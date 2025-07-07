import { snakeCase, camelCase } from 'change-case';
import { DBClient } from './db.types';

/**
 * Split a record into keys, binds (placeholders), and params
 * @param obj - The record to split
 * @param offset - The offset to use for the binds
 * @returns The split record
 */
function splitRecord(obj: Record<string, unknown> = {}, offset = 0) {
  let size = 0;
  const keys: string[] = [];
  const binds: string[] = [];
  const params: unknown[] = [];
  Object.entries(obj).forEach(([k, v], idx) => {
    keys.push(snakeCase(k));
    binds.push(`$${idx + 1 + offset}`);
    params.push(v);
    size++;
  });

  return { keys, binds, params, size };
}

/**
 * Split a record into keys, binds (placeholders), and params for WHERE clauses
 * @param obj - The record to split
 * @param offset - The offset to use for the binds
 * @returns The split record with WHERE clause
 */
function splitForWhere(obj?: Record<string, unknown>, offset = 0) {
  const md = splitRecord(obj, offset);
  return {
    ...md,
    where: !md.size ? '' : `where ${md.keys.map((k, i) => `${k} = ${md.binds[i]}`).join(' and ')}`,
  };
}

/**
 * Generic SQL client that implements the DBClient interface
 * This provides SQL-specific logic that can be extended by database-specific clients
 */
export abstract class SqlClient implements DBClient {
  public abstract exec(statement: string, params?: unknown[]): Promise<any[]>;
  public abstract close(): Promise<void>;

  /**
   * Select records from a table
   */
  async select(table: string, where?: Record<string, any>): Promise<any[]> {
    const md = splitForWhere(where);
    const statement = `select * from ${table} ${md.where}`;
    const result = await this.exec(statement, md.params);
    return this.transformResult(result);
  }

  /**
   * Insert records into a table
   */
  async insert(table: string, data: Record<string, any>): Promise<any[]> {
    const md = splitRecord(data);
    const statement = `insert into ${snakeCase(table)}(${md.keys.join(', ')}) values(${md.binds.join(', ')}) returning *`;
    const result = await this.exec(statement, md.params);
    return this.transformResult(result);
  }

  /**
   * Update records in a table
   */
  async update(
    table: string,
    data: Record<string, any>,
    where: Record<string, any>
  ): Promise<any[]> {
    const set = splitRecord(data);
    const md = splitForWhere(where, set.size);
    const statement = `update ${table} set ${set.keys.map((k, i) => `${k} = ${set.binds[i]}`).join(', ')} ${md.where} returning *`;
    const result = await this.exec(statement, set.params.concat(md.params));
    return this.transformResult(result);
  }

  /**
   * Delete records from a table
   */
  async delete(table: string, where: Record<string, any>): Promise<any[]> {
    const md = splitForWhere(where);
    const statement = `delete from ${table} ${md.where} returning *`;
    const result = await this.exec(statement, md.params);
    return this.transformResult(result);
  }

  /**
   * Transform database results to camelCase keys
   */
  protected transformResult(result: any[]): any[] {
    return result.map(r =>
      Object.fromEntries(Object.entries(r).map(([k, v]) => [camelCase(k), v]))
    );
  }
}
