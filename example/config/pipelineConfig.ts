import { PipelineConfig, TYPES } from '../../lib/definitions';
import { allStages } from './stageConfig';

/**
 * Main pipeline configuration for the example application.
 * Orchestrates deployment of VPC and App stacks across all stages.
 */
export const pipelineConfig: PipelineConfig = {
  pipelineName: 'ExamplePipeline',
  appName: 'example',
  stages: allStages,
  stacks: [
    {
      type: TYPES.VpcStack,
      enabled: true,
      props: {
        maxAzs: 2,
      },
    },
    {
      type: TYPES.AppStack,
      enabled: true,
      dependsOn: [TYPES.VpcStack],
      props: {
        enableVersioning: true,
      },
    },
  ],
  tags: {
    Project: 'ExampleApp',
    Owner: 'platform-team',
    Repository: 'CDK-FactoryPattern',
  },
  enableTerminationProtection: true,
};

/**
 * Development-only pipeline configuration.
 * Useful for quick iteration during development.
 */
export const devOnlyPipelineConfig: PipelineConfig = {
  ...pipelineConfig,
  pipelineName: 'DevPipeline',
  stageFilter: ['dev'],
};

/**
 * Production-only pipeline configuration.
 * For targeted production deployments.
 */
export const prodOnlyPipelineConfig: PipelineConfig = {
  ...pipelineConfig,
  pipelineName: 'ProdPipeline',
  stageFilter: ['prod'],
};

/**
 * Gets the pipeline configuration based on environment.
 *
 * @returns The appropriate pipeline configuration
 */
export function getPipelineConfig(): PipelineConfig {
  const stage = process.env.DEPLOY_STAGE;

  if (stage === 'dev') {
    return devOnlyPipelineConfig;
  }

  if (stage === 'prod') {
    return prodOnlyPipelineConfig;
  }

  // Default: deploy all stages
  return pipelineConfig;
}
