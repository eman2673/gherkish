import { test } from 'vitest';

import { getStepQueue } from './step-types';
import { context, setContext } from './utils/context';

const scenarioUtils = {
  setContext,
};

function scenario(name: string, define: (utils: typeof scenarioUtils) => void) {
  test(name, async (testContext) => {
    await context.run(testContext, async () => {
      define(scenarioUtils);
      const steps = getStepQueue();
      for (const step of steps) await step();
    });
  });
}

scenario.skip = (name: string, define: (utils: typeof scenarioUtils) => void) =>
  test.skip(name, async (testContext) => {
    await context.run(testContext, async () => {
      define(scenarioUtils);
      const steps = getStepQueue();
      for (const step of steps) await step();
    });
  });

scenario.only = (name: string, define: (utils: typeof scenarioUtils) => void) =>
  test.only(name, async (testContext) => {
    await context.run(testContext, async () => {
      define(scenarioUtils);
      const steps = getStepQueue();
      for (const step of steps) await step();
    });
  });

export { scenario };
