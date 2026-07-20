# Fakish - Test Data Generation Utility

Fakish is a powerful test data generation utility built on top of [@faker-js/faker](https://fakerjs.dev/). It extends Faker's functionality with context management and data persistence features specifically designed for BDD testing scenarios.

## Features

1. **Direct Faker Access**: All standard Faker methods are available directly
2. **Context Management**: Generated data is automatically stored in test context
3. **Data Persistence**: Store and reuse generated data across test steps
4. **Nested Path Support**: Generate and store data in nested object structures
5. **List Generation**: Generate arrays of fake data with consistent structure
6. **Step-Specific Availability**: Only available in `Given` steps for proper test organization

## Usage Examples

### Basic Usage

```typescript
Feature('User Management', () => {
  Scenario('Creating a new user', () => {
    Given(async (ctx, { Fake }) => {
      // Direct faker method access
      const firstName = Fake.person.firstName();
      const email = Fake.internet.email();

      // Data will be automatically stored in context using the final segment
      expect(ctx.fake.firstName).toBe(firstName);
      expect(ctx.fake.email).toBe(email);
    });
  });
});
```

### Data Method

The `data` method provides two ways to generate and store data:

1. **Direct Path Usage**:

```typescript
Given(async (ctx, { Fake }) => {
  // All values will be stored flat under ctx.fake.user
  const userFake = Fake.data('user');
  const name = userFake.person.firstName();
  const email = userFake.internet.email();

  // Access stored data from context - note the flat structure
  expect(ctx.fake.user.firstName).toBe(name);
  expect(ctx.fake.user.email).toBe(email);
});
```

2. **Generator Function**:

```typescript
Given(async (ctx, { Fake }) => {
  // Generate and store user data in one go
  // Note: Individual faker calls inside the generator do not affect context
  Fake.data('user', (F) => ({
    // These values are part of the returned object structure
    firstName: F.person.firstName(),
    lastName: F.person.lastName(),

    // Using Fake directly here would store at ctx.fake.email
    email: Fake.internet.email(),
    address: {
      street: F.location.street(),
      city: F.location.city(),
      country: F.location.country(),
    },
  }));

  // The entire object is stored at ctx.fake.user
  expect(ctx.fake.user).toEqual({
    firstName: expect.any(String),
    lastName: expect.any(String),
    email: expect.any(String),
    address: {
      street: expect.any(String),
      city: expect.any(String),
      country: expect.any(String),
    },
  });
});
```

### List Generation

Generate arrays of fake data:

```typescript
Given(async (ctx, { Fake }) => {
  // Generate 3 users
  Fake.list(3, 'users', (F) => ({
    id: F.string.uuid(),
    name: F.person.fullName(),
    email: F.internet.email(),
  }));

  // Access generated list from context
  expect(ctx.fake.users).toHaveLength(3);
  expect(ctx.fake.users[0]).toEqual({
    id: expect.any(String),
    name: expect.any(String),
    email: expect.any(String),
  });
});
```

### Generator Context Behavior

When using generator functions with `data()` or `list()`:

1. Individual faker calls inside the generator do not store to context
2. Only the final returned object/array is stored at the specified path
3. This prevents cluttering the context with intermediate values

## Architecture

The Fakish utility is built using a proxy-based architecture that:

1. Intercepts all Faker method calls
2. Automatically stores generated values in context
3. Provides additional utility methods (`data` and `list`)
4. Manages context access through the `useCtx` utility

### Context Structure

Generated data is stored in the test context under the 'fake' key:

```typescript
{
  fake: {
    // Direct faker calls - stored using final segment
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',

    // Nested data from data('user') - stored flat under user
    user: {
      firstName: 'Jane',  // from userFake.person.firstName()
      email: 'jane@example.com',  // from userFake.internet.email()
    },

    // Data from generator function - maintains structure
    admin: {
      name: 'Admin User',
      address: {
        street: '123 Main St'
      }
    },

    // Lists require generator and always maintain structure
    users: [
      { id: '...', name: '...' },
      { id: '...', name: '...' }
    ]
  }
}
```

### Generator Context Behavior

When using generator functions with `data()` or `list()`:

1. Individual faker calls inside the generator do not store to context
2. Only the final returned object/array is stored at the specified path
3. This prevents cluttering the context with intermediate values

## Best Practices

1. **Use in Given Steps**: Only use Fakish in `Given` steps to maintain clear test structure
2. **Consistent Data Structure**: Use generator functions for complex objects to ensure consistent structure
3. **Meaningful Paths**: Use descriptive nested paths that reflect your data structure
4. **Reuse Data**: Reference generated data in subsequent steps using context

## API Reference

### Extended Faker Interface

```typescript
interface Extended extends Faker {
  data: {
    (nestedKey: string): Extended;
    <T>(nestedKey: string, generator: (Fake: Extended) => T): void;
  };
  list: <T>(count: number, nestedKey: string, generator: (Fake: Extended) => T) => void;
}
```

### Methods

- **`data(nestedKey: string): Extended`**
  - Returns an Extended Faker instance that stores generated values under the specified path
  - Values are stored flat under the provided key
- **`data<T>(nestedKey: string, generator: (Fake: Extended) => T): void`**
  - Generates and stores complex data structures using a generator function
  - Individual faker calls inside the generator do not affect context
  - The returned object structure is preserved
- **`list<T>(count: number, nestedKey: string, generator: (Fake: Extended) => T): void`**
  - Generates an array of fake data using the provided generator function
  - Individual faker calls inside the generator do not affect context

## Dependencies

- **@faker-js/faker**: Core faker functionality
- **Context Management**: Internal `useCtx` utility for test context management
