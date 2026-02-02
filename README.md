# CDK Factory Pattern Framework

A comprehensive AWS CDK Factory Pattern Framework for standardized infrastructure deployment across multiple environments.

## Overview

The CDK Factory Pattern Framework provides a structured approach to building AWS infrastructure with:

- **Organizational Standards**: Pre-configured constructs that enforce best practices
- **Multi-Stage Deployment**: Seamless deployment across dev, staging, and production
- **Type-Safe Configuration**: Full TypeScript support with strong typing
- **Extensible Architecture**: Easy to add new constructs and stack types

## Quick Start

### Installation

```bash
npm install
```

### Build

```bash
npm run build
```

### Synthesize CloudFormation Templates

```bash
# Synthesize all stages
npx cdk synth

# Synthesize specific stage
DEPLOY_STAGE=dev npx cdk synth
```

### Deploy

```bash
# Deploy all stacks
npx cdk deploy --all

# Deploy specific stack
npx cdk deploy example-dev-VpcStack
```

## Project Structure

```
CDK-FactoryPattern/
├── lib/
│   ├── implementations/
│   │   └── constructs/      # Organizational-standard constructs
│   │       ├── base.ts      # Base construct class
│   │       ├── vpc.ts       # SecureVpc construct
│   │       ├── dynamodb.ts  # DynamoTable construct
│   │       ├── s3.ts        # S3Bucket construct
│   │       └── lambda.ts    # SecureLambda construct
│   ├── definitions/         # Types and interfaces
│   │   ├── types.ts         # Core type definitions
│   │   ├── factory.ts       # Factory interfaces
│   │   └── config.ts        # Configuration interfaces
│   └── factory/             # Factory classes
│       ├── baseStack.ts     # FactoryBaseStack
│       ├── stackFactory.ts  # StackFactory class
│       └── appFactory.ts    # CdkAppFactory class
├── example/                 # Example application
│   ├── config/              # Configuration files
│   ├── stacks/              # Example stacks
│   └── app.ts               # Entry point
├── tests/                   # Unit and integration tests
└── docs/                    # Documentation
```

## Basic Usage

### 1. Define Stage Configurations

```typescript
import { StageConfig } from './lib/definitions';

const devStage: StageConfig = {
  stageName: 'dev',
  env: { account: '111111111111', region: 'us-east-1' },
  isProduction: false,
};
```

### 2. Create a Stack

```typescript
import { FactoryBaseStack } from './lib/factory';
import { SecureVpc } from './lib/implementations/constructs';

export class VpcStack extends FactoryBaseStack {
  constructor(scope: Construct, id: string, props: FactoryStackProps) {
    super(scope, id, props);

    new SecureVpc(this, 'Vpc', {
      context: {
        stageName: this.getStageName(),
        appName: this.pipelineConfig.appName,
        isProduction: this.isProd(),
      },
    });
  }
}
```

### 3. Configure Pipeline

```typescript
import { PipelineConfig, TYPES } from './lib/definitions';

const pipelineConfig: PipelineConfig = {
  pipelineName: 'MyPipeline',
  appName: 'myapp',
  stages: [devStage, prodStage],
  stacks: [
    { type: TYPES.VpcStack },
    { type: TYPES.AppStack, dependsOn: [TYPES.VpcStack] },
  ],
};
```

### 4. Synthesize

```typescript
import { CdkAppFactory } from './lib/factory';

const factory = new CdkAppFactory(pipelineConfig);
factory.registerStack(TYPES.VpcStack, VpcStack);
factory.registerStack(TYPES.AppStack, AppStack);
factory.synth();
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md) - Framework architecture and design decisions
- [Getting Started](docs/GETTING_STARTED.md) - Step-by-step tutorial
- [Constructs](docs/CONSTRUCTS.md) - Available constructs and usage
- [Best Practices](docs/BEST_PRACTICES.md) - Naming conventions and security
- [Migration Guide](docs/MIGRATION.md) - Migrating from simple CDK
- [API Reference](docs/API.md) - Complete API documentation

## Organizational Standards

### VPC
- CIDR: 10.0.0.0/16
- Minimum 2 Availability Zones
- Private subnets with NAT Gateway
- VPC Flow Logs in production

### DynamoDB
- Billing: PAY_PER_REQUEST
- Encryption: AWS_MANAGED
- Point-in-Time Recovery: Enabled
- Removal Policy: RETAIN

### S3
- Encryption: S3_MANAGED
- Public Access: BLOCK_ALL
- SSL Enforcement: Required
- Versioning: Recommended for production

### Lambda
- Runtime: Node.js 20.x
- Memory: 512MB
- Timeout: 30 seconds
- X-Ray Tracing: Active
- Log Retention: 7 days

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

## License

Apache-2.0
