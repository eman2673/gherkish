import { test } from 'vitest';
import { context, setContext } from './utils/context';
import { getStepQueue } from './step-types';

const scenarioUtils = {
  setContext,
};

export function scenario(name: string, define: (utils: typeof scenarioUtils) => void) {
  test(name, async testContext => {
    await context.run(testContext, async () => {
      define(scenarioUtils);
      const steps = getStepQueue();
      for (const step of steps) await step();
    });
  });
}
