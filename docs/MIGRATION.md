# Migration Guide

This guide helps you migrate from a simple CDK application to the Factory Pattern Framework.

## Overview

Migrating to the Factory Pattern involves:
1. Converting stacks to extend `FactoryBaseStack`
2. Converting constructs to use organizational standards
3. Setting up stage and pipeline configurations
4. Updating the app entry point

## Before Migration

A typical simple CDK application might look like:

```typescript
// bin/app.ts
const app = new cdk.App();

new VpcStack(app, 'VpcStack', {
  env: { account: '111111111111', region: 'us-east-1' },
});

new AppStack(app, 'AppStack', {
  env: { account: '111111111111', region: 'us-east-1' },
});
```

```typescript
// lib/vpc-stack.ts
export class VpcStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.vpc = new ec2.Vpc(this, 'Vpc', {
      maxAzs: 2,
    });
  }
}
```

```typescript
// lib/app-stack.ts
export class AppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    new s3.Bucket(this, 'Bucket', {
      bucketName: 'my-bucket',
    });

    new dynamodb.Table(this, 'Table', {
      tableName: 'my-table',
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
    });
  }
}
```

## Step 1: Install Dependencies

Ensure you have the required dependencies:

```json
{
  "dependencies": {
    "aws-cdk-lib": "^2.177.0",
    "constructs": "^10.3.0"
  },
  "devDependencies": {
    "typescript": "^5.3.3"
  }
}
```

## Step 2: Copy Framework Files

Copy the framework files to your project:

```
lib/
├── implementations/
│   └── constructs/
│       ├── base.ts
│       ├── vpc.ts
│       ├── dynamodb.ts
│       ├── s3.ts
│       ├── lambda.ts
│       └── index.ts
├── definitions/
│   ├── types.ts
│   ├── factory.ts
│   ├── config.ts
│   └── index.ts
└── factory/
    ├── baseStack.ts
    ├── stackFactory.ts
    ├── appFactory.ts
    └── index.ts
```

## Step 3: Define Stage Configurations

Create stage configuration file:

```typescript
// config/stageConfig.ts
import { StageConfig } from '../lib/definitions';

export const devStage: StageConfig = {
  stageName: 'dev',
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT || '111111111111',
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  isProduction: false,
  tags: { Environment: 'development' },
};

export const prodStage: StageConfig = {
  stageName: 'prod',
  env: {
    account: process.env.CDK_PROD_ACCOUNT || '222222222222',
    region: 'us-east-1',
  },
  isProduction: true,
  tags: { Environment: 'production' },
};
```

## Step 4: Convert Stacks

### Before: Simple Stack

```typescript
export class VpcStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.vpc = new ec2.Vpc(this, 'Vpc', {
      maxAzs: 2,
    });
  }
}
```

### After: Factory Stack

```typescript
import { FactoryStackProps } from '../lib/definitions';
import { FactoryBaseStack } from '../lib/factory';
import { SecureVpc } from '../lib/implementations/constructs';

export class VpcStack extends FactoryBaseStack {
  public readonly secureVpc: SecureVpc;

  constructor(scope: Construct, id: string, props: FactoryStackProps) {
    super(scope, id, props);

    this.secureVpc = new SecureVpc(this, 'Vpc', {
      context: {
        stageName: this.getStageName(),
        appName: this.pipelineConfig.appName,
        isProduction: this.isProd(),
      },
      maxAzs: 2,
    });
  }

  public get vpc() {
    return this.secureVpc.vpc;
  }
}
```

### Key Changes

1. **Extend `FactoryBaseStack`** instead of `cdk.Stack`
2. **Accept `FactoryStackProps`** instead of `cdk.StackProps`
3. **Use organizational constructs** like `SecureVpc` instead of `ec2.Vpc`
4. **Pass context** to constructs
5. **Use helper methods** like `getStageName()`, `isProd()`

## Step 5: Convert Constructs

### Before: Direct CDK Constructs

```typescript
new s3.Bucket(this, 'Bucket', {
  bucketName: 'my-bucket',
});

new dynamodb.Table(this, 'Table', {
  tableName: 'my-table',
  partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
});
```

### After: Organizational Constructs

```typescript
new S3Bucket(this, 'Bucket', {
  context: {
    stageName: this.getStageName(),
    appName: this.pipelineConfig.appName,
    isProduction: this.isProd(),
  },
  bucketName: 'data', // Will be prefixed automatically
});

new DynamoTable(this, 'Table', {
  context: {
    stageName: this.getStageName(),
    appName: this.pipelineConfig.appName,
    isProduction: this.isProd(),
  },
  tableName: 'data', // Will be prefixed automatically
  partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
});
```

### Benefits

- Automatic resource naming: `myapp-prod-data`
- Security standards enforced automatically
- Consistent tagging
- Environment-aware configuration

