type Context = Record<string, any>;
type StepFn<T, C = Context> = (ctx: C, utils: T) => Promise<void> | void;

type DeepReadonly<T> = T extends object
  ? {
      readonly [P in keyof T]: DeepReadonly<T[P]>;
    }
  : T;
