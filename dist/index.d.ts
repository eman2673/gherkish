import { Assertion, expect, beforeAll, afterAll } from 'vitest';
import { Faker } from '@faker-js/faker';
import * as _vitest_runner from '@vitest/runner';
import { ClientConfig, Client } from 'pg';
import { DynamoDBClientConfig } from '@aws-sdk/client-dynamodb';

declare function setContext(key: string, value: any, logFormatter?: (value: any) => string): void;

interface DbRequestConfig {
    table: string;
    operation: 'select' | 'insert' | 'update' | 'delete';
    where?: Record<string, any>;
    data?: Record<string, any>;
}
interface DbResponse<T = any> {
    data: T[];
    rowCount: number;
    config: DbRequestConfig;
}
interface DBResponseHistory {
    reads: (Record<string, any> | undefined)[];
    writes: (Record<string, any> | undefined)[];
}
interface DbContextResponse {
    request?: DbRequestConfig;
    response?: DbResponse;
    responseObject?: any;
}
/**
 * The DbContext is a union of the DbResponse and the DBResponseHistory
 * The DbResponse is the response from the last database operation containing the data, rowCount and config (request confing)
 * The remaining keys contain DBResponseHistory objects, historical `reads` and `writes` keyed by the table name in PascalCase
 */
type DbContext = DbContextResponse & Record<string, DBResponseHistory>;
interface DBClient<T = any> {
    insert: (table: string, data: Record<string, any>) => Promise<any[]>;
    update: (table: string, data: Record<string, any>, where: Record<string, any>) => Promise<any[]>;
    delete: (table: string, where: Record<string, any>) => Promise<any[]>;
    select: (table: string, where: Record<string, any>) => Promise<any[]>;
    exec: (...args: any[]) => Promise<any>;
    close: () => Promise<void>;
}

type DefaultBuilder = (context: Context) => Record<string, any>;
interface DBRegistration<T = any> {
    name: string;
    /**
     * Connect to the database
     * @returns The database client
     */
    connect: () => Promise<T>;
    /**
     * Runs once, immediately after the connection is first established and before
     * any step uses it — the client is connected lazily and cached, so this fires
     * exactly once per worker. Use it for one-time setup (seeding reference rows,
     * priming sequences). Because it still runs once *per worker*, keep the work
     * idempotent and safe to run concurrently across workers.
     */
    onConnect?: (client: T) => Promise<void> | void;
    before?: (config: DbRequestConfig) => DbRequestConfig;
    after?: (response: DbResponse) => DbResponse;
}
type SendDbRequestHandler = (dbName: string, table: string, operation: 'select' | 'insert' | 'update' | 'delete', requestInit?: Partial<Omit<DbRequestConfig, 'table' | 'operation'>>) => Promise<DbResponse>;
type SendDbRequestUtil = SendDbRequestHandler & {
    client: DbClientRegistry;
    exec: (dbName: string, statement: string, params?: unknown[]) => Promise<any[]>;
};
interface DbGivenUtils extends SendDbRequestUtil {
    insert: (dbName: string, table: string, ...records: Record<string, any>[]) => Promise<any[]>;
    update: (dbName: string, table: string, data: Record<string, any>, where: Record<string, any>) => Promise<any[]>;
    delete: (dbName: string, table: string, where: Record<string, any>) => Promise<any[]>;
}
type DbWhenUtils = SendDbRequestUtil;
interface DbThenUtils extends SendDbRequestUtil {
    /**
     * Looks up a record in the database and returns an assertion resulting from expect(executedQuery).resolves
     * Stores the query results in the global context as db.[table].reads to allow multiple assertions
     * on the same results.
     * @example
     * await DB.expect('default', 'donor_profiles', { clientId }).resolves.toEqual(...)
     * expect(db.DonorProfiles?.reads[0]).toEqual(...)
     */
    expect: (dbName: string, table: string, where: Record<string, any>) => Assertion<() => Promise<any[]>>['resolves'];
}
interface DbFeatureUtils {
    setDefaults: (dbName: string, table: string, defaults: DefaultBuilder) => void;
    clearDefaults: (dbName: string) => void;
}
declare class DbClientRegistry {
    private dbRegistry;
    private clients;
    private defaults;
    /**
     * Register a database configuration
     */
    add(dbName: string, config: Omit<DBRegistration, 'name'>): void;
    /**
     * Get registered database configuration
     */
    getDb(dbName: string): DBRegistration | undefined;
    /**
     * Get or create a database client
     */
    private getClient;
    /**
     * Set default values for a table. Function is used to allow for dynamic default values based on the context.
     */
    setDefaultValues(dbName: string, table: string, defaultValues: (context: Context) => Record<string, any>): void;
    /**
     * Clear all defaults for a database
     */
    clearDefaults(dbName: string): void;
    /**
     * Apply defaults to a record
     */
    private applyDefaults;
    /**
     * Execute a SQL statement
     */
    exec<T>(dbName: string, ...args: Parameters<DBClient<T>['exec']>): Promise<any[]>;
    /**
     * Main method to send database requests
     */
    sendRequest<T = any>(dbName: string, table: string, operation: 'select' | 'insert' | 'update' | 'delete', requestInit?: Partial<Omit<DbRequestConfig, 'table' | 'operation'>>): Promise<DbResponse<T>>;
    /**
     * Update global context with database request/response information
     */
    private updateGlobalContext;
    /**
     * Close all database connections
     */
    close(): Promise<void>;
}

