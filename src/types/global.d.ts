import type { StepUtils, Context } from './step-utils.types';
import type { feature } from '../feature';
import type { scenario } from '../scenario';
import type { PgClient } from '../utils/db/pg.client';
import type { DynamoClient } from '../utils/db/dynamo.client';
import type { DbClientRegistry } from '../utils/db/db.client';
import type { HttpClient } from '../utils/http.client';
import './index.d';

type StepFn<T, C = Context> = (
  ctx: DeepReadonly<C>,
  utils: T & { setContext: (key: string, value: any) => void }
) => Promise<void> | void;

declare global {
  function Given(fn: StepFn<StepUtils['given']>): void;
  function When(fn: StepFn<StepUtils['when']>): void;
  function Then(fn: StepFn<StepUtils['then']>): void;
  const Feature: typeof feature;
  const Scenario: typeof scenario;

  namespace NodeJS {
    interface ProcessEnv {
      [key: string]: string | undefined;
      APP__BASE_URL: string;
    }
  }
}

interface DBNameSpace {
  PgClient: typeof PgClient;
  DynamoClient: typeof DynamoClient;
  add: DbClientRegistry['add'];
}

interface HttpNameSpace {
  add: HttpClient['add'];
}

export { DBNameSpace, HttpNameSpace };
