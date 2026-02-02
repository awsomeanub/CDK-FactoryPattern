/**
 * Factory Pattern Definitions
 *
 * This module exports all types, interfaces, and configuration
 * definitions for the CDK Factory Pattern framework.
 *
 * @module definitions
 */

// Types and interfaces
export {
  TYPES,
  StackType,
  StageConfig,
  StackConfig,
  PipelineConfig,
  StageContext,
  StackDeploymentResult,
  PipelineDeploymentResult,
} from './types';

// Factory interfaces
export {
  FactoryStackProps,
  StackConstructor,
  IStackFactory,
  IAppFactory,
  StageSetupHook,
  StackCreationOptions,
  StackResolutionResult,
} from './factory';

// Configuration interfaces
export {
  EnvironmentConfig,
  NamingConfig,
  DEFAULT_NAMING_CONFIG,
  NamingUtils,
  AppConfig,
  FeatureFlags,
  CostCenterConfig,
  ComplianceConfig,
} from './config';
