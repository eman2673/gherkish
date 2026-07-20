var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/utils/context.ts
import { AsyncLocalStorage } from "async_hooks";
var context = new AsyncLocalStorage();
function useCtx() {
  const ctx = context.getStore();
  if (!ctx) throw new Error("No scenario context found");
  return ctx;
}
var blacklistKeys = [];
function setContext(key, value, logFormatter = (value2) => JSON.stringify(value2, null, 2)) {
  const ctx = useCtx();
  if (blacklistKeys.includes(key)) {
    console.warn(`Cannot set ${key} in context. Must be used internally.`);
    return;
  }
  console.log(`Setting context: ${key} = ${logFormatter(value)}`);
  ctx[key] = value;
}

// src/step-types.ts
var registeredUtils = {
  given: { setContext },
  when: {},
  then: {}
};
function registerStepUtils({ given, when, then }) {
  Object.assign(registeredUtils.given, given);
  Object.assign(registeredUtils.when, when);
  Object.assign(registeredUtils.then, then);
}
var stepQueue = [];
function addStep(fn, stepType) {
  stepQueue.push(async () => {
    const ctx = useCtx();
    const result = fn(ctx, registeredUtils[stepType]);
    if (result instanceof Promise) {
      await result;
    }
  });
}
function createStepFunction(stepType) {
  function step(descriptionOrFn, fn) {
    if (typeof descriptionOrFn === "string") {
      addStep(fn, stepType);
    } else {
      addStep(descriptionOrFn, stepType);
    }
  }
  return step;
}
var Given = createStepFunction("given");
var When = createStepFunction("when");
var Then = createStepFunction("then");
function getStepQueue() {
  const steps = [...stepQueue];
  stepQueue.length = 0;
  return steps;
}

export {
  __export,
  context,
  useCtx,
  setContext,
  registerStepUtils,
  Given,
  When,
  Then,
  getStepQueue
};
//# sourceMappingURL=chunk-BUSTDPMG.js.map