## Step 6: Set Up Pipeline Configuration

```typescript
// config/pipelineConfig.ts
import { PipelineConfig, TYPES } from '../lib/definitions';
import { devStage, prodStage } from './stageConfig';

export const pipelineConfig: PipelineConfig = {
  pipelineName: 'MyPipeline',
  appName: 'myapp',
  stages: [devStage, prodStage],
  stacks: [
    { type: TYPES.VpcStack },
    { type: TYPES.AppStack, dependsOn: [TYPES.VpcStack] },
  ],
  enableTerminationProtection: true,
};
```

## Step 7: Create Stack Registry

```typescript
// config/stackRegistry.ts
import { StackConstructor, TYPES } from '../lib/definitions';
import { VpcStack } from '../stacks/VpcStack';
import { AppStack } from '../stacks/AppStack';

export const stackRegistry: Record<symbol, StackConstructor> = {
  [TYPES.VpcStack]: VpcStack,
  [TYPES.AppStack]: AppStack,
};

export function registerAllStacks(factory: {
  registerStack: (type: symbol, constructor: StackConstructor) => void;
}): void {
  Object.getOwnPropertySymbols(stackRegistry).forEach((type) => {
    factory.registerStack(type, stackRegistry[type as keyof typeof stackRegistry]);
  });
}
```

## Step 8: Update App Entry Point

### Before

```typescript
// bin/app.ts
const app = new cdk.App();

new VpcStack(app, 'VpcStack', {
  env: { account: '111111111111', region: 'us-east-1' },
});

new AppStack(app, 'AppStack', {
  env: { account: '111111111111', region: 'us-east-1' },
});
```

### After

```typescript
// app.ts
import { CdkAppFactory } from './lib/factory';
import { pipelineConfig } from './config/pipelineConfig';
import { registerAllStacks } from './config/stackRegistry';

const factory = new CdkAppFactory(pipelineConfig);
registerAllStacks(factory);
factory.synth();
```

## Step 9: Handle Cross-Stack References

### Before

```typescript
// Manually managing dependencies
const vpcStack = new VpcStack(app, 'VpcStack', props);
const appStack = new AppStack(app, 'AppStack', {
  ...props,
  vpc: vpcStack.vpc,
});
appStack.addDependency(vpcStack);
```

### After

```typescript
// In pipeline config
{
  type: TYPES.AppStack,
  dependsOn: [TYPES.VpcStack],
}

// In AppStack
class AppStack extends FactoryBaseStack {
  constructor(scope: Construct, id: string, props: FactoryStackProps) {
    super(scope, id, props);

    // Automatically resolved
    const vpcStack = this.getDeployedStack<VpcStack>(TYPES.VpcStack);
    const vpc = vpcStack?.vpc;
  }
}
```

## Step 10: Update Tests

### Before

```typescript
test('creates vpc', () => {
  const app = new cdk.App();
  const stack = new VpcStack(app, 'TestVpc', {
    env: { account: '111111111111', region: 'us-east-1' },
  });

  const template = Template.fromStack(stack);
  template.hasResource('AWS::EC2::VPC', {});
});
```

### After

```typescript
import { createMockFactoryStackProps } from './helpers';

test('creates vpc', () => {
  const app = new cdk.App();
  const props = createMockFactoryStackProps('dev');
  
  const stack = new VpcStack(app, 'TestVpc', props);

  const template = Template.fromStack(stack);
  template.hasResource('AWS::EC2::VPC', {});
});
```

## Migration Checklist

- [ ] Install framework dependencies
- [ ] Copy framework files to project
- [ ] Define stage configurations
- [ ] Convert stacks to extend `FactoryBaseStack`
- [ ] Replace direct CDK constructs with organizational constructs
- [ ] Set up pipeline configuration
- [ ] Create stack registry
- [ ] Update app entry point
- [ ] Update cross-stack references
- [ ] Update tests
- [ ] Test synthesis for all stages
- [ ] Verify CloudFormation templates
- [ ] Plan production deployment

## Common Issues

### Issue: Stack Names Changed

After migration, stack names will follow the new pattern. You may need to:
1. Deploy new stacks alongside old ones
2. Migrate resources
3. Delete old stacks

### Issue: Resource Names Changed

Organizational constructs prefix resource names. You may need to:
1. Create new resources with new names
2. Migrate data
3. Update application configuration

### Issue: Missing Dependencies

If you get "Stack type not registered" errors:
1. Verify the stack constructor is exported
2. Check the stack registry includes the type
3. Ensure the symbol matches in pipeline config

## Rollback Plan

If migration causes issues:
1. Keep the old `bin/app.ts` as `bin/app.old.ts`
2. Test thoroughly in dev before prod
3. Use CDK diff to compare changes
4. Deploy incrementally
