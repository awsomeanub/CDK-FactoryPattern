import { Construct } from 'constructs';
import { RemovalPolicy } from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { BaseConstruct, BaseConstructProps } from './base';

/**
 * Attribute definition for DynamoDB table.
 */
export interface AttributeDefinition {
  /** The attribute name */
  readonly name: string;
  /** The attribute type */
  readonly type: dynamodb.AttributeType;
}

/**
 * Global Secondary Index configuration.
 */
export interface GlobalSecondaryIndexConfig {
  /** The index name */
  readonly indexName: string;
  /** The partition key for the GSI */
  readonly partitionKey: AttributeDefinition;
  /** The optional sort key for the GSI */
  readonly sortKey?: AttributeDefinition;
  /** Projection type (default: ALL) */
  readonly projectionType?: dynamodb.ProjectionType;
  /** Non-key attributes to project when using INCLUDE projection */
  readonly nonKeyAttributes?: string[];
}

/**
 * Local Secondary Index configuration.
 */
export interface LocalSecondaryIndexConfig {
  /** The index name */
  readonly indexName: string;
  /** The sort key for the LSI */
  readonly sortKey: AttributeDefinition;
  /** Projection type (default: ALL) */
  readonly projectionType?: dynamodb.ProjectionType;
  /** Non-key attributes to project when using INCLUDE projection */
  readonly nonKeyAttributes?: string[];
}

/**
 * Properties for configuring the DynamoTable construct.
 */
export interface DynamoTableProps extends BaseConstructProps {
  /** The table name (will be prefixed with app/stage) */
  readonly tableName: string;
  /** The partition key attribute definition */
  readonly partitionKey: AttributeDefinition;
  /** The optional sort key attribute definition */
  readonly sortKey?: AttributeDefinition;
  /** Billing mode (default: PAY_PER_REQUEST per org standards) */
  readonly billingMode?: dynamodb.BillingMode;
  /** Enable point-in-time recovery (default: true per org standards) */
  readonly pointInTimeRecovery?: boolean;
  /** Table encryption type (default: AWS_MANAGED per org standards) */
  readonly encryption?: dynamodb.TableEncryption;
  /** Removal policy (default: RETAIN per org standards) */
  readonly removalPolicy?: RemovalPolicy;
  /** Time to live attribute name (optional) */
  readonly timeToLiveAttribute?: string;
  /** Enable DynamoDB Streams (optional) */
  readonly stream?: dynamodb.StreamViewType;
  /** Global Secondary Indexes (optional) */
  readonly globalSecondaryIndexes?: GlobalSecondaryIndexConfig[];
  /** Local Secondary Indexes (optional) */
  readonly localSecondaryIndexes?: LocalSecondaryIndexConfig[];
  /** Enable contributor insights (default: false) */
  readonly contributorInsights?: boolean;
}

/**
 * DynamoTable construct implementing organizational DynamoDB standards.
 *
 * Organizational Standards:
 * - Billing Mode: PAY_PER_REQUEST (on-demand)
 * - Encryption: AWS_MANAGED
 * - Point-in-Time Recovery: Enabled
 * - Removal Policy: RETAIN (prevents accidental deletion)
 *
 * @example
 * ```typescript
 * const table = new DynamoTable(this, 'UsersTable', {
 *   context: {
 *     stageName: 'prod',
 *     appName: 'myapp',
 *     isProduction: true,
 *   },
 *   tableName: 'users',
 *   partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
 *   sortKey: { name: 'createdAt', type: dynamodb.AttributeType.NUMBER },
 * });
 *
 * // Access the underlying table
 * const underlyingTable = table.table;
 * ```
 */
export class DynamoTable extends BaseConstruct<DynamoTableProps> {
  /** The underlying CDK DynamoDB Table construct */
  public readonly table: dynamodb.Table;

  /** The table name */
  public readonly tableName: string;

  /** The table ARN */
  public readonly tableArn: string;

