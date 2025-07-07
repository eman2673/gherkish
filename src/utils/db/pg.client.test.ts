import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Client } from 'pg';
import { DbClient, createDbUtils } from './db.client';
import type { PgRegistry, DbResponse } from './db.client';
import { runWithContext } from '../../test-utils';

// Import test-utils to ensure context mock is set up
import '../../test-utils';

// Mock pg Client
vi.mock('pg', () => ({
  Client: vi.fn(),
}));

const MockClient = vi.mocked(Client);

describe('DbClient', () => {
  let dbClient: DbClient;
  let mockPgClient: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock PostgreSQL client
    mockPgClient = {
      connect: vi.fn().mockResolvedValue(undefined),
      query: vi.fn().mockResolvedValue({ rows: [] }),
      end: vi.fn().mockResolvedValue(undefined),
    };
    MockClient.mockImplementation(() => mockPgClient);

    dbClient = new DbClient();
  });

  afterEach(async () => {
    await dbClient.close();
  });

  describe('registerDb', () => {
    it('should register a database configuration', () => {
      const config: Omit<PgRegistry, 'name'> = {
        connection: {
          host: 'localhost',
          port: 5432,
          database: 'test',
          user: 'test',
          password: 'test',
        },
      };

      dbClient.registerDb('test-db', config);
      const registered = dbClient.getDb('test-db');

      expect(registered).toEqual({
        name: 'test-db',
        ...config,
      });
    });

    it('should overwrite existing database configuration', () => {
      const config1 = {
        connection: {
          host: 'localhost',
          port: 5432,
          database: 'test1',
          user: 'test',
          password: 'test',
        },
      };
      const config2 = {
        connection: {
          host: 'localhost',
          port: 5432,
          database: 'test2',
          user: 'test',
          password: 'test',
        },
      };

      dbClient.registerDb('test-db', config1);
      dbClient.registerDb('test-db', config2);

      const registered = dbClient.getDb('test-db');
      expect(registered?.connection.database).toBe('test2');
    });
  });

  describe('getClient', () => {
    it('should create and cache a client for a registered database', async () => {
      const config = {
        connection: {
          host: 'localhost',
          port: 5432,
          database: 'test',
          user: 'test',
          password: 'test',
        },
      };

      dbClient.registerDb('test-db', config);

      const client1 = await (dbClient as any).getClient('test-db');
      const client2 = await (dbClient as any).getClient('test-db');

      expect(MockClient).toHaveBeenCalledTimes(1);
      expect(mockPgClient.connect).toHaveBeenCalledTimes(1);
      expect(client1).toBe(client2);
    });

    it('should throw error for unregistered database', async () => {
      await expect((dbClient as any).getClient('unregistered')).rejects.toThrow(
        "Database 'unregistered' not registered"
      );
    });
  });

  describe('exec', () => {
    it('should execute a SQL statement', async () => {
      const mockRows = [{ id: 1, name: 'test' }];
      mockPgClient.query.mockResolvedValue({ rows: mockRows });

      const config = {
        connection: {
          host: 'localhost',
          port: 5432,
          database: 'test',
          user: 'test',
          password: 'test',
        },
      };

      dbClient.registerDb('test-db', config);

      const result = await dbClient.exec('test-db', 'SELECT * FROM users', ['param1']);

      expect(mockPgClient.query).toHaveBeenCalledWith('SELECT * FROM users', ['param1']);
      expect(result).toEqual(mockRows);
    });
  });

  describe('sendRequest', () => {
    beforeEach(() => {
      const config = {
        connection: {
          host: 'localhost',
          port: 5432,
          database: 'test',
          user: 'test',
          password: 'test',
        },
      };
      dbClient.registerDb('test-db', config);
    });

    it('should handle select operation', async () => {
      const mockRows = [{ id: 1, name: 'test' }];
      mockPgClient.query.mockResolvedValue({ rows: mockRows });

      const response = await dbClient.sendRequest('test-db', 'users', 'select', {
        where: { id: 1 },
      });

      expect(response.data).toEqual(mockRows);
      expect(response.rowCount).toBe(1);
      expect(response.config.operation).toBe('select');
    });

    it('should handle insert operation', async () => {
      const mockRows = [{ id: 1, name: 'test', email: 'test@example.com' }];
      mockPgClient.query.mockResolvedValue({ rows: mockRows });

      await runWithContext(async () => {
        const response = await dbClient.sendRequest('test-db', 'users', 'insert', {
          data: { name: 'test', email: 'test@example.com' },
        });

        expect(response.data).toEqual(mockRows);
        expect(response.rowCount).toBe(1);
        expect(response.config.operation).toBe('insert');
      });
    });

    it('should handle update operation', async () => {
      const mockRows = [{ id: 1, name: 'updated', email: 'test@example.com' }];
      mockPgClient.query.mockResolvedValue({ rows: mockRows });

      const response = await dbClient.sendRequest('test-db', 'users', 'update', {
        data: { name: 'updated' },
        where: { id: 1 },
      });

      expect(response.data).toEqual(mockRows);
      expect(response.rowCount).toBe(1);
      expect(response.config.operation).toBe('update');
    });

    it('should handle delete operation', async () => {
      const mockRows = [{ id: 1, name: 'test' }];
      mockPgClient.query.mockResolvedValue({ rows: mockRows });

      const response = await dbClient.sendRequest('test-db', 'users', 'delete', {
        where: { id: 1 },
      });

      expect(response.data).toEqual(mockRows);
      expect(response.rowCount).toBe(1);
      expect(response.config.operation).toBe('delete');
    });

    it('should throw error for unregistered database', async () => {
      await expect(dbClient.sendRequest('unregistered', 'users', 'select')).rejects.toThrow(
        "Database 'unregistered' not registered"
      );
    });

    it('should throw error for unsupported operation', async () => {
      await expect(dbClient.sendRequest('test-db', 'users', 'unsupported' as any)).rejects.toThrow(
        'Unsupported operation: unsupported'
      );
    });

    it('should apply before and after hooks', async () => {
      const beforeHook = vi.fn(config => ({ ...config, custom: true }));
      const afterHook = vi.fn(response => ({ ...response, custom: true }));

      const config = {
        connection: {
          host: 'localhost',
          port: 5432,
          database: 'test',
          user: 'test',
          password: 'test',
        },
        before: beforeHook,
        after: afterHook,
      };

      dbClient.registerDb('test-db', config);
      mockPgClient.query.mockResolvedValue({ rows: [] });

      const response = await dbClient.sendRequest('test-db', 'users', 'select');

      expect(beforeHook).toHaveBeenCalled();
      expect(afterHook).toHaveBeenCalled();
      expect((response as any).custom).toBe(true);
    });
  });

  describe('defaults management', () => {
    it('should set and apply default values', async () => {
      const config = {
        connection: {
          host: 'localhost',
          port: 5432,
          database: 'test',
          user: 'test',
          password: 'test',
        },
      };

      dbClient.registerDb('test-db', config);
      dbClient.setDefaultValues('test-db', 'users', () => ({ created_at: '2023-01-01' }));

      mockPgClient.query.mockResolvedValue({ rows: [] });

      await runWithContext(async () => {
        await dbClient.sendRequest('test-db', 'users', 'insert', {
          data: { name: 'test' },
        });
      });

      // Check that the query includes the default value
      expect(mockPgClient.query).toHaveBeenCalledWith(
        expect.stringContaining('created_at'),
        expect.arrayContaining(['2023-01-01'])
      );
    });

    it('should clear defaults for a database', () => {
      dbClient.setDefaultValues('test-db', 'users', () => ({ created_at: '2023-01-01' }));
      dbClient.setDefaultValues('test-db', 'posts', () => ({ created_at: '2023-01-01' }));
      dbClient.setDefaultValues('other-db', 'users', () => ({ created_at: '2023-01-01' }));

      dbClient.clearDefaults('test-db');

      // Check that only test-db defaults are cleared
      expect((dbClient as any).defaults.has('test-db:users')).toBe(false);
      expect((dbClient as any).defaults.has('test-db:posts')).toBe(false);
      expect((dbClient as any).defaults.has('other-db:users')).toBe(true);
    });
  });

  describe('cleanup and close', () => {
    it('should close all database connections', async () => {
      const config = {
        connection: {
          host: 'localhost',
          port: 5432,
          database: 'test',
          user: 'test',
          password: 'test',
        },
      };

      dbClient.registerDb('test-db', config);
      await (dbClient as any).getClient('test-db');

      await dbClient.close();

      expect(mockPgClient.end).toHaveBeenCalled();
      expect((dbClient as any).clients.size).toBe(0);
    });
  });
});

