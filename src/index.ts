/// <reference path="./types/global.d.ts" />

import { allowedNodeEnvironmentFlags } from 'node:process';
import './define-globals';
import type { DBNameSpace, HttpNameSpace } from './types/global';

const UTILS = ['*', 'db/pg.client', 'db/dynamo.client', 'http.client', 'expect'] as const;
type Utils = (typeof UTILS)[number];

function buildNameSpace<T extends object>(): T {
  return new Proxy<T>({} as any, {
    get(target, prop: string & keyof T) {
      if (!(prop in target)) {
        throw new Error(
          `Util ${prop} not found. Has it been registered? Maybe you need to run useUtils?`
        );
      }
      return target[prop] as any;
    },
  });
}

const DB = buildNameSpace<DBNameSpace>();
const HTTP = buildNameSpace<HttpNameSpace>();

const contextMap: { [key in Utils]?: any } = {
  'db/pg.client': DB,
  'db/dynamo.client': DB,
  'http.client': HTTP,
};

async function useUtils(...utils: Utils[]) {
  if (utils.length === 1 && utils.includes('*')) {
    utils = UTILS.slice(1);
  }

  await Promise.all(
    utils.map(async util => {
      const mod = await import(`./utils/${util}`);
      return mod.default?.(contextMap[util]);
    })
  );
}

export { useUtils, DB, HTTP };
