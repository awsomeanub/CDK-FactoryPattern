import { Environment } from 'aws-cdk-lib';

/**
 * Symbol identifiers for stack types.
 * Used for stack registration and lookup in the factory pattern.
 */
export const TYPES = {
  /** VPC Stack type identifier */
  VpcStack: Symbol.for('VpcStack'),
  /** Application Stack type identifier */
  AppStack: Symbol.for('AppStack'),
  /** Database Stack type identifier */
  DatabaseStack: Symbol.for('DatabaseStack'),
  /** API Stack type identifier */
  ApiStack: Symbol.for('ApiStack'),
  /** Monitoring Stack type identifier */
  MonitoringStack: Symbol.for('MonitoringStack'),
  /** Storage Stack type identifier */
  StorageStack: Symbol.for('StorageStack'),
  /** Lambda Stack type identifier */
  LambdaStack: Symbol.for('LambdaStack'),
  /** Networking Stack type identifier */
  NetworkingStack: Symbol.for('NetworkingStack'),
} as const;

/**
 * Type for stack type symbols.
 */
export type StackType = (typeof TYPES)[keyof typeof TYPES];

/**
 * Configuration for a deployment stage.
 * Represents a single environment like dev, staging, or prod.
 */
export interface StageConfig {
  /** The stage name identifier (e.g., 'dev', 'staging', 'prod') */
  readonly stageName: string;
  /** The display name for the stage */
  readonly displayName?: string;
  /** The AWS environment configuration */
  readonly env: Environment;
  /** Whether this is a production stage */
  readonly isProduction: boolean;
  /** Stage-specific tags to apply to all resources */
  readonly tags?: Record<string, string>;
  /** Stage-specific configuration values */
  readonly config?: Record<string, unknown>;
  /** Whether the stage is enabled for deployment */
  readonly enabled?: boolean;
}

/**
 * Stack configuration within a pipeline.
 * Defines which stack to deploy with what dependencies.
 */
export interface StackConfig {
  /** The stack type symbol for registry lookup */
  readonly type: StackType | symbol;
  /** Stack-specific props to pass to the constructor */
  readonly props?: Record<string, unknown>;
  /** Array of stack types this stack depends on */
  readonly dependsOn?: (StackType | symbol)[];
  /** Whether this stack is enabled in the pipeline */
  readonly enabled?: boolean;
}

/**
 * Pipeline configuration for multi-stack deployment.
 * Orchestrates the deployment of multiple stacks across stages.
 */
export interface PipelineConfig {
  /** The pipeline name identifier */
  readonly pipelineName: string;
  /** The application name for resource naming */
  readonly appName: string;
  /** Array of stage configurations to deploy */
  readonly stages: StageConfig[];
  /** Array of stack configurations in deployment order */
  readonly stacks: StackConfig[];
  /** Pipeline-wide tags to apply */
  readonly tags?: Record<string, string>;
  /** Stage filter - only deploy specified stages */
  readonly stageFilter?: string[];
  /** Whether to enable termination protection for production */
  readonly enableTerminationProtection?: boolean;
}

/**
 * Stage context available during stack construction.
 * Provides environment-aware configuration.
 */
export interface StageContext {
  /** The stage configuration */
  readonly stage: StageConfig;
  /** The pipeline configuration */
  readonly pipeline: PipelineConfig;
  /** Map of deployed stacks for cross-stack references */
  readonly deployedStacks: Map<StackType | symbol, unknown>;
}

/**
 * Stack deployment result.
 * Returned after stack synthesis/deployment.
 */
export interface StackDeploymentResult {
  /** The stack type */
  readonly type: StackType | symbol;
  /** The stack name */
  readonly stackName: string;
  /** The stack instance */
  readonly stack: unknown;
  /** Whether deployment was successful */
  readonly success: boolean;
  /** Error message if deployment failed */
  readonly error?: string;
}

/**
 * Pipeline deployment result.
 * Aggregates results from all stack deployments.
 */
export interface PipelineDeploymentResult {
  /** The pipeline name */
  readonly pipelineName: string;
  /** Array of stack deployment results */
  readonly stacks: StackDeploymentResult[];
  /** Overall success status */
  readonly success: boolean;
  /** Total deployment duration in milliseconds */
  readonly durationMs: number;
}
