import {
  registerEachUtils,
  registerFeatureUtils
} from "./chunk-KJCU2WBQ.js";
import {
  registerStepUtils,
  useCtx
} from "./chunk-BUSTDPMG.js";

// src/utils/db/db.client.ts
import { pascalCase } from "change-case";
import { expect } from "vitest";
var DbClientRegistry = class {
  dbRegistry = /* @__PURE__ */ new Map();
  clients = /* @__PURE__ */ new Map();
  defaults = /* @__PURE__ */ new Map();
  /**
   * Register a database configuration
   */
  add(dbName, config) {
    this.dbRegistry.set(dbName, { name: dbName, ...config });
  }
  /**
   * Get registered database configuration
   */
  getDb(dbName) {
    return this.dbRegistry.get(dbName);
  }
  /**
   * Get or create a database client
   */
  async getClient(dbName) {
    if (this.clients.has(dbName)) {
      return this.clients.get(dbName);
    }
    const db = this.dbRegistry.get(dbName);
    if (!db) {
      throw new Error(`Database '${dbName}' not registered`);
    }
    const client = await db.connect();
    await db.onConnect?.(client);
    this.clients.set(dbName, client);
    return client;
  }
  /**
   * Set default values for a table. Function is used to allow for dynamic default values based on the context.
   */
  setDefaultValues(dbName, table, defaultValues) {
    const defaults = this.defaults.get(dbName) ?? {};
    defaults[pascalCase(table)] = defaultValues;
    this.defaults.set(dbName, defaults);
  }
  /**
   * Clear all defaults for a database
   */
  clearDefaults(dbName) {
    this.defaults.delete(dbName);
  }
  /**
   * Apply defaults to a record
   */
  applyDefaults(dbName, table, record) {
    const defaults = this.defaults.get(dbName) ?? {};
    const defaultValues = defaults[pascalCase(table)];
    return defaultValues ? { ...defaultValues(useCtx()), ...record } : record;
  }
  /**
   * Execute a SQL statement
   */
  async exec(dbName, ...args) {
    const client = await this.getClient(dbName);
    return await client.exec(...args);
  }
  /**
   * Main method to send database requests
   */
  async sendRequest(dbName, table, operation, requestInit = {}) {
    const db = this.dbRegistry.get(dbName);
    if (!db) {
      throw new Error(`Database '${dbName}' not registered`);
    }
    const { where, data, ...request } = requestInit;
    let config = {
      table,
      operation,
      where,
      data,
      ...request
    };
    config = db.before?.(config) ?? config;
    this.updateGlobalContext(config);
    let result;
    let rowCount = 0;
    const client = await this.getClient(dbName);
    if (operation === "insert") {
      config.data = this.applyDefaults(dbName, table, data);
    }
    console.log(
      "DB request: ",
      dbName,
      JSON.stringify({ table, operation, config: { ...requestInit, data: config.data } }, null, 2)
    );
    switch (operation) {
      case "select":
        result = await client.select(table, where);
        rowCount = result.length;
        break;
      case "insert":
        result = await client.insert(table, config.data);
        rowCount = result.length;
        break;
      case "update":
        result = await client.update(table, data, where);
        rowCount = result.length;
        break;
      case "delete":
        result = await client.delete(table, where);
        rowCount = result.length;
        break;
      default:
        throw new Error(`Unsupported operation: ${operation}`);
    }
    console.log("DB response: ", dbName, JSON.stringify({ result, rowCount }, null, 2));
    const response = {
      data: result,
      rowCount,
      config
    };
    this.updateGlobalContext(config, response);
    const finalResponse = db.after?.(response) ?? response;
    this.updateGlobalContext(
      config,
      finalResponse,
      response.data.length > 1 ? response.data : response.data[0]
    );
    return finalResponse;
  }
  /**
   * Update global context with database request/response information
   */
  updateGlobalContext(request, response, data) {
    try {
      const ctx = useCtx();
      ctx.db = ctx.db ?? {};
      const { db } = ctx;
      Object.assign(db, {
        request,
        response,
        responseObject: data
      });
      if (data) {
        const { table, operation } = request;
        const tableKey = pascalCase(table);
        db[tableKey] = db[tableKey] ?? {};
        db[tableKey].reads = db[tableKey].reads ?? [];
        db[tableKey].writes = db[tableKey].writes ?? [];
        db[tableKey][operation === "select" ? "reads" : "writes"].push(data);
      }
    } catch {
    }
  }
  /**
   * Close all database connections
   */
  async close() {
    await Promise.all(Array.from(this.clients.values()).map((client) => client.close()));
    this.clients.clear();
  }
};
function createDbUtils(dbClient) {
  const sendDbRequest = (dbName, table, operation, requestInit) => dbClient.sendRequest(dbName, table, operation, requestInit);
  return Object.assign(sendDbRequest, {
    client: dbClient,
    exec: dbClient.exec.bind(dbClient),
    // Given utilities
    insert: async (dbName, table, ...records) => {
      const results = await Promise.all(
        records.map((record) => dbClient.sendRequest(dbName, table, "insert", { data: record }))
      );
      return results.flatMap((response) => response.data);
    },
    update: async (dbName, table, data, where) => {
      const response = await dbClient.sendRequest(dbName, table, "update", { data, where });
      return response.data;
    },
    delete: async (dbName, table, where) => {
      const response = await dbClient.sendRequest(dbName, table, "delete", { where });
      return response.data;
    },
    // Then utilities
    expect: (dbName, table, where) => {
      const records = dbClient.sendRequest(dbName, table, "select", { where });
      return expect(records.then((res) => res.data)).resolves;
    },
    // Feature-level utilities
    setDefaults: (dbName, table, defaults) => {
      dbClient.setDefaultValues(dbName, table, defaults);
    },
    clearDefaults: (dbName) => {
      dbClient.clearDefaults(dbName);
    }
  });
}
var isRegistered = false;
var db_client_default = (context) => {
  if (isRegistered) return;
  isRegistered = true;
  const util = createDbUtils(new DbClientRegistry());
  registerStepUtils({ given: { DB: util }, then: { DB: util } });
  registerEachUtils({ DB: util });
  registerFeatureUtils({ DB: util });
  context.add = util.client.add.bind(util.client);
};

export {
  db_client_default
};
//# sourceMappingURL=chunk-VPMDCXUE.js.map