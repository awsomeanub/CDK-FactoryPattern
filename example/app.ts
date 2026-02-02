#!/usr/bin/env node
import 'source-map-support/register';
import { CdkAppFactory } from '../lib/factory';
import { getPipelineConfig } from './config/pipelineConfig';
import { registerAllStacks } from './config/stackRegistry';

/**
 * Main entry point for the CDK application.
 *
 * This file demonstrates how to use the Factory Pattern Framework
 * to deploy infrastructure across multiple stages.
 *
 * Usage:
 *   npx cdk synth                    # Synthesize all stages
 *   DEPLOY_STAGE=dev npx cdk synth   # Synthesize dev only
 *   DEPLOY_STAGE=prod npx cdk synth  # Synthesize prod only
 *   npx cdk deploy --all             # Deploy all stacks
 */

// Get the pipeline configuration based on environment
const pipelineConfig = getPipelineConfig();

// Create the CDK App Factory
const factory = new CdkAppFactory(pipelineConfig, true);

// Register all stack constructors from the registry
registerAllStacks(factory);

// Add a stage setup hook (example)
factory.addStageSetupHook((stageName, stageConfig, pipelineConfig) => {
  console.log(`Setting up stage: ${stageName}`);
  console.log(`  - Environment: ${stageConfig.env.account}/${stageConfig.env.region}`);
  console.log(`  - Is Production: ${stageConfig.isProduction}`);
});

// Synthesize all stacks
factory.synth();

// Log summary
const stacks = factory.getStacks();
console.log('\n=== Synthesis Summary ===');
stacks.forEach((stageStacks, stageName) => {
  console.log(`\nStage: ${stageName}`);
  stageStacks.forEach((stack, type) => {
    console.log(`  - ${type.description ?? String(type)}: ${stack.stackName}`);
  });
});
console.log('\n=========================\n');
