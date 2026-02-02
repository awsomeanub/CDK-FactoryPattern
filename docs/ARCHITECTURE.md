# Framework Architecture

This document describes the architecture and design decisions of the CDK Factory Pattern Framework.

## Overview

The framework follows the Factory Design Pattern to provide a structured, scalable approach to AWS CDK infrastructure deployment. It separates concerns into three main layers:

1. **Constructs Layer** - Building blocks with organizational standards
2. **Definitions Layer** - Types, interfaces, and configuration schemas
3. **Factory Layer** - Assembly and orchestration logic

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              CDK App Factory                              │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                       Pipeline Configuration                        │  │
│  │  - Stages (dev, staging, prod)                                     │  │
│  │  - Stacks (VPC, App, Database, etc.)                               │  │
│  │  - Dependencies                                                     │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                    │                                      │
│                                    ▼                                      │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                         Stack Factory                               │  │
│  │  - Stack Registry (Symbol → Constructor)                           │  │
│  │  - Stack Creation with Props                                        │  │
│  │  - Dependency Resolution                                            │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                    │                                      │
│                                    ▼                                      │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                       Factory Base Stack                            │  │
│  │  - Automatic Naming                                                 │  │
│  │  - Automatic Tagging                                                │  │
│  │  - Stage-Aware Configuration                                        │  │
│  │  - Cross-Stack References                                           │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                    │                                      │
│                                    ▼                                      │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                     Organizational Constructs                       │  │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐              │  │
│  │  │SecureVpc│  │DynamoDB │  │ S3Bucket│  │ Lambda  │              │  │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘              │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

## Component Relationships

### 1. CdkAppFactory

The top-level orchestrator that:
- Manages the CDK App instance
- Processes pipeline configuration
- Creates stacks for each enabled stage
- Handles stage setup hooks
- Resolves stack dependencies

```typescript
class CdkAppFactory implements IAppFactory {
  private readonly app: App;
  private readonly stackFactory: StackFactory;
  
  synth(): void {
    for (const stage of enabledStages) {
      this.processStage(stage);
    }
  }
}
```

### 2. StackFactory

The registry and factory for stack constructors:
- Maintains a map of stack type symbols to constructors
- Creates stack instances with proper props
- Validates stack registration

```typescript
class StackFactory implements IStackFactory {
  private readonly registry: Map<symbol, StackConstructor>;
  
  createStack(scope, stackType, props): Stack {
    const Constructor = this.registry.get(stackType);
    return new Constructor(scope, id, props);
  }
}
```

### 3. FactoryBaseStack

The base class for all factory-created stacks:
- Extends CDK's Stack class
- Provides helper methods for common operations
- Handles automatic tagging
- Manages termination protection

```typescript
abstract class FactoryBaseStack extends Stack {
  protected getStageName(): string;
  protected isProd(): boolean;
  protected getResourceName(name: string): string;
}
```

### 4. Base Construct

The foundation for organizational constructs:
- Provides context awareness
- Standardizes resource naming
- Applies default tags

```typescript
abstract class BaseConstruct<T extends BaseConstructProps> extends Construct {
  protected readonly context: ConstructContext;
  protected getResourceName(name: string): string;
}
```

## Design Decisions

### Why Factory Pattern?

1. **Decoupling**: Stack definitions are decoupled from instantiation
2. **Extensibility**: New stack types can be added without modifying existing code
3. **Consistency**: All stacks follow the same creation pattern
4. **Testability**: Easy to mock and test individual components

### Why Symbols for Stack Types?

Using Symbols (instead of strings or enums) provides:
- **Uniqueness**: Guaranteed unique identifiers
- **Type Safety**: Can't accidentally use wrong type
- **Namespacing**: Avoids collisions between different stack registries
- **Debugging**: Built-in description support

```typescript
const TYPES = {
  VpcStack: Symbol.for('VpcStack'),
  AppStack: Symbol.for('AppStack'),
};
```

### Why Stage Configuration Objects?

Stage configurations as structured objects allow:
- **Type Safety**: Full IntelliSense support
- **Validation**: Props can be validated at compile and runtime
- **Extensibility**: Easy to add new configuration options
- **Documentation**: Self-documenting structure

## Data Flow

```
1. Pipeline Config → CdkAppFactory
   ↓
2. Filter Enabled Stages
   ↓
3. For Each Stage:
   a. Run Stage Setup Hooks
   b. Sort Stacks by Dependencies
   c. For Each Stack:
      i.  Create FactoryStackProps
      ii. Call StackFactory.createStack()
      iii. Add CDK Dependencies
      iv. Store in deployedStacks Map
   ↓
4. Synthesis Complete
```

## Extension Points

### Adding New Constructs

1. Create a new file in `lib/implementations/constructs/`
2. Extend `BaseConstruct`
3. Implement organizational standards
4. Export from index.ts

### Adding New Stack Types

1. Add symbol to `TYPES` in `lib/definitions/types.ts`
2. Create stack class extending `FactoryBaseStack`
3. Register in `stackRegistry`

### Adding Stage Setup Hooks

```typescript
factory.addStageSetupHook((stageName, stageConfig, pipelineConfig) => {
  // Custom setup logic
});
```

## Performance Considerations

1. **Lazy Instantiation**: Stacks are only created when needed
2. **Dependency Resolution**: Single-pass topological sort
3. **Caching**: Stack registry avoids repeated lookups
4. **Minimal Logging**: Debug logging is opt-in

## Security Architecture

1. **Construct Defaults**: All constructs default to secure settings
2. **Production Detection**: `isProd()` enables stricter controls
3. **Termination Protection**: Automatic for production stacks
4. **Tag Enforcement**: Automatic compliance tagging
