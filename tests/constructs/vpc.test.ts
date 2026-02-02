import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { SecureVpc } from '../../lib/implementations/constructs';
import { createTestStack, createMockContext, createProdContext } from '../helpers';

describe('SecureVpc', () => {
  let app: App;
  let stack: Stack;

  beforeEach(() => {
    app = new App();
    stack = createTestStack(app);
  });

  describe('basic creation', () => {
    it('creates a VPC with default settings', () => {
      new SecureVpc(stack, 'TestVpc', {
        context: createMockContext(),
      });

      const template = Template.fromStack(stack);
      template.hasResource('AWS::EC2::VPC', {});
    });

    it('creates VPC with correct CIDR', () => {
      new SecureVpc(stack, 'TestVpc', {
        context: createMockContext(),
        cidr: '10.0.0.0/16',
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::EC2::VPC', {
        CidrBlock: '10.0.0.0/16',
      });
    });

    it('creates minimum 2 availability zones', () => {
      const vpc = new SecureVpc(stack, 'TestVpc', {
        context: createMockContext(),
        maxAzs: 1, // Should be enforced to 2
      });

      expect(vpc.publicSubnets.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('subnet configuration', () => {
    it('creates public subnets', () => {
      new SecureVpc(stack, 'TestVpc', {
        context: createMockContext(),
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::EC2::Subnet', {
        MapPublicIpOnLaunch: true,
      });
    });

    it('creates private subnets', () => {
      new SecureVpc(stack, 'TestVpc', {
        context: createMockContext(),
      });

      const template = Template.fromStack(stack);
      // Private subnets don't have MapPublicIpOnLaunch
      template.resourceCountIs('AWS::EC2::Subnet', 6); // 2 AZs * 3 subnet types
    });

    it('creates NAT gateways for private subnets', () => {
      new SecureVpc(stack, 'TestVpc', {
        context: createMockContext(),
        natGateways: 1,
      });

      const template = Template.fromStack(stack);
      template.resourceCountIs('AWS::EC2::NatGateway', 1);
    });
  });

  describe('production settings', () => {
    it('enables VPC flow logs in production', () => {
      new SecureVpc(stack, 'TestVpc', {
        context: createProdContext(),
        enableFlowLogs: true,
      });

      const template = Template.fromStack(stack);
      template.hasResource('AWS::EC2::FlowLog', {});
    });

    it('creates multiple NAT gateways in production by default', () => {
      new SecureVpc(stack, 'TestVpc', {
        context: createProdContext(),
        maxAzs: 3,
      });

      const template = Template.fromStack(stack);
      template.resourceCountIs('AWS::EC2::NatGateway', 3);
    });
  });

  describe('DNS settings', () => {
    it('enables DNS hostnames by default', () => {
      new SecureVpc(stack, 'TestVpc', {
        context: createMockContext(),
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::EC2::VPC', {
        EnableDnsHostnames: true,
      });
    });

    it('enables DNS support by default', () => {
      new SecureVpc(stack, 'TestVpc', {
        context: createMockContext(),
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::EC2::VPC', {
        EnableDnsSupport: true,
      });
    });
  });

  describe('resource naming', () => {
    it('names VPC with correct pattern', () => {
      new SecureVpc(stack, 'TestVpc', {
        context: createMockContext({
          appName: 'myapp',
          stageName: 'dev',
        }),
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::EC2::VPC', {
        Tags: expect.arrayContaining([
          expect.objectContaining({
            Key: 'Name',
            Value: expect.stringContaining('myapp-dev-vpc'),
          }),
        ]),
      });
    });
  });

  describe('exposed properties', () => {
    it('exposes underlying VPC', () => {
      const secureVpc = new SecureVpc(stack, 'TestVpc', {
        context: createMockContext(),
      });

      expect(secureVpc.vpc).toBeDefined();
      expect(secureVpc.vpc.vpcId).toBeDefined();
    });

    it('exposes subnet collections', () => {
      const secureVpc = new SecureVpc(stack, 'TestVpc', {
        context: createMockContext(),
      });

      expect(secureVpc.publicSubnets).toBeDefined();
      expect(secureVpc.privateSubnets).toBeDefined();
      expect(secureVpc.isolatedSubnets).toBeDefined();
    });
  });
});
