import { Stack, Tags, CfnOutput, Aspects } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  FactoryStackProps,
  StageConfig,
  PipelineConfig,
  NamingUtils,
} from '../definitions';

/**
 * Base stack class for the factory pattern.
 * Provides common functionality for all factory-created stacks.
 *
 * Features:
 * - Automatic resource naming with stage awareness
 * - Automatic tagging based on stage and pipeline configuration
 * - Termination protection for production environments
 * - Helper methods for common operations
 *
 * @example
 * ```typescript
 * class MyStack extends FactoryBaseStack {
 *   constructor(scope: Construct, id: string, props: FactoryStackProps) {
 *     super(scope, id, props);
 *
 *     const bucket = new s3.Bucket(this, 'Bucket', {
 *       bucketName: this.getResourceName('data'),
 *     });
 *   }
 * }
 * ```
 */
export class FactoryBaseStack extends Stack {
  /** The stage configuration for this stack */
  protected readonly stageConfig: StageConfig;

  /** The pipeline configuration */
  protected readonly pipelineConfig: PipelineConfig;

  /** The factory stack props */
  protected readonly factoryProps: FactoryStackProps;

  /**
   * Creates a new FactoryBaseStack.
   *
   * @param scope - The parent construct scope
   * @param id - The stack identifier
   * @param props - The factory stack props
   */
  constructor(scope: Construct, id: string, props: FactoryStackProps) {
    // Generate stack name
    const stackName = NamingUtils.generateStackName(
      props.pipelineConfig.appName,
      props.stageConfig.stageName,
      id
    );

    super(scope, id, {
      ...props,
      stackName,
      env: props.stageConfig.env,
      terminationProtection:
        props.stageConfig.isProduction &&
        (props.pipelineConfig.enableTerminationProtection ?? true),
    });

    this.stageConfig = props.stageConfig;
    this.pipelineConfig = props.pipelineConfig;
    this.factoryProps = props;

    // Apply automatic tagging
    this.applyTags();

    // Log stack creation
    this.log(`Creating stack: ${stackName}`);
  }

  /**
   * Gets the current stage name.
   *
   * @returns The stage name (e.g., 'dev', 'staging', 'prod')
   */
  protected getStageName(): string {
    return this.stageConfig.stageName;
  }

  /**
   * Checks if the current deployment is to a production environment.
   *
   * @returns True if deploying to production
   */
  protected isProd(): boolean {
    return this.stageConfig.isProduction;
  }

  /**
   * Generates a standardized resource name.
   * Format: {appName}-{stageName}-{resourceName}
   *
   * @param resourceName - The base resource name
   * @returns The fully qualified resource name
   */
  protected getResourceName(resourceName: string): string {
    return `${this.pipelineConfig.appName}-${this.stageConfig.stageName}-${resourceName}`;
  }

  /**
   * Gets a stage-specific configuration value.
   *
   * @param key - The configuration key
   * @param defaultValue - The default value if not found
   * @returns The configuration value
   */
  protected getStageConfig<T>(key: string, defaultValue?: T): T | undefined {
    const config = this.stageConfig.config;
    if (config && key in config) {
      return config[key] as T;
    }
    return defaultValue;
  }

  /**
   * Gets a custom prop passed to the stack.
   *
   * @param key - The custom prop key
   * @param defaultValue - The default value if not found
   * @returns The custom prop value
   */
  protected getCustomProp<T>(key: string, defaultValue?: T): T | undefined {
    const customProps = this.factoryProps.customProps;
    if (customProps && key in customProps) {
      return customProps[key] as T;
    }
    return defaultValue;
  }

  /**
   * Applies automatic tags to the stack.
   */
  private applyTags(): void {
    const defaultTags: Record<string, string> = {
      Environment: this.stageConfig.stageName,
      Application: this.pipelineConfig.appName,
      ManagedBy: 'CDK-FactoryPattern',
      Stack: this.stackName,
    };

    // Add stage-specific tags
    const stageTags = this.stageConfig.tags ?? {};

    // Add pipeline-wide tags
    const pipelineTags = this.pipelineConfig.tags ?? {};

    // Merge all tags (custom tags override defaults)
    const allTags = { ...defaultTags, ...pipelineTags, ...stageTags };

    Object.entries(allTags).forEach(([key, value]) => {
      Tags.of(this).add(key, value);
    });
  }

  /**
   * Logs a message with stack context information.
   *
   * @param message - The message to log
   * @param level - The log level (default: 'info')
   */
  protected log(
    message: string,
    level: 'info' | 'warn' | 'error' = 'info'
  ): void {
    const prefix = `[${this.pipelineConfig.appName}/${this.stageConfig.stageName}/${this.stackName}]`;
    const logMessage = `${prefix} ${message}`;

    switch (level) {
      case 'error':
        console.error(logMessage);
        break;
      case 'warn':
        console.warn(logMessage);
        break;
      default:
        console.log(logMessage);
    }
  }

  /**
   * Creates a CloudFormation output with the standardized name.
   *
   * @param id - The output identifier
   * @param value - The output value
   * @param description - Optional description
   * @param exportName - Optional export name (auto-generated if not provided)
   */
  protected createOutput(
    id: string,
    value: string,
    description?: string,
    exportName?: string
  ): CfnOutput {
    return new CfnOutput(this, id, {
      value,
      description,
      exportName:
        exportName ?? this.getResourceName(`${id}`).replace(/[^a-zA-Z0-9-]/g, '-'),
    });
  }

  /**
   * Gets a stack from the deployed stacks map.
   * Used for cross-stack references.
   *
   * @param stackType - The stack type symbol to look up
   * @returns The stack instance or undefined
   */
  protected getDeployedStack<T extends Stack>(
    stackType: symbol
  ): T | undefined {
    const deployedStacks = this.factoryProps.stageContext.deployedStacks;
    return deployedStacks.get(stackType) as T | undefined;
  }

  /**
   * Adds a dependency on another stack.
   *
   * @param stackType - The stack type symbol to depend on
   */
  protected addStackDependency(stackType: symbol): void {
    const dependencyStack = this.getDeployedStack(stackType);
    if (dependencyStack) {
      this.addDependency(dependencyStack);
      this.log(`Added dependency on ${stackType.description ?? 'unknown stack'}`);
    } else {
      this.log(
        `Warning: Could not find deployed stack for dependency: ${stackType.description ?? 'unknown'}`,
        'warn'
      );
    }
  }

  /**
   * Validates that required deployed stacks exist.
   *
   * @param requiredStacks - Array of required stack type symbols
   * @throws Error if any required stack is missing
   */
  protected validateDependencies(...requiredStacks: symbol[]): void {
    const missing: string[] = [];

    for (const stackType of requiredStacks) {
      if (!this.factoryProps.stageContext.deployedStacks.has(stackType)) {
        missing.push(stackType.description ?? 'unknown');
      }
    }

    if (missing.length > 0) {
      throw new Error(
        `Missing required stack dependencies: ${missing.join(', ')}`
      );
    }
  }
}
