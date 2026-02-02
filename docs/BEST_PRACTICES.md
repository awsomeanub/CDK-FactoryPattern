# Best Practices

This guide covers best practices for using the CDK Factory Pattern Framework, including naming conventions, security guidelines, and cost optimization strategies.

## Naming Conventions

### Resource Naming Pattern

All resources follow the pattern: `{appName}-{stageName}-{resourceName}`

Example: `myapp-prod-data-bucket`

### Stack Naming

Stack names follow: `{appName}-{stageName}-{stackType}`

Example: `myapp-prod-VpcStack`

### Guidelines

1. **Use lowercase with hyphens**: `my-resource-name`
2. **Keep names short but descriptive**: Under 64 characters
3. **Avoid special characters**: Only alphanumeric and hyphens
4. **Include purpose in name**: `user-data-bucket` not `bucket-1`

```typescript
// Good
const bucket = new S3Bucket(this, 'UserDataBucket', {
  bucketName: 'user-data',
});

// Avoid
const bucket = new S3Bucket(this, 'Bucket1', {
  bucketName: 'b1',
});
```

## Security Best Practices

### 1. Always Use Org-Standard Constructs

The constructs in this framework enforce security best practices:

```typescript
// ✅ Good - Uses org-standard construct
const bucket = new S3Bucket(this, 'Bucket', {
  context,
  bucketName: 'data',
});

// ❌ Avoid - Direct CDK construct without standards
const bucket = new s3.Bucket(this, 'Bucket', {
  bucketName: 'data',
  // Missing encryption, public access settings, etc.
});
```

### 2. Leverage Production Detection

```typescript
class MyStack extends FactoryBaseStack {
  constructor(scope: Construct, id: string, props: FactoryStackProps) {
    super(scope, id, props);

    if (this.isProd()) {
      // Enable stricter security in production
      // Enable detailed monitoring
      // Enable backups
    }
  }
}
```

### 3. Use Least Privilege IAM

```typescript
// ✅ Good - Specific permissions
table.grantReadData(function);

// ❌ Avoid - Overly permissive
function.addToRolePolicy(new PolicyStatement({
  actions: ['dynamodb:*'],
  resources: ['*'],
}));
```

### 4. Enable Encryption Everywhere

All constructs default to encryption enabled:

- S3: S3_MANAGED encryption
- DynamoDB: AWS_MANAGED encryption
- Lambda: Environment variable encryption

### 5. Block Public Access

S3 buckets default to `BLOCK_ALL` public access.

```typescript
// Default - already blocked
const bucket = new S3Bucket(this, 'Bucket', {
  bucketName: 'data',
});

// Only override if absolutely necessary
const publicAssets = new S3Bucket(this, 'PublicAssets', {
  bucketName: 'public-assets',
  blockPublicAccess: BlockPublicAccess.BLOCK_ACLS,
  // Document why this is needed
});
```

### 6. Use VPC for Sensitive Workloads

```typescript
const function = new SecureLambda(this, 'Function', {
  context,
  functionName: 'processor',
  code: Code.fromAsset('lambda'),
  handler: 'index.handler',
  vpc: {
    vpc: vpc.vpc,
    subnets: { subnetType: SubnetType.PRIVATE_WITH_EGRESS },
  },
});
```

## Cost Optimization

### 1. Use On-Demand Billing for DynamoDB

```typescript
// Default - PAY_PER_REQUEST
const table = new DynamoTable(this, 'Table', {
  tableName: 'data',
  partitionKey: { name: 'id', type: AttributeType.STRING },
  // billingMode: BillingMode.PAY_PER_REQUEST (default)
});
```

### 2. Right-Size NAT Gateways

```typescript
const vpc = new SecureVpc(this, 'Vpc', {
  context,
  // 1 NAT Gateway for dev (default)
  // Multiple for prod based on traffic
  natGateways: this.isProd() ? 3 : 1,
});
```

### 3. Configure Lifecycle Policies

```typescript
const bucket = new S3Bucket(this, 'Bucket', {
  bucketName: 'logs',
  lifecycleRules: [
    {
      id: 'archive-old-logs',
      transitionToIaAfterDays: 30,
      transitionToGlacierAfterDays: 90,
      expirationDays: 365,
    },
  ],
});
```

### 4. Set Appropriate Log Retention

```typescript
const fn = new SecureLambda(this, 'Function', {
  functionName: 'processor',
  logRetention: this.isProd() 
    ? RetentionDays.TWO_WEEKS 
    : RetentionDays.ONE_WEEK,
});
```

