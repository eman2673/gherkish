import type { FluentStubConfig, WireMockStub } from './wiremock.types';

type StubWrapper = (mockName: string, path: string, config?: FluentStubConfig) => Promise<void>;

/**
 * Provides a fluent interface for building WireMock stubs.
 * The builder is attached to the stub function and can be used to
 * chain methods together to build a stub.
 * @param stubFn - The stub function to build a stub for.
 * @returns The stub builder.
 */
export class StubBuilder {
  private mockName: string = '';
  private config: WireMockStub = {
    request: {
      method: 'GET',
      urlPath: '',
    },
    response: {
      status: 200,
      headers: {},
      jsonBody: {},
    },
  };

  get: StubWrapper;
  post: StubWrapper;
  put: StubWrapper;
  patch: StubWrapper;
  delete: StubWrapper;
  options: StubWrapper;
  any: StubWrapper;

  private stubFn: (mockName: string, config: WireMockStub) => Promise<void>;

  constructor(stubFn: (mockName: string, config: WireMockStub) => Promise<void>) {
    this.stubFn = stubFn;
    this.get = this.method.bind(this, 'GET');
    this.post = this.method.bind(this, 'POST');
    this.put = this.method.bind(this, 'PUT');
    this.patch = this.method.bind(this, 'PATCH');
    this.delete = this.method.bind(this, 'DELETE');
    this.options = this.method.bind(this, 'OPTIONS');
    this.any = this.method.bind(this, 'ANY');
  }

  get json() {
    return this.contentType('json');
  }

  get text() {
    return this.contentType('text');
  }

  get xml() {
    return this.contentType('xml');
  }

  private contentType(type: 'json' | 'text' | 'xml'): Omit<this, 'contentType'> {
    const contentTypes = {
      json: 'application/json',
      text: 'text/plain',
      xml: 'application/xml',
    };

    this.config.request.headers = {
      ...this.config.request.headers,
      Accept: {
        contains: contentTypes[type],
      },
    };
    this.config.response.headers = {
      ...this.config.response.headers,
      'Content-Type': contentTypes[type],
    };
    return this;
  }

  private method(method: string, mockName: string, path: string, config?: FluentStubConfig) {
    this.mockName = mockName;
    this.config.request = {
      method,
      urlPath: path.startsWith('/') ? path : `/${path}`,
    };

    if (!config) {
      return this.execute();
    }

    if (typeof config === 'string') {
      // String response
      this.config.response.body = config;
      this.config.response.jsonBody = undefined;
    } else if ('response' in config) {
      // Full config provided
      const { request, response, ...rest } = config;
      if (request) {
        // Merge request config, but keep method and urlPath
        const { method: _, urlPath: __, ...requestRest } = request;
        Object.assign(this.config.request, requestRest);
      }
      // Use response as is
      this.config.response = response;
      // Add any other properties
      Object.assign(this.config, rest);
    } else {
      // Just response data
      this.config.response = {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
        jsonBody: config,
      };
    }

    return this.execute();
  }

  private async execute(): Promise<void> {
    // Create a new config for each execution
    const execConfig = {
      request: { ...this.config.request },
      response: { ...this.config.response },
    };

    // Reset the config for the next use
    this.config = {
      request: {
        method: 'GET',
        urlPath: '',
      },
      response: {
        status: 200,
        headers: {},
        jsonBody: {},
      },
    };

    return this.stubFn(this.mockName, execConfig);
  }
}

export function createStubBuilder(
  stubFn: (mockName: string, config: WireMockStub) => Promise<void>,
) {
  return new StubBuilder(stubFn);
}
