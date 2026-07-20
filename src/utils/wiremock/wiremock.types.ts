/*
 * Adjust types as needed. This is a starting point.
 * Reviewed and modified but convinced there is more to be done here.
 */

export interface LogicalAndOr {
  and?: Array<MatcherPattern>;
  or?: Array<MatcherPattern>;
  not?: MatcherPattern;
}

export interface TextMatchPattern {
  equalTo?: string;
  contains?: string;
  matches?: string;
  doesNotMatch?: string;
}

export interface JsonMatchPattern {
  equalToJson?: string | object;
  matchesJsonPath?: string | object;
}

export interface XmlMatchPattern {
  equalToXml?: string;
  matchesXPath?: string;
}

export interface BinaryMatchPattern {
  binaryEqualTo?: string;
}

export interface DateTimePattern {
  before?: string;
  after?: string;
  equalToDateTime?: string;
  truncateExpected?: string;
  applyTruncationLast?: boolean;
}

export type MatcherPattern = TextMatchPattern &
  JsonMatchPattern &
  XmlMatchPattern &
  BinaryMatchPattern &
  DateTimePattern &
  LogicalAndOr;

// Request matching types
export interface MultiValuePattern {
  hasExactly?: Array<MatcherPattern>;
  includes?: Array<MatcherPattern>;
}

export type HeaderPattern = TextMatchPattern & MultiValuePattern & LogicalAndOr;
export type QueryParameterPattern = TextMatchPattern & MultiValuePattern & LogicalAndOr;
export type CookiePattern = TextMatchPattern & LogicalAndOr;

export interface BasicAuth {
  username: string;
  password: string;
}

// Body matching types
export interface BodyPattern
  extends TextMatchPattern,
    JsonMatchPattern,
    XmlMatchPattern,
    BinaryMatchPattern,
    LogicalAndOr {
  ignoreArrayOrder?: boolean;
  ignoreExtraElements?: boolean;
}

export interface MultipartPattern {
  headers?: Record<string, MultiValuePattern>;
  matchingType: 'ALL' | 'ANY';
  bodyPatterns?: BodyPattern[];
}

type UrlMatchKeys = 'url' | 'urlPath' | 'urlPathPattern' | 'urlPattern' | 'urlPathTemplate';

// URL matching types
type UrlMatchTypes<T extends UrlMatchKeys = 'url'> = {
  [K in Exclude<UrlMatchKeys, T>]?: never;
} & { [K in T]: string };

export type UrlMatch =
  | UrlMatchTypes<'url'>
  | UrlMatchTypes<'urlPath'>
  | UrlMatchTypes<'urlPathPattern'>
  | UrlMatchTypes<'urlPattern'>
  | UrlMatchTypes<'urlPathTemplate'>;

// Response types
export type TransformerType =
  | 'response-template'
  | 'body-transformer'
  | 'transformer-parameter'
  | 'spring-transformer'
  | 'transformer-class';

export type FaultType =
  | 'CONNECTION_RESET_BY_PEER'
  | 'EMPTY_RESPONSE'
  | 'MALFORMED_RESPONSE_CHUNK'
  | 'RANDOM_DATA_THEN_CLOSE';

export interface DelayDistribution {
  type: 'lognormal' | 'uniform';
  median?: number;
  sigma?: number;
  upper?: number;
  lower?: number;
}

export interface ChunkedDribbleDelay {
  numberOfChunks: number;
  totalDuration: number;
}

type ResponseBodyKeys = 'body' | 'base64Body' | 'jsonBody' | 'bodyFileName';

// Making response body types mutually exclusive
type ResponseBodyTypes<T extends ResponseBodyKeys = 'body', R = string> = {
  [K in Exclude<ResponseBodyKeys, T>]?: never;
} & { [K in T]: R };

export type ResponseBody =
  | ResponseBodyTypes<'body'>
  | ResponseBodyTypes<'base64Body'>
  | ResponseBodyTypes<'jsonBody', string | object>
  | ResponseBodyTypes<'bodyFileName'>;

export type ResponseDefinition = ResponseBody & {
  status: number;
  statusMessage?: string;
  headers?: Record<string, string>;
  additionalProxyRequestHeaders?: Record<string, string>;
  fault?: FaultType;
  fixedDelayMilliseconds?: number;
  delayDistribution?: DelayDistribution;
  chunkedDribbleDelay?: ChunkedDribbleDelay;
  transformers?: TransformerType[];
  transformerParameters?: Record<string, string>;
  proxyBaseUrl?: string;
  proxiedFrom?: string;
  removeProxyRequestHeaders?: string[];
  fromConfiguredStub?: boolean;
};

// Scenario types
export interface ScenarioState {
  scenarioName?: string;
  requiredScenarioState?: string;
  newScenarioState?: string;
}

// Post-serve action types
export interface PostServeAction {
  name: string;
  parameters?: Record<string, any>;
}

// Main stub type using composition
export interface WireMockStub extends ScenarioState {
  id?: string;
  name?: string;
  priority?: number;
  persistent?: boolean;
  request: UrlMatch & {
    method: string;
    queryParameters?: Record<string, QueryParameterPattern>;
    headers?: Record<string, HeaderPattern>;
    cookies?: Record<string, CookiePattern>;
    bodyPatterns?: BodyPattern[];
    multipartPatterns?: MultipartPattern[];
    basicAuthCredentials?: BasicAuth;
    pathParameters?: Record<string, MatcherPattern>;
    clientIp?: MatcherPattern;
  };
  response: ResponseDefinition;
  postServeActions?: PostServeAction[];
  metadata?: Record<string, any>;
}

// Verification types
export interface RequestDetail {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
}

export interface WireMockVerification {
  count: number;
  requests: RequestDetail[];
}

// Registry type
export interface WireMockRegistry {
  name: string;
  rootPath: string;
}

export type StubResponseObject = Record<string, any> & { response?: never };

interface PartialWiremockStub extends Omit<WireMockStub, 'request' | 'response'> {
  request?: Partial<WireMockStub['request']>;
  response: WireMockStub['response'];
}

// This type ensures that if request/response are present, they must be properly typed
type StrictStubConfig = {
  [K in keyof WireMockStub]: K extends 'request' | 'response' ? never : any;
};

export type FluentStubConfig =
  | PartialWiremockStub
  | (StrictStubConfig & Record<string, any>)
  | string;

export type StubMethod = (
  mockName: string,
  path: string,
  config?: FluentStubConfig,
) => Promise<void>;

export type ContentBuilder = {
  get: StubMethod;
  post: StubMethod;
  put: StubMethod;
  patch: StubMethod;
  delete: StubMethod;
};
