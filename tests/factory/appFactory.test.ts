import { App, Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CdkAppFactory, FactoryBaseStack } from '../../lib/factory';
import {
  PipelineConfig,
  StageConfig,
  FactoryStackProps,
  TYPES,
} from '../../lib/definitions';
import { createMockStageConfig, createMockPipelineConfig } from '../helpers';

// Test stack implementations
class TestVpcStack extends FactoryBaseStack {
  constructor(scope: Construct, id: string, props: FactoryStackProps) {
    super(scope, id, props);
  }
}

class TestAppStack extends FactoryBaseStack {
  constructor(scope: Construct, id: string, props: FactoryStackProps) {
    super(scope, id, props);
  }
}

describe('CdkAppFactory', () => {
  describe('initialization', () => {
    it('creates factory with valid config', () => {
      const config = createMockPipelineConfig();

      const factory = new CdkAppFactory(config);

      expect(factory).toBeDefined();
      expect(factory.getPipelineConfig()).toBe(config);
    });

    it('throws error if pipeline name is missing', () => {
      const config = createMockPipelineConfig();
      (config as any).pipelineName = '';

      expect(() => {
        new CdkAppFactory(config);
      }).toThrow('pipelineName is required');
    });

    it('throws error if app name is missing', () => {
      const config = createMockPipelineConfig();
      (config as any).appName = '';

      expect(() => {
        new CdkAppFactory(config);
      }).toThrow('appName is required');
    });

    it('throws error if no stages defined', () => {
      const config = createMockPipelineConfig();
      (config as any).stages = [];

      expect(() => {
        new CdkAppFactory(config);
      }).toThrow('At least one stage is required');
    });

    it('throws error if no stacks defined', () => {
      const config = createMockPipelineConfig();
      (config as any).stacks = [];

      expect(() => {
        new CdkAppFactory(config);
      }).toThrow('At least one stack configuration is required');
    });
  });

  describe('stack registration', () => {
    it('registers stack type', () => {
      const factory = new CdkAppFactory(createMockPipelineConfig());

      factory.registerStack(TYPES.VpcStack, TestVpcStack);

      // Registration is verified by successful synthesis
      expect(() => factory.synth()).not.toThrow();
    });
  });

  describe('stage setup hooks', () => {
    it('calls stage setup hooks', () => {
      const config = createMockPipelineConfig();
      const factory = new CdkAppFactory(config);
      const mockHook = jest.fn();

      factory.registerStack(TYPES.VpcStack, TestVpcStack);
      factory.registerStack(TYPES.AppStack, TestAppStack);
      factory.addStageSetupHook(mockHook);
      factory.synth();

      expect(mockHook).toHaveBeenCalled();
    });

    it('passes correct arguments to hook', () => {
      const config = createMockPipelineConfig();
      const factory = new CdkAppFactory(config);
      const mockHook = jest.fn();

      factory.registerStack(TYPES.VpcStack, TestVpcStack);
      factory.registerStack(TYPES.AppStack, TestAppStack);
      factory.addStageSetupHook(mockHook);
      factory.synth();

      expect(mockHook).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ stageName: expect.any(String) }),
        expect.objectContaining({ pipelineName: 'TestPipeline' })
      );
    });
  });

  describe('synthesis', () => {
    it('synthesizes stacks for all stages', () => {
      const devStage = createMockStageConfig('dev', false);
      const prodStage = createMockStageConfig('prod', true);
      const config = createMockPipelineConfig('testapp', [devStage, prodStage]);
      const factory = new CdkAppFactory(config);

      factory.registerStack(TYPES.VpcStack, TestVpcStack);
      factory.registerStack(TYPES.AppStack, TestAppStack);
      factory.synth();

      const stacks = factory.getStacks();
      expect(stacks.size).toBe(2); // dev and prod stages
    });

    it('creates stacks in dependency order', () => {
      const config = createMockPipelineConfig();
      const factory = new CdkAppFactory(config);

      factory.registerStack(TYPES.VpcStack, TestVpcStack);
      factory.registerStack(TYPES.AppStack, TestAppStack);
      factory.synth();

      const stacks = factory.getStacks();
      const stageStacks = stacks.get('test');

      expect(stageStacks).toBeDefined();
      expect(stageStacks?.has(TYPES.VpcStack)).toBe(true);
      expect(stageStacks?.has(TYPES.AppStack)).toBe(true);
    });

    it('warns on duplicate synth calls', () => {
      const config = createMockPipelineConfig();
      const factory = new CdkAppFactory(config);
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      factory.registerStack(TYPES.VpcStack, TestVpcStack);
      factory.registerStack(TYPES.AppStack, TestAppStack);
      factory.synth();
      factory.synth(); // Second call

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('synth() has already been called')
      );

      warnSpy.mockRestore();
    });
  });

  describe('stage filtering', () => {
    it('filters stages when stageFilter is specified', () => {
      const devStage = createMockStageConfig('dev', false);
      const stagingStage = createMockStageConfig('staging', false);
      const prodStage = createMockStageConfig('prod', true);

      const config: PipelineConfig = {
        ...createMockPipelineConfig('testapp', [devStage, stagingStage, prodStage]),
        stageFilter: ['dev'],
      };

      const factory = new CdkAppFactory(config);
      factory.registerStack(TYPES.VpcStack, TestVpcStack);
      factory.registerStack(TYPES.AppStack, TestAppStack);
      factory.synth();

      const stacks = factory.getStacks();
      expect(stacks.size).toBe(1);
      expect(stacks.has('dev')).toBe(true);
      expect(stacks.has('staging')).toBe(false);
      expect(stacks.has('prod')).toBe(false);
    });

    it('respects enabled flag on stages', () => {
      const devStage = { ...createMockStageConfig('dev', false), enabled: true };
      const stagingStage = {
        ...createMockStageConfig('staging', false),
        enabled: false,
      };

      const config = createMockPipelineConfig('testapp', [devStage, stagingStage]);
      const factory = new CdkAppFactory(config);

      factory.registerStack(TYPES.VpcStack, TestVpcStack);
      factory.registerStack(TYPES.AppStack, TestAppStack);
      factory.synth();

      const stacks = factory.getStacks();
      expect(stacks.has('dev')).toBe(true);
      expect(stacks.has('staging')).toBe(false);
    });
  });

  describe('app access', () => {
    it('provides access to CDK App', () => {
      const factory = new CdkAppFactory(createMockPipelineConfig());

      const app = factory.getApp();

      expect(app).toBeInstanceOf(App);
    });
  });

  describe('dependency resolution', () => {
    it('handles stack dependencies', () => {
      const config: PipelineConfig = {
        pipelineName: 'TestPipeline',
        appName: 'testapp',
        stages: [createMockStageConfig('dev', false)],
        stacks: [
          { type: TYPES.VpcStack },
          { type: TYPES.AppStack, dependsOn: [TYPES.VpcStack] },
        ],
      };

      const factory = new CdkAppFactory(config);
      factory.registerStack(TYPES.VpcStack, TestVpcStack);
      factory.registerStack(TYPES.AppStack, TestAppStack);

      expect(() => factory.synth()).not.toThrow();

      const stacks = factory.getStacks().get('dev');
      const vpcStack = stacks?.get(TYPES.VpcStack);
      const appStack = stacks?.get(TYPES.AppStack);

      expect(vpcStack).toBeDefined();
      expect(appStack).toBeDefined();
    });

    it('detects circular dependencies', () => {
      // Create symbols for test
      const TypeA = Symbol.for('TypeA');
      const TypeB = Symbol.for('TypeB');

      const config: PipelineConfig = {
        pipelineName: 'TestPipeline',
        appName: 'testapp',
        stages: [createMockStageConfig('dev', false)],
        stacks: [
          { type: TypeA, dependsOn: [TypeB] },
          { type: TypeB, dependsOn: [TypeA] },
        ],
      };

      const factory = new CdkAppFactory(config);
      factory.registerStack(TypeA, TestVpcStack);
      factory.registerStack(TypeB, TestAppStack);

      expect(() => factory.synth()).toThrow('Circular dependency detected');
    });
  });
});
