import { AsyncLocalStorage } from 'node:async_hooks';

export const context = new AsyncLocalStorage<Context>();

export function useCtx() {
  const ctx = context.getStore();
  if (!ctx) throw new Error('No scenario context found');
  return ctx;
}

const blacklistKeys: string[] = [];
export function blacklistKey(key: string) {
  blacklistKeys.push(key);
}

export function setContext(key: string, value: any) {
  const ctx = useCtx();
  if (blacklistKeys.includes(key)) {
    console.warn(`Cannot set ${key} in context. Must be used internally.`);
    return;
  }
  ctx[key] = value;
}
