# Constructs Guide

This guide documents all available constructs in the CDK Factory Pattern Framework, their organizational standards, and usage examples.

## Overview

All constructs in this framework extend `BaseConstruct` and enforce organizational standards while remaining flexible for customization.

## BaseConstruct

The foundation for all organizational constructs.

### Features
- Context-aware configuration
- Automatic tagging
- Standardized resource naming
- Logging support

### Usage

```typescript
import { BaseConstruct, BaseConstructProps, ConstructContext } from './lib/implementations/constructs';

interface MyConstructProps extends BaseConstructProps {
  myProperty: string;
}

class MyConstruct extends BaseConstruct<MyConstructProps> {
  constructor(scope: Construct, id: string, props: MyConstructProps) {
    super(scope, id, props);
    
    // Use context
    console.log(this.context.stageName);
    console.log(this.context.isProduction);
    
    // Generate resource names
    const name = this.getResourceName('resource');
  }
}
```

---

## SecureVpc

Creates a VPC following organizational network standards.

### Organizational Standards
| Setting | Standard Value | Notes |
|---------|---------------|-------|
| CIDR | 10.0.0.0/16 | Customizable |
| Availability Zones | Minimum 2 | Enforced |
| NAT Gateways | 1 (non-prod), maxAzs (prod) | Cost optimization |
| Flow Logs | Enabled (prod) | Compliance |
| Default Security Group | Restricted | Security |

### Properties

```typescript
interface SecureVpcProps extends BaseConstructProps {
  cidr?: string;              // Default: 10.0.0.0/16
  maxAzs?: number;            // Default: 2, minimum: 2
  natGateways?: number;       // Default: 1 (non-prod), maxAzs (prod)
  enableDnsHostnames?: boolean; // Default: true
  enableDnsSupport?: boolean;   // Default: true
  enableFlowLogs?: boolean;     // Default: true (prod only)
  subnetConfiguration?: SubnetConfiguration[];
}
```

### Usage

```typescript
import { SecureVpc } from './lib/implementations/constructs';

const vpc = new SecureVpc(this, 'Vpc', {
  context: {
    stageName: 'prod',
    appName: 'myapp',
    isProduction: true,
  },
  maxAzs: 3,
  natGateways: 3,
});

// Access underlying VPC
const cdkVpc = vpc.vpc;

// Access subnets
const privateSubnets = vpc.privateSubnets;
const publicSubnets = vpc.publicSubnets;
const isolatedSubnets = vpc.isolatedSubnets;

// Add VPC endpoints
vpc.addInterfaceEndpoint(InterfaceVpcEndpointAwsService.SECRETS_MANAGER);
vpc.addGatewayEndpoint(GatewayVpcEndpointAwsService.S3);
```

### Default Subnet Configuration

```
Public Subnets    (CIDR: /24) - For load balancers, bastion hosts
Private Subnets   (CIDR: /24) - For application workloads
Isolated Subnets  (CIDR: /24) - For databases
```

---

## DynamoTable

Creates a DynamoDB table with organizational standards.

### Organizational Standards
| Setting | Standard Value | Notes |
|---------|---------------|-------|
| Billing Mode | PAY_PER_REQUEST | Cost optimization |
| Encryption | AWS_MANAGED | Security |
| Point-in-Time Recovery | Enabled | Data protection |
| Removal Policy | RETAIN | Prevents data loss |
| Contributor Insights | Enabled (prod) | Observability |

### Properties

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
  contributorInsights?: boolean;     // Default: true (prod)
}
```

### Usage

```typescript
import { DynamoTable } from './lib/implementations/constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

const table = new DynamoTable(this, 'UsersTable', {
  context: {
    stageName: 'prod',
    appName: 'myapp',
    isProduction: true,
  },
  tableName: 'users',
  partitionKey: {
    name: 'userId',
    type: dynamodb.AttributeType.STRING,
  },
  sortKey: {
    name: 'createdAt',
    type: dynamodb.AttributeType.NUMBER,
  },
  globalSecondaryIndexes: [
    {
      indexName: 'email-index',
      partitionKey: {
        name: 'email',
        type: dynamodb.AttributeType.STRING,
      },
    },
  ],
  timeToLiveAttribute: 'ttl',
});

// Access underlying table
const cdkTable = table.table;
const tableName = table.tableName;
const tableArn = table.tableArn;

// Grant permissions
table.grantReadData(lambdaFunction);
table.grantWriteData(lambdaFunction);
table.grantReadWriteData(lambdaFunction);
```

---

## S3Bucket

Creates an S3 bucket with organizational security standards.

### Organizational Standards
| Setting | Standard Value | Notes |
|---------|---------------|-------|
| Encryption | S3_MANAGED | Server-side encryption |
| Public Access | BLOCK_ALL | Security |
| Object Ownership | BUCKET_OWNER_ENFORCED | ACL disabled |
| SSL Enforcement | Required | Security |
| Versioning | Recommended (prod) | Data protection |

### Properties

```typescript
interface S3BucketProps extends BaseConstructProps {
  bucketName: string;
  versioned?: boolean;               // Default: false (true recommended for prod)
  encryption?: BucketEncryption;     // Default: S3_MANAGED
  blockPublicAccess?: BlockPublicAccess; // Default: BLOCK_ALL
  objectOwnership?: ObjectOwnership; // Default: BUCKET_OWNER_ENFORCED
  removalPolicy?: RemovalPolicy;     // Default: RETAIN (prod), DESTROY (non-prod)
  autoDeleteObjects?: boolean;
  serverAccessLogsBucket?: IBucket;
  serverAccessLogsPrefix?: string;
  lifecycleRules?: LifecycleRuleConfig[];
  cors?: CorsRuleConfig[];
  intelligentTiering?: boolean;
  eventBridgeEnabled?: boolean;      // Default: true (prod)
}
```

### Usage

```typescript
import { S3Bucket } from './lib/implementations/constructs';

