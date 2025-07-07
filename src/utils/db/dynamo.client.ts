import './db.client';
import { DynamoDBClient as AwsDynamoClient, DynamoDBClientConfig } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import { DBClient } from './db.types';
import type { DBNameSpace } from '../../types/global';

/**
 * DynamoDB client that implements the DBClient interface
 * Maps SQL-like operations to DynamoDB operations
 */
export class DynamoClient implements DBClient {
  private client: DynamoDBDocumentClient;
  private tableName: string;

  constructor(config: DynamoDBClientConfig, tableName: string) {
    const dynamoClient = new AwsDynamoClient(config);
    this.client = DynamoDBDocumentClient.from(dynamoClient);
    this.tableName = tableName;
  }

  /**
   * Select records from a table (maps to Scan or Query)
   */
  async select(table: string, where?: Record<string, any>): Promise<any[]> {
    if (!where || Object.keys(where).length === 0) {
      // Use Scan for no WHERE clause
      const command = new ScanCommand({
        TableName: table,
      });
      const result = await this.client.send(command);
      return result.Items || [];
    }

    // Use Query for WHERE clause (assumes primary key is provided)
    // Note: This is a simplified implementation - real DynamoDB queries need proper key structure
    const command = new QueryCommand({
      TableName: table,
      KeyConditionExpression: this.buildKeyConditionExpression(where),
      ExpressionAttributeValues: this.buildExpressionAttributeValues(where),
    });
    const result = await this.client.send(command);
    return result.Items || [];
  }

  /**
   * Insert records into a table (maps to Put)
   */
  async insert(table: string, data: Record<string, any>): Promise<any[]> {
    const command = new PutCommand({
      TableName: table,
      Item: data,
    });
    await this.client.send(command);
    return [data]; // Return the inserted data
  }

  /**
   * Update records in a table (maps to Update)
   */
  async update(
    table: string,
    data: Record<string, any>,
    where: Record<string, any>
  ): Promise<any[]> {
    const updateExpression = this.buildUpdateExpression(data);
    const command = new UpdateCommand({
      TableName: table,
      Key: where, // Primary key for the update
      UpdateExpression: updateExpression.expression,
      ExpressionAttributeNames: updateExpression.names,
      ExpressionAttributeValues: updateExpression.values,
      ReturnValues: 'ALL_NEW',
    });
    const result = await this.client.send(command);
    return [result.Attributes];
  }

  /**
   * Delete records from a table (maps to Delete)
   */
  async delete(table: string, where: Record<string, any>): Promise<any[]> {
    const command = new DeleteCommand({
      TableName: table,
      Key: where, // Primary key for deletion
      ReturnValues: 'ALL_OLD',
    });
    const result = await this.client.send(command);
    return [result.Attributes];
  }

  /**
   * Execute a custom DynamoDB operation
   */
  async exec(...args: any[]): Promise<any> {
    // This could be used for custom DynamoDB operations
    throw new Error('Custom exec operations not implemented for DynamoDB');
  }

  /**
   * Close the DynamoDB client
   */
  async close(): Promise<void> {
    // DynamoDB client doesn't need explicit closing
  }

  /**
   * Build DynamoDB update expression
   */
  private buildUpdateExpression(data: Record<string, any>) {
    const expressions: string[] = [];
    const names: Record<string, string> = {};
    const values: Record<string, any> = {};

    Object.entries(data).forEach(([key, value], index) => {
      const attrName = `#attr${index}`;
      const attrValue = `:val${index}`;

      expressions.push(`${attrName} = ${attrValue}`);
      names[attrName] = key;
      values[attrValue] = value;
    });

    return {
      expression: `SET ${expressions.join(', ')}`,
      names,
      values,
    };
  }

  /**
   * Build DynamoDB key condition expression
   */
  private buildKeyConditionExpression(where: Record<string, any>): string {
    return Object.keys(where)
      .map((key, index) => `#key${index} = :val${index}`)
      .join(' AND ');
  }

  /**
   * Build DynamoDB expression attribute values
   */
  private buildExpressionAttributeValues(where: Record<string, any>): Record<string, any> {
    const values: Record<string, any> = {};
    Object.entries(where).forEach(([key, value], index) => {
      values[`:val${index}`] = value;
    });
    return values;
  }
}

export default (context: DBNameSpace) => {
  context.DynamoClient = DynamoClient;
};
