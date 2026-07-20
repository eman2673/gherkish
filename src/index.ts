/// <reference path="./types/global.d.ts" />

import './define-globals';

import type { DBNameSpace, HttpNameSpace, WireMockNameSpace } from './types/global';

const UTILS = ['*', 'postgres', 'dynamo', 'http', 'expect', 'wiremock'] as const;
type Utils = (typeof UTILS)[number];

function buildNameSpace<T extends object>(name: string): T {
  return new Proxy<T>({} as any, {
    get(target, prop: string & keyof T) {
      if (!(prop in target)) {
        throw new Error(
          `'${prop}' not found on ${name} util. Has the utility been registered? Maybe you need to run useUtils?`,
        );
      }
      return target[prop] as any;
    },
  });
}

const DB = buildNameSpace<DBNameSpace>('DB');
const HTTP = buildNameSpace<HttpNameSpace>('HTTP');
const WireMock = buildNameSpace<WireMockNameSpace>('WireMock');

// Map of module paths to their imports
const moduleImports: { [key in Utils]: { module: () => Promise<any>; reference?: object } } = {
  '*': { module: () => Promise.resolve({}) },
  postgres: { module: () => import('./utils/db/pg.client'), reference: DB },
  dynamo: { module: () => import('./utils/db/dynamo.client'), reference: DB },
  http: { module: () => import('./utils/http.client'), reference: HTTP },
  expect: { module: () => import('./utils/expect') },
  wiremock: { module: () => import('./utils/wiremock'), reference: WireMock },
};

async function useUtils(...utils: Utils[]) {
  if (utils.length === 1 && utils.includes('*')) {
    utils = UTILS.slice(1);
  }

  await Promise.all(
    utils.map(async (util) => {
      const mod = await moduleImports[util].module();
      return mod.default?.(moduleImports[util].reference);
    }),
  );
}

useUtils.filter = (filter: (util: Utils) => boolean) => {
  const [, ...rest] = UTILS;
  return useUtils(...rest.filter(filter));
};

export { useUtils, DB, HTTP, WireMock };
export * from './utils/fakish';
