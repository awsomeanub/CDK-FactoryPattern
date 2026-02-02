# API Reference

Complete API documentation for the CDK Factory Pattern Framework.

## Table of Contents

- [Constructs](#constructs)
  - [BaseConstruct](#baseconstruct)
  - [SecureVpc](#securevpc)
  - [DynamoTable](#dynamotable)
  - [S3Bucket](#s3bucket)
  - [SecureLambda](#securelambda)
- [Definitions](#definitions)
  - [Types](#types)
  - [Interfaces](#interfaces)
  - [Configuration](#configuration)
- [Factory Classes](#factory-classes)
  - [FactoryBaseStack](#factorybasestack)
  - [StackFactory](#stackfactory)
  - [CdkAppFactory](#cdkappfactory)

---

## Constructs

### BaseConstruct

Abstract base class for organizational constructs.

#### Constructor

```typescript
constructor(scope: Construct, id: string, props: T extends BaseConstructProps)
```

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `context` | `ConstructContext` | Environment and app context |
| `props` | `T` | Construct properties |

#### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `getResourceName(name: string)` | `string` | Generates prefixed resource name |
| `isProd()` | `boolean` | Checks if production environment |
| `log(message: string, level?: string)` | `void` | Logs with context |

---

### SecureVpc

Secure VPC construct with organizational standards.

#### Constructor

```typescript
constructor(scope: Construct, id: string, props: SecureVpcProps)
```

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `vpc` | `ec2.Vpc` | Underlying CDK VPC |
| `publicSubnets` | `ec2.ISubnet[]` | Public subnet references |
| `privateSubnets` | `ec2.ISubnet[]` | Private subnet references |
| `isolatedSubnets` | `ec2.ISubnet[]` | Isolated subnet references |

#### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `addInterfaceEndpoint(service, options?)` | `InterfaceVpcEndpoint` | Adds interface endpoint |
| `addGatewayEndpoint(service, options?)` | `GatewayVpcEndpoint` | Adds gateway endpoint |

#### Props Interface

```typescript
interface SecureVpcProps extends BaseConstructProps {
  cidr?: string;                    // Default: '10.0.0.0/16'
  maxAzs?: number;                  // Default: 2, Min: 2
  natGateways?: number;             // Default: 1 (non-prod), maxAzs (prod)
  enableDnsHostnames?: boolean;     // Default: true
  enableDnsSupport?: boolean;       // Default: true
  enableFlowLogs?: boolean;         // Default: true (prod)
  subnetConfiguration?: SubnetConfiguration[];
}
```

---

### DynamoTable

DynamoDB table construct with organizational standards.

#### Constructor

```typescript
constructor(scope: Construct, id: string, props: DynamoTableProps)
```

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `table` | `dynamodb.Table` | Underlying CDK Table |
| `tableName` | `string` | Table name |
| `tableArn` | `string` | Table ARN |

#### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `grantReadData(grantee)` | `void` | Grants read permissions |
| `grantWriteData(grantee)` | `void` | Grants write permissions |
| `grantReadWriteData(grantee)` | `void` | Grants full permissions |

#### Props Interface

```typescript
interface DynamoTableProps extends BaseConstructProps {
  tableName: string;
  partitionKey: AttributeDefinition;
  sortKey?: AttributeDefinition;
  billingMode?: BillingMode;        // Default: PAY_PER_REQUEST
  pointInTimeRecovery?: boolean;    // Default: true
  encryption?: TableEncryption;      // Default: AWS_MANAGED
  removalPolicy?: RemovalPolicy;     // Default: RETAIN
  timeToLiveAttribute?: string;
  stream?: StreamViewType;
  globalSecondaryIndexes?: GlobalSecondaryIndexConfig[];
  localSecondaryIndexes?: LocalSecondaryIndexConfig[];
  contributorInsights?: boolean;
}
```

---

### S3Bucket

S3 bucket construct with organizational standards.

#### Constructor

```typescript
constructor(scope: Construct, id: string, props: S3BucketProps)
```

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `bucket` | `s3.Bucket` | Underlying CDK Bucket |
| `bucketName` | `string` | Bucket name |
| `bucketArn` | `string` | Bucket ARN |

#### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `grantRead(grantee)` | `void` | Grants read permissions |
| `grantWrite(grantee)` | `void` | Grants write permissions |
| `grantReadWrite(grantee)` | `void` | Grants full permissions |
| `grantPut(grantee, pattern?)` | `void` | Grants put permissions |
| `grantDelete(grantee, pattern?)` | `void` | Grants delete permissions |

#### Props Interface

```typescript
interface S3BucketProps extends BaseConstructProps {
  bucketName: string;
  versioned?: boolean;
  encryption?: BucketEncryption;     // Default: S3_MANAGED
  blockPublicAccess?: BlockPublicAccess; // Default: BLOCK_ALL
  objectOwnership?: ObjectOwnership; // Default: BUCKET_OWNER_ENFORCED
  removalPolicy?: RemovalPolicy;
  autoDeleteObjects?: boolean;
  serverAccessLogsBucket?: IBucket;
  serverAccessLogsPrefix?: string;
  lifecycleRules?: LifecycleRuleConfig[];
  cors?: CorsRuleConfig[];
  intelligentTiering?: boolean;
  eventBridgeEnabled?: boolean;
}
```

---

### SecureLambda

Lambda function construct with organizational standards.

#### Constructor

```typescript
constructor(scope: Construct, id: string, props: SecureLambdaProps)
```

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `function` | `lambda.Function` | Underlying CDK Function |
| `functionName` | `string` | Function name |
| `functionArn` | `string` | Function ARN |
| `role` | `iam.IRole` | Execution role |

#### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `addEnvironment(key, value)` | `void` | Adds environment variable |
| `addLayers(...layers)` | `void` | Adds Lambda layers |
| `addPermission(id, options)` | `void` | Adds invoke permission |
| `grantInvoke(grantee)` | `void` | Grants invoke permission |
| `addManagedPolicy(policy)` | `void` | Adds managed policy |
| `addToRolePolicy(statement)` | `void` | Adds inline policy |
| `addFunctionUrl(options?)` | `FunctionUrl` | Creates function URL |

#### Props Interface

```typescript
interface SecureLambdaProps extends BaseConstructProps {
  functionName: string;
  code: Code;
  handler: string;
  runtime?: Runtime;                 // Default: NODEJS_20_X
  memorySize?: number;               // Default: 512
  timeout?: Duration;                // Default: 30 seconds
  environment?: Record<string, string>;
  logRetention?: RetentionDays;      // Default: ONE_WEEK
  tracing?: Tracing;                 // Default: ACTIVE
  reservedConcurrentExecutions?: number;
  description?: string;
  layers?: ILayerVersion[];
  vpc?: LambdaVpcConfig;
  architecture?: Architecture;
  provisionedConcurrency?: number;
  deadLetterQueueEnabled?: boolean;
  insightsVersion?: LambdaInsightsVersion;
}
```

---

## Definitions

### Types

#### TYPES

Symbol constants for stack identification.

```typescript
const TYPES = {
  VpcStack: Symbol.for('VpcStack'),
  AppStack: Symbol.for('AppStack'),
  DatabaseStack: Symbol.for('DatabaseStack'),
  ApiStack: Symbol.for('ApiStack'),
  MonitoringStack: Symbol.for('MonitoringStack'),
  StorageStack: Symbol.for('StorageStack'),
  LambdaStack: Symbol.for('LambdaStack'),
  NetworkingStack: Symbol.for('NetworkingStack'),
} as const;
```

#### StackType

```typescript
type StackType = (typeof TYPES)[keyof typeof TYPES];
```

---

### Interfaces

#### ConstructContext

```typescript
interface ConstructContext {
  stageName: string;
  appName: string;
  region?: string;
  accountId?: string;
  isProduction: boolean;
}
```

#### BaseConstructProps

```typescript
interface BaseConstructProps {
  context: ConstructContext;
  tags?: Record<string, string>;
}
```

#### StageConfig

```typescript
interface StageConfig {
  stageName: string;
  displayName?: string;
  env: Environment;
  isProduction: boolean;
  tags?: Record<string, string>;
  config?: Record<string, unknown>;
  enabled?: boolean;
}
```

#### StackConfig

```typescript
interface StackConfig {
  type: StackType | symbol;
  props?: Record<string, unknown>;
  dependsOn?: (StackType | symbol)[];
  enabled?: boolean;
}
```

#### PipelineConfig

```typescript
interface PipelineConfig {
  pipelineName: string;
  appName: string;
  stages: StageConfig[];
  stacks: StackConfig[];
  tags?: Record<string, string>;
  stageFilter?: string[];
  enableTerminationProtection?: boolean;
}
```

#### FactoryStackProps

```typescript
interface FactoryStackProps extends StackProps {
  stageConfig: StageConfig;
  pipelineConfig: PipelineConfig;
  stageContext: StageContext;
  customProps?: Record<string, unknown>;
}
```

#### StageContext

```typescript
interface StageContext {
  stage: StageConfig;
  pipeline: PipelineConfig;
  deployedStacks: Map<StackType | symbol, unknown>;
}
```

---

### Configuration

#### EnvironmentConfig

```typescript
interface EnvironmentConfig {
  account: string;
  region: string;
}
```

#### NamingConfig

```typescript
interface NamingConfig {
  appName: string;
  separator?: string;          // Default: '-'
  maxLength?: number;          // Default: 64
  includeRandomSuffix?: boolean;
  randomSuffixLength?: number; // Default: 8
}
```

#### NamingUtils

```typescript
const NamingUtils = {
  generateName(config, stageName, resourceType, resourceName): string;
  generateRandomSuffix(length): string;
  generateStackName(appName, stageName, stackName): string;
  sanitize(name, allowedChars?): string;
};
```

---

## Factory Classes

### FactoryBaseStack

Base class for factory-created stacks.

#### Constructor

```typescript
constructor(scope: Construct, id: string, props: FactoryStackProps)
```

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `stageConfig` | `StageConfig` | Stage configuration |
| `pipelineConfig` | `PipelineConfig` | Pipeline configuration |
| `factoryProps` | `FactoryStackProps` | Full factory props |

#### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `getStageName()` | `string` | Gets current stage name |
| `isProd()` | `boolean` | Checks if production |
| `getResourceName(name)` | `string` | Generates prefixed name |
| `getStageConfig<T>(key, default?)` | `T` | Gets stage config value |
| `getCustomProp<T>(key, default?)` | `T` | Gets custom prop value |
| `log(message, level?)` | `void` | Logs with context |
| `createOutput(id, value, desc?, export?)` | `CfnOutput` | Creates CFN output |
| `getDeployedStack<T>(type)` | `T` | Gets deployed stack |
| `addStackDependency(type)` | `void` | Adds stack dependency |
| `validateDependencies(...types)` | `void` | Validates dependencies |

---

### StackFactory

Factory for creating and managing stacks.

#### Constructor

```typescript
constructor(debug?: boolean)
```

#### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `registerStack(type, constructor)` | `void` | Registers stack type |
| `registerStacks(registrations)` | `void` | Bulk register |
| `hasStack(type)` | `boolean` | Checks registration |
| `getStackConstructor(type)` | `StackConstructor` | Gets constructor |
| `createStack(scope, type, props)` | `Stack` | Creates stack |
| `createStacks(scope, types, props)` | `Map` | Creates multiple |
| `getRegisteredTypes()` | `symbol[]` | Gets all types |
| `clear()` | `void` | Clears registry |

---

### CdkAppFactory

Top-level factory for CDK applications.

#### Constructor

```typescript
constructor(pipelineConfig: PipelineConfig, debug?: boolean)
```

#### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `registerStack(type, constructor)` | `void` | Registers stack |
| `addStageSetupHook(hook)` | `void` | Adds setup hook |
| `getPipelineConfig()` | `PipelineConfig` | Gets config |
| `getStacks()` | `Map<string, Map>` | Gets created stacks |
| `getApp()` | `App` | Gets CDK App |
| `synth()` | `void` | Synthesizes all |

---

## Type Definitions

### AttributeDefinition

```typescript
interface AttributeDefinition {
  name: string;
  type: dynamodb.AttributeType;
}
```

### GlobalSecondaryIndexConfig

```typescript
interface GlobalSecondaryIndexConfig {
  indexName: string;
  partitionKey: AttributeDefinition;
  sortKey?: AttributeDefinition;
  projectionType?: ProjectionType;
  nonKeyAttributes?: string[];
}
```

### LocalSecondaryIndexConfig

```typescript
interface LocalSecondaryIndexConfig {
  indexName: string;
  sortKey: AttributeDefinition;
  projectionType?: ProjectionType;
  nonKeyAttributes?: string[];
}
```

### LifecycleRuleConfig

```typescript
interface LifecycleRuleConfig {
  id?: string;
  enabled?: boolean;
  prefix?: string;
  transitionToIaAfterDays?: number;
  transitionToGlacierAfterDays?: number;
  expirationDays?: number;
  noncurrentVersionExpirationDays?: number;
}
```

### CorsRuleConfig

```typescript
interface CorsRuleConfig {
  allowedMethods: HttpMethods[];
  allowedOrigins: string[];
  allowedHeaders?: string[];
  exposedHeaders?: string[];
  maxAge?: number;
}
```

### LambdaVpcConfig

```typescript
interface LambdaVpcConfig {
  vpc: ec2.IVpc;
  subnets?: ec2.SubnetSelection;
  securityGroups?: ec2.ISecurityGroup[];
}
```

### StageSetupHook

```typescript
type StageSetupHook = (
  stageName: string,
  stageConfig: StageConfig,
  pipelineConfig: PipelineConfig
) => void;
```

### StackConstructor

```typescript
interface StackConstructor<T extends Stack = Stack> {
  new (scope: Construct, id: string, props: FactoryStackProps): T;
}
```
