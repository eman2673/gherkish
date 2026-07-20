import { posix } from 'path';

import { registerEachUtils } from '../../feature';
import { registerStepUtils } from '../../step-types';
import type { WireMockNameSpace } from '../../types/global.d';
import { useCtx } from '../context';
import { createStubBuilder } from './stub.builder';
import type {
  UrlMatch,
  WireMockRegistry,
  WireMockStub,
  WireMockVerification,
} from './wiremock.types';

export class WireMockClient {
  private mockRegistry = new Map<string, WireMockRegistry>();
  private baseUrl = 'http://wiremock:8080'; // Default value
  private apiToken: string | undefined;

  configure(config: { baseUrl: string; apiToken?: string }): void {
    this.baseUrl = config.baseUrl;
    this.apiToken = config.apiToken;
  }

  add(mockName: string, config: Omit<WireMockRegistry, 'name'>): void {
    this.mockRegistry.set(mockName, { name: mockName, ...config });
  }

  getMock(mockName: string): WireMockRegistry {
    const mock = this.mockRegistry.get(mockName);
    if (mock) return mock;
    throw new Error(`Mock '${mockName}' not registered`);
  }

  private prefixUrlPattern(mockName: string, urlPattern: string): string {
    const mock = this.getMock(mockName);
    return mock.rootPath ? posix.join('/', mock.rootPath, urlPattern) : urlPattern;
  }

