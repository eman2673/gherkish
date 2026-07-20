import "./chunk-E5YT573H.js";
import "./chunk-EBYPHWYD.js";
import "./chunk-BUSTDPMG.js";

// src/utils/db/dynamo.client.ts
import { DynamoDBClient as AwsDynamoClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand
} from "@aws-sdk/lib-dynamodb";
var DynamoClient = class {
  client;
  tableName;
  constructor(config, tableName) {
    const dynamoClient = new AwsDynamoClient(config);
    this.client = DynamoDBDocumentClient.from(dynamoClient);
    this.tableName = tableName;
  }
  /**
   * Select records from a table (maps to Scan or Query)
   */
  async select(table, where) {
    if (!where || Object.keys(where).length === 0) {
      const command2 = new ScanCommand({
        TableName: table
      });
      const result2 = await this.client.send(command2);
      return result2.Items || [];
    }
    const command = new QueryCommand({
      TableName: table,
      KeyConditionExpression: this.buildKeyConditionExpression(where),
      ExpressionAttributeValues: this.buildExpressionAttributeValues(where)
    });
    const result = await this.client.send(command);
    return result.Items || [];
  }
  /**
   * Insert records into a table (maps to Put)
   */
  async insert(table, data) {
    const command = new PutCommand({
      TableName: table,
      Item: data
    });
    await this.client.send(command);
    return [data];
  }
  /**
   * Update records in a table (maps to Update)
   */
  async update(table, data, where) {
    const updateExpression = this.buildUpdateExpression(data);
    const command = new UpdateCommand({
      TableName: table,
      Key: where,
      // Primary key for the update
      UpdateExpression: updateExpression.expression,
      ExpressionAttributeNames: updateExpression.names,
      ExpressionAttributeValues: updateExpression.values,
      ReturnValues: "ALL_NEW"
    });
    const result = await this.client.send(command);
    return [result.Attributes];
  }
  /**
   * Delete records from a table (maps to Delete)
   */
  async delete(table, where) {
    const command = new DeleteCommand({
      TableName: table,
      Key: where,
      // Primary key for deletion
      ReturnValues: "ALL_OLD"
    });
    const result = await this.client.send(command);
    return [result.Attributes];
  }
  /**
   * Execute a custom DynamoDB operation
   */
  async exec(...args) {
    throw new Error("Custom exec operations not implemented for DynamoDB");
  }
  /**
   * Close the DynamoDB client
   */
  async close() {
  }
  /**
   * Build DynamoDB update expression
   */
  buildUpdateExpression(data) {
    const expressions = [];
    const names = {};
    const values = {};
    Object.entries(data).forEach(([key, value], index) => {
      const attrName = `#attr${index}`;
      const attrValue = `:val${index}`;
      expressions.push(`${attrName} = ${attrValue}`);
      names[attrName] = key;
      values[attrValue] = value;
    });
    return {
      expression: `SET ${expressions.join(", ")}`,
      names,
      values
    };
  }
  /**
   * Build DynamoDB key condition expression
   */
  buildKeyConditionExpression(where) {
    return Object.keys(where).map((key, index) => `#key${index} = :val${index}`).join(" AND ");
  }
  /**
   * Build DynamoDB expression attribute values
   */
  buildExpressionAttributeValues(where) {
    const values = {};
    Object.entries(where).forEach(([key, value], index) => {
      values[`:val${index}`] = value;
    });
    return values;
  }
};
var dynamo_client_default = (context) => {
  context.DynamoClient = DynamoClient;
};
export {
  DynamoClient,
  dynamo_client_default as default
};
//# sourceMappingURL=dynamo.client-ZYKDVPUR.js.map