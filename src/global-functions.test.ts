import { describe, it, expect } from 'vitest';
import './define-globals';
import { registerStepUtils } from './step-types';
import { runWithContext } from './test-utils';

// Import test-utils to ensure context mock is set up
import './test-utils';

registerStepUtils({
  given: {} as any,
  when: {} as any,
  then: {} as any,
});

describe('Global BDD Functions', () => {
  describe('Primary functions', () => {
    [Feature, Scenario, Given, When, Then].forEach(fn => {
      it(`${fn.name} is a function`, () => {
        expect(typeof fn).toBe('function');
      });
    });
  });

  it('should be able to use Given, When, Then without imports', async () => {
    const testContext = { test: true };

    // Run the scenario within the context

    let givenCalled = false;
    let whenCalled = false;
    let thenCalled = false;

    Given((ctx, given) => {
      givenCalled = true;
      expect(ctx).toBe(testContext);
    });

    When((ctx, when) => {
      whenCalled = true;
      expect(ctx).toBe(testContext);
    });

    Then((ctx, then) => {
      thenCalled = true;
      expect(ctx).toBe(testContext);
    });

    // Execute the step queue
    const { getStepQueue } = await import('./step-types');
    const steps = getStepQueue();

    await runWithContext(testContext, async () => {
      for (const step of steps) {
        await step();
      }
    });

    expect(givenCalled).toBe(true);
    expect(whenCalled).toBe(true);
    expect(thenCalled).toBe(true);
  });
});
