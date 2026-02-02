import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { StageConfig, PipelineConfig, StackType, StageContext } from './types';

/**
 * Extended stack props with factory pattern context.
 * Used by all factory-created stacks.
 */
export interface FactoryStackProps extends StackProps {
  /** The stage configuration for this deployment */
  readonly stageConfig: StageConfig;
  /** The pipeline configuration */
  readonly pipelineConfig: PipelineConfig;
  /** The full stage context with deployed stacks */
  readonly stageContext: StageContext;
  /** Stack-specific custom props */
  readonly customProps?: Record<string, unknown>;
}

/**
 * Constructor signature for factory-created stacks.
 * Enables type-safe stack instantiation.
 *
 * @typeParam T - The stack type extending Stack
 */
export interface StackConstructor<T extends Stack = Stack> {
  new (scope: Construct, id: string, props: FactoryStackProps): T;
}

/**
 * Interface for stack factory implementations.
 * Defines the contract for creating and managing stacks.
 */
export interface IStackFactory {
  /**
   * Creates a stack instance with the given configuration.
   *
   * @param scope - The parent construct scope
   * @param stackType - The stack type symbol
   * @param props - The factory stack props
   * @returns The created stack instance
   */
  createStack(
    scope: Construct,
    stackType: StackType | symbol,
    props: FactoryStackProps
  ): Stack;

  /**
   * Registers a stack constructor for a given type.
   *
   * @param stackType - The stack type symbol
   * @param constructor - The stack constructor
   */
  registerStack(
    stackType: StackType | symbol,
    constructor: StackConstructor
  ): void;

  /**
   * Checks if a stack type is registered.
   *
   * @param stackType - The stack type symbol
   * @returns True if the stack type is registered
   */
  hasStack(stackType: StackType | symbol): boolean;

  /**
   * Gets the registered stack constructor for a type.
   *
   * @param stackType - The stack type symbol
   * @returns The stack constructor or undefined
   */
  getStackConstructor(
    stackType: StackType | symbol
  ): StackConstructor | undefined;
}

/**
 * Interface for CDK app factory implementations.
 * Orchestrates multi-stage pipeline deployment.
 */
export interface IAppFactory {
  /**
   * Synthesizes all stacks in the pipeline.
   *
   * @returns The CDK app instance
   */
  synth(): void;

  /**
   * Gets the pipeline configuration.
   *
   * @returns The pipeline configuration
   */
  getPipelineConfig(): PipelineConfig;

  /**
   * Adds a stage setup hook.
   *
   * @param hook - Function called before stage deployment
   */
  addStageSetupHook(hook: StageSetupHook): void;

  /**
   * Gets all synthesized stacks.
   *
   * @returns Map of stage name to stack instances
   */
  getStacks(): Map<string, Map<StackType | symbol, Stack>>;
}

/**
 * Hook function called during stage setup.
 * Allows customization of stage deployment.
 */
export type StageSetupHook = (
  stageName: string,
  stageConfig: StageConfig,
  pipelineConfig: PipelineConfig
) => void;

/**
 * Options for stack creation.
 */
export interface StackCreationOptions {
  /** Override the stack name */
  readonly stackNameOverride?: string;
  /** Additional tags for this stack */
  readonly additionalTags?: Record<string, string>;
  /** Whether to skip this stack */
  readonly skip?: boolean;
}

/**
 * Result of stack resolution.
 * Used when looking up stacks from the registry.
 */
export interface StackResolutionResult<T extends Stack = Stack> {
  /** Whether the stack was found */
  readonly found: boolean;
  /** The resolved stack instance */
  readonly stack?: T;
  /** Error message if resolution failed */
  readonly error?: string;
}
