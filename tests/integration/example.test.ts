import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { CdkAppFactory } from '../../lib/factory';
import { TYPES, PipelineConfig } from '../../lib/definitions';
import { VpcStack } from '../../example/stacks/VpcStack';
import { AppStack } from '../../example/stacks/AppStack';
import { pipelineConfig } from '../../example/config/pipelineConfig';
import { registerAllStacks } from '../../example/config/stackRegistry';

describe('Example Application Integration', () => {
  describe('full synthesis', () => {
    it('synthesizes all stages without errors', () => {
      // Use dev-only config for faster tests
      const testConfig: PipelineConfig = {
        ...pipelineConfig,
        stageFilter: ['dev'],
      };

      const factory = new CdkAppFactory(testConfig);
      registerAllStacks(factory);

      expect(() => factory.synth()).not.toThrow();
    });

    it('creates expected number of stacks', () => {
      const testConfig: PipelineConfig = {
        ...pipelineConfig,
        stageFilter: ['dev'],
      };

      const factory = new CdkAppFactory(testConfig);
      registerAllStacks(factory);
      factory.synth();

      const stacks = factory.getStacks();
      const devStacks = stacks.get('dev');

      expect(devStacks).toBeDefined();
      expect(devStacks?.size).toBe(2); // VpcStack and AppStack
    });
  });

  describe('VpcStack integration', () => {
    it('creates VPC resources', () => {
      const testConfig: PipelineConfig = {
        ...pipelineConfig,
        stageFilter: ['dev'],
      };

      const factory = new CdkAppFactory(testConfig);
      registerAllStacks(factory);
      factory.synth();

      const stacks = factory.getStacks();
      const vpcStack = stacks.get('dev')?.get(TYPES.VpcStack);

      expect(vpcStack).toBeDefined();

      const template = Template.fromStack(vpcStack!);
      template.hasResource('AWS::EC2::VPC', {});
      template.hasResource('AWS::EC2::Subnet', {});
    });

    it('creates NAT Gateway', () => {
      const testConfig: PipelineConfig = {
        ...pipelineConfig,
        stageFilter: ['dev'],
      };

      const factory = new CdkAppFactory(testConfig);
      registerAllStacks(factory);
      factory.synth();

      const stacks = factory.getStacks();
      const vpcStack = stacks.get('dev')?.get(TYPES.VpcStack);

      const template = Template.fromStack(vpcStack!);
      template.hasResource('AWS::EC2::NatGateway', {});
    });
  });

  describe('AppStack integration', () => {
    it('creates S3 bucket', () => {
      const testConfig: PipelineConfig = {
        ...pipelineConfig,
        stageFilter: ['dev'],
      };

      const factory = new CdkAppFactory(testConfig);
      registerAllStacks(factory);
      factory.synth();

      const stacks = factory.getStacks();
      const appStack = stacks.get('dev')?.get(TYPES.AppStack);

      expect(appStack).toBeDefined();

      const template = Template.fromStack(appStack!);
      template.hasResource('AWS::S3::Bucket', {});
    });

    it('creates DynamoDB table', () => {
      const testConfig: PipelineConfig = {
        ...pipelineConfig,
        stageFilter: ['dev'],
      };

      const factory = new CdkAppFactory(testConfig);
      registerAllStacks(factory);
      factory.synth();

      const stacks = factory.getStacks();
      const appStack = stacks.get('dev')?.get(TYPES.AppStack);

      const template = Template.fromStack(appStack!);
      template.hasResource('AWS::DynamoDB::Table', {});
    });

    it('bucket has security settings', () => {
      const testConfig: PipelineConfig = {
        ...pipelineConfig,
        stageFilter: ['dev'],
      };

      const factory = new CdkAppFactory(testConfig);
      registerAllStacks(factory);
      factory.synth();

      const stacks = factory.getStacks();
      const appStack = stacks.get('dev')?.get(TYPES.AppStack);

      const template = Template.fromStack(appStack!);
      template.hasResourceProperties('AWS::S3::Bucket', {
        PublicAccessBlockConfiguration: {
          BlockPublicAcls: true,
          BlockPublicPolicy: true,
          IgnorePublicAcls: true,
          RestrictPublicBuckets: true,
        },
      });
    });

    it('DynamoDB table has organizational standards', () => {
      const testConfig: PipelineConfig = {
        ...pipelineConfig,
        stageFilter: ['dev'],
      };

      const factory = new CdkAppFactory(testConfig);
      registerAllStacks(factory);
      factory.synth();

      const stacks = factory.getStacks();
      const appStack = stacks.get('dev')?.get(TYPES.AppStack);

      const template = Template.fromStack(appStack!);
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        BillingMode: 'PAY_PER_REQUEST',
        PointInTimeRecoverySpecification: {
          PointInTimeRecoveryEnabled: true,
        },
      });
    });
  });

  describe('cross-stage deployment', () => {
    it('creates stacks for multiple stages', () => {
      const testConfig: PipelineConfig = {
        ...pipelineConfig,
        stageFilter: ['dev', 'staging'],
      };

      const factory = new CdkAppFactory(testConfig);
      registerAllStacks(factory);
      factory.synth();

      const stacks = factory.getStacks();

      expect(stacks.has('dev')).toBe(true);
      expect(stacks.has('staging')).toBe(true);
    });

    it('production stacks have termination protection', () => {
      const testConfig: PipelineConfig = {
        ...pipelineConfig,
        stageFilter: ['prod'],
      };

      const factory = new CdkAppFactory(testConfig);
      registerAllStacks(factory);
      factory.synth();

      const stacks = factory.getStacks();
      const prodVpcStack = stacks.get('prod')?.get(TYPES.VpcStack);

      expect(prodVpcStack?.terminationProtection).toBe(true);
    });
  });

  describe('tagging', () => {
    it('applies environment tags', () => {
      const testConfig: PipelineConfig = {
        ...pipelineConfig,
        stageFilter: ['dev'],
      };

      const factory = new CdkAppFactory(testConfig);
      registerAllStacks(factory);
      factory.synth();

      const stacks = factory.getStacks();
      const appStack = stacks.get('dev')?.get(TYPES.AppStack);

      expect(appStack?.tags.tagValues()).toHaveProperty('Environment', 'dev');
    });

    it('applies application tags', () => {
      const testConfig: PipelineConfig = {
        ...pipelineConfig,
        stageFilter: ['dev'],
      };

      const factory = new CdkAppFactory(testConfig);
      registerAllStacks(factory);
      factory.synth();

      const stacks = factory.getStacks();
      const appStack = stacks.get('dev')?.get(TYPES.AppStack);

      expect(appStack?.tags.tagValues()).toHaveProperty('Application', 'example');
    });
  });
});