### 5. Use Reserved Concurrency Wisely

```typescript
// Limit concurrency to control costs
const fn = new SecureLambda(this, 'Function', {
  functionName: 'processor',
  reservedConcurrentExecutions: this.isProd() ? 100 : 10,
});
```

## Tagging Strategy

### Automatic Tags

The framework automatically applies these tags:

| Tag | Description |
|-----|-------------|
| Environment | Stage name (dev, staging, prod) |
| Application | Application name |
| ManagedBy | CDK-FactoryPattern |
| Stack | Stack name |

### Custom Tags

Add stage-specific or stack-specific tags:

```typescript
// Stage-level tags
const prodStage: StageConfig = {
  stageName: 'prod',
  tags: {
    CostCenter: 'prod-001',
    Compliance: 'required',
  },
};

// Pipeline-level tags
const pipelineConfig: PipelineConfig = {
  pipelineName: 'MyPipeline',
  tags: {
    Project: 'MyProject',
    Owner: 'platform-team',
  },
};

// Construct-level tags
const bucket = new S3Bucket(this, 'Bucket', {
  context,
  bucketName: 'data',
  tags: {
    DataClassification: 'confidential',
  },
});
```

## Code Organization

### 1. Group Related Stacks

```
example/stacks/
├── networking/
│   ├── VpcStack.ts
│   └── SecurityGroupStack.ts
├── data/
│   ├── DynamoStack.ts
│   └── S3Stack.ts
└── compute/
    ├── LambdaStack.ts
    └── EcsStack.ts
```

### 2. Separate Configuration

```
example/config/
├── stageConfig.ts    # Stage definitions
├── pipelineConfig.ts # Pipeline configurations
└── stackRegistry.ts  # Stack type mappings
```

### 3. Use Index Files

```typescript
// stacks/index.ts
export * from './VpcStack';
export * from './AppStack';
```

## Testing

### 1. Test Construct Snapshots

```typescript
test('creates bucket with correct settings', () => {
  const app = new App();
  const stack = new Stack(app, 'TestStack');

  new S3Bucket(stack, 'Bucket', {
    context: mockContext,
    bucketName: 'test',
  });

  expect(Template.fromStack(stack)).toMatchSnapshot();
});
```

### 2. Test Security Settings

```typescript
test('bucket blocks public access', () => {
  const template = Template.fromStack(stack);
  
  template.hasResourceProperties('AWS::S3::Bucket', {
    PublicAccessBlockConfiguration: {
      BlockPublicAcls: true,
      BlockPublicPolicy: true,
      IgnorePublicAcls: true,
      RestrictPublicBuckets: true,
    },
  });
});
```

### 3. Test Environment-Specific Behavior

```typescript
test('enables versioning in production', () => {
  const prodContext = { ...mockContext, isProduction: true };
  
  new S3Bucket(stack, 'Bucket', {
    context: prodContext,
    bucketName: 'data',
  });

  template.hasResourceProperties('AWS::S3::Bucket', {
    VersioningConfiguration: {
      Status: 'Enabled',
    },
  });
});
```

## Monitoring and Observability

### 1. Enable X-Ray Tracing

```typescript
// Enabled by default for Lambda
const fn = new SecureLambda(this, 'Function', {
  functionName: 'processor',
  // tracing: Tracing.ACTIVE (default)
});
```

### 2. Enable VPC Flow Logs

```typescript
// Enabled by default in production
const vpc = new SecureVpc(this, 'Vpc', {
  context,
  // enableFlowLogs: true (default for prod)
});
```

### 3. Enable DynamoDB Contributor Insights

```typescript
// Enabled by default in production
const table = new DynamoTable(this, 'Table', {
  context,
  tableName: 'data',
  partitionKey: { name: 'id', type: AttributeType.STRING },
  // contributorInsights: true (default for prod)
});
```

## Deployment Best Practices

### 1. Use Stage Filtering for Development

```bash
# Deploy only dev
DEPLOY_STAGE=dev npx cdk deploy --all

# Deploy only prod
DEPLOY_STAGE=prod npx cdk deploy --all
```

### 2. Review Changes Before Deployment

```bash
# Always diff before deploy
npx cdk diff

# Review synthesized templates
npx cdk synth
```

### 3. Use Termination Protection

```typescript
// Enabled by default for production
const pipelineConfig: PipelineConfig = {
  // ...
  enableTerminationProtection: true,
};
```