  /**
   * Creates a new DynamoTable with organizational standards.
   *
   * @param scope - The parent construct scope
   * @param id - The construct identifier
   * @param props - The DynamoDB table configuration properties
   */
  constructor(scope: Construct, id: string, props: DynamoTableProps) {
    super(scope, id, props);

    this.validateProps(props);

    const billingMode = props.billingMode ?? dynamodb.BillingMode.PAY_PER_REQUEST;
    const pointInTimeRecovery = props.pointInTimeRecovery ?? true;
    const encryption = props.encryption ?? dynamodb.TableEncryption.AWS_MANAGED;
    const removalPolicy = props.removalPolicy ?? RemovalPolicy.RETAIN;
    const contributorInsights = props.contributorInsights ?? this.isProd();

    const fullTableName = this.getResourceName(props.tableName);

    this.log(`Creating DynamoDB table: ${fullTableName}`);

    this.table = new dynamodb.Table(this, 'Table', {
      tableName: fullTableName,
      partitionKey: {
        name: props.partitionKey.name,
        type: props.partitionKey.type,
      },
      sortKey: props.sortKey
        ? {
            name: props.sortKey.name,
            type: props.sortKey.type,
          }
        : undefined,
      billingMode,
      pointInTimeRecovery,
      encryption,
      removalPolicy,
      stream: props.stream,
      timeToLiveAttribute: props.timeToLiveAttribute,
      contributorInsightsEnabled: contributorInsights,
    });

    // Add Global Secondary Indexes
    if (props.globalSecondaryIndexes) {
      this.addGlobalSecondaryIndexes(props.globalSecondaryIndexes);
    }

    // Add Local Secondary Indexes
    if (props.localSecondaryIndexes) {
      this.addLocalSecondaryIndexes(props.localSecondaryIndexes);
    }

    this.tableName = this.table.tableName;
    this.tableArn = this.table.tableArn;

    this.log('DynamoDB table created successfully');
  }

  /**
   * Validates the DynamoDB table properties.
   *
   * @param props - The table properties to validate
   */
  private validateProps(props: DynamoTableProps): void {
    if (!props.tableName || props.tableName.trim().length === 0) {
      throw new Error('tableName is required and cannot be empty');
    }

    if (!props.partitionKey || !props.partitionKey.name) {
      throw new Error('partitionKey with a valid name is required');
    }

    if (props.billingMode === dynamodb.BillingMode.PROVISIONED) {
      this.log(
        'Warning: Using PROVISIONED billing mode deviates from org standards (PAY_PER_REQUEST)',
        'warn'
      );
    }

    if (props.removalPolicy === RemovalPolicy.DESTROY && this.isProd()) {
      this.log(
        'Warning: DESTROY removal policy in production environment is not recommended',
        'warn'
      );
    }
  }

  /**
   * Adds Global Secondary Indexes to the table.
   *
   * @param indexes - Array of GSI configurations
   */
  private addGlobalSecondaryIndexes(
    indexes: GlobalSecondaryIndexConfig[]
  ): void {
    indexes.forEach((gsi) => {
      this.log(`Adding GSI: ${gsi.indexName}`);
      this.table.addGlobalSecondaryIndex({
        indexName: gsi.indexName,
        partitionKey: {
          name: gsi.partitionKey.name,
          type: gsi.partitionKey.type,
        },
        sortKey: gsi.sortKey
          ? {
              name: gsi.sortKey.name,
              type: gsi.sortKey.type,
            }
          : undefined,
        projectionType: gsi.projectionType ?? dynamodb.ProjectionType.ALL,
        nonKeyAttributes: gsi.nonKeyAttributes,
      });
    });
  }

  /**
   * Adds Local Secondary Indexes to the table.
   *
   * @param indexes - Array of LSI configurations
   */
  private addLocalSecondaryIndexes(indexes: LocalSecondaryIndexConfig[]): void {
    indexes.forEach((lsi) => {
      this.log(`Adding LSI: ${lsi.indexName}`);
      this.table.addLocalSecondaryIndex({
        indexName: lsi.indexName,
        sortKey: {
          name: lsi.sortKey.name,
          type: lsi.sortKey.type,
        },
        projectionType: lsi.projectionType ?? dynamodb.ProjectionType.ALL,
        nonKeyAttributes: lsi.nonKeyAttributes,
      });
    });
  }

  /**
   * Grants read permissions on the table to a grantee.
   *
   * @param grantee - The IAM grantee (e.g., Lambda function)
   */
  public grantReadData(grantee: dynamodb.IGrantable): void {
    this.table.grantReadData(grantee);
  }

  /**
   * Grants write permissions on the table to a grantee.
   *
   * @param grantee - The IAM grantee (e.g., Lambda function)
   */
  public grantWriteData(grantee: dynamodb.IGrantable): void {
    this.table.grantWriteData(grantee);
  }

  /**
   * Grants full read/write permissions on the table to a grantee.
   *
   * @param grantee - The IAM grantee (e.g., Lambda function)
   */
  public grantReadWriteData(grantee: dynamodb.IGrantable): void {
    this.table.grantReadWriteData(grantee);
  }
}
