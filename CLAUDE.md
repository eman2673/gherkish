# gherkish — contributor notes

Gherkish wraps Vitest in a Gherkin-style DSL (`Feature` / `Scenario` / `Given` /
`When` / `Then`) and ships a set of **step-context utilities** — `HTTP`, `DB`,
`Mock`, `Fake` — that get destructured out of the second argument
to each step callback:

```ts
When(async (_, { HTTP }) => {
  /* ... */
});
```

This file explains how those utilities are wired and how to add a new one.
The end-user docs (DSL, project setup) live in `README.md`.

## The registration model

Every utility is registered through `registerStepUtils` (`src/step-types.ts`),
which mutates a module-level `registeredUtils` record keyed by step phase:

```ts
registerStepUtils({
  given: { Foo: fooUtil }, // available in Given(...)
  when: { Foo: fooUtil }, // available in When(...)
  then: { Foo: fooUtil }, // available in Then(...)
});
```

Only register a utility in the phases where it makes sense — phases are
intent, not just access control:

- `given` — setup (seed data, configure mocks)
- `when` — act (HTTP calls, triggers)
- `then` — assert (check responses, mock invocations)

E.g. `HTTP` lives in `when` only, because it sends requests.
`Mock.verify` lives in `then`, while `Mock.stub` lives in `given`.

The types for each phase live in `src/types/step-utils.types.ts`
(`GivenUtils` / `WhenUtils` / `ThenUtils`). **Adding a utility to the runtime
without adding it to the type forces consumers to cast — always update both.**

## Two ways a utility gets initialized

1. **Lazy, via `useUtils(...)`.** The utility module exports a `default`
   function that performs registration. `useUtils('http')` (called from a
   test's `setup.ts`) loads the module and invokes the default. Used by
   utilities that need per-test configuration (`HTTP.add('core', ...)`,
   `DB.add('default', ...)`, `WireMock.configure(...)`).

2. **Eager, on import.** The utility calls `registerStepUtils(...)` at
   module top-level. Triggered just by `import 'gherkish'` because the
   package index re-exports the module. Used by utilities that need no
   per-test config (`expect`, `Fakish`).

Pick eager when the utility has no setup hooks. Pick lazy if it does.

## Sharing the HTTP client

`http.client.ts` exposes `httpUtil` as a module-level singleton:

```ts
export const httpUtil: SendRequestUtil = createHttpUtil();
```

Layer new transport-style helpers on top of `httpUtil` rather than calling
`fetch` directly. That way they share the api registry (`HTTP.add(...)`),
the request/response hooks, and the `ctx.http` updates that `Then` steps
assert against.

## Adding a brand-new utility

1. Create `src/utils/<name>.ts` (or a folder if it grows).
2. Export the utility's public type and value: `export interface FooUtil { ... }`
   and `export const Foo: FooUtil = { ... }`.
3. Decide eager vs lazy (see above). For lazy, also add a default export that
   does the registration, then wire it into `useUtils`' `moduleImports` map
   in `src/index.ts`.
4. Add the utility to `GivenUtils` / `WhenUtils` / `ThenUtils` in
   `src/types/step-utils.types.ts` — only the phases where it belongs.
5. Re-export from `src/index.ts` if callers may want to import it directly
   (most don't — destructuring from the step args is preferred).
6. Write a colocated `*.test.ts` covering the happy path, edge cases, and any
   delegation (spy on the underlying util where relevant, e.g.
   `vi.spyOn(httpUtil, 'post')`).

## Things to avoid

- **Don't reach into `registeredUtils` directly.** It's a private module in
  `step-types.ts`. Cross-utility composition should go through module-level
  singletons (`httpUtil`) or through the step args at call time.
- **Don't make utilities stateful across scenarios** unless they explicitly
  participate in `ctx` via `useCtx()`. Module-level state survives between
  scenarios and will cause cross-test leaks.
- **Don't add a utility to a phase "just in case".** `HTTP` is intentionally
  not in `Then` — it would invite firing requests in assertion steps, which
  is the wrong shape.