const bucket = new S3Bucket(this, 'DataBucket', {
  context: {
    stageName: 'prod',
    appName: 'myapp',
    isProduction: true,
  },
  bucketName: 'data',
  versioned: true,
  lifecycleRules: [
    {
      id: 'archive-old',
      transitionToIaAfterDays: 90,
      transitionToGlacierAfterDays: 180,
    },
  ],
  cors: [
    {
      allowedMethods: [HttpMethods.GET],
      allowedOrigins: ['https://example.com'],
    },
  ],
});

// Access underlying bucket
const cdkBucket = bucket.bucket;
const bucketName = bucket.bucketName;
const bucketArn = bucket.bucketArn;

// Grant permissions
bucket.grantRead(lambdaFunction);
bucket.grantWrite(lambdaFunction);
bucket.grantReadWrite(lambdaFunction);
bucket.grantPut(lambdaFunction, 'uploads/*');
bucket.grantDelete(lambdaFunction);
```

---

## SecureLambda

Creates a Lambda function with organizational standards.

### Organizational Standards
| Setting | Standard Value | Notes |
|---------|---------------|-------|
| Runtime | Node.js 20.x | Latest LTS |
| Memory | 512MB | Default |
| Timeout | 30 seconds | Default |
| Tracing | Active (X-Ray) | Observability |
| Log Retention | 7 days | Cost/compliance balance |

### Properties

```typescript
interface SecureLambdaProps extends BaseConstructProps {
  functionName: string;
  code: Code;
  handler: string;
  runtime?: Runtime;              // Default: NODEJS_20_X
  memorySize?: number;            // Default: 512
  timeout?: Duration;             // Default: 30 seconds
  environment?: EnvironmentVariables;
  logRetention?: RetentionDays;   // Default: ONE_WEEK
  tracing?: Tracing;              // Default: ACTIVE
  reservedConcurrentExecutions?: number;
  description?: string;
  layers?: ILayerVersion[];
  vpc?: LambdaVpcConfig;
  architecture?: Architecture;     // Default: X86_64
  provisionedConcurrency?: number;
  deadLetterQueueEnabled?: boolean;
  insightsVersion?: LambdaInsightsVersion;
}
```

### Usage

```typescript
import { SecureLambda } from './lib/implementations/constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';

const fn = new SecureLambda(this, 'ProcessorFunction', {
  context: {
    stageName: 'prod',
    appName: 'myapp',
    isProduction: true,
  },
  functionName: 'processor',
  code: lambda.Code.fromAsset('lambda/processor'),
  handler: 'index.handler',
  memorySize: 1024,
  timeout: Duration.seconds(60),
  environment: {
    TABLE_NAME: table.tableName,
    BUCKET_NAME: bucket.bucketName,
  },
  vpc: {
    vpc: vpc.vpc,
    subnets: { subnetType: SubnetType.PRIVATE_WITH_EGRESS },
  },
});

// Access underlying function
const cdkFunction = fn.function;
const functionName = fn.functionName;
const functionArn = fn.functionArn;
const role = fn.role;

// Add environment variables
fn.addEnvironment('NEW_VAR', 'value');

// Add layers
fn.addLayers(myLayer);

// Add permissions
fn.addPermission('ApiGateway', {
  principal: new ServicePrincipal('apigateway.amazonaws.com'),
});

// Grant invoke permissions
fn.grantInvoke(otherLambda);

// Add IAM policies
fn.addToRolePolicy(new PolicyStatement({
  actions: ['s3:GetObject'],
  resources: ['*'],
}));

// Create function URL
const url = fn.addFunctionUrl({
  authType: FunctionUrlAuthType.AWS_IAM,
});
```

---

## Construct Composition

Constructs can be composed together:

```typescript
class MyApplicationConstruct extends BaseConstruct<MyAppProps> {
  public readonly vpc: SecureVpc;
  public readonly table: DynamoTable;
  public readonly function: SecureLambda;

  constructor(scope: Construct, id: string, props: MyAppProps) {
    super(scope, id, props);

    this.vpc = new SecureVpc(this, 'Vpc', { context: props.context });

    this.table = new DynamoTable(this, 'Table', {
      context: props.context,
      tableName: 'data',
      partitionKey: { name: 'id', type: AttributeType.STRING },
    });

    this.function = new SecureLambda(this, 'Function', {
      context: props.context,
      functionName: 'processor',
      code: Code.fromAsset('lambda'),
      handler: 'index.handler',
      environment: {
        TABLE_NAME: this.table.tableName,
      },
      vpc: { vpc: this.vpc.vpc },
    });

    // Grant permissions
    this.table.grantReadWriteData(this.function.function);
  }
}
```

## Best Practices

1. **Always provide context**: Pass the `ConstructContext` to all constructs
2. **Use `isProd()` for conditional configuration**: Different settings for prod/non-prod
3. **Export underlying resources**: Allow access to CDK resources for flexibility
4. **Use grant methods**: Prefer `grantRead()` over manual IAM policies
5. **Log important operations**: Use `this.log()` for debugging
