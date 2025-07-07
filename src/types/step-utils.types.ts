import type { expect } from 'vitest';
import type { HttpContext, SendRequestUtil } from '../utils/http.client';
import type { DbGivenUtils, DbWhenUtils, DbThenUtils } from '../utils/db/db.client';
import type { DbContext } from '../utils/db/db.types';

export type GivenUtils = {
  DB: DbGivenUtils;
};

export type WhenUtils = {
  HTTP: SendRequestUtil;
  DB: DbWhenUtils;
};

export type ThenUtils = {
  expect: typeof expect;
  DB: DbThenUtils;
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
};
