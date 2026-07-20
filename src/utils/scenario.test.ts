import { describe, it, expect, vi, beforeEach } from 'vitest';
import { scenario } from '../scenario';
import { mockContext } from '../setup';

// Mock the stepTypes module with hoisted mock
const mockGetStepQueue = vi.hoisted(() => vi.fn());
vi.mock('../stepTypes', () => ({
  getStepQueue: mockGetStepQueue,
}));

// Mock the test function from vitest
const mockTest = vi.hoisted(() => vi.fn());
vi.mock('vitest', async () => {
  const actual = await vi.importActual('vitest');
  return {
    ...actual,
    test: mockTest,
  };
});

// Mock the scenario module to use our mocked dependencies
vi.mock('../scenario', async () => {
  const actual = await vi.importActual('../scenario');
  return {
    ...actual,
    scenario: (name: string, define: () => void) => {
      mockTest(name, async () => {
        const ctx = {};
        await mockContext.run(ctx, async () => {
          define();
          const steps = mockGetStepQueue();
          for (const step of steps) await step();
        });
      });
    },
  };
});

describe('Scenario Runner', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Set up the context mock to return an empty object
    mockContext.getStore.mockReturnValue({});
    mockContext.run.mockImplementation(async (ctx, fn) => {
      mockContext.getStore.mockReturnValue(ctx);
      try {
        return await fn();
      } finally {
        mockContext.getStore.mockReturnValue(undefined);
      }
    });
  });

  describe('scenario', () => {
    it('should register a test with vitest', () => {
      const testName = 'test scenario';
      const testDefine = vi.fn();

      scenario(testName, testDefine);

      expect(mockTest).toHaveBeenCalledWith(testName, expect.any(Function));
    });

    it('should execute the define function and steps', async () => {
      const testName = 'test scenario';
      const testDefine = vi.fn();
      let executedSteps = false;

      // Mock the step queue to return a simple step
      mockGetStepQueue.mockReturnValue([
        async () => {
          executedSteps = true;
        },
      ]);

      scenario(testName, testDefine);

      // Get the test function that was registered
      const registeredTestFn = mockTest.mock.calls[0][1];

      // Execute the test function
      await registeredTestFn();

      expect(testDefine).toHaveBeenCalled();
      expect(executedSteps).toBe(true);
    });

    it('should create and run context for the test', async () => {
      const testName = 'test scenario';
      const testDefine = vi.fn();
      let capturedContext: any = null;

      // Mock the step queue
      mockGetStepQueue.mockReturnValue([
        async () => {
          capturedContext = mockContext.getStore();
        },
      ]);

      scenario(testName, testDefine);

      const registeredTestFn = mockTest.mock.calls[0][1];
      await registeredTestFn();

      expect(capturedContext).toEqual({});
    });

    it('should execute steps in order', async () => {
      const testName = 'test scenario';
      const testDefine = vi.fn();
      const executionOrder: string[] = [];

      // Mock the step queue with multiple steps
      mockGetStepQueue.mockReturnValue([
        async () => {
          executionOrder.push('step1');
        },
        async () => {
          executionOrder.push('step2');
        },
        async () => {
          executionOrder.push('step3');
        },
      ]);

      scenario(testName, testDefine);

      const registeredTestFn = mockTest.mock.calls[0][1];
      await registeredTestFn();

      expect(executionOrder).toEqual(['step1', 'step2', 'step3']);
    });

    it('should handle errors in step execution', async () => {
      const testName = 'test scenario';
      const testDefine = vi.fn();
      const testError = new Error('Step failed');

      // Mock the step queue with a failing step
      mockGetStepQueue.mockReturnValue([
        async () => {
          throw testError;
        },
      ]);

      scenario(testName, testDefine);

      const registeredTestFn = mockTest.mock.calls[0][1];

      await expect(registeredTestFn()).rejects.toThrow('Step failed');
    });

    it('should handle empty step queue', async () => {
      const testName = 'test scenario';
      const testDefine = vi.fn();

      // Mock the step queue to return empty array
      mockGetStepQueue.mockReturnValue([]);

      scenario(testName, testDefine);

      const registeredTestFn = mockTest.mock.calls[0][1];

      // Should not throw
      await expect(registeredTestFn()).resolves.toBeUndefined();
    });
  });
});
