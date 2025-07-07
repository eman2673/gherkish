import { mockContext, mockUseCtx } from './setup';

/**
 * Helper function to set up context mock for tests that use context.run
 * @returns The mock context object
 */
export function setupContextMock(ctx?: any) {
  const mockCtx = ctx ?? {};

  // Set up the useCtx mock to return the context
  mockUseCtx.mockReturnValue(mockCtx);

  // Set up the context.run mock to properly manage the context
  mockContext.run.mockImplementation(async (ctx, fn) => {
    // Set the context for the duration of the function execution
    mockContext.getStore.mockReturnValue(ctx);
    mockUseCtx.mockReturnValue(ctx);

    try {
      const result = await fn();
      return result;
    } finally {
      // Clean up after the function execution
      mockContext.getStore.mockReturnValue(undefined);
      mockUseCtx.mockReturnValue(undefined);
    }
  });

  return mockCtx;
}

/**
 * Helper function to run a test with proper context setup
 * @param testFn The test function to run within the context
 * @returns Promise that resolves when the test is complete
 */
export function runWithContext(testFn: () => Promise<void>): Promise<void>;
export function runWithContext(ctx: any, testFn: () => Promise<void>): Promise<void>;
export async function runWithContext(arg1: any, arg2?: () => Promise<void>) {
  const fn = arg2 ?? arg1;
  const mockCtx = setupContextMock(arg2 ? arg1 : undefined);

  const { context } = await import('./utils/context');
  return context.run(mockCtx, fn);
}

// Export the mock objects for direct access if needed
export { mockContext, mockUseCtx };