interface Context$2 {
    [key: string]: any;
}
interface Extended extends Faker {
    data: {
        (nestedKey: string): Extended;
        <T>(nestedKey: string, generator: (Fake: Extended) => T): void;
    };
    list: <T>(count: number, nestedKey: string, generator: (Fake: Extended) => T) => void;
}
declare class FakeDataManager {
    private static readonly CONTEXT_KEY;
    private readonly fakerInstance;
    private readonly proxy;
    constructor();
    /**
     * Get or create the fake data context
     */
    private getFakeContext;
    /**
     * Store a value at a nested key path
     */
    private storeNestedValue;
    /**
     * Create proxy to wrap faker methods for logging and data storage
     */
    private createProxy;
    /**
     * Get the wrapped faker instance with additional methods
     */
    getFaker(): Extended;
}

type fakish_util_Extended = Extended;
declare const fakish_util_Faker: typeof Faker;
declare namespace fakish_util {
  export { type Context$2 as Context, type fakish_util_Extended as Extended, fakish_util_Faker as Faker, FakeDataManager as default };
}

declare const HTTP_METHODS: readonly ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];
type HttpMethod = (typeof HTTP_METHODS)[number];
type CommonRequestInit = Partial<Omit<RequestInit, 'method' | 'body' | 'headers'>> & {
    params?: {
        [key: string]: string | number | boolean;
    };
    headers?: Record<string, string | string[]>;
    muteSentry?: boolean;
};
type PartialRequestInit = CommonRequestInit & ({
    data?: any;
} | {
    form?: Record<string, any>;
});
interface HttpRequestConfig extends RequestInit {
    url: string;
    timeout?: number;
    muteSentry?: boolean;
}
interface HttpResponse<T = any> {
    data: T;
    status: number;
    statusText: string;
    headers: Record<string, string>;
    config: HttpRequestConfig;
}
interface HttpContext {
    request?: HttpRequestConfig;
    response?: HttpResponse;
    responseObject?: any;
}
interface ApiRegistry {
    name: string;
    baseUrl: string;
    defaultHeaders?: Record<string, string>;
    before?: (config: HttpRequestConfig) => HttpRequestConfig;
    after?: (response: HttpResponse) => HttpResponse;
}
type SendRequestHandler = (apiName: string, path: string, requestInit?: PartialRequestInit) => Promise<HttpResponse>;
type SendRequestUtil = SendRequestHandler & {
    [key in Lowercase<HttpMethod>]: SendRequestHandler;
} & {
    client: HttpClient;
};
declare class HttpClient {
    private apiRegistry;
    private defaultTimeout;
    /**
     * Register an API configuration
     */
    add(apiName: string, config: Omit<ApiRegistry, 'name'>): void;
    /**
     * Get registered API configuration
     */
    getApi(apiName: string): ApiRegistry | undefined;
    /**
     * Main method to send HTTP requests
     */
    sendRequest<T = any>(apiName: string, path: string, method?: HttpMethod, requestInit?: PartialRequestInit): Promise<HttpResponse<T>>;
    /**
     * Make the actual HTTP request using fetch
     */
    private makeRequest;
    /**
     * Update global context with request/response information
     */
    private updateGlobalContext;
}

