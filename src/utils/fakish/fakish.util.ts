import { faker, Faker } from '@faker-js/faker';
import { registerStepUtils } from '../../step-types';
import { useCtx } from '../context';

// Define the structure of our fake data context
export interface Context {
  [key: string]: any;
}

// Extended Faker type that includes our additional methods
export interface Extended extends Faker {
  data: {
    (nestedKey: string): Extended;
    <T>(nestedKey: string, generator: (Fake: Extended) => T): void;
  };
  list: <T>(count: number, nestedKey: string, generator: (Fake: Extended) => T) => void;
}

export default class FakeDataManager {
  private static readonly CONTEXT_KEY = 'fake';
  private readonly fakerInstance = faker;
  private readonly proxy: Extended;

  constructor() {
    this.proxy = this.createProxy();
  }

  /**
   * Get or create the fake data context
   */
  private getFakeContext(): Context {
    const ctx = useCtx();
    ctx[FakeDataManager.CONTEXT_KEY] ??= {};
    return ctx[FakeDataManager.CONTEXT_KEY];
  }

  /**
   * Store a value at a nested key path
   */
  private storeNestedValue(nestedKey: string, value: any): void {
    const context = this.getFakeContext();
    const keys = nestedKey.split('.');
    let current = context;

    // Create nested objects as needed
    for (let i = 0; i < keys.length - 1; i++) {
      current[keys[i]] ??= {};
      current = current[keys[i]];
    }

    // Set the final value
    current[keys[keys.length - 1]] = value;
    console.log('Context update:', `fake.${nestedKey} =>`, value);
  }

  /**
   * Create proxy to wrap faker methods for logging and data storage
   */
  private createProxy(path?: string): Extended {
    const handler: ProxyHandler<Faker> = {
      get: (target: any, prop: string) => {
        // Handle data method
        switch (prop) {
          case 'data':
            return (nestedKey: string, generator?: (Fake: Faker) => any) => {
              if (generator) {
                return this.storeNestedValue(nestedKey, generator(this.fakerInstance));
              }
              return this.createProxy(nestedKey);
            };
          case 'list':
            return (count: number, nestedKey: string, generator: (Fake: Faker) => any) => {
              const list = Array.from({ length: count }, () => generator(this.fakerInstance));
              this.storeNestedValue(nestedKey, list);
            };
          default:
        }

        // Handle functions and namespaces
        if (typeof target[prop] === 'function') {
          return (...args: any[]) => {
            const value = target[prop](...args);
            const storePath = path ? `${path}.${prop}` : prop;
            this.storeNestedValue(storePath, value);
            return value;
          };
        }

        // Must be a namespace, wrap it with the same proxy
        return new Proxy(target[prop], handler);
      },
    };

    return new Proxy(this.fakerInstance, handler) as Extended;
  }

  /**
   * Get the wrapped faker instance with additional methods
   */
  public getFaker(): Extended {
    return this.proxy;
  }
}

// Create the utility instance
const fakeUtil = new FakeDataManager();

// Get the extended faker instance
const fakerUtil = fakeUtil.getFaker();

// Register faker utility only for Given steps
registerStepUtils({
  given: { Fake: fakerUtil },
});

export type { Faker };
