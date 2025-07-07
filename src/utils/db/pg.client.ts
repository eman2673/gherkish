import './db.client';
import { Client, ClientConfig } from 'pg';
import { SqlClient } from './sql.client';
import type { DBNameSpace } from '../../types/global';

/**
 * PostgreSQL-specific client that extends the generic SQL client
 */
export class PgClient extends SqlClient {
  private client: Client;

  constructor(config: ClientConfig) {
    super();
    this.client = new Client(config);
  }

  /**
   * Connect to the PostgreSQL database
   */
  async connect(): Promise<void> {
    await this.client.connect();
  }

  /**
   * Execute a SQL statement with parameters
   */
  async exec(statement: string, params?: unknown[]): Promise<any[]> {
    const result = await this.client.query(statement, params);
    return result.rows;
  }

  /**
   * Close the database connection
   */
  async close(): Promise<void> {
    await this.client.end();
  }

  /**
   * Get the underlying PostgreSQL client for advanced operations
   */
  getClient(): Client {
    return this.client;
  }
}

export default (context: DBNameSpace) => {
  context.PgClient = PgClient;
};
