import { pascalCase } from 'change-case';
import { Assertion, expect } from 'vitest';

import { registerEachUtils, registerFeatureUtils } from '../../feature';
import { registerStepUtils } from '../../step-types';
import type { DBNameSpace } from '../../types/global';
import { useCtx } from '../context';
import { DBClient, DbRequestConfig, DbResponse } from './db.types';

type DefaultBuilder = (context: Context) => Record<string, any>;
type DBDefaults = Record<string, DefaultBuilder>;

export interface DBRegistration<T = any> {
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

export type SendDbRequestHandler = (
  dbName: string,
  table: string,
  operation: 'select' | 'insert' | 'update' | 'delete',
  requestInit?: Partial<Omit<DbRequestConfig, 'table' | 'operation'>>,
) => Promise<DbResponse>;

export type SendDbRequestUtil = SendDbRequestHandler & {
  client: DbClientRegistry;
  exec: (dbName: string, statement: string, params?: unknown[]) => Promise<any[]>;
};

// Step-specific database utilities
export interface DbGivenUtils extends SendDbRequestUtil {
  insert: (dbName: string, table: string, ...records: Record<string, any>[]) => Promise<any[]>;
  update: (
    dbName: string,
    table: string,
    data: Record<string, any>,
    where: Record<string, any>,
  ) => Promise<any[]>;
  delete: (dbName: string, table: string, where: Record<string, any>) => Promise<any[]>;
}

export type DbWhenUtils = SendDbRequestUtil;

export interface DbThenUtils extends SendDbRequestUtil {
  /**
   * Looks up a record in the database and returns an assertion resulting from expect(executedQuery).resolves
   * Stores the query results in the global context as db.[table].reads to allow multiple assertions
   * on the same results.
   * @example
   * await DB.expect('default', 'donor_profiles', { clientId }).resolves.toEqual(...)
   * expect(db.DonorProfiles?.reads[0]).toEqual(...)
   */
  expect: (
    dbName: string,
    table: string,
    where: Record<string, any>,
  ) => Assertion<() => Promise<any[]>>['resolves'];
}

export interface DbFeatureUtils {
  setDefaults: (dbName: string, table: string, defaults: DefaultBuilder) => void;
  clearDefaults: (dbName: string) => void;
}

export class DbClientRegistry {
  private dbRegistry = new Map<string, DBRegistration>();
  private clients = new Map<string, DBClient>();
  private defaults = new Map<string, DBDefaults>();

  /**
   * Register a database configuration
   */
  add(dbName: string, config: Omit<DBRegistration, 'name'>): void {
    this.dbRegistry.set(dbName, { name: dbName, ...config });
  }

  /**
   * Get registered database configuration
   */
  getDb(dbName: string): DBRegistration | undefined {
    return this.dbRegistry.get(dbName);
  }

  /**
   * Get or create a database client
   */
  private async getClient<T>(dbName: string): Promise<DBClient<T>> {
    if (this.clients.has(dbName)) {
      return this.clients.get(dbName)!;
    }

    const db = this.dbRegistry.get(dbName);
    if (!db) {
      throw new Error(`Database '${dbName}' not registered`);
    }

    const client = await db.connect();
    // Run one-time setup before caching so a failed hook doesn't leave a
    // half-initialized client registered for the rest of the run.
    await db.onConnect?.(client);
    this.clients.set(dbName, client);
    return client;
  }

  /**
   * Set default values for a table. Function is used to allow for dynamic default values based on the context.
   */
  setDefaultValues(
    dbName: string,
    table: string,
    defaultValues: (context: Context) => Record<string, any>,
  ): void {
    const defaults = this.defaults.get(dbName) ?? {};
    defaults[pascalCase(table)] = defaultValues;
    this.defaults.set(dbName, defaults);
  }

  /**
   * Clear all defaults for a database
   */
  clearDefaults(dbName: string): void {
    this.defaults.delete(dbName);
  }

  /**
   * Apply defaults to a record
   */
  private applyDefaults(
    dbName: string,
    table: string,
    record: Record<string, any>,
  ): Record<string, any> {
    const defaults = this.defaults.get(dbName) ?? {};
    const defaultValues = defaults[pascalCase(table)];
    return defaultValues ? { ...defaultValues(useCtx()), ...record } : record;
  }

  /**
   * Execute a SQL statement
   */
  async exec<T>(dbName: string, ...args: Parameters<DBClient<T>['exec']>): Promise<any[]> {
    const client = await this.getClient<T>(dbName);
    return await client.exec(...args);
  }

