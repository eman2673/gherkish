import type { StepUtils } from './types/step-utils.types';
import { useCtx } from './utils/context';

type PartiallyPartial<T> = Partial<{ [K in keyof T]: Partial<T[K]> }>;

let registeredUtils: StepUtils = { given: {}, when: {}, then: {} } as any;

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

export function Given(fn: StepFn<StepUtils['given']>) {
  addStep(fn, 'given');
}

export function When(fn: StepFn<StepUtils['when']>) {
  addStep(fn, 'when');
}

export function Then(fn: StepFn<StepUtils['then']>) {
  addStep(fn, 'then');
}

export function getStepQueue() {
  const steps = [...stepQueue];
  stepQueue.length = 0;
  return steps;
}