describe('createDbUtils', () => {
  let dbClient: DbClient;
  let dbUtils: any;
  let mockPgClient: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockPgClient = {
      connect: vi.fn().mockResolvedValue(undefined),
      query: vi.fn().mockResolvedValue({ rows: [] }),
      end: vi.fn().mockResolvedValue(undefined),
    };
    MockClient.mockImplementation(() => mockPgClient);

    dbClient = new DbClient();
    const config = {
      connection: {
        host: 'localhost',
        port: 5432,
        database: 'test',
        user: 'test',
        password: 'test',
      },
    };
    dbClient.registerDb('test-db', config);
    dbUtils = createDbUtils(dbClient);
  });

  afterEach(async () => {
    await dbClient.close();
  });

  describe('sendRequest functionality', () => {
    it('should delegate to dbClient.sendRequest', async () => {
      const mockResponse: DbResponse = {
        data: [{ id: 1, name: 'test' }],
        rowCount: 1,
        config: { table: 'users', operation: 'select' },
      };

      vi.spyOn(dbClient, 'sendRequest').mockResolvedValue(mockResponse);

      const result = await dbUtils('test-db', 'users', 'select');

      expect(dbClient.sendRequest).toHaveBeenCalledWith('test-db', 'users', 'select', undefined);
      expect(result).toEqual(mockResponse);
    });

    it('should have client property', () => {
      expect(dbUtils.client).toBe(dbClient);
    });

    it('should have exec method', () => {
      expect(typeof dbUtils.exec).toBe('function');
    });
  });

  describe('insert method', () => {
    it('should insert multiple records', async () => {
      const mockResponse1: DbResponse = {
        data: [{ id: 1, name: 'user1' }],
        rowCount: 1,
        config: { table: 'users', operation: 'insert' },
      };
      const mockResponse2: DbResponse = {
        data: [{ id: 2, name: 'user2' }],
        rowCount: 1,
        config: { table: 'users', operation: 'insert' },
      };

      vi.spyOn(dbClient, 'sendRequest')
        .mockResolvedValueOnce(mockResponse1)
        .mockResolvedValueOnce(mockResponse2);

      const result = await dbUtils.insert('test-db', 'users', { name: 'user1' }, { name: 'user2' });

      expect(dbClient.sendRequest).toHaveBeenCalledTimes(2);
      expect(result).toEqual([
        { id: 1, name: 'user1' },
        { id: 2, name: 'user2' },
      ]);
    });
  });

  describe('update method', () => {
    it('should update records', async () => {
      const mockResponse: DbResponse = {
        data: [{ id: 1, name: 'updated' }],
        rowCount: 1,
        config: { table: 'users', operation: 'update' },
      };

      vi.spyOn(dbClient, 'sendRequest').mockResolvedValue(mockResponse);

      const result = await dbUtils.update('test-db', 'users', { name: 'updated' }, { id: 1 });

      expect(dbClient.sendRequest).toHaveBeenCalledWith('test-db', 'users', 'update', {
        data: { name: 'updated' },
        where: { id: 1 },
      });
      expect(result).toEqual([{ id: 1, name: 'updated' }]);
    });
  });

  describe('delete method', () => {
    it('should delete records', async () => {
      const mockResponse: DbResponse = {
        data: [{ id: 1, name: 'deleted' }],
        rowCount: 1,
        config: { table: 'users', operation: 'delete' },
      };

      vi.spyOn(dbClient, 'sendRequest').mockResolvedValue(mockResponse);

      const result = await dbUtils.delete('test-db', 'users', { id: 1 });

      expect(dbClient.sendRequest).toHaveBeenCalledWith('test-db', 'users', 'delete', {
        where: { id: 1 },
      });
      expect(result).toEqual([{ id: 1, name: 'deleted' }]);
    });
  });

  describe('expect method', () => {
    it('should return vitest expect assertion', async () => {
      const mockResponse: DbResponse = {
        data: [{ id: 1, name: 'test' }],
        rowCount: 1,
        config: { table: 'users', operation: 'select' },
      };

      vi.spyOn(dbClient, 'sendRequest').mockResolvedValue(mockResponse);

      const assertion = await dbUtils.expect('test-db', 'users', { id: 1 });

      expect(dbClient.sendRequest).toHaveBeenCalledWith('test-db', 'users', 'select', {
        where: { id: 1 },
      });
      expect(assertion).toBeDefined();
      expect(typeof assertion.toHaveLength).toBe('function');
    });
  });

  describe('setDefaults and clearDefaults', () => {
    it('should set defaults for a table', () => {
      const setDefaultsSpy = vi.spyOn(dbClient, 'setDefaultValues');

      dbUtils.setDefaults('test-db', 'users', { created_at: '2023-01-01' });

      expect(setDefaultsSpy).toHaveBeenCalledWith('test-db', 'users', { created_at: '2023-01-01' });
    });

    it('should clear defaults for a database', () => {
      const clearDefaultsSpy = vi.spyOn(dbClient, 'clearDefaults');

      dbUtils.clearDefaults('test-db');

      expect(clearDefaultsSpy).toHaveBeenCalledWith('test-db');
    });
  });
});
