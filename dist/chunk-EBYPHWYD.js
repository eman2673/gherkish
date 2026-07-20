import {
  Given,
  context
} from "./chunk-BUSTDPMG.js";

// src/feature.ts
import { describe, beforeEach, afterEach, beforeAll, afterAll } from "vitest";
var eachUtils = {
  Given
};
function registerEachUtils(util) {
  Object.assign(eachUtils, util);
}
function wrapHook(originalHook) {
  return (...args) => {
    const [fn, ...otherArgs] = args;
    const wrappedFn = function(...args2) {
      return context.run(args2[0], async () => {
        const ctx = context.getStore() ?? args2[0];
        const rest = [...args2];
        return fn(ctx, eachUtils, ...rest);
      });
    };
    return originalHook(wrappedFn, ...otherArgs);
  };
}
var contextualBeforeEach = wrapHook(beforeEach);
var contextualAfterEach = wrapHook(afterEach);
var _dbUtils;
var params = {
  beforeEach: contextualBeforeEach,
  afterEach: contextualAfterEach,
  beforeAll,
  afterAll,
  get DB() {
    if (!_dbUtils) {
      throw new Error(
        "Database utilities not initialized. Make sure setup.ts has run."
      );
    }
    return _dbUtils;
  },
  set DB(utils) {
    _dbUtils = utils;
  }
};
function registerFeatureUtils(util) {
  Object.assign(params, util);
}
var feature = Object.assign(
  function feature2(name, fn) {
    describe(name, () => fn(params));
  },
  {
    only: (name, fn) => describe.only(name, () => fn(params)),
    skip: (name, fn) => describe.skip(name, () => fn(params)),
    todo: describe.todo
  }
);

export {
  registerEachUtils,
  registerFeatureUtils,
  feature
};
//# sourceMappingURL=chunk-EBYPHWYD.js.map