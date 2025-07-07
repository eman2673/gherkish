# Database Client Architecture

This module provides a flexible database client architecture that supports both SQL and NoSQL databases through a unified interface.

## Architecture Overview

The database client system is built around the `DBClient` interface, which provides a common API for different database types:

- **`SqlClient`** - Abstract base class for SQL databases
- **`PgClient`** - PostgreSQL-specific implementation
- **`DynamoClient`** - DynamoDB implementation
- **`DbClientRegistry`** - Main registry for managing multiple database connections

## Usage Examples

### PostgreSQL Client

```typescript
import { PgClient } from './pg.client';

const pgClient = new PgClient({
  host: 'localhost',
  port: 5432,
  database: 'myapp',
  user: 'postgres',
  password: 'password',
});

await pgClient.connect();

// Insert a record
const result = await pgClient.insert('users', {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
});

// Select records
const users = await pgClient.select('users', { email: 'john@example.com' });

await pgClient.close();
```

### DynamoDB Client

```typescript
import { DynamoClient } from './dynamo.client';

const dynamoClient = new DynamoClient(
  {
    region: 'us-east-1',
    credentials: {
      accessKeyId: 'your-access-key',
      secretAccessKey: 'your-secret-key',
    },
  },
  'users-table'
);

// Insert a record
const result = await dynamoClient.insert('users', {
  id: 'user-123',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
});

// Select records
const users = await dynamoClient.select('users', { id: 'user-123' });
```

### Using the Registry

```typescript
import { DbClientRegistry, PgClient, DynamoClient } from './index';

const registry = new DbClientRegistry();

// Register PostgreSQL database
registry.registerDb('postgres', {
  connect: async () => {
    const client = new PgClient({
      host: 'localhost',
      port: 5432,
      database: 'myapp',
      user: 'postgres',
      password: 'password',
    });
    await client.connect();
    return client;
  },
});

// Register DynamoDB
registry.registerDb('dynamo', {
  connect: async () => {
    return new DynamoClient(
      {
        region: 'us-east-1',
      },
      'users-table'
    );
  },
});

// Use the registry
const result = await registry.sendRequest('postgres', 'users', 'insert', {
  data: { firstName: 'John', lastName: 'Doe' },
});
```

## Key Features

1. **Unified Interface**: All database clients implement the same `DBClient` interface
2. **SQL Abstraction**: `SqlClient` provides common SQL operations that can be extended
3. **NoSQL Support**: `DynamoClient` maps SQL-like operations to DynamoDB operations
4. **Connection Management**: `DbClientRegistry` manages multiple database connections
5. **Default Values**: Support for setting default values for tables
6. **Context Integration**: Integrates with the global context system

## Extending the System

To add support for a new database:

1. Implement the `DBClient` interface
2. Extend `SqlClient` if it's a SQL database
3. Register the client with `DbClientRegistry`

## Dependencies

- **PostgreSQL**: `pg` package
- **DynamoDB**: `@aws-sdk/client-dynamodb` and `@aws-sdk/lib-dynamodb` packages
- **Utilities**: `change-case` for case conversion
