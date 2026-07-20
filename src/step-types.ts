import type { StepUtils } from './types/step-utils.types';
import { setContext, useCtx } from './utils/context';

type PartiallyPartial<T> = Partial<{ [K in keyof T]: Partial<T[K]> }>;

let registeredUtils: StepUtils = {
  given: { setContext: setContext },
  when: {},
  then: {},
} as any;

export function registerStepUtils({ given, when, then }: PartiallyPartial<StepUtils>) {
  Object.assign(registeredUtils.given, given);
  Object.assign(registeredUtils.when, when);
  Object.assign(registeredUtils.then, then);
}

const stepQueue: (() => Promise<void>)[] = [];

function addStep<T extends keyof StepUtils>(fn: StepFn<StepUtils[T]>, stepType: T) {
  stepQueue.push(async () => {
    const ctx = useCtx();
    const result = fn(ctx, registeredUtils[stepType]);
    if (result instanceof Promise) {
      await result;
    }
  });
}

function createStepFunction<T extends keyof StepUtils>(stepType: T) {
  function step(description: string, fn: StepFn<StepUtils[T]>): void;
  function step(fn: StepFn<StepUtils[T]>): void;
  function step(descriptionOrFn: string | StepFn<StepUtils[T]>, fn?: StepFn<StepUtils[T]>) {
    if (typeof descriptionOrFn === 'string') {
      addStep(fn!, stepType);
    } else {
      addStep(descriptionOrFn, stepType);
    }
  }
  return step;
}

export const Given = createStepFunction('given');
export const When = createStepFunction('when');
export const Then = createStepFunction('then');

export function getStepQueue() {
  const steps = [...stepQueue];
  stepQueue.length = 0;
  return steps;
}
