import { describe, it, expect, beforeEach, vi } from 'vitest';
import { registerStepUtils, Given, When, Then, getStepQueue } from './step-types';
import { runWithContext } from './test-utils';
import { mockUseCtx } from './setup';

describe('Step Types', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('registerStepUtils', () => {
    it('should register step utilities', () => {
      const mockSendRequest = vi.fn() as any;
      mockSendRequest.get = vi.fn();
      mockSendRequest.post = vi.fn();
      mockSendRequest.put = vi.fn();
      mockSendRequest.patch = vi.fn();
      mockSendRequest.delete = vi.fn();
      mockSendRequest.head = vi.fn();
      mockSendRequest.options = vi.fn();
      mockSendRequest.client = {};

      const mockDbUtils = {
        client: {},
        exec: vi.fn(),
        insert: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        expect: vi.fn(),
        setDefaults: vi.fn(),
        clearDefaults: vi.fn(),
      };

      const mockExpect = vi.fn(() => ({ toBe: vi.fn() }));

      const mockUtils = {
        given: {
          DB: mockDbUtils,
        },
        when: {
          HTTP: mockSendRequest,
          DB: mockDbUtils,
        },
        then: {
          expect: mockExpect,
          DB: mockDbUtils,
        },
      } as any;

      expect(() => registerStepUtils(mockUtils)).not.toThrow();
    });
  });

  describe('step registration', () => {
    it('should register given step', () => {
      let capturedCtx: any = null;
      let capturedUtils: any = null;

      Given(async (ctx, utils) => {
        capturedCtx = ctx;
        capturedUtils = utils;
      });

      const steps = getStepQueue();
      expect(steps).toHaveLength(1);
    });

    it('should register when step', () => {
      let capturedCtx: any = null;
      let capturedUtils: any = null;

      When(async (ctx, utils) => {
        capturedCtx = ctx;
        capturedUtils = utils;
      });

      const steps = getStepQueue();
      expect(steps).toHaveLength(1);
    });

    it('should register then step', () => {
      let capturedCtx: any = null;
      let capturedUtils: any = null;

      Then(async (ctx, utils) => {
        capturedCtx = ctx;
        capturedUtils = utils;
      });

      const steps = getStepQueue();
      expect(steps).toHaveLength(1);
    });

    it('should register multiple steps in order', () => {
      Given(async () => {});
      When(async () => {});
      Then(async () => {});

      const steps = getStepQueue();
      expect(steps).toHaveLength(3);
    });
  });

  describe('getStepQueue', () => {
    it('should return and clear the step queue', () => {
      Given(async () => {});
      When(async () => {});

      const firstCall = getStepQueue();
      expect(firstCall).toHaveLength(2);

      const secondCall = getStepQueue();
      expect(secondCall).toHaveLength(0);
    });

    it('should return empty array when no steps registered', () => {
      const steps = getStepQueue();
      expect(steps).toHaveLength(0);
    });
  });

  describe('step execution', () => {
    it.only('should execute steps in order', async () => {
      // Set up the useCtx mock to return a mock context
      const mockCtx = { test: 'context' };
      mockUseCtx.mockReturnValue(mockCtx);
      const mockSendRequest = vi.fn() as any;
      mockSendRequest.get = vi.fn();
      mockSendRequest.post = vi.fn();
      mockSendRequest.put = vi.fn();
      mockSendRequest.patch = vi.fn();
      mockSendRequest.delete = vi.fn();
      mockSendRequest.head = vi.fn();
      mockSendRequest.options = vi.fn();
      mockSendRequest.client = {};

      const mockDbUtils = {
        client: {},
        exec: vi.fn(),
        insert: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        expect: vi.fn(),
        setDefaults: vi.fn(),
        clearDefaults: vi.fn(),
      };

      const mockExpect = vi.fn(() => ({ toBe: vi.fn() }));

      const mockUtils = {
        given: {
          DB: mockDbUtils,
        },
        when: {
          HTTP: mockSendRequest,
          DB: mockDbUtils,
        },
        then: {
          expect: mockExpect,
          DB: mockDbUtils,
        },
      } as any;

      registerStepUtils(mockUtils);

      const { Given, When, Then } = await import('./step-types');

      Given(async (_, { DB }) => {
        await DB.insert('default', 'users', { name: 'Test User', email: 'test@example.com' });
      });

      When(async (_, { HTTP }) => {
        await HTTP('default', '/test');
      });

      Then((_, { expect }) => {
        expect(true).toBe(true);
      });

      const steps = getStepQueue();
      expect(steps).toHaveLength(3);

      await runWithContext(async () => {
        for (const step of steps) await step();
      });

      expect(mockDbUtils.insert).toHaveBeenCalledWith('default', 'users', {
        name: 'Test User',
        email: 'test@example.com',
      });
      expect(mockSendRequest).toHaveBeenCalledWith('default', '/test');
      expect(mockExpect).toHaveBeenCalledWith(true);
    });
  });
});
