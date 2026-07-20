import {
  registerEachUtils
} from "./chunk-KJCU2WBQ.js";
import {
  registerStepUtils,
  useCtx
} from "./chunk-BUSTDPMG.js";

// src/utils/wiremock/wiremock.client.ts
import { posix } from "path";

// src/utils/wiremock/stub.builder.ts
var StubBuilder = class {
  mockName = "";
  config = {
    request: {
      method: "GET",
      urlPath: ""
    },
    response: {
      status: 200,
      headers: {},
      jsonBody: {}
    }
  };
  get;
  post;
  put;
  patch;
  delete;
  options;
  any;
  stubFn;
  constructor(stubFn) {
    this.stubFn = stubFn;
    this.get = this.method.bind(this, "GET");
    this.post = this.method.bind(this, "POST");
    this.put = this.method.bind(this, "PUT");
    this.patch = this.method.bind(this, "PATCH");
    this.delete = this.method.bind(this, "DELETE");
    this.options = this.method.bind(this, "OPTIONS");
    this.any = this.method.bind(this, "ANY");
  }
  get json() {
    return this.contentType("json");
  }
  get text() {
    return this.contentType("text");
  }
  get xml() {
    return this.contentType("xml");
  }
  contentType(type) {
    const contentTypes = {
      json: "application/json",
      text: "text/plain",
      xml: "application/xml"
    };
    this.config.request.headers = {
      ...this.config.request.headers,
      Accept: {
        contains: contentTypes[type]
      }
    };
    this.config.response.headers = {
      ...this.config.response.headers,
      "Content-Type": contentTypes[type]
    };
    return this;
  }
  method(method, mockName, path, config) {
    this.mockName = mockName;
    this.config.request = {
      method,
      urlPath: path.startsWith("/") ? path : `/${path}`
    };
    if (!config) {
      return this.execute();
    }
    if (typeof config === "string") {
      this.config.response.body = config;
      this.config.response.jsonBody = void 0;
    } else if ("response" in config) {
      const { request, response, ...rest } = config;
      if (request) {
        const { method: _, urlPath: __, ...requestRest } = request;
        Object.assign(this.config.request, requestRest);
      }
      this.config.response = response;
      Object.assign(this.config, rest);
    } else {
      this.config.response = {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        },
        jsonBody: config
      };
    }
    return this.execute();
  }
  async execute() {
    const execConfig = {
      request: { ...this.config.request },
      response: { ...this.config.response }
    };
    this.config = {
      request: {
        method: "GET",
        urlPath: ""
      },
      response: {
        status: 200,
        headers: {},
        jsonBody: {}
      }
    };
    return this.stubFn(this.mockName, execConfig);
  }
};
function createStubBuilder(stubFn) {
  return new StubBuilder(stubFn);
}

