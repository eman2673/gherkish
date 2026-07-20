import { describe, it, expect } from 'vitest';
import type { Fakish } from './index';
import { runWithContext } from '../../test-utils';
import FakeDataManager from './fakish.util';

// Define test context type
type TestContext = {
  fake: Record<string, any>;
  [key: string]: any;
};

describe('Fakish Utility', () => {
  describe('Basic Faker Functionality', () => {
    it('should provide direct access to faker methods', async () => {
      const ctx: TestContext = { fake: {} };
      await runWithContext(ctx, () => {
        const fakeUtil = new FakeDataManager();
        const Fake = fakeUtil.getFaker();

        const name = Fake.person.firstName();
        expect(name).toEqual(expect.any(String));
        expect(ctx.fake.firstName).toBe(name);
        return Promise.resolve();
      });
    });

    it('should preserve faker method behavior and return types', async () => {
      const ctx: TestContext = { fake: {} };
      await runWithContext(ctx, () => {
        const fakeUtil = new FakeDataManager();
        const Fake = fakeUtil.getFaker();

        const age = Fake.number.int({ min: 18, max: 65 });
        expect(age).toBeGreaterThanOrEqual(18);
        expect(age).toBeLessThanOrEqual(65);
        expect(ctx.fake.int).toBe(age);
        return Promise.resolve();
      });
    });
  });

  describe('Data Method Usage', () => {
    it('should store values at the specified path', async () => {
      const ctx: TestContext = { fake: {} };
      await runWithContext(ctx, () => {
        const fakeUtil = new FakeDataManager();
        const Fake = fakeUtil.getFaker();

        const userFake = Fake.data('user');
        const name = userFake.person.firstName();
        const email = userFake.internet.email();

        expect(ctx.fake.user.firstName).toBe(name);
        expect(ctx.fake.user.email).toBe(email);
        return Promise.resolve();
      });
    });

    it('should handle deeply nested paths', async () => {
      const ctx: TestContext = { fake: {} };
      await runWithContext(ctx, () => {
        const fakeUtil = new FakeDataManager();
        const Fake = fakeUtil.getFaker();

        const addressFake = Fake.data('user.contact.address');
        const street = addressFake.location.streetAddress();
        const city = addressFake.location.city();

        expect(ctx.fake.user.contact.address.streetAddress).toBe(street);
        expect(ctx.fake.user.contact.address.city).toBe(city);
        return Promise.resolve();
      });
    });

    it('should handle generator functions', async () => {
      const ctx: TestContext = { fake: {} };
      await runWithContext(ctx, () => {
        const fakeUtil = new FakeDataManager();
        const Fake = fakeUtil.getFaker();

        Fake.data('user', (F) => ({
          name: F.person.firstName(),
          email: F.internet.email(),
          age: F.number.int({ min: 18, max: 65 }),
        }));

        expect(ctx.fake.user).toEqual({
          name: expect.any(String),
          email: expect.any(String),
          age: expect.any(Number),
        });
        return Promise.resolve();
      });
    });

    it('should handle array generation', async () => {
      const ctx: TestContext = { fake: {} };
      await runWithContext(ctx, () => {
        const fakeUtil = new FakeDataManager();
        const Fake = fakeUtil.getFaker();

        Fake.data('users', (F) => [{ name: F.person.firstName() }, { name: F.person.firstName() }]);

        expect(ctx.fake.users).toEqual([
          { name: expect.any(String) },
          { name: expect.any(String) },
        ]);
        return Promise.resolve();
      });
    });
  });

  describe('Context Storage Behavior', () => {
    it('should store direct method calls at method name path', async () => {
      const ctx: TestContext = { fake: {} };
      await runWithContext(ctx, () => {
        const fakeUtil = new FakeDataManager();
        const Fake = fakeUtil.getFaker();

        // Direct method call stores at method name
        const name = Fake.person.firstName();
        expect(ctx.fake.firstName).toBe(name);

        // Using data() with path stores at that path
        const userFake = Fake.data('user');
        const email = userFake.internet.email();
        expect(ctx.fake.user.email).toBe(email);
        return Promise.resolve();
      });
    });

    it('should store list items correctly', async () => {
      const ctx: TestContext = { fake: {} };
      await runWithContext(ctx, () => {
        const fakeUtil = new FakeDataManager();
        const Fake = fakeUtil.getFaker();

        // Direct method calls store at method name
        const name1 = Fake.person.firstName();
        const name2 = Fake.person.firstName();
        expect(ctx.fake.firstName).toBe(name2); // Last value wins

        // Using data() with generator for list
        Fake.data('users', (F) => [{ name: F.person.firstName() }, { name: F.person.firstName() }]);

        expect(ctx.fake.users).toEqual([
          { name: expect.any(String) },
          { name: expect.any(String) },
        ]);
        return Promise.resolve();
      });
    });
  });

  describe('Generator Context Behavior', () => {
    it('should not store individual faker calls from within generator', async () => {
      const ctx: TestContext = { fake: {} };
      await runWithContext(ctx, () => {
        const fakeUtil = new FakeDataManager();
        const Fake = fakeUtil.getFaker();

        // When using data() with a generator, the faker calls inside
        // should not store to context individually
        Fake.data('user', (F) => {
          // These individual calls should not store to context
          const firstName = F.person.firstName();
          const lastName = F.person.lastName();
          const email = F.internet.email();

          // Verify the individual calls didn't store
          expect(ctx.fake?.firstName).toBeUndefined();
          expect(ctx.fake?.lastName).toBeUndefined();
          expect(ctx.fake?.email).toBeUndefined();

          // Return the combined object
          return {
            firstName,
            lastName,
            email,
          };
        });

        // Only the final returned object should be stored
        expect(ctx.fake.user).toEqual({
          firstName: expect.any(String),
          lastName: expect.any(String),
          email: expect.any(String),
        });
        return Promise.resolve();
      });
    });

    it('should not store individual faker calls when generating lists', async () => {
      const ctx: TestContext = { fake: {} };
      await runWithContext(ctx, () => {
        const fakeUtil = new FakeDataManager();
        const Fake = fakeUtil.getFaker();

        Fake.data('users', (F) => {
          // These calls inside the generator should not store
          const name1 = F.person.firstName();
          const name2 = F.person.firstName();

          expect(ctx.fake?.firstName).toBeUndefined();

          return [{ name: name1 }, { name: name2 }];
        });

        // Only the final list should be stored
        expect(ctx.fake.users).toEqual([
          { name: expect.any(String) },
          { name: expect.any(String) },
        ]);
        return Promise.resolve();
      });
    });
  });
});
