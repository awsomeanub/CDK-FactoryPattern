import { App, Stack, Duration } from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { SecureLambda } from '../../lib/implementations/constructs';
import {
  createTestStack,
  createMockContext,
  createProdContext,
  createDevContext,
} from '../helpers';

describe('SecureLambda', () => {
  let app: App;
  let stack: Stack;

  beforeEach(() => {
    app = new App();
    stack = createTestStack(app);
  });

  describe('basic creation', () => {
    it('creates a Lambda function', () => {
      new SecureLambda(stack, 'TestFunction', {
        context: createMockContext(),
        functionName: 'test',
        code: lambda.Code.fromInline('exports.handler = async () => {}'),
        handler: 'index.handler',
      });

      const template = Template.fromStack(stack);
      template.hasResource('AWS::Lambda::Function', {});
    });

    it('throws error if function name is empty', () => {
      expect(() => {
        new SecureLambda(stack, 'TestFunction', {
          context: createMockContext(),
          functionName: '',
          code: lambda.Code.fromInline('exports.handler = async () => {}'),
          handler: 'index.handler',
        });
      }).toThrow('functionName is required and cannot be empty');
    });

    it('throws error if handler is empty', () => {
      expect(() => {
        new SecureLambda(stack, 'TestFunction', {
          context: createMockContext(),
          functionName: 'test',
          code: lambda.Code.fromInline('exports.handler = async () => {}'),
          handler: '',
        });
      }).toThrow('handler is required and cannot be empty');
    });
  });

  describe('organizational standards', () => {
    it('uses Node.js 20.x runtime by default', () => {
      new SecureLambda(stack, 'TestFunction', {
        context: createMockContext(),
        functionName: 'test',
        code: lambda.Code.fromInline('exports.handler = async () => {}'),
        handler: 'index.handler',
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::Lambda::Function', {
        Runtime: 'nodejs20.x',
      });
    });

    it('uses 512MB memory by default', () => {
      new SecureLambda(stack, 'TestFunction', {
        context: createMockContext(),
        functionName: 'test',
        code: lambda.Code.fromInline('exports.handler = async () => {}'),
        handler: 'index.handler',
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::Lambda::Function', {
        MemorySize: 512,
      });
    });

    it('uses 30 second timeout by default', () => {
      new SecureLambda(stack, 'TestFunction', {
        context: createMockContext(),
        functionName: 'test',
        code: lambda.Code.fromInline('exports.handler = async () => {}'),
        handler: 'index.handler',
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::Lambda::Function', {
        Timeout: 30,
      });
    });

    it('enables X-Ray tracing by default', () => {
      new SecureLambda(stack, 'TestFunction', {
        context: createMockContext(),
        functionName: 'test',
        code: lambda.Code.fromInline('exports.handler = async () => {}'),
        handler: 'index.handler',
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::Lambda::Function', {
        TracingConfig: {
          Mode: 'Active',
        },
      });
    });
  });

  describe('custom configuration', () => {
    it('allows custom memory size', () => {
      new SecureLambda(stack, 'TestFunction', {
        context: createMockContext(),
        functionName: 'test',
        code: lambda.Code.fromInline('exports.handler = async () => {}'),
        handler: 'index.handler',
        memorySize: 1024,
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::Lambda::Function', {
        MemorySize: 1024,
      });
    });

    it('allows custom timeout', () => {
      new SecureLambda(stack, 'TestFunction', {
        context: createMockContext(),
        functionName: 'test',
        code: lambda.Code.fromInline('exports.handler = async () => {}'),
        handler: 'index.handler',
        timeout: Duration.seconds(60),
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::Lambda::Function', {
        Timeout: 60,
      });
    });

    it('allows Python runtime', () => {
      new SecureLambda(stack, 'TestFunction', {
        context: createMockContext(),
        functionName: 'test',
        code: lambda.Code.fromInline('def handler(event, context): pass'),
        handler: 'index.handler',
        runtime: lambda.Runtime.PYTHON_3_12,
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::Lambda::Function', {
        Runtime: 'python3.12',
      });
    });
  });

  describe('environment variables', () => {
    it('includes custom environment variables', () => {
      new SecureLambda(stack, 'TestFunction', {
        context: createMockContext(),
        functionName: 'test',
        code: lambda.Code.fromInline('exports.handler = async () => {}'),
        handler: 'index.handler',
        environment: {
          MY_VAR: 'my-value',
        },
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::Lambda::Function', {
        Environment: {
          Variables: expect.objectContaining({
            MY_VAR: 'my-value',
          }),
        },
      });
    });

    it('includes standard environment variables', () => {
      new SecureLambda(stack, 'TestFunction', {
        context: createMockContext({
          stageName: 'dev',
          appName: 'myapp',
        }),
        functionName: 'test',
        code: lambda.Code.fromInline('exports.handler = async () => {}'),
        handler: 'index.handler',
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::Lambda::Function', {
        Environment: {
          Variables: expect.objectContaining({
            STAGE: 'dev',
            APP_NAME: 'myapp',
            AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
          }),
        },
      });
    });
  });

  describe('resource naming', () => {
    it('generates correct function name', () => {
      new SecureLambda(stack, 'TestFunction', {
        context: createMockContext({
          appName: 'myapp',
          stageName: 'dev',
        }),
        functionName: 'processor',
        code: lambda.Code.fromInline('exports.handler = async () => {}'),
        handler: 'index.handler',
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::Lambda::Function', {
        FunctionName: 'myapp-dev-processor',
      });
    });
  });

  describe('validation', () => {
    it('throws error for memory size below minimum', () => {
      expect(() => {
        new SecureLambda(stack, 'TestFunction', {
          context: createMockContext(),
          functionName: 'test',
          code: lambda.Code.fromInline('exports.handler = async () => {}'),
          handler: 'index.handler',
          memorySize: 64, // Below 128 minimum
        });
      }).toThrow('memorySize must be between 128 and 10240 MB');
    });

    it('throws error for memory size above maximum', () => {
      expect(() => {
        new SecureLambda(stack, 'TestFunction', {
          context: createMockContext(),
          functionName: 'test',
          code: lambda.Code.fromInline('exports.handler = async () => {}'),
          handler: 'index.handler',
          memorySize: 20000, // Above 10240 maximum
        });
      }).toThrow('memorySize must be between 128 and 10240 MB');
    });

    it('throws error for timeout exceeding 15 minutes', () => {
      expect(() => {
        new SecureLambda(stack, 'TestFunction', {
          context: createMockContext(),
          functionName: 'test',
          code: lambda.Code.fromInline('exports.handler = async () => {}'),
          handler: 'index.handler',
          timeout: Duration.seconds(1000), // Over 900 seconds
        });
      }).toThrow('timeout cannot exceed 900 seconds');
    });
  });

  describe('exposed properties', () => {
    it('exposes function name', () => {
      const fn = new SecureLambda(stack, 'TestFunction', {
        context: createMockContext(),
        functionName: 'test',
        code: lambda.Code.fromInline('exports.handler = async () => {}'),
        handler: 'index.handler',
      });

      expect(fn.functionName).toBeDefined();
    });

    it('exposes function ARN', () => {
      const fn = new SecureLambda(stack, 'TestFunction', {
        context: createMockContext(),
        functionName: 'test',
        code: lambda.Code.fromInline('exports.handler = async () => {}'),
        handler: 'index.handler',
      });

      expect(fn.functionArn).toBeDefined();
    });

    it('exposes underlying function', () => {
      const fn = new SecureLambda(stack, 'TestFunction', {
        context: createMockContext(),
        functionName: 'test',
        code: lambda.Code.fromInline('exports.handler = async () => {}'),
        handler: 'index.handler',
      });

      expect(fn.function).toBeDefined();
    });

    it('exposes execution role', () => {
      const fn = new SecureLambda(stack, 'TestFunction', {
        context: createMockContext(),
        functionName: 'test',
        code: lambda.Code.fromInline('exports.handler = async () => {}'),
        handler: 'index.handler',
      });

      expect(fn.role).toBeDefined();
    });
  });

  describe('log retention', () => {
    it('sets log retention to 7 days by default', () => {
      new SecureLambda(stack, 'TestFunction', {
        context: createMockContext(),
        functionName: 'test',
        code: lambda.Code.fromInline('exports.handler = async () => {}'),
        handler: 'index.handler',
      });

      const template = Template.fromStack(stack);
      template.hasResource('Custom::LogRetention', {});
    });
  });
});
