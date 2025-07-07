import { describe, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import type { DbFeatureUtils } from './utils/db/db.client';
import { context } from './utils/context';
import type { Context } from './types/step-utils.types';

// Wrapper function that maintains the same API as original hooks
function wrapHook<T extends (...args: any[]) => void>(originalHook: T) {
  return (...args: Parameters<T>) => {
    const [fn, ...otherArgs]: Parameters<T> = args;

    const wrappedFn = function (testCtx: any, ...hookArgs: any[]) {
      return context.run(testCtx, async () => {
        return fn(context.getStore(), ...hookArgs);
      });
    };

    return originalHook(wrappedFn, ...otherArgs);
  };
}

// Create contextual versions of all hooks
const contextualBeforeEach = wrapHook(beforeEach<Context>);
const contextualAfterEach = wrapHook(afterEach<Context>);

// Define the parameters that will be passed to the feature function
export type FeatureUtils = {
  beforeEach: typeof contextualBeforeEach;
  afterEach: typeof contextualAfterEach;
  beforeAll: typeof beforeAll;
  afterAll: typeof afterAll;
  DB: DbFeatureUtils;
};

const params: FeatureUtils = {
  beforeEach: contextualBeforeEach,
  afterEach: contextualAfterEach,
  beforeAll,
  afterAll,
  get DB() {
    const that = globalThis as any;
    if (!that.__dbUtils) {
      throw new Error('Database utilities not initialized. Make sure setup.ts has run.');
    }
    return that.__dbUtils;
  },
};

// Create the feature function
function feature(name: string, fn: (params: FeatureUtils) => void) {
  describe(name, () => fn(params));
}

// Add the special methods
feature.only = (name: string, fn: (params: FeatureUtils) => void) =>
  describe.only(name, () => fn(params));

feature.skip = (name: string, fn: (params: FeatureUtils) => void) =>
  describe.skip(name, () => fn(params));

feature.todo = describe.todo;

export { feature };