  /**
   * Main method to send database requests
   */
  async sendRequest<T = any>(
    dbName: string,
    table: string,
    operation: 'select' | 'insert' | 'update' | 'delete',
    requestInit: Partial<Omit<DbRequestConfig, 'table' | 'operation'>> = {},
  ): Promise<DbResponse<T>> {
    const db = this.dbRegistry.get(dbName);
    if (!db) {
      throw new Error(`Database '${dbName}' not registered`);
    }

    const { where, data, ...request } = requestInit;

    let config: DbRequestConfig = {
      table,
      operation,
      where,
      data,
      ...request,
    };

    // Apply before hook if exists
    config = db.before?.(config) ?? config;

    this.updateGlobalContext(config);

    // Execute the operation
    let result: any[];
    let rowCount = 0;

    const client = await this.getClient(dbName);
    if (operation === 'insert') {
      config.data = this.applyDefaults(dbName, table, data!);
    }

    console.log(
      'DB request: ',
      dbName,
      JSON.stringify({ table, operation, config: { ...requestInit, data: config.data } }, null, 2),
    );

    switch (operation) {
      case 'select':
        result = await client.select(table, where!);
        rowCount = result.length;
        break;
      case 'insert':
        result = await client.insert(table, config.data!);
        rowCount = result.length;
        break;
      case 'update':
        result = await client.update(table, data!, where!);
        rowCount = result.length;
        break;
      case 'delete':
        result = await client.delete(table, where!);
        rowCount = result.length;
        break;
      default:
        throw new Error(`Unsupported operation: ${operation}`);
    }

    console.log('DB response: ', dbName, JSON.stringify({ result, rowCount }, null, 2));

    const response: DbResponse<T> = {
      data: result as T[],
      rowCount,
      config,
    };

    this.updateGlobalContext(config, response);

    // Apply after hook if exists
    const finalResponse = db.after?.(response) ?? response;

    // Update global context
    this.updateGlobalContext(
      config,
      finalResponse,
      response.data.length > 1 ? response.data : response.data[0],
    );

    return finalResponse;
  }

  /**
   * Update global context with database request/response information
   */
  private updateGlobalContext(request: DbRequestConfig, response?: DbResponse, data?: any): void {
    try {
      const ctx = useCtx();
      ctx.db = ctx.db ?? {};
      const { db } = ctx;
      Object.assign(db, {
        request,
        response,
        responseObject: data,
      });

      if (data) {
        const { table, operation } = request;
        const tableKey = pascalCase(table);
        db[tableKey] = db[tableKey] ?? {};
        db[tableKey].reads = db[tableKey].reads ?? [];
        db[tableKey].writes = db[tableKey].writes ?? [];
        db[tableKey][operation === 'select' ? 'reads' : 'writes'].push(data);
      }
    } catch {}
  }

  /**
   * Close all database connections
   */
  async close(): Promise<void> {
    await Promise.all(Array.from(this.clients.values()).map((client) => client.close()));
    this.clients.clear();
  }
}

// Database utilities factory
function createDbUtils(
  dbClient: DbClientRegistry,
): DbGivenUtils & DbWhenUtils & DbThenUtils & DbFeatureUtils {
  const sendDbRequest = (
    dbName: string,
    table: string,
    operation: 'select' | 'insert' | 'update' | 'delete',
    requestInit?: Partial<Omit<DbRequestConfig, 'table' | 'operation'>>,
  ) => dbClient.sendRequest(dbName, table, operation, requestInit);

  return Object.assign(sendDbRequest, {
    client: dbClient,
    exec: dbClient.exec.bind(dbClient),

    // Given utilities
    insert: async (dbName: string, table: string, ...records: Record<string, any>[]) => {
      const results = await Promise.all(
        records.map((record) => dbClient.sendRequest(dbName, table, 'insert', { data: record })),
      );
      return results.flatMap((response: any) => response.data);
    },
    update: async (
      dbName: string,
      table: string,
      data: Record<string, any>,
      where: Record<string, any>,
    ) => {
      const response = await dbClient.sendRequest(dbName, table, 'update', { data, where });
      return response.data;
    },
    delete: async (dbName: string, table: string, where: Record<string, any>) => {
      const response = await dbClient.sendRequest(dbName, table, 'delete', { where });
      return response.data;
    },

    // Then utilities
    expect: (dbName: string, table: string, where: Record<string, any>) => {
      const records = dbClient.sendRequest(dbName, table, 'select', { where });
      return expect(records.then((res) => res.data)).resolves;
    },

    // Feature-level utilities
    setDefaults: (
      dbName: string,
      table: string,
      defaults: (context: Context) => Record<string, any>,
    ) => {
      dbClient.setDefaultValues(dbName, table, defaults);
    },
    clearDefaults: (dbName: string) => {
      dbClient.clearDefaults(dbName);
    },
  });
}

let isRegistered = false;
export default (context: DBNameSpace) => {
  if (isRegistered) return;
  isRegistered = true;

  const util = createDbUtils(new DbClientRegistry());
  registerStepUtils({ given: { DB: util }, then: { DB: util } });
  registerEachUtils({ DB: util });
  registerFeatureUtils({ DB: util });
  context.add = util.client.add.bind(util.client);
};
