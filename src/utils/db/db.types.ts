export interface DbRequestConfig {
  table: string;
  operation: 'select' | 'insert' | 'update' | 'delete';
  where?: Record<string, any>;
  data?: Record<string, any>;
}

export interface DbResponse<T = any> {
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
export type DbContext = DbContextResponse & Record<string, DBResponseHistory>;

export interface DBClient<T = any> {
  insert: (table: string, data: Record<string, any>) => Promise<any[]>;
  update: (table: string, data: Record<string, any>, where: Record<string, any>) => Promise<any[]>;
  delete: (table: string, where: Record<string, any>) => Promise<any[]>;
  select: (table: string, where: Record<string, any>) => Promise<any[]>;
  exec: (...args: any[]) => Promise<any>;
  close: () => Promise<void>;
}
