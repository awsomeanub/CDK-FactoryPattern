import { App, Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { StackFactory } from '../../lib/factory';
import { FactoryBaseStack } from '../../lib/factory';
import { FactoryStackProps, TYPES, StackConstructor } from '../../lib/definitions';
import { createMockFactoryStackProps } from '../helpers';

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

describe('StackFactory', () => {
  let factory: StackFactory;
  let app: App;

  beforeEach(() => {
    factory = new StackFactory(true); // Enable debug logging
    app = new App();
  });

  afterEach(() => {
    factory.clear();
  });

  describe('registration', () => {
    it('registers a stack type', () => {
      factory.registerStack(TYPES.VpcStack, TestVpcStack);

      expect(factory.hasStack(TYPES.VpcStack)).toBe(true);
    });

    it('throws error on duplicate registration', () => {
      factory.registerStack(TYPES.VpcStack, TestVpcStack);

      expect(() => {
        factory.registerStack(TYPES.VpcStack, TestVpcStack);
      }).toThrow('Stack type already registered');
    });

    it('returns false for unregistered stack', () => {
      expect(factory.hasStack(TYPES.VpcStack)).toBe(false);
    });

    it('returns registered constructor', () => {
      factory.registerStack(TYPES.VpcStack, TestVpcStack);

      const constructor = factory.getStackConstructor(TYPES.VpcStack);
      expect(constructor).toBe(TestVpcStack);
    });

    it('returns undefined for unregistered constructor', () => {
      const constructor = factory.getStackConstructor(TYPES.VpcStack);
      expect(constructor).toBeUndefined();
    });
  });

  describe('stack creation', () => {
    it('creates a stack from registered type', () => {
      factory.registerStack(TYPES.VpcStack, TestVpcStack);
      const props = createMockFactoryStackProps('dev');

      const stack = factory.createStack(app, TYPES.VpcStack, props);

      expect(stack).toBeInstanceOf(Stack);
      expect(stack).toBeInstanceOf(TestVpcStack);
    });

    it('throws error for unregistered stack type', () => {
      const props = createMockFactoryStackProps('dev');

      expect(() => {
        factory.createStack(app, TYPES.VpcStack, props);
      }).toThrow('Stack type not registered');
    });

    it('creates stack with correct naming', () => {
      factory.registerStack(TYPES.VpcStack, TestVpcStack);
      const props = createMockFactoryStackProps('dev');

      const stack = factory.createStack(app, TYPES.VpcStack, props);

      expect(stack.stackName).toContain('testapp');
      expect(stack.stackName).toContain('dev');
    });
  });

  describe('bulk operations', () => {
    it('registers multiple stacks', () => {
      const registrations = {
        [TYPES.VpcStack]: TestVpcStack,
        [TYPES.AppStack]: TestAppStack,
      };

      factory.registerStacks(registrations as Record<symbol, StackConstructor>);

      expect(factory.hasStack(TYPES.VpcStack)).toBe(true);
      expect(factory.hasStack(TYPES.AppStack)).toBe(true);
    });

    it('creates multiple stacks in order', () => {
      factory.registerStack(TYPES.VpcStack, TestVpcStack);
      factory.registerStack(TYPES.AppStack, TestAppStack);

      const props = createMockFactoryStackProps('dev');
      const baseProps = {
        stageConfig: props.stageConfig,
        pipelineConfig: props.pipelineConfig,
        customProps: props.customProps,
        env: props.env,
      };

      const stacks = factory.createStacks(
        app,
        [TYPES.VpcStack, TYPES.AppStack],
        baseProps
      );

      expect(stacks.size).toBe(2);
      expect(stacks.get(TYPES.VpcStack)).toBeInstanceOf(TestVpcStack);
      expect(stacks.get(TYPES.AppStack)).toBeInstanceOf(TestAppStack);
    });
  });

  describe('registry management', () => {
    it('returns all registered types', () => {
      factory.registerStack(TYPES.VpcStack, TestVpcStack);
      factory.registerStack(TYPES.AppStack, TestAppStack);

      const types = factory.getRegisteredTypes();

      expect(types).toContain(TYPES.VpcStack);
      expect(types).toContain(TYPES.AppStack);
    });

    it('clears all registrations', () => {
      factory.registerStack(TYPES.VpcStack, TestVpcStack);
      factory.registerStack(TYPES.AppStack, TestAppStack);

      factory.clear();

      expect(factory.hasStack(TYPES.VpcStack)).toBe(false);
      expect(factory.hasStack(TYPES.AppStack)).toBe(false);
    });

    it('returns empty array when no types registered', () => {
      const types = factory.getRegisteredTypes();

      expect(types).toHaveLength(0);
    });
  });

  describe('error handling', () => {
    it('propagates construction errors', () => {
      class ErrorStack extends FactoryBaseStack {
        constructor(scope: Construct, id: string, props: FactoryStackProps) {
          super(scope, id, props);
          throw new Error('Construction error');
        }
      }

      factory.registerStack(TYPES.VpcStack, ErrorStack);
      const props = createMockFactoryStackProps('dev');

      expect(() => {
        factory.createStack(app, TYPES.VpcStack, props);
      }).toThrow('Construction error');
    });
  });
});
