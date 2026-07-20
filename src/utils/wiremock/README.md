# WireMock Utility

The WireMock utility provides a fluent API for mocking HTTP services in your tests using WireMock. It supports multiple service paths on a single WireMock instance, content type-specific stubbing, and request verification.

This utility is built on top of [WireMock](https://wiremock.org/), a flexible library for stubbing and mocking web services. For detailed information about WireMock's capabilities and matching rules, see the [official WireMock documentation](https://wiremock.org/docs/request-matching/).

## Table of Contents

- [Setup](#setup)
- [Basic Usage](#basic-usage)
- [Fluent API](#fluent-api)
- [Content Types](#content-types)
- [Request Verification](#request-verification)
- [Examples](#examples)
- [WireMock Documentation](#wiremock-documentation)

## Setup

1. **Start WireMock**

   The WireMock service should be running and accessible. You can use the provided Docker Compose configuration:

   ```yaml
   wiremock:
     image: wiremock/wiremock:3.4.1
     ports:
       - '8080:8080'
     volumes:
       - wiremock-data:/home/wiremock
     command: --verbose --global-response-templating --async-response-enabled=true
   ```

2. **Configure Services**

   In your test setup, configure the WireMock services:

   ```typescript
   import { WireMock } from '@boom/gherkish';

   // Configure WireMock base URL
   WireMock.setBaseUrl('http://localhost:8080');

   // Add service paths
   WireMock.add('external', { rootPath: '/external' });
   WireMock.add('openai', { rootPath: '/openai' });
   ```

## Basic Usage

```typescript
Feature('External API Integration', () => {
  Scenario('Basic request matching', () => {
    Given(async (_, { Mock }) => {
      // Create a stub with JSON response
      await Mock.stub.json.get('external', '/api/test', {
        message: 'WireMock is working!',
      });
    });

    When(async (_, { HTTP }) => {
      // Make a request that would trigger the mocked enpoint
      await HTTP.get('external', '/external/api/test');
    });

    Then(({ http }, { expect }) => {
      // Verify response
      expect(http.response?.status).toBe(200);
      expect(http.responseObject).toEqual({
        message: 'WireMock is working!',
      });
    });
  });
});
```

## Fluent API

The WireMock utility provides a fluent API for creating stubs:

```typescript
// Simple response
Mock.stub.json.get('external', '/api/test', {
  message: 'Hello World',
});

// Full configuration
Mock.stub.json.post('external', '/api/test', {
  request: {
    bodyPatterns: [{ matchesJsonPath: '$.type' }],
  },
  response: {
    status: 200,
    jsonBody: { status: 'created' },
  },
});
```

### HTTP Methods

- `get(mockName, path, config?)`
- `post(mockName, path, config?)`
- `put(mockName, path, config?)`
- `patch(mockName, path, config?)`
- `delete(mockName, path, config?)`
- `options(mockName, path, config?)`
- `any(mockName, path, config?)`

## Content Types

The utility supports different content types with appropriate headers:

### JSON (Default)

```typescript
Mock.stub.json.get('external', '/api/test', {
  data: { key: 'value' },
});
```

### Text

```typescript
Mock.stub.text.get('external', '/api/text', 'Hello, World!');
```

### XML

```typescript
Mock.stub.xml.post(
  'external',
  '/api/xml',
  `
  <?xml version="1.0" encoding="UTF-8"?>
  <response>
    <message>XML Response</message>
  </response>
`,
);
```

## Request Verification

Verify that requests were made to your stubs:

```typescript
Then(async (_, { expect, Mock }) => {
  const verification = await Mock.verify('external', 'GET', '/api/test');
  expect(verification.count).toBe(1);
});
```

## Examples

### Complex JSON Matching

```typescript
Given(async (_, { Mock }) => {
  await Mock.stub.json.post('external', '/api/users', {
    request: {
      bodyPatterns: [{ matchesJsonPath: '$.name' }, { matchesJsonPath: '$.email' }],
      headers: {
        'Content-Type': {
          contains: 'application/json',
        },
      },
    },
    response: {
      status: 201,
      jsonBody: {
        id: '123',
        status: 'created',
      },
    },
  });
});
```

### Query Parameter Matching

```typescript
Given(async (_, { Mock }) => {
  await Mock.stub.json.get('external', '/api/search', {
    request: {
      queryParameters: {
        q: { matches: '.*' },
        limit: { equalTo: '10' },
      },
    },
    response: {
      jsonBody: {
        results: [],
        total: 0,
      },
    },
  });
});
```

### Multiple URL Patterns

```typescript
Given(async (_, { Mock }) => {
  // Match exact path
  await Mock.stub.json.get('external', '/api/users/123', {
    response: { id: '123', name: 'John' },
  });

  // Match pattern
  await Mock.stub.json.get('external', '/api/users/.*', {
    request: {
      urlPathPattern: '/api/users/.*',
    },
    response: { error: 'User not found' },
  });
});
```

### Response Templating

```typescript
Given(async (_, { Mock }) => {
  await Mock.stub.json.post('external', '/api/echo', {
    request: {
      bodyPatterns: [{ matchesJsonPath: '$.message' }],
    },
    response: {
      status: 200,
      jsonBody: {
        echo: '{{request.body.message}}',
        timestamp: '{{now}}',
      },
    },
  });
});
```

## WireMock Documentation

For more advanced features and configurations, refer to the official WireMock documentation:

- [Request Matching](https://wiremock.org/docs/request-matching/) - Details on matching request patterns
- [Response Templating](https://wiremock.org/docs/response-templating/) - Dynamic response generation
- [Stubbing](https://wiremock.org/docs/stubbing/) - Complete guide to stub mappings
- [Verifying](https://wiremock.org/docs/verifying/) - Request verification options
- [Record and Playback](https://wiremock.org/docs/record-playback/) - Recording real HTTP interactions
- [Simulating Faults](https://wiremock.org/docs/simulating-faults/) - Testing error conditions
- [Configuration](https://wiremock.org/docs/configuration/) - WireMock server configuration
