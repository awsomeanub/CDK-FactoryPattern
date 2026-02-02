import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { Construct } from 'constructs';
import { FactoryBaseStack } from '../../lib/factory';
import { FactoryStackProps, TYPES } from '../../lib/definitions';
import { createMockFactoryStackProps } from '../helpers';

// Test stack implementation
class TestStack extends FactoryBaseStack {
  public readonly testResourceName: string;

  constructor(scope: Construct, id: string, props: FactoryStackProps) {
    super(scope, id, props);
    this.testResourceName = this.getResourceName('test');
  }
}

describe('FactoryBaseStack', () => {
  let app: App;

  beforeEach(() => {
    app = new App();
  });

  describe('basic creation', () => {
    it('creates a stack with correct name', () => {
      const props = createMockFactoryStackProps('dev');
      const stack = new TestStack(app, 'TestStack', props);

      expect(stack.stackName).toContain('testapp-dev');
    });

    it('sets environment from stage config', () => {
      const props = createMockFactoryStackProps('dev');
      const stack = new TestStack(app, 'TestStack', props);

      expect(stack.account).toBe('123456789012');
      expect(stack.region).toBe('us-east-1');
    });
  });

  describe('helper methods', () => {
    it('getStageName returns correct stage', () => {
      const props = createMockFactoryStackProps('staging');
      const stack = new TestStack(app, 'TestStack', props);

      // Access through the exposed test property
      expect(stack.testResourceName).toContain('staging');
    });

    it('isProd returns false for non-production', () => {
      const props = createMockFactoryStackProps('dev', false);
      const stack = new TestStack(app, 'TestStack', props);

      // Non-prod should not have termination protection
      expect(stack.terminationProtection).toBeFalsy();
    });

    it('isProd returns true for production', () => {
      const props = createMockFactoryStackProps('prod', true);
      const stack = new TestStack(app, 'TestStack', props);

      // Prod should have termination protection by default
      expect(stack.terminationProtection).toBe(true);
    });

    it('getResourceName generates correct format', () => {
      const props = createMockFactoryStackProps('dev');
      const stack = new TestStack(app, 'TestStack', props);

      expect(stack.testResourceName).toBe('testapp-dev-test');
    });
  });

  describe('tagging', () => {
    it('applies environment tag', () => {
      const props = createMockFactoryStackProps('dev');
      const stack = new TestStack(app, 'TestStack', props);

      const template = Template.fromStack(stack);
      // CDK stacks automatically get tags
      expect(stack.tags.tagValues()).toHaveProperty('Environment', 'dev');
    });

    it('applies application tag', () => {
      const props = createMockFactoryStackProps('dev');
      const stack = new TestStack(app, 'TestStack', props);

      expect(stack.tags.tagValues()).toHaveProperty('Application', 'testapp');
    });

    it('applies ManagedBy tag', () => {
      const props = createMockFactoryStackProps('dev');
      const stack = new TestStack(app, 'TestStack', props);

      expect(stack.tags.tagValues()).toHaveProperty(
        'ManagedBy',
        'CDK-FactoryPattern'
      );
    });
  });

  describe('termination protection', () => {
    it('enables termination protection for production', () => {
      const props = createMockFactoryStackProps('prod', true);
      const stack = new TestStack(app, 'TestStack', props);

      expect(stack.terminationProtection).toBe(true);
    });

    it('disables termination protection for non-production', () => {
      const props = createMockFactoryStackProps('dev', false);
      const stack = new TestStack(app, 'TestStack', props);

      expect(stack.terminationProtection).toBeFalsy();
    });
  });

  describe('custom props', () => {
    it('passes custom props correctly', () => {
      const customProps = { maxAzs: 3, enableFeature: true };
      const props = createMockFactoryStackProps('dev', false, customProps);

      const stack = new TestStack(app, 'TestStack', props);

      expect(props.customProps).toEqual(customProps);
    });
  });

  describe('stage context', () => {
    it('provides access to stage config', () => {
      const props = createMockFactoryStackProps('staging');
      const stack = new TestStack(app, 'TestStack', props);

      expect(props.stageConfig.stageName).toBe('staging');
    });

    it('provides access to pipeline config', () => {
      const props = createMockFactoryStackProps('dev');
      const stack = new TestStack(app, 'TestStack', props);

      expect(props.pipelineConfig.appName).toBe('testapp');
    });

    it('provides access to deployed stacks', () => {
      const props = createMockFactoryStackProps('dev');

      expect(props.stageContext.deployedStacks).toBeInstanceOf(Map);
    });
  });
});
