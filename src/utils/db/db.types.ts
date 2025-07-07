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

export type DbContext = DbResponse & Record<string, DBResponseHistory>;

export interface DBClient<T = any> {
  insert: (table: string, data: Record<string, any>) => Promise<any[]>;
  update: (table: string, data: Record<string, any>, where: Record<string, any>) => Promise<any[]>;
  delete: (table: string, where: Record<string, any>) => Promise<any[]>;
  select: (table: string, where: Record<string, any>) => Promise<any[]>;
  exec: (...args: any[]) => Promise<any>;
  close: () => Promise<void>;
}
