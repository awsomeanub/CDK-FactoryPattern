# Getting Started

This guide walks you through creating your first stack using the CDK Factory Pattern Framework.

## Prerequisites

- Node.js 18+ installed
- AWS CLI configured with appropriate credentials
- Basic familiarity with AWS CDK concepts

## Step 1: Project Setup

Clone or initialize your project:

```bash
# Clone the repository
git clone <repository-url>
cd CDK-FactoryPattern

# Install dependencies
npm install

# Build the project
npm run build
```

## Step 2: Understand the Structure

The framework has three main layers:

```
lib/
├── implementations/constructs/  # Building blocks
├── definitions/                 # Types and interfaces
└── factory/                     # Factory classes
```

## Step 3: Configure Your Stages

Edit `example/config/stageConfig.ts` or create your own stage configuration:

```typescript
import { StageConfig } from '../../lib/definitions';

export const devStage: StageConfig = {
  stageName: 'dev',
  displayName: 'Development',
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT || '111111111111',
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  isProduction: false,
  tags: {
    Environment: 'development',
    CostCenter: 'dev-001',
  },
  config: {
    // Stage-specific configuration
    logLevel: 'DEBUG',
  },
};
```

## Step 4: Create Your First Stack

Create a new file `example/stacks/MyFirstStack.ts`:

```typescript
import { Construct } from 'constructs';
import { CfnOutput } from 'aws-cdk-lib';
import { FactoryStackProps } from '../../lib/definitions';
import { FactoryBaseStack } from '../../lib/factory';
import { S3Bucket } from '../../lib/implementations/constructs';

export class MyFirstStack extends FactoryBaseStack {
  public readonly bucket: S3Bucket;

  constructor(scope: Construct, id: string, props: FactoryStackProps) {
    super(scope, id, props);

    // Create an S3 bucket with organizational standards
    this.bucket = new S3Bucket(this, 'MyBucket', {
      context: {
        stageName: this.getStageName(),
        appName: this.pipelineConfig.appName,
        isProduction: this.isProd(),
      },
      bucketName: 'my-first-bucket',
      versioned: this.isProd(), // Enable versioning in prod
    });

    // Create an output
    new CfnOutput(this, 'BucketName', {
      value: this.bucket.bucketName,
      description: 'My first bucket name',
    });
  }
}
```

## Step 5: Register the Stack Type

Add a new symbol to identify your stack. Edit `lib/definitions/types.ts`:

```typescript
export const TYPES = {
  VpcStack: Symbol.for('VpcStack'),
  AppStack: Symbol.for('AppStack'),
  MyFirstStack: Symbol.for('MyFirstStack'), // Add this
} as const;
```

## Step 6: Update the Stack Registry

Edit `example/config/stackRegistry.ts`:

```typescript
import { MyFirstStack } from '../stacks/MyFirstStack';
import { TYPES } from '../../lib/definitions';

export const stackRegistry: Record<symbol, StackConstructor> = {
  [TYPES.VpcStack]: VpcStack,
  [TYPES.AppStack]: AppStack,
  [TYPES.MyFirstStack]: MyFirstStack, // Add this
};
```

## Step 7: Add to Pipeline Configuration

Edit `example/config/pipelineConfig.ts`:

```typescript
export const pipelineConfig: PipelineConfig = {
  pipelineName: 'MyPipeline',
  appName: 'myapp',
  stages: [devStage, stagingStage, prodStage],
  stacks: [
    { type: TYPES.VpcStack },
    { type: TYPES.AppStack, dependsOn: [TYPES.VpcStack] },
    { type: TYPES.MyFirstStack }, // Add this
  ],
};
```

## Step 8: Synthesize and Deploy

```bash
# Synthesize CloudFormation templates
npx cdk synth

# List all stacks
npx cdk list

# Deploy dev stack only
npx cdk deploy myapp-dev-MyFirstStack

# Deploy all stacks
npx cdk deploy --all
```

## Step 9: Using Helper Methods

The `FactoryBaseStack` provides useful helper methods:

```typescript
class MyStack extends FactoryBaseStack {
  constructor(scope: Construct, id: string, props: FactoryStackProps) {
    super(scope, id, props);

    // Get current stage name
    const stage = this.getStageName(); // 'dev', 'staging', 'prod'

    // Check if production
    if (this.isProd()) {
      // Enable production-specific features
    }

    // Generate consistent resource names
    const bucketName = this.getResourceName('data'); // 'myapp-dev-data'

    // Get stage-specific configuration
    const logLevel = this.getStageConfig<string>('logLevel', 'INFO');

    // Get custom props from stack config
    const customValue = this.getCustomProp<number>('maxAzs', 2);

    // Log with context
    this.log('Stack created successfully');
  }
}
```

## Step 10: Cross-Stack References

Reference other stacks in your stack:

```typescript
class DatabaseStack extends FactoryBaseStack {
  constructor(scope: Construct, id: string, props: FactoryStackProps) {
    super(scope, id, props);

    // Validate dependency exists
    this.validateDependencies(TYPES.VpcStack);

    // Get reference to VPC stack
    const vpcStack = this.getDeployedStack<VpcStack>(TYPES.VpcStack);
    
    if (vpcStack) {
      // Use VPC in this stack
      const vpc = vpcStack.vpc;
      // Create resources in the VPC...
    }
  }
}
```

## Next Steps

- Read the [Constructs Guide](CONSTRUCTS.md) to learn about available constructs
- Check [Best Practices](BEST_PRACTICES.md) for naming and security guidelines
- See [Architecture](ARCHITECTURE.md) for framework design details
- Explore [API Reference](API.md) for complete documentation

## Troubleshooting

### "Stack type not registered"

Ensure you've:
1. Added the symbol to `TYPES`
2. Registered the constructor in `stackRegistry`
3. Imported the stack class correctly

### "Missing required stack dependencies"

When using `validateDependencies()`, ensure:
1. The dependency stack is listed in `stacks` array
2. The dependency stack appears before the current stack (or use `dependsOn`)

### Build Errors

```bash
# Clear build artifacts
rm -rf dist cdk.out

# Reinstall dependencies
rm -rf node_modules
npm install

# Rebuild
npm run build
```
