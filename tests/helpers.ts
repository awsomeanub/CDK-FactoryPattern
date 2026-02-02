import { App, Stack } from 'aws-cdk-lib';
import {
  ConstructContext,
  StageConfig,
  PipelineConfig,
  FactoryStackProps,
  StageContext,
  TYPES,
} from '../lib/definitions';

/**
 * Creates a mock ConstructContext for testing.
 *
 * @param overrides - Optional overrides for context properties
 * @returns Mock ConstructContext
 */
export function createMockContext(
  overrides: Partial<ConstructContext> = {}
): ConstructContext {
  return {
    stageName: 'test',
    appName: 'testapp',
    region: 'us-east-1',
    accountId: '123456789012',
    isProduction: false,
    ...overrides,
  };
}

/**
 * Creates a mock StageConfig for testing.
 *
 * @param stageName - Stage name
 * @param isProduction - Whether this is a production stage
 * @returns Mock StageConfig
 */
export function createMockStageConfig(
  stageName: string = 'test',
  isProduction: boolean = false
): StageConfig {
  return {
    stageName,
    displayName: `${stageName} Stage`,
    env: {
      account: '123456789012',
      region: 'us-east-1',
    },
    isProduction,
    tags: {
      Environment: stageName,
    },
    config: {
      logLevel: isProduction ? 'WARN' : 'DEBUG',
    },
  };
}

/**
 * Creates a mock PipelineConfig for testing.
 *
 * @param appName - Application name
 * @param stages - Array of stage configs
 * @returns Mock PipelineConfig
 */
export function createMockPipelineConfig(
  appName: string = 'testapp',
  stages: StageConfig[] = [createMockStageConfig()]
): PipelineConfig {
  return {
    pipelineName: 'TestPipeline',
    appName,
    stages,
    stacks: [{ type: TYPES.VpcStack }, { type: TYPES.AppStack }],
    tags: {
      Project: 'Test',
    },
  };
}

/**
 * Creates mock FactoryStackProps for testing.
 *
 * @param stageName - Stage name
 * @param isProduction - Whether this is production
 * @param customProps - Optional custom props
 * @returns Mock FactoryStackProps
 */
export function createMockFactoryStackProps(
  stageName: string = 'test',
  isProduction: boolean = false,
  customProps: Record<string, unknown> = {}
): FactoryStackProps {
  const stageConfig = createMockStageConfig(stageName, isProduction);
  const pipelineConfig = createMockPipelineConfig('testapp', [stageConfig]);

  const stageContext: StageContext = {
    stage: stageConfig,
    pipeline: pipelineConfig,
    deployedStacks: new Map(),
  };

  return {
    stageConfig,
    pipelineConfig,
    stageContext,
    customProps,
    env: stageConfig.env,
  };
}

/**
 * Creates a test stack for construct testing.
 *
 * @param app - Optional CDK App
 * @returns Test Stack
 */
export function createTestStack(app?: App): Stack {
  const testApp = app ?? new App();
  return new Stack(testApp, 'TestStack', {
    env: {
      account: '123456789012',
      region: 'us-east-1',
    },
  });
}

/**
 * Creates a production mock context.
 *
 * @returns Production ConstructContext
 */
export function createProdContext(): ConstructContext {
  return createMockContext({
    stageName: 'prod',
    isProduction: true,
  });
}

/**
 * Creates a development mock context.
 *
 * @returns Development ConstructContext
 */
export function createDevContext(): ConstructContext {
  return createMockContext({
    stageName: 'dev',
    isProduction: false,
  });
}
