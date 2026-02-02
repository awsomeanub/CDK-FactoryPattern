import { Construct } from 'constructs';
import { CfnOutput } from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { FactoryStackProps, TYPES } from '../../lib/definitions';
import { FactoryBaseStack } from '../../lib/factory';
import { S3Bucket, DynamoTable } from '../../lib/implementations/constructs';
import { VpcStack } from './VpcStack';

/**
 * Application Stack with S3 bucket and DynamoDB table.
 *
 * This stack creates:
 * - An S3 bucket with organizational security standards
 * - A DynamoDB table with on-demand billing
 *
 * Dependencies:
 * - VpcStack (for cross-stack reference demonstration)
 *
 * @example
 * ```typescript
 * const appStack = new AppStack(app, 'AppStack', {
 *   stageConfig: devStage,
 *   pipelineConfig,
 *   stageContext: {
 *     deployedStacks: new Map([[TYPES.VpcStack, vpcStack]]),
 *     ...
 *   },
 * });
 * ```
 */
export class AppStack extends FactoryBaseStack {
  /** The S3 bucket construct */
  public readonly bucket: S3Bucket;

  /** The DynamoDB table construct */
  public readonly table: DynamoTable;

  /**
   * Creates a new AppStack.
   *
   * @param scope - The parent construct scope
   * @param id - The stack identifier
   * @param props - The factory stack props
   */
  constructor(scope: Construct, id: string, props: FactoryStackProps) {
    super(scope, id, props);

    // Validate dependencies
    this.validateDependencies(TYPES.VpcStack);

    // Get VPC stack for cross-stack reference demonstration
    const vpcStack = this.getDeployedStack<VpcStack>(TYPES.VpcStack);
    if (vpcStack) {
      this.log(`Using VPC: ${vpcStack.vpc.vpcId}`);
    }

    // Get custom props
    const enableVersioning = this.getCustomProp<boolean>(
      'enableVersioning',
      this.isProd()
    );

    // Create S3 bucket
    this.bucket = this.createBucket(enableVersioning);

    // Create DynamoDB table
    this.table = this.createTable();

    // Create outputs
    this.createOutputs();
  }

  /**
   * Creates the S3 bucket with organizational standards.
   *
   * @param enableVersioning - Whether to enable versioning
   * @returns The S3Bucket construct
   */
  private createBucket(enableVersioning?: boolean): S3Bucket {
    return new S3Bucket(this, 'DataBucket', {
      context: {
        stageName: this.getStageName(),
        appName: this.pipelineConfig.appName,
        isProduction: this.isProd(),
      },
      bucketName: 'data',
      versioned: enableVersioning,
      lifecycleRules: this.isProd()
        ? [
            {
              id: 'archive-old-data',
              transitionToIaAfterDays: 90,
              transitionToGlacierAfterDays: 180,
              noncurrentVersionExpirationDays: 90,
            },
          ]
        : [
            {
              id: 'cleanup-dev-data',
              expirationDays: 30,
            },
          ],
    });
  }

  /**
   * Creates the DynamoDB table with organizational standards.
   *
   * @returns The DynamoTable construct
   */
  private createTable(): DynamoTable {
    return new DynamoTable(this, 'DataTable', {
      context: {
        stageName: this.getStageName(),
        appName: this.pipelineConfig.appName,
        isProduction: this.isProd(),
      },
      tableName: 'data',
      partitionKey: {
        name: 'pk',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'sk',
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
            type: dynamodb.AttributeType.STRING,
          },
        },
      ],
      timeToLiveAttribute: 'ttl',
    });
  }

  /**
   * Creates CloudFormation outputs for the stack resources.
   */
  private createOutputs(): void {
    new CfnOutput(this, 'BucketName', {
      value: this.bucket.bucketName,
      description: 'S3 Bucket Name',
      exportName: this.getResourceName('bucket-name'),
    });

    new CfnOutput(this, 'BucketArn', {
      value: this.bucket.bucketArn,
      description: 'S3 Bucket ARN',
      exportName: this.getResourceName('bucket-arn'),
    });

    new CfnOutput(this, 'TableName', {
      value: this.table.tableName,
      description: 'DynamoDB Table Name',
      exportName: this.getResourceName('table-name'),
    });

    new CfnOutput(this, 'TableArn', {
      value: this.table.tableArn,
      description: 'DynamoDB Table ARN',
      exportName: this.getResourceName('table-arn'),
    });
  }
}
