import {
  registerStepUtils,
  useCtx
} from "./chunk-BUSTDPMG.js";

// src/utils/http.client.ts
import * as PATH from "path";
var HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];
var MUTE_SENTRY_HEADER = "X-Mute-Sentry";
var HttpClient = class {
  apiRegistry = /* @__PURE__ */ new Map();
  defaultTimeout = 3e4;
  /**
   * Register an API configuration
   */
  add(apiName, config) {
    this.apiRegistry.set(apiName, { name: apiName, ...config });
  }
  /**
   * Get registered API configuration
   */
  getApi(apiName) {
    return this.apiRegistry.get(apiName);
  }
  /**
   * Main method to send HTTP requests
   */
  async sendRequest(apiName, path, method = "GET", requestInit = {}) {
    const api = this.apiRegistry.get(apiName);
    if (!api) {
      throw new Error(`API '${apiName}' not registered`);
    }
    let url = PATH.join(api.baseUrl, path);
    const {
      params,
      headers: requestHeaders = {},
      data,
      form,
      muteSentry,
      ...request
    } = requestInit;
    if (params) {
      const searchParams = new URLSearchParams(
        Object.entries(params).map(([key, value]) => [key, String(value)])
      );
      url += `?${searchParams.toString()}`;
    }
    let body;
    let isFormData = false;
    if (form) {
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (value && typeof value === "object" && "formDataValue" in value) {
          const { formDataValue, filename, ...options } = value;
          if (typeof formDataValue === "string") {
            formData.append(key, formDataValue);
          } else if (formDataValue instanceof Blob) {
            formData.append(key, formDataValue, filename || options.filename);
          }
        } else if (typeof value === "string") {
          formData.append(key, value);
        } else if (value instanceof Blob) {
          formData.append(key, value);
        }
      });
      body = formData;
      isFormData = true;
    } else if (data !== void 0) {
      body = JSON.stringify(data);
      requestHeaders["Content-Type"] = "application/json";
    }
    const headers = Object.entries(
      Object.assign({}, api.defaultHeaders, requestHeaders, {
        [MUTE_SENTRY_HEADER]: muteSentry ? "true" : void 0
      })
    ).reduce((acc, [key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((v) => acc.push([key, v]));
      } else if (value !== void 0) {
        acc.push([key, value]);
      }
      return acc;
    }, []).filter(([key]) => !isFormData || key.toLowerCase() !== "content-type");
    let config = {
      url,
      timeout: this.defaultTimeout,
      method,
      headers,
      ...body ? { body } : void 0,
      ...request
    };
    config = api.before?.(config) ?? config;
    this.updateGlobalContext(config);
    const response = await this.makeRequest(config);
    this.updateGlobalContext(config, response);
    const finalResponse = api.after?.(response) ?? response;
    this.updateGlobalContext(config, finalResponse);
    return finalResponse;
  }
  /**
   * Make the actual HTTP request using fetch
   */
  async makeRequest(config) {
    const { url, timeout, ...requestOptions } = config;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    console.log("HTTP request: ", url, JSON.stringify(requestOptions, null, 2));
    try {
      const response = await fetch(url, {
        ...requestOptions,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      const responseHeaders = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });
      let responseData;
      const contentType = response.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        try {
          responseData = await response.json();
        } catch {
        }
      } else {
        responseData = await response.text();
        if (responseData.startsWith("{") || responseData.startsWith("[")) {
          try {
            responseData = JSON.parse(responseData);
          } catch {
          }
        }
      }
      console.log("HTTP response: ", url, response.status, JSON.stringify(responseData, null, 2));
      return {
        data: responseData,
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        config
      };
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(`Request timeout after ${timeout}ms`);
      }
      throw error;
    }
  }
  /**
   * Update global context with request/response information
   */
  updateGlobalContext(request, response) {
    try {
      const httpContext = {
        request,
        response,
        responseObject: response?.data
      };
      Object.assign(useCtx(), { http: httpContext });
    } catch {
    }
  }
};
function createHttpUtil() {
  const httpClient = new HttpClient();
  const handler = (apiName, path, requestInit) => httpClient.sendRequest(apiName, path, "GET", requestInit);
  return Object.assign(handler, {
    client: httpClient,
    ...Object.fromEntries(
      HTTP_METHODS.map((method) => [
        method.toLowerCase(),
        (apiName, path, requestInit) => httpClient.sendRequest(apiName, path, method, requestInit)
      ])
    )
  });
}
var httpUtil = createHttpUtil();
var http_client_default = (context) => {
  registerStepUtils({ when: { HTTP: httpUtil } });
  context.add = httpUtil.client.add.bind(httpUtil.client);
};
export {
  HttpClient,
  http_client_default as default,
  httpUtil
};
//# sourceMappingURL=http.client-RR7E7EOP.js.map