interface LogicalAndOr {
    and?: Array<MatcherPattern>;
    or?: Array<MatcherPattern>;
    not?: MatcherPattern;
}
interface TextMatchPattern {
    equalTo?: string;
    contains?: string;
    matches?: string;
    doesNotMatch?: string;
}
interface JsonMatchPattern {
    equalToJson?: string | object;
    matchesJsonPath?: string | object;
}
interface XmlMatchPattern {
    equalToXml?: string;
    matchesXPath?: string;
}
interface BinaryMatchPattern {
    binaryEqualTo?: string;
}
interface DateTimePattern {
    before?: string;
    after?: string;
    equalToDateTime?: string;
    truncateExpected?: string;
    applyTruncationLast?: boolean;
}
type MatcherPattern = TextMatchPattern & JsonMatchPattern & XmlMatchPattern & BinaryMatchPattern & DateTimePattern & LogicalAndOr;
interface MultiValuePattern {
    hasExactly?: Array<MatcherPattern>;
    includes?: Array<MatcherPattern>;
}
type HeaderPattern = TextMatchPattern & MultiValuePattern & LogicalAndOr;
type QueryParameterPattern = TextMatchPattern & MultiValuePattern & LogicalAndOr;
type CookiePattern = TextMatchPattern & LogicalAndOr;
interface BasicAuth {
    username: string;
    password: string;
}
interface BodyPattern extends TextMatchPattern, JsonMatchPattern, XmlMatchPattern, BinaryMatchPattern, LogicalAndOr {
    ignoreArrayOrder?: boolean;
    ignoreExtraElements?: boolean;
}
interface MultipartPattern {
    headers?: Record<string, MultiValuePattern>;
    matchingType: 'ALL' | 'ANY';
    bodyPatterns?: BodyPattern[];
}
type UrlMatchKeys = 'url' | 'urlPath' | 'urlPathPattern' | 'urlPattern' | 'urlPathTemplate';
type UrlMatchTypes<T extends UrlMatchKeys = 'url'> = {
    [K in Exclude<UrlMatchKeys, T>]?: never;
} & {
    [K in T]: string;
};
type UrlMatch = UrlMatchTypes<'url'> | UrlMatchTypes<'urlPath'> | UrlMatchTypes<'urlPathPattern'> | UrlMatchTypes<'urlPattern'> | UrlMatchTypes<'urlPathTemplate'>;
type TransformerType = 'response-template' | 'body-transformer' | 'transformer-parameter' | 'spring-transformer' | 'transformer-class';
type FaultType = 'CONNECTION_RESET_BY_PEER' | 'EMPTY_RESPONSE' | 'MALFORMED_RESPONSE_CHUNK' | 'RANDOM_DATA_THEN_CLOSE';
interface DelayDistribution {
    type: 'lognormal' | 'uniform';
    median?: number;
    sigma?: number;
    upper?: number;
    lower?: number;
}
interface ChunkedDribbleDelay {
    numberOfChunks: number;
    totalDuration: number;
}
type ResponseBodyKeys = 'body' | 'base64Body' | 'jsonBody' | 'bodyFileName';
type ResponseBodyTypes<T extends ResponseBodyKeys = 'body', R = string> = {
    [K in Exclude<ResponseBodyKeys, T>]?: never;
} & {
    [K in T]: R;
};
type ResponseBody = ResponseBodyTypes<'body'> | ResponseBodyTypes<'base64Body'> | ResponseBodyTypes<'jsonBody', string | object> | ResponseBodyTypes<'bodyFileName'>;
type ResponseDefinition = ResponseBody & {
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
interface ScenarioState {
    scenarioName?: string;
    requiredScenarioState?: string;
    newScenarioState?: string;
}
interface PostServeAction {
    name: string;
    parameters?: Record<string, any>;
}
interface WireMockStub extends ScenarioState {
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
interface RequestDetail {
    url: string;
    method: string;
    headers: Record<string, string>;
    body?: string;
}
interface WireMockVerification {
    count: number;
    requests: RequestDetail[];
}
interface WireMockRegistry {
    name: string;
    rootPath: string;
}
interface PartialWiremockStub extends Omit<WireMockStub, 'request' | 'response'> {
    request?: Partial<WireMockStub['request']>;
    response: WireMockStub['response'];
}
type StrictStubConfig = {
    [K in keyof WireMockStub]: K extends 'request' | 'response' ? never : any;
};
type FluentStubConfig = PartialWiremockStub | (StrictStubConfig & Record<string, any>) | string;

type StubWrapper = (mockName: string, path: string, config?: FluentStubConfig) => Promise<void>;
/**
 * Provides a fluent interface for building WireMock stubs.
 * The builder is attached to the stub function and can be used to
 * chain methods together to build a stub.
 * @param stubFn - The stub function to build a stub for.
 * @returns The stub builder.
 */
declare class StubBuilder {
    private mockName;
    private config;
    get: StubWrapper;
    post: StubWrapper;
    put: StubWrapper;
    patch: StubWrapper;
    delete: StubWrapper;
    options: StubWrapper;
    any: StubWrapper;
    private stubFn;
    constructor(stubFn: (mockName: string, config: WireMockStub) => Promise<void>);
    get json(): Omit<this, "contentType">;
    get text(): Omit<this, "contentType">;
    get xml(): Omit<this, "contentType">;
    private contentType;
    private method;
    private execute;
}

interface WireMockContext {
    stub?: WireMockStub;
    verification?: WireMockVerification;
    /** Array of stub UUIDs created during this test (for cleanup and filtering) */
    stubs?: string[];
}
interface WireMockUtils {
    stub: ((mockName: string, stubConfig: WireMockStub) => Promise<void>) & StubBuilder;
    verify: (mockName: string, method: string, urlPattern: string) => Promise<WireMockVerification>;
    reset: () => Promise<void>;
    hardReset: () => Promise<void>;
}
type GivenUtils = {
    DB: DbGivenUtils;
    Fake: Extended;
    Mock: Pick<WireMockUtils, 'stub'>;
    setContext: typeof setContext;
};
type WhenUtils = {
    HTTP: SendRequestUtil;
    DB: DbWhenUtils;
};
type ThenUtils = {
    expect: typeof expect;
    DB: DbThenUtils;
    Mock: Pick<WireMockUtils, 'verify'>;
};
type EachUtils = {
    Given: typeof Given;
    Mock: Pick<WireMockUtils, 'reset'>;
    DB: Pick<DbGivenUtils, 'delete'>;
};
type StepUtils = {
    given: GivenUtils;
    when: WhenUtils;
    then: ThenUtils;
};
type Context$1 = {
    [key: string]: any;
    http: HttpContext;
    db: DbContext;
    fake: Context$2;
    mock: WireMockContext;
};

type Tail<T extends any[]> = T extends [any, ...infer U] ? U : never;
/**
 * Preserves T's real return type instead of forcing `void`. Vitest's
 * before/afterEach listeners return `Awaitable<unknown>`, so hardcoding `void`
 * here made async Given/afterEach callbacks trip
 * @typescript-eslint/no-misused-promises for consumers, even though they
 * resolve correctly at runtime.
 */
type PlusUtils<T extends (...args: any[]) => any> = (...args: [Parameters<T>[0], EachUtils, ...Tail<Parameters<T>>]) => ReturnType<T>;
declare const contextualBeforeEach: (args_0: PlusUtils<_vitest_runner.BeforeEachListener<Context$1>>, timeout?: number | undefined) => void;
declare const contextualAfterEach: (args_0: PlusUtils<_vitest_runner.AfterEachListener<Context$1>>, timeout?: number | undefined) => void;
type FeatureUtils = {
    beforeEach: typeof contextualBeforeEach;
    afterEach: typeof contextualAfterEach;
    beforeAll: typeof beforeAll;
    afterAll: typeof afterAll;
    DB: DbFeatureUtils;
};
type FeatureFn = {
    (name: string, fn: (params: FeatureUtils) => void): void;
    only: (name: string, fn: (params: FeatureUtils) => void) => void;
    skip: (name: string, fn: (params: FeatureUtils) => void) => void;
    todo: (name: string) => void;
};
declare const feature: FeatureFn;

declare const scenarioUtils: {
    setContext: typeof setContext;
};
declare function scenario(name: string, define: (utils: typeof scenarioUtils) => void): void;
declare namespace scenario {
    var skip: (name: string, define: (utils: typeof scenarioUtils) => void) => void;
    var only: (name: string, define: (utils: typeof scenarioUtils) => void) => void;
}

/**
 * Generic SQL client that implements the DBClient interface
 * This provides SQL-specific logic that can be extended by database-specific clients
 */
declare abstract class SqlClient implements DBClient {
    abstract exec(statement: string, params?: unknown[]): Promise<any[]>;
    abstract close(): Promise<void>;
    /**
     * Select records from a table
     */
    select(table: string, where?: Record<string, any>): Promise<any[]>;
    /**
     * Insert records into a table
     */
    insert(table: string, data: Record<string, any>): Promise<any[]>;
    /**
     * Update records in a table
     */
    update(table: string, data: Record<string, any>, where: Record<string, any>): Promise<any[]>;
    /**
     * Delete records from a table
     */
    delete(table: string, where: Record<string, any>): Promise<any[]>;
    /**
     * Transform database results to camelCase keys
     */
    protected transformResult(result: any[]): any[];
}

/**
 * PostgreSQL-specific client that extends the generic SQL client
 */
declare class PgClient extends SqlClient {
    private client;
    constructor(config: ClientConfig);
    /**
     * Connect to the PostgreSQL database
     */
    connect(): Promise<void>;
    /**
     * Execute a SQL statement with parameters
     */
    exec(statement: string, params?: unknown[]): Promise<any[]>;
    /**
     * Close the database connection
     */
    close(): Promise<void>;
    /**
     * Get the underlying PostgreSQL client for advanced operations
     */
    getClient(): Client;
}

/**
 * DynamoDB client that implements the DBClient interface
 * Maps SQL-like operations to DynamoDB operations
 */
declare class DynamoClient implements DBClient {
    private client;
    private tableName;
    constructor(config: DynamoDBClientConfig, tableName: string);
    /**
     * Select records from a table (maps to Scan or Query)
     */
    select(table: string, where?: Record<string, any>): Promise<any[]>;
    /**
     * Insert records into a table (maps to Put)
     */
    insert(table: string, data: Record<string, any>): Promise<any[]>;
    /**
     * Update records in a table (maps to Update)
     */
    update(table: string, data: Record<string, any>, where: Record<string, any>): Promise<any[]>;
    /**
     * Delete records from a table (maps to Delete)
     */
    delete(table: string, where: Record<string, any>): Promise<any[]>;
    /**
     * Execute a custom DynamoDB operation
     */
    exec(...args: any[]): Promise<any>;
    /**
     * Close the DynamoDB client
     */
    close(): Promise<void>;
    /**
     * Build DynamoDB update expression
     */
    private buildUpdateExpression;
    /**
     * Build DynamoDB key condition expression
     */
    private buildKeyConditionExpression;
    /**
     * Build DynamoDB expression attribute values
     */
    private buildExpressionAttributeValues;
}

/**
 * Function signature for BDD step definitions.
 * @template T - The utilities available in this step type (GivenUtils, WhenUtils, or ThenUtils)
 * @template C - The context type, defaults to the standard Context
 * @param ctx - Read-only access to the test context for retrieving values set in previous steps
 * @param utils - Utilities available for this step type, plus setContext for storing values
 */
type StepFn<T, C = Context$1> = (
  ctx: DeepReadonly<C>,
  utils: T & { setContext: (key: string, value: any) => void },
) => Promise<void> | void;

declare global {
  /**
   * Defines a "Given" step for setting up preconditions.
   * Use for: database seeding, mock configuration, test data generation.
   *
   * @example
   * Given('a user exists in the database', async (ctx, { DB, Fake }) => {
   *   await DB.insert('default', 'users', { email: Fake.data('email') });
   * });
   *
   * @param description - Human-readable description of the precondition
   * @param fn - Step function with access to DB, Fake, Mock.stub, and setContext
   */
  function Given(description: string, fn: StepFn<StepUtils['given']>): void;
  /** @see Given - Overload without description for inline/anonymous steps */
  function Given(fn: StepFn<StepUtils['given']>): void;

  /**
   * Defines a "When" step for executing the action under test.
   * Use for: HTTP requests, triggering operations, user actions.
   *
   * @example
   * When('the user submits a login request', async (ctx, { HTTP }) => {
   *   await HTTP.post('core', '/api/auth/login', { body: { email: ctx.email } });
   * });
   *
   * @param description - Human-readable description of the action
   * @param fn - Step function with access to HTTP and DB utilities
   */
  function When(description: string, fn: StepFn<StepUtils['when']>): void;
  /** @see When - Overload without description for inline/anonymous steps */
  function When(fn: StepFn<StepUtils['when']>): void;

  /**
   * Defines a "Then" step for verifying outcomes and assertions.
   * Use for: response validation, database state checks, mock verification.
   *
   * @example
   * Then('the response should be successful', async (ctx, { expect }) => {
   *   expect(ctx.http.status).toBe(200);
   * });
   *
   * @param description - Human-readable description of the expected outcome
   * @param fn - Step function with access to expect, DB assertions, and Mock.verify
   */
  function Then(description: string, fn: StepFn<StepUtils['then']>): void;
  /** @see Then - Overload without description for inline/anonymous steps */
  function Then(fn: StepFn<StepUtils['then']>): void;

  /**
   * Defines a feature (test suite) containing related scenarios.
   * Provides access to lifecycle hooks and DB utilities for setting table defaults.
   *
   * @param name - Feature name (becomes the test suite description)
   * @param fn - Function receiving { beforeAll, beforeEach, afterEach, afterAll, DB }
   *
   * @example
   * Feature('User Authentication', ({ beforeEach, afterEach, DB }) => {
   *   // Set default values for table inserts (merged with explicit values)
   *   DB.setDefaults('default', 'users', ({ fake }) => ({
   *     email: fake.userEmail,
   *     role: 'user',
   *   }));
   *
   *   beforeEach(async (ctx, { Given }) => { ... });
   *   afterEach(async (ctx, { DB, Mock }) => { ... });
   *
   *   Scenario('User logs in', () => { ... });
   * });
   */
  const Feature: typeof feature;

  /**
   * Defines a scenario (test case) within a feature.
   * Contains Given/When/Then steps that describe a specific behavior.
   *
   * @example
   * Scenario('User logs in with valid credentials', () => {
   *   Given('a user exists', ...);
   *   When('they submit login credentials', ...);
   *   Then('they receive an auth token', ...);
   * });
   */
  const Scenario: typeof scenario;

  namespace NodeJS {
    interface ProcessEnv {
      [key: string]: string | undefined;
      /** Base URL for the application under test (e.g., http://localhost:4000) */
      APP__BASE_URL: string;
    }
  }
}

/**
 * Database namespace for global configuration.
 * Used in setup files to configure database connections.
 */
interface DBNameSpace {
  /** PostgreSQL client class for creating database connections */
  PgClient: typeof PgClient;
  /** DynamoDB client class for creating database connections */
  DynamoClient: typeof DynamoClient;
  /**
   * Registers a named database connection.
   * @example
   * DB.add('default', {
   *   connect: async () => new DB.PgClient({ host: 'localhost', ... })
   * });
   */
  add: DbClientRegistry['add'];
}

/**
 * HTTP namespace for global configuration.
 * Used in setup files to configure HTTP clients for different services.
 */
interface HttpNameSpace {
  /**
   * Registers a named HTTP client with a base URL.
   * @example
   * HTTP.add('core', { baseUrl: 'http://localhost:4000' });
   */
  add: HttpClient['add'];
}

/**
 * WireMock namespace for global mock server configuration.
 * Used in setup files to configure mock endpoints for external services.
 */
interface WireMockNameSpace {
  /**
   * Configures the WireMock server connection.
   * @param config.baseUrl - WireMock admin API URL (e.g., http://wiremock:8080)
   * @param config.apiToken - Optional authentication token for cloud-hosted WireMock
   * @example
   * WireMock.configure({ baseUrl: process.env.MOCK__BASE_URL });
   */
  configure: (config: { baseUrl: string; apiToken?: string }) => void;

  /**
   * Registers a named mock service with an optional root path prefix.
   * @param mockName - Identifier used in Mock.stub() and Mock.verify() calls
   * @param config.rootPath - URL prefix for all stubs (e.g., 'postmark' → '/postmark/...')
   * @example
   * WireMock.add('postmark', { rootPath: 'postmark' });
   * // Stubs will be created at /postmark/email, etc.
   */
  add: (mockName: string, config: Omit<WireMockRegistry, 'name'>) => void;

  /**
   * Performs a full reset of the WireMock server.
   * Removes ALL stubs and clears the request journal.
   * ⚠️ Use with caution in shared environments - prefer Mock.reset() in tests.
   */
  hardReset: () => Promise<void>;
}

declare const UTILS: readonly ["*", "postgres", "dynamo", "http", "expect", "wiremock"];
type Utils = (typeof UTILS)[number];
declare const DB: DBNameSpace;
declare const HTTP: HttpNameSpace;
declare const WireMock: WireMockNameSpace;
declare function useUtils(...utils: Utils[]): Promise<void>;
declare namespace useUtils {
    var filter: (filter: (util: Utils) => boolean) => Promise<void>;
}

export { DB, fakish_util as Fakish, HTTP, WireMock, useUtils };
