import type { expect } from 'vitest';

import { setContext } from '../utils/context';
import type { DbGivenUtils, DbThenUtils, DbWhenUtils } from '../utils/db/db.client';
import type { DbContext } from '../utils/db/db.types';
import type { Fakish } from '../utils/fakish';
import type { HttpContext, SendRequestUtil } from '../utils/http.client';
import type { WireMockStub, WireMockVerification } from '../utils/wiremock';
import type { StubBuilder } from '../utils/wiremock/stub.builder';

export interface WireMockContext {
  stub?: WireMockStub;
  verification?: WireMockVerification;
  /** Array of stub UUIDs created during this test (for cleanup and filtering) */
  stubs?: string[];
}

export interface WireMockUtils {
  stub: ((mockName: string, stubConfig: WireMockStub) => Promise<void>) & StubBuilder;
  verify: (mockName: string, method: string, urlPattern: string) => Promise<WireMockVerification>;
  reset: () => Promise<void>;
  hardReset: () => Promise<void>;
}

export type GivenUtils = {
  DB: DbGivenUtils;
  Fake: Fakish.Extended;
  Mock: Pick<WireMockUtils, 'stub'>;
  setContext: typeof setContext;
};

export type WhenUtils = {
  HTTP: SendRequestUtil;
  DB: DbWhenUtils;
};

export type ThenUtils = {
  expect: typeof expect;
  DB: DbThenUtils;
  Mock: Pick<WireMockUtils, 'verify'>;
};

export type EachUtils = {
  Given: typeof Given;
  Mock: Pick<WireMockUtils, 'reset'>;
  DB: Pick<DbGivenUtils, 'delete'>;
};

export type StepUtils = {
  given: GivenUtils;
  when: WhenUtils;
  then: ThenUtils;
};

export type Context = {
  [key: string]: any;
  http: HttpContext;
  db: DbContext;
  fake: Fakish.Context;
  mock: WireMockContext;
};
