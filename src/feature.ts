import { describe, beforeEach, afterEach, beforeAll, afterAll } from "vitest";
import type { DbFeatureUtils } from "./utils/db/db.client";
import { context } from "./utils/context";
import type { Context, EachUtils } from "./types/step-utils.types";
import { Given } from "./step-types";

const eachUtils: EachUtils = {
  Given,
} as any;
const featureUtils: FeatureUtils = {} as any;

export function registerEachUtils(util: Partial<EachUtils>) {
  Object.assign(eachUtils, util);
}

type Tail<T extends any[]> = T extends [any, ...infer U] ? U : never;
/**
 * Preserves T's real return type instead of forcing `void`. Vitest's
 * before/afterEach listeners return `Awaitable<unknown>`, so hardcoding `void`
 * here made async Given/afterEach callbacks trip
 * @typescript-eslint/no-misused-promises for consumers, even though they
 * resolve correctly at runtime.
 */
type PlusUtils<T extends (...args: any[]) => any> = (
  ...args: [Parameters<T>[0], EachUtils, ...Tail<Parameters<T>>]
) => ReturnType<T>;

// Wrapper function, maintains same API as original with utils as final added argument
function wrapHook<
  T extends (cb: (ctx: any, ...args: any[]) => any, ...args: any[]) => void,
>(originalHook: T) {
  type PT_0 = Parameters<T>[0];
  return (...args: [PlusUtils<PT_0>, ...Tail<Parameters<T>>]) => {
    const [fn, ...otherArgs] = args;

    const wrappedFn: (...args: any[]) => Promise<void> = function (
      ...args: Parameters<PT_0>
    ) {
      return context.run(args[0], async () => {
        const ctx = context.getStore() ?? args[0];
        const rest = [...args] as Tail<Parameters<PT_0>>;
        return fn(ctx, eachUtils, ...rest);
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

let _dbUtils: DbFeatureUtils;
const params: FeatureUtils = {
  beforeEach: contextualBeforeEach,
  afterEach: contextualAfterEach,
  beforeAll,
  afterAll,
  get DB() {
    if (!_dbUtils) {
      throw new Error(
        "Database utilities not initialized. Make sure setup.ts has run.",
      );
    }
    return _dbUtils;
  },
  set DB(utils) {
    _dbUtils = utils;
  },
};

export function registerFeatureUtils(util: Partial<FeatureUtils>) {
  Object.assign(params, util);
}

// Explicit public-facing type: describe.todo's real type reaches into
// @vitest/runner's private internals (SuiteCollectorCallable, etc.), which
// can't be named in a bundled .d.ts. Annotating FeatureFn keeps the emitted
// declaration self-contained while runtime behavior is unchanged.
type FeatureFn = {
  (name: string, fn: (params: FeatureUtils) => void): void;
  only: (name: string, fn: (params: FeatureUtils) => void) => void;
  skip: (name: string, fn: (params: FeatureUtils) => void) => void;
  todo: (name: string) => void;
};

// Create the feature function
const feature: FeatureFn = Object.assign(
  function feature(name: string, fn: (params: FeatureUtils) => void) {
    describe(name, () => fn(params));
  },
  {
    only: (name: string, fn: (params: FeatureUtils) => void) =>
      describe.only(name, () => fn(params)),
    skip: (name: string, fn: (params: FeatureUtils) => void) =>
      describe.skip(name, () => fn(params)),
    todo: describe.todo,
  },
);

export { feature };
