import { App, Stack } from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { DynamoTable } from '../../lib/implementations/constructs';
import {
  createTestStack,
  createMockContext,
  createProdContext,
} from '../helpers';

describe('DynamoTable', () => {
  let app: App;
  let stack: Stack;

  beforeEach(() => {
    app = new App();
    stack = createTestStack(app);
  });

  describe('basic creation', () => {
    it('creates a DynamoDB table', () => {
      new DynamoTable(stack, 'TestTable', {
        context: createMockContext(),
        tableName: 'test',
        partitionKey: {
          name: 'pk',
          type: dynamodb.AttributeType.STRING,
        },
      });

      const template = Template.fromStack(stack);
      template.hasResource('AWS::DynamoDB::Table', {});
    });

    it('creates table with correct partition key', () => {
      new DynamoTable(stack, 'TestTable', {
        context: createMockContext(),
        tableName: 'test',
        partitionKey: {
          name: 'pk',
          type: dynamodb.AttributeType.STRING,
        },
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        KeySchema: expect.arrayContaining([
          {
            AttributeName: 'pk',
            KeyType: 'HASH',
          },
        ]),
      });
    });

    it('creates table with sort key when specified', () => {
      new DynamoTable(stack, 'TestTable', {
        context: createMockContext(),
        tableName: 'test',
        partitionKey: {
          name: 'pk',
          type: dynamodb.AttributeType.STRING,
        },
        sortKey: {
          name: 'sk',
          type: dynamodb.AttributeType.NUMBER,
        },
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        KeySchema: expect.arrayContaining([
          { AttributeName: 'pk', KeyType: 'HASH' },
          { AttributeName: 'sk', KeyType: 'RANGE' },
        ]),
      });
    });

    it('throws error if table name is empty', () => {
      expect(() => {
        new DynamoTable(stack, 'TestTable', {
          context: createMockContext(),
          tableName: '',
          partitionKey: {
            name: 'pk',
            type: dynamodb.AttributeType.STRING,
          },
        });
      }).toThrow('tableName is required and cannot be empty');
    });

    it('throws error if partition key is missing', () => {
      expect(() => {
        new DynamoTable(stack, 'TestTable', {
          context: createMockContext(),
          tableName: 'test',
          partitionKey: {
            name: '',
            type: dynamodb.AttributeType.STRING,
          },
        });
      }).toThrow('partitionKey with a valid name is required');
    });
  });

  describe('organizational standards', () => {
    it('uses PAY_PER_REQUEST billing by default', () => {
      new DynamoTable(stack, 'TestTable', {
        context: createMockContext(),
        tableName: 'test',
        partitionKey: {
          name: 'pk',
          type: dynamodb.AttributeType.STRING,
        },
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        BillingMode: 'PAY_PER_REQUEST',
      });
    });

    it('enables point-in-time recovery by default', () => {
      new DynamoTable(stack, 'TestTable', {
        context: createMockContext(),
        tableName: 'test',
        partitionKey: {
          name: 'pk',
          type: dynamodb.AttributeType.STRING,
        },
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        PointInTimeRecoverySpecification: {
          PointInTimeRecoveryEnabled: true,
        },
      });
    });

    it('uses RETAIN deletion policy by default', () => {
      new DynamoTable(stack, 'TestTable', {
        context: createMockContext(),
        tableName: 'test',
        partitionKey: {
          name: 'pk',
          type: dynamodb.AttributeType.STRING,
        },
      });

      const template = Template.fromStack(stack);
      template.hasResource('AWS::DynamoDB::Table', {
        DeletionPolicy: 'Retain',
        UpdateReplacePolicy: 'Retain',
      });
    });
  });

  describe('global secondary indexes', () => {
    it('creates GSI with partition key', () => {
      new DynamoTable(stack, 'TestTable', {
        context: createMockContext(),
        tableName: 'test',
        partitionKey: {
          name: 'pk',
          type: dynamodb.AttributeType.STRING,
        },
        globalSecondaryIndexes: [
          {
            indexName: 'gsi1',
            partitionKey: {
              name: 'gsi1pk',
              type: dynamodb.AttributeType.STRING,
            },
          },
        ],
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        GlobalSecondaryIndexes: expect.arrayContaining([
          expect.objectContaining({
            IndexName: 'gsi1',
            KeySchema: expect.arrayContaining([
              { AttributeName: 'gsi1pk', KeyType: 'HASH' },
            ]),
          }),
        ]),
      });
    });

    it('creates GSI with partition and sort key', () => {
      new DynamoTable(stack, 'TestTable', {
        context: createMockContext(),
        tableName: 'test',
        partitionKey: {
          name: 'pk',
          type: dynamodb.AttributeType.STRING,
        },
        globalSecondaryIndexes: [
          {
            indexName: 'gsi1',
            partitionKey: {
              name: 'gsi1pk',
              type: dynamodb.AttributeType.STRING,
            },
            sortKey: {
              name: 'gsi1sk',
              type: dynamodb.AttributeType.NUMBER,
            },
          },
        ],
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        GlobalSecondaryIndexes: expect.arrayContaining([
          expect.objectContaining({
            IndexName: 'gsi1',
            KeySchema: expect.arrayContaining([
              { AttributeName: 'gsi1pk', KeyType: 'HASH' },
              { AttributeName: 'gsi1sk', KeyType: 'RANGE' },
            ]),
          }),
        ]),
      });
    });
  });

  describe('TTL configuration', () => {
    it('enables TTL when attribute specified', () => {
      new DynamoTable(stack, 'TestTable', {
        context: createMockContext(),
        tableName: 'test',
        partitionKey: {
          name: 'pk',
          type: dynamodb.AttributeType.STRING,
        },
        timeToLiveAttribute: 'ttl',
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TimeToLiveSpecification: {
          AttributeName: 'ttl',
          Enabled: true,
        },
      });
    });
  });

  describe('contributor insights', () => {
    it('enables contributor insights in production', () => {
      new DynamoTable(stack, 'TestTable', {
        context: createProdContext(),
        tableName: 'test',
        partitionKey: {
          name: 'pk',
          type: dynamodb.AttributeType.STRING,
        },
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        ContributorInsightsSpecification: {
          Enabled: true,
        },
      });
    });
  });

  describe('resource naming', () => {
    it('generates correct table name', () => {
      new DynamoTable(stack, 'TestTable', {
        context: createMockContext({
          appName: 'myapp',
          stageName: 'dev',
        }),
        tableName: 'users',
        partitionKey: {
          name: 'pk',
          type: dynamodb.AttributeType.STRING,
        },
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'myapp-dev-users',
      });
    });
  });

  describe('exposed properties', () => {
    it('exposes table name', () => {
      const table = new DynamoTable(stack, 'TestTable', {
        context: createMockContext(),
        tableName: 'test',
        partitionKey: {
          name: 'pk',
          type: dynamodb.AttributeType.STRING,
        },
      });

      expect(table.tableName).toBeDefined();
    });

    it('exposes table ARN', () => {
      const table = new DynamoTable(stack, 'TestTable', {
        context: createMockContext(),
        tableName: 'test',
        partitionKey: {
          name: 'pk',
          type: dynamodb.AttributeType.STRING,
        },
      });

      expect(table.tableArn).toBeDefined();
    });

    it('exposes underlying table', () => {
      const table = new DynamoTable(stack, 'TestTable', {
        context: createMockContext(),
        tableName: 'test',
        partitionKey: {
          name: 'pk',
          type: dynamodb.AttributeType.STRING,
        },
      });

      expect(table.table).toBeDefined();
    });
  });
});
