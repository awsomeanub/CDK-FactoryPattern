/**
 * Factory Pattern Constructs
 *
 * This module exports all organizational-standard constructs
 * for building AWS CDK infrastructure with consistent patterns.
 *
 * @module constructs
 */

// Base construct
export { BaseConstruct, BaseConstructProps, ConstructContext } from './base';

// VPC construct
export { SecureVpc, SecureVpcProps } from './vpc';

// DynamoDB construct
export {
  DynamoTable,
  DynamoTableProps,
  AttributeDefinition,
  GlobalSecondaryIndexConfig,
  LocalSecondaryIndexConfig,
} from './dynamodb';

// S3 construct
export {
  S3Bucket,
  S3BucketProps,
  LifecycleRuleConfig,
  CorsRuleConfig,
} from './s3';

// Lambda construct
export {
  SecureLambda,
  SecureLambdaProps,
  EnvironmentVariables,
  LambdaVpcConfig,
} from './lambda';
