import { Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  IStackFactory,
  StackConstructor,
  FactoryStackProps,
  StackType,
  NamingUtils,
} from '../definitions';

/**
 * Stack factory implementation for creating stacks with proper naming and configuration.
 * Manages a registry of stack constructors and creates instances on demand.
 *
 * @example
 * ```typescript
 * const factory = new StackFactory();
 *
 * // Register stack types
 * factory.registerStack(TYPES.VpcStack, VpcStack);
 * factory.registerStack(TYPES.AppStack, AppStack);
 *
 * // Create stack instances
 * const vpcStack = factory.createStack(app, TYPES.VpcStack, props);
 * ```
 */
export class StackFactory implements IStackFactory {
  /** Registry of stack constructors by type */
  private readonly registry: Map<StackType | symbol, StackConstructor> =
    new Map();

  /** Logger instance for factory operations */
  private readonly debug: boolean;

  /**
   * Creates a new StackFactory.
   *
   * @param debug - Whether to enable debug logging
   */
  constructor(debug: boolean = false) {
    this.debug = debug;
    this.log('StackFactory initialized');
  }

  /**
   * Registers a stack constructor for a given type.
   *
   * @param stackType - The stack type symbol
   * @param constructor - The stack constructor
   * @throws Error if the stack type is already registered
   */
  public registerStack(
    stackType: StackType | symbol,
    constructor: StackConstructor
  ): void {
    if (this.registry.has(stackType)) {
      throw new Error(
        `Stack type already registered: ${this.getStackTypeName(stackType)}`
      );
    }

    this.registry.set(stackType, constructor);
    this.log(`Registered stack type: ${this.getStackTypeName(stackType)}`);
  }

  /**
   * Registers multiple stack constructors at once.
   *
   * @param registrations - Object mapping stack types to constructors
   */
  public registerStacks(
    registrations: Record<symbol, StackConstructor>
  ): void {
    Object.entries(registrations).forEach(([_, constructor]) => {
      // Note: We can't iterate over symbol keys with Object.entries
      // This method is provided for convenience but registerStack should be used directly
    });

    // Use getOwnPropertySymbols for symbol keys
    Object.getOwnPropertySymbols(registrations).forEach((stackType) => {
      this.registerStack(stackType, registrations[stackType as keyof typeof registrations] as StackConstructor);
    });
  }

  /**
   * Checks if a stack type is registered.
   *
   * @param stackType - The stack type symbol
   * @returns True if the stack type is registered
   */
  public hasStack(stackType: StackType | symbol): boolean {
    return this.registry.has(stackType);
  }

  /**
   * Gets the registered stack constructor for a type.
   *
   * @param stackType - The stack type symbol
   * @returns The stack constructor or undefined
   */
  public getStackConstructor(
    stackType: StackType | symbol
  ): StackConstructor | undefined {
    return this.registry.get(stackType);
  }

  /**
   * Creates a stack instance with the given configuration.
   *
   * @param scope - The parent construct scope
   * @param stackType - The stack type symbol
   * @param props - The factory stack props
   * @returns The created stack instance
   * @throws Error if the stack type is not registered
   */
  public createStack(
    scope: Construct,
    stackType: StackType | symbol,
    props: FactoryStackProps
  ): Stack {
    const Constructor = this.registry.get(stackType);

    if (!Constructor) {
      throw new Error(
        `Stack type not registered: ${this.getStackTypeName(stackType)}. ` +
          'Use registerStack() to register the stack constructor first.'
      );
    }

    const stackName = this.getStackTypeName(stackType);
    const stackId = NamingUtils.generateStackName(
      props.pipelineConfig.appName,
      props.stageConfig.stageName,
      stackName
    );

    this.log(
      `Creating stack: ${stackId} (type: ${stackName}) for stage: ${props.stageConfig.stageName}`
    );

    try {
      const stack = new Constructor(scope, stackId, props);
      this.log(`Successfully created stack: ${stackId}`);
      return stack;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.log(`Failed to create stack ${stackId}: ${errorMessage}`, 'error');
      throw error;
    }
  }

  /**
   * Creates multiple stacks in order, respecting dependencies.
   *
   * @param scope - The parent construct scope
   * @param stackTypes - Array of stack types to create
   * @param props - The factory stack props (will be modified for each stack)
   * @returns Map of created stacks by type
   */
  public createStacks(
    scope: Construct,
    stackTypes: (StackType | symbol)[],
    baseProps: Omit<FactoryStackProps, 'stageContext'>
  ): Map<StackType | symbol, Stack> {
    const createdStacks = new Map<StackType | symbol, Stack>();
    const deployedStacks = new Map<StackType | symbol, unknown>();

    for (const stackType of stackTypes) {
      const props: FactoryStackProps = {
        ...baseProps,
        stageContext: {
          stage: baseProps.stageConfig,
          pipeline: baseProps.pipelineConfig,
          deployedStacks,
        },
      };

      const stack = this.createStack(scope, stackType, props);
      createdStacks.set(stackType, stack);
      deployedStacks.set(stackType, stack);
    }

    return createdStacks;
  }

  /**
   * Gets the registered stack types.
   *
   * @returns Array of registered stack type symbols
   */
  public getRegisteredTypes(): (StackType | symbol)[] {
    return Array.from(this.registry.keys());
  }

  /**
   * Clears all registered stack types.
   * Useful for testing.
   */
  public clear(): void {
    this.registry.clear();
    this.log('Stack registry cleared');
  }

  /**
   * Gets the human-readable name for a stack type symbol.
   *
   * @param stackType - The stack type symbol
   * @returns The stack type name
   */
  private getStackTypeName(stackType: StackType | symbol): string {
    return stackType.description ?? String(stackType);
  }

  /**
   * Logs a message with factory context.
   *
   * @param message - The message to log
   * @param level - The log level
   */
  private log(
    message: string,
    level: 'info' | 'warn' | 'error' = 'info'
  ): void {
    if (!this.debug && level === 'info') return;

    const prefix = '[StackFactory]';
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
}
