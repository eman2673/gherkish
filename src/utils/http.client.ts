import { registerStepUtils } from '../step-types';
import { useCtx } from './context';
import * as PATH from 'path';
import type { HttpNameSpace } from '../types/global';

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'] as const;
export type HttpMethod = (typeof HTTP_METHODS)[number];

type CommonRequestInit = Partial<Omit<RequestInit, 'method' | 'body' | 'headers'>> & {
  params?: { [key: string]: string | number | boolean };
  headers?: Record<string, string | string[]>;
  muteSentry?: boolean;
};

type PartialRequestInit = CommonRequestInit & ({ data?: any } | { form?: Record<string, any> });
interface RelaxedPartialRequestInit extends CommonRequestInit {
  data?: any;
  form?: Record<string, any>;
}

export interface HttpRequestConfig extends RequestInit {
  url: string;
  timeout?: number;
  muteSentry?: boolean;
}

export interface HttpResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  config: HttpRequestConfig;
}

export interface HttpContext {
  request?: HttpRequestConfig;
  response?: HttpResponse;
  responseObject?: any;
}

export interface ApiRegistry {
  name: string;
  baseUrl: string;
  defaultHeaders?: Record<string, string>;
  before?: (config: HttpRequestConfig) => HttpRequestConfig;
  after?: (response: HttpResponse) => HttpResponse;
}

export type SendRequestHandler = (
  apiName: string,
  path: string,
  requestInit?: PartialRequestInit
) => Promise<HttpResponse>;
export type SendRequestUtil = SendRequestHandler & {
  [key in Lowercase<HttpMethod>]: SendRequestHandler;
} & { client: HttpClient };

const MUTE_SENTRY_HEADER = 'X-Mute-Sentry';

export class HttpClient {
  private apiRegistry = new Map<string, ApiRegistry>();
  private defaultTimeout = 30000;

  /**
   * Register an API configuration
   */
  add(apiName: string, config: Omit<ApiRegistry, 'name'>): void {
    this.apiRegistry.set(apiName, { name: apiName, ...config });
  }

  /**
   * Get registered API configuration
   */
  getApi(apiName: string): ApiRegistry | undefined {
    return this.apiRegistry.get(apiName);
  }

  /**
   * Main method to send HTTP requests
   */
  async sendRequest<T = any>(
    apiName: string,
    path: string,
    method: HttpMethod = 'GET',
    requestInit: PartialRequestInit = {}
  ): Promise<HttpResponse<T>> {
    const api = this.apiRegistry.get(apiName);
    if (!api) {
      throw new Error(`API '${apiName}' not registered`);
    }

    // Build URL with path and params
    let url = PATH.join(api.baseUrl, path);

    const {
      params,
      headers: requestHeaders = {},
      data,
      form,
      muteSentry,
      ...request
    }: RelaxedPartialRequestInit = requestInit;

    // Add params to URL if present
    if (params) {
      const searchParams = new URLSearchParams(
        Object.entries(params).map(([key, value]) => [key, String(value)])
      );
      url += `?${searchParams.toString()}`;
    }

    let body: BodyInit | undefined;

    if (form) {
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (value && typeof value === 'object' && 'formDataValue' in value) {
          const { formDataValue, ...options } = value as any;
          if (typeof formDataValue === 'string') {
            formData.append(key, formDataValue);
          } else if (formDataValue instanceof Blob) {
            formData.append(key, formDataValue, options);
          }
        } else if (typeof value === 'string') {
          formData.append(key, value);
        } else if (value instanceof Blob) {
          formData.append(key, value);
        }
      });

      body = formData;
    } else if (data !== undefined) {
      body = JSON.stringify(data);
      requestHeaders['Content-Type'] = 'application/json';
    }

    const headers = Object.entries(
      Object.assign({}, api.defaultHeaders, requestHeaders, {
        [MUTE_SENTRY_HEADER]: muteSentry ? 'true' : undefined,
      })
    ).reduce((acc: [string, string][], [key, value]) => {
      if (Array.isArray(value)) {
        value.forEach(v => acc.push([key, v]));
      } else if (value !== undefined) {
        acc.push([key, value]);
      }
      return acc;
    }, []);

    let config: HttpRequestConfig = {
      url,
      timeout: this.defaultTimeout,
      method,
      headers,
      ...(body ? { body } : undefined),
      ...request,
    };

    // Apply before hook if exists
    config = api.before?.(config) ?? config;

    this.updateGlobalContext(config);

    // Make the request
    const response = await this.makeRequest<T>(config);

    this.updateGlobalContext(config, response);

    // Apply after hook if exists
    const finalResponse = api.after?.(response) ?? response;

    // Update global context
    this.updateGlobalContext(config, finalResponse);

    return finalResponse;
  }

  /**
   * Make the actual HTTP request using fetch
   */
  private async makeRequest<T>(config: HttpRequestConfig): Promise<HttpResponse<T>> {
    const { url, timeout, ...requestOptions } = config;

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...requestOptions,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Parse response headers
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      // Parse response body
      let responseData: T;
      const contentType = response.headers.get('content-type');

      if (contentType?.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = (await response.text()) as T;
      }

      return {
        data: responseData,
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        config,
      };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout}ms`);
      }

      throw error;
    }
  }

  /**
   * Update global context with request/response information
   */
  private updateGlobalContext(request: HttpRequestConfig, response?: HttpResponse): void {
    try {
      const httpContext: HttpContext = {
        request,
        response,
        responseObject: response?.data,
      };

      Object.assign(useCtx(), { http: httpContext });
    } catch {}
  }
}

function createHttpUtil(): SendRequestUtil {
  const httpClient = new HttpClient();
  const handler = (apiName: string, path: string, requestInit?: PartialRequestInit) =>
    httpClient.sendRequest(apiName, path, 'GET', requestInit);
  return Object.assign(handler, {
    client: httpClient,
    ...(Object.fromEntries(
      HTTP_METHODS.map(method => [
        method.toLowerCase(),
        (apiName: string, path: string, requestInit?: PartialRequestInit) =>
          httpClient.sendRequest(apiName, path, method, requestInit),
      ])
    ) as Record<Lowercase<HttpMethod>, SendRequestHandler>),
  });
}

export default (context: HttpNameSpace) => {
  const util = createHttpUtil();
  registerStepUtils({ when: { HTTP: util } });
  context.add = util.client.add.bind(util.client);
};
