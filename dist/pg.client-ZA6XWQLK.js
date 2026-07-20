import {
  db_client_default
} from "./chunk-E5YT573H.js";
import "./chunk-EBYPHWYD.js";
import "./chunk-BUSTDPMG.js";

// src/utils/db/pg.client.ts
import { Client } from "pg";

// src/utils/db/sql.client.ts
import { snakeCase, camelCase } from "change-case";
function splitRecord(obj = {}, offset = 0) {
  let size = 0;
  const keys = [];
  const binds = [];
  const params = [];
  Object.entries(obj).forEach(([k, v], idx) => {
    keys.push(snakeCase(k));
    binds.push(`$${idx + 1 + offset}`);
    params.push(v);
    size++;
  });
  return { keys, binds, params, size };
}
function splitForWhere(obj, offset = 0) {
  const md = splitRecord(obj, offset);
  return {
    ...md,
    where: !md.size ? "" : `where ${md.keys.map((k, i) => `${k} = ${md.binds[i]}`).join(" and ")}`
  };
}
var SqlClient = class {
  /**
   * Select records from a table
   */
  async select(table, where) {
    const md = splitForWhere(where);
    const statement = `select * from ${snakeCase(table)} ${md.where}`;
    const result = await this.exec(statement, md.params);
    return this.transformResult(result);
  }
  /**
   * Insert records into a table
   */
  async insert(table, data) {
    const md = splitRecord(data);
    const statement = `insert into ${snakeCase(table)}(${md.keys.join(", ")}) values(${md.binds.join(", ")}) returning *`;
    const result = await this.exec(statement, md.params);
    return this.transformResult(result);
  }
  /**
   * Update records in a table
   */
  async update(table, data, where) {
    const set = splitRecord(data);
    const md = splitForWhere(where, set.size);
    const statement = `update ${snakeCase(table)} set ${set.keys.map((k, i) => `${k} = ${set.binds[i]}`).join(", ")} ${md.where} returning *`;
    const result = await this.exec(statement, set.params.concat(md.params));
    return this.transformResult(result);
  }
  /**
   * Delete records from a table
   */
  async delete(table, where) {
    const md = splitForWhere(where);
    const statement = `delete from ${snakeCase(table)} ${md.where} returning *`;
    const result = await this.exec(statement, md.params);
    return this.transformResult(result);
  }
  /**
   * Transform database results to camelCase keys
   */
  transformResult(result) {
    return result.map(
      (r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [camelCase(k), v]))
    );
  }
};

// src/utils/db/pg.client.ts
var PgClient = class extends SqlClient {
  client;
  constructor(config) {
    super();
    this.client = new Client(config);
  }
  /**
   * Connect to the PostgreSQL database
   */
  async connect() {
    await this.client.connect();
  }
  /**
   * Execute a SQL statement with parameters
   */
  async exec(statement, params) {
    const result = await this.client.query(statement, params);
    return result.rows;
  }
  /**
   * Close the database connection
   */
  async close() {
    await this.client.end();
  }
  /**
   * Get the underlying PostgreSQL client for advanced operations
   */
  getClient() {
    return this.client;
  }
};
var pg_client_default = (context) => {
  db_client_default(context);
  context.PgClient = PgClient;
};
export {
  PgClient,
  pg_client_default as default
};
//# sourceMappingURL=pg.client-ZA6XWQLK.js.map