// src/utils/wiremock/wiremock.client.ts
var WireMockClient = class {
  mockRegistry = /* @__PURE__ */ new Map();
  baseUrl = "http://wiremock:8080";
  // Default value
  apiToken;
  configure(config) {
    this.baseUrl = config.baseUrl;
    this.apiToken = config.apiToken;
  }
  add(mockName, config) {
    this.mockRegistry.set(mockName, { name: mockName, ...config });
  }
  getMock(mockName) {
    const mock = this.mockRegistry.get(mockName);
    if (mock) return mock;
    throw new Error(`Mock '${mockName}' not registered`);
  }
  prefixUrlPattern(mockName, urlPattern) {
    const mock = this.getMock(mockName);
    return mock.rootPath ? posix.join("/", mock.rootPath, urlPattern) : urlPattern;
  }
  /**
   * Sends a request to the WireMock server after prefixing the path with the mock's root path.
   * Also handles JSON parsing of the response updating the global context.
   * @param path - The path to send the request to.
   * @param method - The HTTP method to use.
   * @param body - The body of the request.
   * @returns The response from the request.
   */
  async sendRequest(path, method = "GET", body) {
    const response = await fetch(new URL(path, this.baseUrl).toString(), {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${this.apiToken}`
      },
      body: body ? JSON.stringify(body) : void 0
    });
    let responseData;
    const contentType = response.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      try {
        responseData = await response.json();
      } catch {
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
  updateGlobalContext(type, data) {
    try {
      const ctx = useCtx();
      ctx.mock ??= {};
      ctx.mock[type] = data;
    } catch {
    }
  }
  /**
   * Creates a stub for the given mock name and configuration on the WireMock server.
   * @param mockName - The name of the mock to create a stub for.
   * @param stubConfig - The configuration for the stub.
   * @returns The response from the request.
   */
  async _stub(mockName, stubConfig) {
    const modifiedConfig = { ...stubConfig };
    const urlKeys = [
      "url",
      "urlPath",
      "urlPattern",
      "urlPathPattern",
      "urlPathTemplate"
    ];
    for (const key of urlKeys) {
      if (modifiedConfig.request[key]) {
        modifiedConfig.request[key] = this.prefixUrlPattern(mockName, modifiedConfig.request[key]);
      }
    }
    const result = await this.sendRequest("/__admin/mappings", "POST", modifiedConfig);
    console.log("WireMock stubbing response: ", JSON.stringify(result, null, 2));
    if (result.status !== 201) {
      throw new Error(`Failed to create stub: ${JSON.stringify(result.data)}`);
    }
    try {
      const ctx = useCtx();
      ctx.mock ??= {};
      ctx.mock.stubs ??= [];
      ctx.mock.stubs.push(result.data.id);
    } catch {
    }
    this.updateGlobalContext("stub", modifiedConfig);
  }
  // TODO: make verify return expectable
  /**
   * Verifies that the given mock name and configuration has been called.
   * @param mockName - The name of the mock to verify.
   * @param method - The HTTP method to use.
   * @param urlPattern - The URL pattern to verify.
   * @returns The verification result.
   */
  async verify(mockName, method, urlPattern) {
    const urlPath = this.prefixUrlPattern(mockName, urlPattern);
    const result = await this.sendRequest("/__admin/requests/find", "POST", {
      method,
      urlPath
    });
    if (result.status !== 200) {
      throw new Error(`Failed to verify requests: ${JSON.stringify(result.data)}`);
    }
    const verification = {
      count: result.data.requests.length,
      requests: result.data.requests
    };
    this.updateGlobalContext("verification", verification);
    return verification;
  }
  /**
   * Removes stubs and their associated journal entries for this test.
   * Only affects stubs/requests created by this test (parallel-safe).
   */
  async reset() {
    const ctx = useCtx();
    if (ctx.mock?.stubs?.length) {
      const stubIds = ctx.mock.stubs;
      await this.removeJournalEntriesForStubs(stubIds);
      for (const id of stubIds) {
        const result = await this.sendRequest(`/__admin/mappings/${id}`, "DELETE");
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
  async removeJournalEntriesForStubs(stubIds) {
    try {
      const result = await this.sendRequest("/__admin/requests");
      if (result.status !== 200) {
        return;
      }
      const stubIdSet = new Set(stubIds);
      const entriesToRemove = (result.data.requests || []).filter(
        (entry) => entry.stubMapping?.id && stubIdSet.has(entry.stubMapping.id)
      );
      for (const entry of entriesToRemove) {
        try {
          if (entry.id) {
            await this.sendRequest(`/__admin/requests/${entry.id}`, "DELETE");
          }
        } catch {
        }
      }
    } catch {
    }
  }
  // TODO: this will likely require a configuration to preserve some stubs (proxies)
  /**
   * Resets the WireMock server.
   * This will delete all stubs and reset the server to its initial state.
   * @returns The response from the request.
   */
  async hardReset() {
    const result = await this.sendRequest("/__admin/reset", "POST");
    if (result.status !== 200) {
      throw new Error(`Failed to reset WireMock: ${result.status}`);
    }
  }
};
function createStubbingUtil(stubFn) {
  return new Proxy(Object.assign(stubFn, createStubBuilder(stubFn)), {
    get(target, prop) {
      const builder = createStubBuilder(target);
      if (typeof prop === "string" && prop in builder) {
        return builder[prop];
      }
      return void 0;
    },
    apply(target, thisArg, args) {
      return target.apply(thisArg, args);
    }
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
    hardReset: wireMockClient.hardReset.bind(wireMockClient)
  };
}
var wiremock_client_default = (context) => {
  const util = createWireMockUtil();
  registerStepUtils({
    given: { Mock: { stub: util.stub } },
    then: { Mock: { verify: util.verify } }
  });
  registerEachUtils({ Mock: { reset: util.reset } });
  context.configure = util.client.configure.bind(util.client);
  context.add = util.client.add.bind(util.client);
  context.hardReset = util.hardReset;
};
export {
  WireMockClient,
  wiremock_client_default as default
};
//# sourceMappingURL=wiremock-BDWX5GWN.js.map