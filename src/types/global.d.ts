import type { StepUtils, Context } from './step-utils.types';
import type { feature } from '../feature';
import type { scenario } from '../scenario';
import type { PgClient } from '../utils/db/pg.client';
import type { DynamoClient } from '../utils/db/dynamo.client';
import type { DbClientRegistry } from '../utils/db/db.client';
import type { HttpClient } from '../utils/http.client';
import type { WireMockRegistry } from '../utils/wiremock';
import './index.d';

/**
 * Function signature for BDD step definitions.
 * @template T - The utilities available in this step type (GivenUtils, WhenUtils, or ThenUtils)
 * @template C - The context type, defaults to the standard Context
 * @param ctx - Read-only access to the test context for retrieving values set in previous steps
 * @param utils - Utilities available for this step type, plus setContext for storing values
 */
type StepFn<T, C = Context> = (
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

export { DBNameSpace, HttpNameSpace, WireMockNameSpace };
