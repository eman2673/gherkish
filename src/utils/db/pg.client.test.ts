import { Client } from 'pg';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DbClientRegistry } from './db.client';
import type { DBRegistration } from './db.client';
import { PgClient } from './pg.client';
// Import test-utils to ensure context mock is set up
import '../../test-utils';

// Mock pg Client
vi.mock('pg', () => ({
  Client: vi.fn(),
}));

const MockClient = vi.mocked(Client);

describe('DbClientRegistry', () => {
  let dbRegistry: DbClientRegistry;
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

    dbRegistry = new DbClientRegistry();
  });

  afterEach(async () => {
    await dbRegistry.close();
  });

  describe('Database Registration', () => {
    it('should register a database configuration', () => {
      const config: Omit<DBRegistration, 'name'> = {
        connect: async () =>
          new PgClient({
            host: 'localhost',
            port: 5432,
            database: 'test',
            user: 'test',
            password: 'test',
          }),
      };

      dbRegistry.add('test-db', config);
      const registered = dbRegistry.getDb('test-db');

      expect(registered).toBeDefined();
      expect(registered?.name).toBe('test-db');
    });

    it('should overwrite existing database configuration', () => {
      const config1: Omit<DBRegistration, 'name'> = {
        connect: async () =>
          new PgClient({
            host: 'localhost',
            port: 5432,
            database: 'test1',
            user: 'test',
            password: 'test',
          }),
      };
      const config2: Omit<DBRegistration, 'name'> = {
        connect: async () =>
          new PgClient({
            host: 'localhost',
            port: 5432,
            database: 'test2',
            user: 'test',
            password: 'test',
          }),
      };

      dbRegistry.add('test-db', config1);
      dbRegistry.add('test-db', config2);

      const registered = dbRegistry.getDb('test-db');
      expect(registered).toBeDefined();
      expect(registered?.name).toBe('test-db');
    });
  });

  describe('Database Operations', () => {
    beforeEach(() => {
      const config: Omit<DBRegistration, 'name'> = {
        connect: async () =>
          new PgClient({
            host: 'localhost',
            port: 5432,
            database: 'test',
            user: 'test',
            password: 'test',
          }),
      };
      dbRegistry.add('test-db', config);
    });

    it('should execute a SQL statement', async () => {
      const mockRows = [{ id: 1, name: 'test' }];
      mockPgClient.query.mockResolvedValue({ rows: mockRows });

      const result = await dbRegistry.exec('test-db', 'SELECT * FROM users', ['param1']);

      expect(mockPgClient.query).toHaveBeenCalledWith('SELECT * FROM users', ['param1']);
      expect(result).toEqual(mockRows);
    });

    it('should handle select operation', async () => {
      const mockRows = [{ id: 1, name: 'test' }];
      mockPgClient.query.mockResolvedValue({ rows: mockRows });

      const response = await dbRegistry.sendRequest('test-db', 'users', 'select', {
        where: { id: 1 },
      });

      expect(response.data).toEqual(mockRows);
      expect(response.rowCount).toBe(1);
    });

    it('should handle insert operation', async () => {
      const mockRows = [{ id: 1, name: 'test' }];
      mockPgClient.query.mockResolvedValue({ rows: mockRows });

      const response = await dbRegistry.sendRequest('test-db', 'users', 'insert', {
        data: { name: 'test' },
      });

      expect(response.data).toEqual(mockRows);
      expect(response.rowCount).toBe(1);
    });

    it('should handle update operation', async () => {
      const mockRows = [{ id: 1, name: 'updated' }];
      mockPgClient.query.mockResolvedValue({ rows: mockRows });

      const response = await dbRegistry.sendRequest('test-db', 'users', 'update', {
        data: { name: 'updated' },
        where: { id: 1 },
      });

      expect(response.data).toEqual(mockRows);
      expect(response.rowCount).toBe(1);
    });

    it('should handle delete operation', async () => {
      const mockRows = [{ id: 1, name: 'test' }];
      mockPgClient.query.mockResolvedValue({ rows: mockRows });

      const response = await dbRegistry.sendRequest('test-db', 'users', 'delete', {
        where: { id: 1 },
      });

      expect(response.data).toEqual(mockRows);
      expect(response.rowCount).toBe(1);
    });

    it('should throw error for unregistered database', async () => {
      await expect(dbRegistry.sendRequest('unregistered', 'users', 'select')).rejects.toThrow(
        "Database 'unregistered' not registered",
      );
    });

    it('should throw error for unsupported operation', async () => {
      await expect(
        // @ts-expect-error Testing invalid operation
        dbRegistry.sendRequest('test-db', 'users', 'invalid'),
      ).rejects.toThrow('Unsupported operation: invalid');
    });

    it('should apply before and after hooks', async () => {
      const mockRows = [{ id: 1, name: 'test' }];
      mockPgClient.query.mockResolvedValue({ rows: mockRows });

      const beforeHook = vi.fn((config) => ({
        ...config,
        where: { ...config.where, active: true },
      }));
      const afterHook = vi.fn((response) => ({
        ...response,
        data: response.data.map((row: Record<string, any>) => ({ ...row, modified: true })),
      }));

      dbRegistry.add('test-db', {
        connect: async () =>
          new PgClient({
            host: 'localhost',
            port: 5432,
            database: 'test',
            user: 'test',
            password: 'test',
          }),
        before: beforeHook,
        after: afterHook,
      });

      const response = await dbRegistry.sendRequest('test-db', 'users', 'select', {
        where: { id: 1 },
      });

      expect(beforeHook).toHaveBeenCalled();
      expect(afterHook).toHaveBeenCalled();
      expect(response.data[0].modified).toBe(true);
    });
  });

  describe('onConnect hook', () => {
    it('runs once, after connect, with the connected client, before it is cached', async () => {
      const order: string[] = [];
      const connect = vi.fn(async () => {
        order.push('connect');
        return new PgClient({
          host: 'localhost',
          port: 5432,
          database: 'test',
          user: 'test',
          password: 'test',
        });
      });
      const onConnect = vi.fn(async (client) => {
        order.push('onConnect');
        await client.exec('SELECT 1');
      });

      dbRegistry.add('test-db', { connect, onConnect });

      // First two operations share one connection; the hook fires exactly once.
      await dbRegistry.exec('test-db', 'SELECT * FROM a');
      await dbRegistry.exec('test-db', 'SELECT * FROM b');

      expect(connect).toHaveBeenCalledTimes(1);
      expect(onConnect).toHaveBeenCalledTimes(1);
      expect(order).toEqual(['connect', 'onConnect']);
      expect(onConnect).toHaveBeenCalledWith(expect.any(PgClient));
    });

    it('propagates a hook failure and does not cache the client', async () => {
      const onConnect = vi.fn().mockRejectedValue(new Error('seed failed'));
      dbRegistry.add('test-db', {
        connect: async () =>
          new PgClient({
            host: 'localhost',
            port: 5432,
            database: 'test',
            user: 'test',
            password: 'test',
          }),
        onConnect,
      });

      await expect(dbRegistry.exec('test-db', 'SELECT 1')).rejects.toThrow('seed failed');
      // A retried operation re-attempts the hook rather than using a half-set-up client.
      await expect(dbRegistry.exec('test-db', 'SELECT 1')).rejects.toThrow('seed failed');
      expect(onConnect).toHaveBeenCalledTimes(2);
    });
  });

  describe('Defaults Management', () => {
    beforeEach(() => {
      dbRegistry.add('test-db', {
        connect: async () =>
          new PgClient({
            host: 'localhost',
            port: 5432,
            database: 'test',
            user: 'test',
            password: 'test',
          }),
      });
    });

    it('should set and apply default values', async () => {
      const mockRows = [{ id: 1, name: 'test' }];
      mockPgClient.query.mockResolvedValue({ rows: mockRows });

      dbRegistry.setDefaultValues('test-db', 'users', () => ({
        active: true,
        createdAt: 'now()',
      }));

      const response = await dbRegistry.sendRequest('test-db', 'users', 'insert', {
        data: { name: 'test' },
      });

      expect(response.data).toEqual(mockRows);
    });

    it('should handle table name casing consistently', async () => {
      const mockRows = [{ id: 1, name: 'test' }];
      mockPgClient.query.mockResolvedValue({ rows: mockRows });

      // Set defaults with different casings
      dbRegistry.setDefaultValues('test-db', 'donor_profiles', () => ({
        active: true,
        source: 'test',
      }));

      dbRegistry.setDefaultValues('test-db', 'DonorProfiles', () => ({
        active: false,
        source: 'override',
      }));

      // Test with different casings
      const response1 = await dbRegistry.sendRequest('test-db', 'donor_profiles', 'insert', {
        data: { name: 'test1' },
      });

      const response2 = await dbRegistry.sendRequest('test-db', 'DonorProfiles', 'insert', {
        data: { name: 'test2' },
      });

      // Both should use the same defaults (last one set)
      expect(response1.config.data).toMatchObject({
        active: false,
        source: 'override',
        name: 'test1',
      });

      expect(response2.config.data).toMatchObject({
        active: false,
        source: 'override',
        name: 'test2',
      });
    });

    it('should handle mixed case in table names', async () => {
      const mockRows = [{ id: 1, name: 'test' }];
      mockPgClient.query.mockResolvedValue({ rows: mockRows });

      // Set with snake_case
      dbRegistry.setDefaultValues('test-db', 'donor_prioritized', () => ({
        priority: { score: 0 },
      }));

      // Access with PascalCase
      const response = await dbRegistry.sendRequest('test-db', 'DonorPrioritized', 'insert', {
        data: { donorId: '123' },
      });

      expect(response.config.data).toMatchObject({
        priority: { score: 0 },
        donorId: '123',
      });
    });

    it('should clear defaults for a database', async () => {
      dbRegistry.setDefaultValues('test-db', 'users', () => ({
        active: true,
      }));

      dbRegistry.clearDefaults('test-db');

      // Verify defaults were cleared by checking internal state
      expect((dbRegistry as any).defaults.size).toBe(0);
    });
  });
});
