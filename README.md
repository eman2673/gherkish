# Gherkish - BDD Testing Framework

Gherkish is a Behavior-Driven Development (BDD) testing framework built on top of Vitest that provides a Gherkin-like syntax for writing expressive, readable tests. It includes built-in utilities for HTTP requests, database operations, and assertions, with a flexible architecture for extending with custom utilities.

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Basic Usage](#basic-usage)
- [Built-in Utilities](#built-in-utilities)
- [Extending Gherkish](#extending-gherkish)
- [Architecture](#architecture)
- [API Reference](#api-reference)
- [Examples](#examples)

## Overview

Gherkish provides a clean, Gherkin-inspired API for writing BDD tests:

```typescript
Feature('User Management', ({ beforeEach, afterEach, DB }) => {
  beforeEach(async () => {
    // Setup test data
    await DB.setDefaults('default', 'users', (ctx) => ({
      createdAt: new Date(),
      status: 'active',
    }));
  });

  Scenario('Creating a new user', ({ setContext }) => {
    Given(async (ctx, { DB }) => {
      await DB.insert('default', 'users', {
        email: 'test@example.com',
        name: 'Test User',
      });
    });

    When(async (ctx, { HTTP }) => {
      await HTTP.post('api', '/users', {
        data: { email: 'new@example.com', name: 'New User' },
      });
    });

    Then(({ http }, { expect, DB }) => {
      expect(http.response).to.have.property('status', 201);
      expect(http.responseObject).to.have.property('email', 'new@example.com');
    });
  });
});
```

## Installation

```bash
npm install gherkish
# or
yarn add gherkish
# or
pnpm add gherkish
```

### Development Installation

For development or if you want to use the latest version:

```bash
git clone https://github.com/eman2673/gherkish.git
cd gherkish
pnpm install
```

### Dependencies

- **Core**: Built on Vitest for testing (supports both Chai and Jest assertions)
- **HTTP**: Native fetch API
- **Database**:
  - PostgreSQL: `pg` package (peer dependency)
  - DynamoDB: `@aws-sdk/client-dynamodb` and `@aws-sdk/lib-dynamodb`
- **Utilities**: `change-case` for case conversion

### Repository

This package is available as a standalone repository at: https://github.com/eman2673/gherkish.git

## Basic Usage

### 1. Setup Test Environment

Create a test file and import the necessary utilities:

```typescript
import { useUtils } from 'gherkish';

// Initialize utilities
await useUtils('http.client', 'db/pg.client', 'expect');
```

### 2. Configure APIs and Databases

```typescript
import { DB, HTTP } from 'gherkish';

// Configure HTTP APIs
HTTP.add('api', {
  baseUrl: 'http://localhost:3000',
  defaultHeaders: {
    'Content-Type': 'application/json',
  },
});

// Configure databases
DB.add('default', {
  connect: async () => {
    // Return your database client
    return new DB.PgClient(config);
  },
});
```

### 3. Write BDD Tests

```typescript
Feature('Health Check', ({ beforeEach, afterEach }) => {
  beforeEach(async () => {
    // Setup before each scenario
  });

  Scenario('Application health is ok', () => {
    When('the health endpoint is checked', async (ctx, { HTTP }) => {
      await HTTP.get('api', '/health');
    });

    Then('the response should indicate the application is healthy', (ctx, { expect }) => {
      expect(ctx.http.response).to.have.property('status', 200);
      expect(ctx.http.responseObject).to.deep.include({
        status: 'ok',
        services: {
          MarketDB: { status: 'ok' },
          OperationsDB: { status: 'ok' },
        },
      });
    });
  });
});
```

## Built-in Utilities

### HTTP Client

The HTTP client provides a flexible way to make HTTP requests with support for multiple APIs, request/response hooks, and automatic context management.

```typescript
// Configure an API
HTTP.add('api', {
  baseUrl: 'http://localhost:3000',
  defaultHeaders: { Authorization: 'Bearer token' },
  before: (config) => {
    // Modify request before sending
    return config;
  },
  after: (response) => {
    // Process response
    return response;
  },
});

// Make requests
await HTTP.get('api', '/users');
await HTTP.post('api', '/users', { data: { name: 'John' } });
await HTTP.put('api', '/users/1', { data: { name: 'Jane' } });
await HTTP.delete('api', '/users/1');
```

### WireMock Client

The WireMock client provides a fluent API for mocking HTTP services in your tests. For detailed documentation, see the [WireMock Client Documentation](src/utils/wiremock/README.md).

```typescript
// Configure WireMock
WireMock.setBaseUrl('http://localhost:8080');
WireMock.add('external', { rootPath: '/external' });

// Create stubs
await Mock.stub.json.get('external', '/api/test', {
  message: 'Hello World',
});

// Verify requests
const verification = await Mock.verify('external', 'GET', '/api/test');
expect(verification.count).toBe(1);
```

### Database Client

The database client supports both SQL and NoSQL databases through a unified interface. For detailed documentation, see the [Database Client Documentation](src/utils/db/README.md).

### Fakish - Test Data Generation

Fakish is a powerful test data generation utility built on top of @faker-js/faker. For detailed documentation, see the [Fakish Documentation](src/utils/fakish/README.md).

### Assertions

Built-in integration with Vitest's expect for assertions. Vitest supports both Chai and Jest assertion styles:

```typescript
Then((ctx, { expect }) => {
  // Chai-style assertions
  expect(ctx.http.response).to.have.property('status', 200);
  expect(ctx.http.responseObject).to.deep.include({ id: 123 });

  // Jest-style assertions
  expect(ctx.http.response.status).toBe(200);
  expect(ctx.http.responseObject).toHaveProperty('id');
  expect(ctx.db.data).toHaveLength(1);
});
```

## Extending Gherkish

Gherkish is designed to be easily extensible. You can add custom utilities for any step type (Given, When, Then).

### 1. Create a Custom Utility

```typescript
// utils/custom.util.ts
import { registerStepUtils } from '../step-types';

export default function createCustomUtil(customNamespace?: any) {
  const customUtil = {
    // Your utility functions
    doSomething: async (param: string) => {
      // Implementation
      return `Processed: ${param}`;
    },

    validateSomething: (data: any) => {
      // Validation logic
      return data && typeof data === 'object';
    },
  };

  // Register with step types
  registerStepUtils({
    given: {
      Custom: customUtil,
    },
    when: {
      Custom: customUtil,
    },
    then: {
      Custom: customUtil,
    },
  });

  // If a namespace was provided, populate it with your utility
  if (customNamespace) {
    Object.assign(customNamespace, customUtil);
  }

  return customUtil;
}
```

### 2. Update Type Definitions

Extend the step utility types to include your custom utilities:

```typescript
// types/step-utils.types.ts
export type GivenUtils = {
  DB: DbGivenUtils;
  Custom: {
    doSomething: (param: string) => Promise<string>;
  };
};

export type WhenUtils = {
  HTTP: SendRequestUtil;
  DB: DbWhenUtils;
  Custom: {
    doSomething: (param: string) => Promise<string>;
  };
};

export type ThenUtils = {
  expect: typeof expect;
  DB: DbThenUtils;
  Custom: {
    validateSomething: (data: any) => boolean;
  };
};
```

### 3. Register Your Utility

To make your utility available through `useUtils`, add it to the `UTILS` array and `contextMap` in `index.ts`:

```typescript
// index.ts
const UTILS = ['db/pg.client', 'db/dynamo.client', 'http.client', 'expect', 'custom.util'] as const;

// If your utility needs to expose something globally (like DB or HTTP)
const CUSTOM = buildNameSpace<CustomNameSpace>();

const contextMap: { [key in Utils]?: any } = {
  'db/pg.client': DB,
  'db/dynamo.client': DB,
  'http.client': HTTP,
  'custom.util': CUSTOM, // Pass the namespace to your utility
};

export { useUtils, DB, HTTP, CUSTOM };
```

The `useUtils` function will automatically import and initialize your utility, passing the namespace from `contextMap` if provided. This allows your utility to expose functionality globally while maintaining lazy loading.

### 4. Use Your Custom Utility

```typescript
Feature('Custom Functionality', () => {
  Scenario('Using custom utility', () => {
    Given(async (ctx, { Custom }) => {
      await Custom.doSomething('test');
      // Context is automatically managed - no need to store results
    });

    When(async (ctx, { Custom }) => {
      await Custom.doSomething('action');
    });

    Then((ctx, { Custom }) => {
      // Access data from context if needed
      const isValid = Custom.validateSomething(ctx.data);
      expect(isValid).toBe(true);
    });
  });
});
```

## Architecture

### Core Components

1. **Feature Function**: Wraps Vitest's `describe` with BDD context
2. **Scenario Function**: Wraps Vitest's `test` with step execution
3. **Step Functions**: `Given`, `When`, `Then` for defining test steps
4. **Context System**: AsyncLocalStorage-based context management
5. **Utility Registry**: Dynamic utility registration and injection

### Context Flow

```
Feature → Scenario → Step Queue → Step Execution → Context Update
```

### Utility Injection

Utilities are injected into step functions based on their type:

- **Given**: Setup utilities (DB, custom setup)
- **When**: Action utilities (HTTP, DB operations)
- **Then**: Assertion utilities (expect, validation)

## API Reference

### Feature Function

```typescript
function feature(name: string, fn: (params: FeatureUtils) => void): void;
```

**Parameters:**

- `name`: Feature description
- `fn`: Function that defines scenarios

**Available methods:**

- `feature.only()`: Run only this feature
- `feature.skip()`: Skip this feature
- `feature.todo()`: Mark as TODO

### Scenario Function

```typescript
function scenario(name: string, define: (utils: ScenarioUtils) => void): void;
```

**Parameters:**

- `name`: Scenario description
- `define`: Function that defines steps

### Step Functions

```typescript
function Given(fn: StepFn<GivenUtils>): void;
function When(fn: StepFn<WhenUtils>): void;
function Then(fn: StepFn<ThenUtils>): void;
```

**Step Function Signature:**

```typescript
type StepFn<T> = (context: Context, utils: T) => void | Promise<void>;
```

### Context Management

```typescript
function setContext(key: string, value: any): void;
function useCtx(): Context;
```

### Utility Registration

```typescript
function registerStepUtils(utils: Partial<StepUtils>): void;
function useUtils(...utils: string[]): Promise<void>;
```

## Examples

### Complete Test Example

```typescript
import { useUtils, DB, HTTP } from 'gherkish';

// Setup
await useUtils('http.client', 'db/pg.client', 'expect');

// Configure services
HTTP.add('api', {
  baseUrl: 'http://localhost:3000',
  defaultHeaders: { 'Content-Type': 'application/json' },
});

DB.add('default', {
  connect: async () => {
    return new DB.PgClient({
      host: 'localhost',
      port: 5432,
      database: 'testdb',
      user: 'postgres',
      password: 'password',
    });
  },
});

// Write tests
Feature('User Management', ({ beforeEach, afterEach, DB }) => {
  beforeEach(async () => {
    await DB.setDefaults('default', 'users', (ctx) => ({
      createdAt: new Date(),
      status: 'active',
      verified: false,
    }));
  });

  afterEach(async () => {
    await DB.delete('default', 'users', {});
  });

  Scenario('Creating a new user', ({ setContext }) => {
    Given('no user exists with the new email', async (ctx, { DB }) => {
      await DB.delete('default', 'users', { email: 'new@example.com' });
    });

    When('a new user is created via the API', async (ctx, { HTTP }) => {
      await HTTP.post('api', '/users', {
        data: {
          email: 'new@example.com',
          name: 'New User',
          password: 'secure123',
        },
      });
    });

    Then('the user should be present in the database', async (ctx, { expect, DB }) => {
      expect(ctx.http.response).to.have.property('status', 201);
      expect(ctx.http.responseObject).to.have.property('id');
      expect(ctx.http.responseObject).to.have.property('email', 'new@example.com');

      // Query and check length
      await DB.expect('default', 'users', { email: 'new@example.com' }).toHaveLength(1);

      // For single result queries, db.responseObject contains the object directly
      expect(db.responseObject).toMatchObject({
        status: 'active',
        verified: false,
      });
    });
  });

  Scenario('User authentication', () => {
    Given('a user exists with valid credentials', async (ctx, { DB }) => {
      await DB.insert('default', 'users', {
        email: 'auth@example.com',
        name: 'Auth User',
        password: 'hashedPassword',
        status: 'active',
      });
    });

    When('the user attempts to log in', async (ctx, { HTTP }) => {
      await HTTP.post('api', '/auth/login', {
        data: {
          email: 'auth@example.com',
          password: 'password123',
        },
      });
    });

    Then('the response should include a valid token', (ctx, { expect }) => {
      expect(ctx.http.response).to.have.property('status', 200);
      expect(ctx.http.responseObject).to.have.property('token');
      expect(ctx.http.responseObject.user).to.have.property('email', 'auth@example.com');
    });
  });
});
```

### Custom Utility Example

```typescript
// utils/email.util.ts
import { registerStepUtils } from '../step-types';

export function createEmailUtil() {
  const emailUtil = {
    sendEmail: async (to: string, subject: string, body: string) => {
      // Mock email sending for tests
      console.log(`Email sent to ${to}: ${subject}`);
      return { id: 'email-123', status: 'sent' };
    },

    verifyEmailSent: (to: string) => {
      // Verify email was sent (mock implementation)
      return true;
    },
  };

  registerStepUtils({
    when: {
      Email: emailUtil,
    },
    then: {
      Email: emailUtil,
    },
  });

  return emailUtil;
}

// Usage in test
Feature('Email Notifications', () => {
  Scenario('Sending welcome email', () => {
    When(async (ctx, { Email }) => {
      await Email.sendEmail('user@example.com', 'Welcome!', 'Welcome to our platform');
    });

    Then((ctx, { Email, expect }) => {
      const wasSent = Email.verifyEmailSent('user@example.com');
      expect(wasSent).toBe(true);
    });
  });
});
```

## Contributing

When extending Gherkish:

1. **Follow the existing patterns** for utility creation and registration
2. **Update type definitions** to include your new utilities
3. **Write tests** for your custom utilities
4. **Document your utilities** with clear examples
5. **Consider context management** - utilities should integrate with the global context system

## Best Practices

1. **Use descriptive scenario names** that clearly explain the behavior being tested
2. **Keep scenarios focused** on a single behavior or user story
3. **Use Given steps for setup**, When steps for actions, Then steps for assertions
4. **Leverage default values** for common test data setup
5. **Clean up test data** in afterEach hooks
6. **Use context sharing** between steps when needed
7. **Write reusable utilities** for common operations
8. **Follow the existing naming conventions** for consistency
