import {
  feature
} from "./chunk-EBYPHWYD.js";
import {
  Given,
  Then,
  When,
  __export,
  context,
  getStepQueue,
  registerStepUtils,
  setContext,
  useCtx
} from "./chunk-BUSTDPMG.js";

// src/scenario.ts
import { test } from "vitest";
var scenarioUtils = {
  setContext
};
function scenario(name, define) {
  test(name, async (testContext) => {
    await context.run(testContext, async () => {
      define(scenarioUtils);
      const steps = getStepQueue();
      for (const step of steps) await step();
    });
  });
}
scenario.skip = (name, define) => test.skip(name, async (testContext) => {
  await context.run(testContext, async () => {
    define(scenarioUtils);
    const steps = getStepQueue();
    for (const step of steps) await step();
  });
});
scenario.only = (name, define) => test.only(name, async (testContext) => {
  await context.run(testContext, async () => {
    define(scenarioUtils);
    const steps = getStepQueue();
    for (const step of steps) await step();
  });
});

// src/define-globals.ts
globalThis.Feature = feature;
globalThis.Scenario = scenario;
globalThis.Given = Given;
globalThis.When = When;
globalThis.Then = Then;

// src/utils/fakish/fakish.util.ts
var fakish_util_exports = {};
__export(fakish_util_exports, {
  default: () => FakeDataManager
});
import { faker } from "@faker-js/faker";
var FakeDataManager = class _FakeDataManager {
  static CONTEXT_KEY = "fake";
  fakerInstance = faker;
  proxy;
  constructor() {
    this.proxy = this.createProxy();
  }
  /**
   * Get or create the fake data context
   */
  getFakeContext() {
    const ctx = useCtx();
    ctx[_FakeDataManager.CONTEXT_KEY] ??= {};
    return ctx[_FakeDataManager.CONTEXT_KEY];
  }
  /**
   * Store a value at a nested key path
   */
  storeNestedValue(nestedKey, value) {
    const context2 = this.getFakeContext();
    const keys = nestedKey.split(".");
    let current = context2;
    for (let i = 0; i < keys.length - 1; i++) {
      current[keys[i]] ??= {};
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
    console.log("Context update:", `fake.${nestedKey} =>`, value);
  }
  /**
   * Create proxy to wrap faker methods for logging and data storage
   */
  createProxy(path) {
    const handler = {
      get: (target, prop) => {
        switch (prop) {
          case "data":
            return (nestedKey, generator) => {
              if (generator) {
                return this.storeNestedValue(nestedKey, generator(this.fakerInstance));
              }
              return this.createProxy(nestedKey);
            };
          case "list":
            return (count, nestedKey, generator) => {
              const list = Array.from({ length: count }, () => generator(this.fakerInstance));
              this.storeNestedValue(nestedKey, list);
            };
          default:
        }
        if (typeof target[prop] === "function") {
          return (...args) => {
            const value = target[prop](...args);
            const storePath = path ? `${path}.${prop}` : prop;
            this.storeNestedValue(storePath, value);
            return value;
          };
        }
        return new Proxy(target[prop], handler);
      }
    };
    return new Proxy(this.fakerInstance, handler);
  }
  /**
   * Get the wrapped faker instance with additional methods
   */
  getFaker() {
    return this.proxy;
  }
};
var fakeUtil = new FakeDataManager();
var fakerUtil = fakeUtil.getFaker();
registerStepUtils({
  given: { Fake: fakerUtil }
});

// src/index.ts
var UTILS = ["*", "postgres", "dynamo", "http", "expect", "wiremock"];
function buildNameSpace(name) {
  return new Proxy({}, {
    get(target, prop) {
      if (!(prop in target)) {
        throw new Error(
          `'${prop}' not found on ${name} util. Has the utility been registered? Maybe you need to run useUtils?`
        );
      }
      return target[prop];
    }
  });
}
var DB = buildNameSpace("DB");
var HTTP = buildNameSpace("HTTP");
var WireMock = buildNameSpace("WireMock");
var moduleImports = {
  "*": { module: () => Promise.resolve({}) },
  postgres: { module: () => import("./pg.client-ZA6XWQLK.js"), reference: DB },
  dynamo: { module: () => import("./dynamo.client-ZYKDVPUR.js"), reference: DB },
  http: { module: () => import("./http.client-RR7E7EOP.js"), reference: HTTP },
  expect: { module: () => import("./expect-DI4EFNZO.js") },
  wiremock: { module: () => import("./wiremock-4HD3M7VS.js"), reference: WireMock }
};
async function useUtils(...utils) {
  if (utils.length === 1 && utils.includes("*")) {
    utils = UTILS.slice(1);
  }
  await Promise.all(
    utils.map(async (util) => {
      const mod = await moduleImports[util].module();
      return mod.default?.(moduleImports[util].reference);
    })
  );
}
useUtils.filter = (filter) => {
  const [, ...rest] = UTILS;
  return useUtils(...rest.filter(filter));
};
export {
  DB,
  fakish_util_exports as Fakish,
  HTTP,
  WireMock,
  useUtils
};
//# sourceMappingURL=index.js.map