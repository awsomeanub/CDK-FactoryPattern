import { App, Stack } from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { S3Bucket } from '../../lib/implementations/constructs';
import {
  createTestStack,
  createMockContext,
  createProdContext,
  createDevContext,
} from '../helpers';

describe('S3Bucket', () => {
  let app: App;
  let stack: Stack;

  beforeEach(() => {
    app = new App();
    stack = createTestStack(app);
  });

  describe('basic creation', () => {
    it('creates an S3 bucket', () => {
      new S3Bucket(stack, 'TestBucket', {
        context: createMockContext(),
        bucketName: 'test',
      });

      const template = Template.fromStack(stack);
      template.hasResource('AWS::S3::Bucket', {});
    });

    it('throws error if bucket name is empty', () => {
      expect(() => {
        new S3Bucket(stack, 'TestBucket', {
          context: createMockContext(),
          bucketName: '',
        });
      }).toThrow('bucketName is required and cannot be empty');
    });
  });

  describe('security settings', () => {
    it('blocks all public access by default', () => {
      new S3Bucket(stack, 'TestBucket', {
        context: createMockContext(),
        bucketName: 'test',
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::S3::Bucket', {
        PublicAccessBlockConfiguration: {
          BlockPublicAcls: true,
          BlockPublicPolicy: true,
          IgnorePublicAcls: true,
          RestrictPublicBuckets: true,
        },
      });
    });

    it('enables S3 managed encryption by default', () => {
      new S3Bucket(stack, 'TestBucket', {
        context: createMockContext(),
        bucketName: 'test',
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::S3::Bucket', {
        BucketEncryption: {
          ServerSideEncryptionConfiguration: [
            {
              ServerSideEncryptionByDefault: {
                SSEAlgorithm: 'AES256',
              },
            },
          ],
        },
      });
    });

    it('enforces bucket owner ownership by default', () => {
      new S3Bucket(stack, 'TestBucket', {
        context: createMockContext(),
        bucketName: 'test',
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::S3::Bucket', {
        OwnershipControls: {
          Rules: [
            {
              ObjectOwnership: 'BucketOwnerEnforced',
            },
          ],
        },
      });
    });
  });

  describe('versioning', () => {
    it('does not enable versioning by default for non-prod', () => {
      new S3Bucket(stack, 'TestBucket', {
        context: createDevContext(),
        bucketName: 'test',
      });

      const template = Template.fromStack(stack);
      // No versioning configuration means versioning is disabled
      template.hasResourceProperties('AWS::S3::Bucket', {
        VersioningConfiguration: Match.absent(),
      });
    });

    it('enables versioning by default for production', () => {
      new S3Bucket(stack, 'TestBucket', {
        context: createProdContext(),
        bucketName: 'test',
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::S3::Bucket', {
        VersioningConfiguration: {
          Status: 'Enabled',
        },
      });
    });

    it('allows explicit versioning configuration', () => {
      new S3Bucket(stack, 'TestBucket', {
        context: createDevContext(),
        bucketName: 'test',
        versioned: true,
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::S3::Bucket', {
        VersioningConfiguration: {
          Status: 'Enabled',
        },
      });
    });
  });

  describe('lifecycle rules', () => {
    it('applies lifecycle rules', () => {
      new S3Bucket(stack, 'TestBucket', {
        context: createMockContext(),
        bucketName: 'test',
        lifecycleRules: [
          {
            id: 'expire-old',
            expirationDays: 30,
          },
        ],
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::S3::Bucket', {
        LifecycleConfiguration: {
          Rules: [
            {
              Id: 'expire-old',
              ExpirationInDays: 30,
              Status: 'Enabled',
            },
          ],
        },
      });
    });

    it('applies transition rules', () => {
      new S3Bucket(stack, 'TestBucket', {
        context: createMockContext(),
        bucketName: 'test',
        lifecycleRules: [
          {
            id: 'archive',
            transitionToIaAfterDays: 30,
          },
        ],
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::S3::Bucket', {
        LifecycleConfiguration: {
          Rules: expect.arrayContaining([
            expect.objectContaining({
              Id: 'archive',
              Transitions: expect.arrayContaining([
                expect.objectContaining({
                  TransitionInDays: 30,
                }),
              ]),
            }),
          ]),
        },
      });
    });
  });

  describe('CORS configuration', () => {
    it('applies CORS rules', () => {
      new S3Bucket(stack, 'TestBucket', {
        context: createMockContext(),
        bucketName: 'test',
        cors: [
          {
            allowedMethods: [],
            allowedOrigins: ['https://example.com'],
          },
        ],
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::S3::Bucket', {
        CorsConfiguration: {
          CorsRules: expect.arrayContaining([
            expect.objectContaining({
              AllowedOrigins: ['https://example.com'],
            }),
          ]),
        },
      });
    });
  });

  describe('resource naming', () => {
    it('generates correct bucket name', () => {
      new S3Bucket(stack, 'TestBucket', {
        context: createMockContext({
          appName: 'myapp',
          stageName: 'dev',
        }),
        bucketName: 'data',
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::S3::Bucket', {
        BucketName: 'myapp-dev-data',
      });
    });

    it('sanitizes bucket name to lowercase', () => {
      new S3Bucket(stack, 'TestBucket', {
        context: createMockContext({
          appName: 'MyApp',
          stageName: 'Dev',
        }),
        bucketName: 'Data',
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::S3::Bucket', {
        BucketName: 'myapp-dev-data',
      });
    });
  });

  describe('exposed properties', () => {
    it('exposes bucket name', () => {
      const bucket = new S3Bucket(stack, 'TestBucket', {
        context: createMockContext(),
        bucketName: 'test',
      });

      expect(bucket.bucketName).toBeDefined();
    });

    it('exposes bucket ARN', () => {
      const bucket = new S3Bucket(stack, 'TestBucket', {
        context: createMockContext(),
        bucketName: 'test',
      });

      expect(bucket.bucketArn).toBeDefined();
    });

    it('exposes underlying bucket', () => {
      const bucket = new S3Bucket(stack, 'TestBucket', {
        context: createMockContext(),
        bucketName: 'test',
      });

      expect(bucket.bucket).toBeDefined();
    });
  });
});