  /**
   * Sends a request to the WireMock server after prefixing the path with the mock's root path.
   * Also handles JSON parsing of the response updating the global context.
   * @param path - The path to send the request to.
   * @param method - The HTTP method to use.
   * @param body - The body of the request.
   * @returns The response from the request.
   */
  private async sendRequest(path: string, method = 'GET', body?: any) {
    const response = await fetch(new URL(path, this.baseUrl).toString(), {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Token ${this.apiToken}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    let responseData;
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      try {
        responseData = await response.json();
      } catch {
        // If response is already a string of JSON, parse it
        const text = await response.text();
        try {
          responseData = JSON.parse(text);
        } catch {
          responseData = text;
        }
      }
    } else {
      responseData = await response.text();
    }
    return { status: response.status, data: responseData };
  }

  // TODO: maybe structure the context better to limit overwrites
  private updateGlobalContext(type: 'stub' | 'verification', data: any): void {
    try {
      const ctx = useCtx();
      ctx.mock ??= {};
      ctx.mock[type] = data;
    } catch {
      // best-effort ctx update; ignore if no scenario context is bound
    }
  }

  /**
   * Creates a stub for the given mock name and configuration on the WireMock server.
   * @param mockName - The name of the mock to create a stub for.
   * @param stubConfig - The configuration for the stub.
   * @returns The response from the request.
   */
  async _stub(mockName: string, stubConfig: WireMockStub): Promise<void> {
    // Clone the config to avoid modifying the original
    const modifiedConfig = { ...stubConfig };

    // Update URL patterns to include root path
    const urlKeys: (keyof UrlMatch)[] = [
      'url',
      'urlPath',
      'urlPattern',
      'urlPathPattern',
      'urlPathTemplate',
    ];
    for (const key of urlKeys) {
      if (modifiedConfig.request[key]) {
        modifiedConfig.request[key] = this.prefixUrlPattern(mockName, modifiedConfig.request[key]);
      }
    }

    const result = await this.sendRequest('/__admin/mappings', 'POST', modifiedConfig);
    // eslint-disable-next-line no-console -- WireMock stub responses are useful test-run diagnostics
    console.log('WireMock stubbing response: ', JSON.stringify(result, null, 2));

    if (result.status !== 201) {
      throw new Error(`Failed to create stub: ${JSON.stringify(result.data)}`);
    }

    // Store stub ID in context for filtering and cleanup
    try {
      const ctx = useCtx();
      ctx.mock ??= {};
      ctx.mock.stubs ??= [];
      ctx.mock.stubs.push(result.data.id);
    } catch {
      // best-effort ctx update; ignore if no scenario context is bound
    }

    this.updateGlobalContext('stub', modifiedConfig);
  }

  // TODO: make verify return expectable
  /**
   * Verifies that the given mock name and configuration has been called.
   * @param mockName - The name of the mock to verify.
   * @param method - The HTTP method to use.
   * @param urlPattern - The URL pattern to verify.
   * @returns The verification result.
   */
  async verify(
    mockName: string,
    method: string,
    urlPattern: string,
  ): Promise<WireMockVerification> {
    const urlPath = this.prefixUrlPattern(mockName, urlPattern);

    const result = await this.sendRequest('/__admin/requests/find', 'POST', {
      method,
      urlPath,
    });

    if (result.status !== 200) {
      throw new Error(`Failed to verify requests: ${JSON.stringify(result.data)}`);
    }

    const verification: WireMockVerification = {
      count: result.data.requests.length,
      requests: result.data.requests,
    };

    this.updateGlobalContext('verification', verification);
    return verification;
  }

  /**
   * Removes stubs and their associated journal entries for this test.
   * Only affects stubs/requests created by this test (parallel-safe).
   */
  async reset(): Promise<void> {
    const ctx = useCtx();
    if (ctx.mock?.stubs?.length) {
      const stubIds = ctx.mock.stubs;

      // Remove journal entries that matched our stubs
      await this.removeJournalEntriesForStubs(stubIds);

      // DELETE /__admin/mappings ignores its body and wipes all stubs; only the per-id endpoint is selective.
      for (const id of stubIds) {
        const result = await this.sendRequest(`/__admin/mappings/${id}`, 'DELETE');
        if (result.status !== 200 && result.status !== 404) {
          throw new Error(`Failed to delete stub ${id}: ${result.status}`);
        }
      }
      ctx.mock.stubs = [];
    }
  }

  /**
   * Removes journal entries for requests that matched the given stub IDs.
   * Best effort - errors are silently caught to not block stub cleanup.
   */
  private async removeJournalEntriesForStubs(stubIds: string[]): Promise<void> {
    try {
      const result = await this.sendRequest('/__admin/requests');
      if (result.status !== 200) {
        return;
      }

      const stubIdSet = new Set(stubIds);
      const entriesToRemove = (result.data.requests || []).filter(
        (entry: any) => entry.stubMapping?.id && stubIdSet.has(entry.stubMapping.id),
      );

      // Remove each matching journal entry by its ID
      for (const entry of entriesToRemove) {
        try {
          if (entry.id) {
            await this.sendRequest(`/__admin/requests/${entry.id}`, 'DELETE');
          }
        } catch {
          // Continue with other entries even if one fails
        }
      }
    } catch {
      // Silently fail - journal cleanup is best effort
    }
  }

  // TODO: this will likely require a configuration to preserve some stubs (proxies)
  /**
   * Resets the WireMock server.
   * This will delete all stubs and reset the server to its initial state.
   * @returns The response from the request.
   */
  async hardReset(): Promise<void> {
    const result = await this.sendRequest('/__admin/reset', 'POST');
    if (result.status !== 200) {
      throw new Error(`Failed to reset WireMock: ${result.status}`);
    }
  }
}

/**
 * Creates a proxy to allow for the stub builder to be attached to the stub function
 * Can't simply assign the builder to the stub function because the builder is a class
 * that needs access to the appropriate context and getters must be maintained..
 * @param stubFn - The stub function to create a proxy for.
 * @returns The proxy.
 */
function createStubbingUtil(stubFn: (mockName: string, stubConfig: WireMockStub) => Promise<void>) {
  return new Proxy(Object.assign(stubFn, createStubBuilder(stubFn)), {
    get(target, prop: string | symbol) {
      // create new builder for each call, the outter builder is for typing
      const builder = createStubBuilder(target);
      if (typeof prop === 'string' && prop in builder) {
        return builder[prop as keyof typeof builder];
      }
      return undefined;
    },

    apply(target, thisArg, args: [string, WireMockStub]) {
      return target.apply(thisArg, args);
    },
  });
}

function createWireMockUtil() {
  const wireMockClient = new WireMockClient();
  const stub = createStubbingUtil(wireMockClient._stub.bind(wireMockClient));
  return {
    client: wireMockClient,
    stub,
    verify: wireMockClient.verify.bind(wireMockClient),
    reset: wireMockClient.reset.bind(wireMockClient),
    hardReset: wireMockClient.hardReset.bind(wireMockClient),
  };
}

export default (context: WireMockNameSpace) => {
  const util = createWireMockUtil();

  registerStepUtils({
    given: { Mock: { stub: util.stub } },
    then: { Mock: { verify: util.verify } },
  });

  registerEachUtils({ Mock: { reset: util.reset } });

  context.configure = util.client.configure.bind(util.client);
  context.add = util.client.add.bind(util.client);
  context.hardReset = util.hardReset;
};
