import { Construct } from 'constructs';
import { CfnOutput } from 'aws-cdk-lib';
import { FactoryStackProps } from '../../lib/definitions';
import { FactoryBaseStack } from '../../lib/factory';
import { SecureVpc } from '../../lib/implementations/constructs';

/**
 * VPC Stack implementing organizational network standards.
 *
 * This stack creates a secure VPC with:
 * - Public, private, and isolated subnets
 * - NAT Gateways for private subnet egress
 * - VPC Flow Logs (in production)
 *
 * @example
 * ```typescript
 * const vpcStack = new VpcStack(app, 'VpcStack', {
 *   stageConfig: devStage,
 *   pipelineConfig,
 *   stageContext: { ... },
 * });
 *
 * // Access the VPC in other stacks
 * const vpc = vpcStack.vpc;
 * ```
 */
export class VpcStack extends FactoryBaseStack {
  /** The secure VPC construct */
  public readonly secureVpc: SecureVpc;

  /**
   * Creates a new VpcStack.
   *
   * @param scope - The parent construct scope
   * @param id - The stack identifier
   * @param props - The factory stack props
   */
  constructor(scope: Construct, id: string, props: FactoryStackProps) {
    super(scope, id, props);

    // Get custom props with defaults
    const maxAzs = this.getCustomProp<number>('maxAzs', 2);

    // Create the secure VPC
    this.secureVpc = new SecureVpc(this, 'SecureVpc', {
      context: {
        stageName: this.getStageName(),
        appName: this.pipelineConfig.appName,
        isProduction: this.isProd(),
        region: this.stageConfig.env.region,
        accountId: this.stageConfig.env.account,
      },
      maxAzs,
      enableFlowLogs: this.isProd(),
    });

    // Create outputs
    this.createVpcOutputs();
  }

  /**
   * Creates CloudFormation outputs for the VPC.
   */
  private createVpcOutputs(): void {
    new CfnOutput(this, 'VpcId', {
      value: this.secureVpc.vpc.vpcId,
      description: 'VPC ID',
      exportName: this.getResourceName('vpc-id'),
    });

    new CfnOutput(this, 'VpcCidr', {
      value: this.secureVpc.vpc.vpcCidrBlock,
      description: 'VPC CIDR Block',
      exportName: this.getResourceName('vpc-cidr'),
    });

    // Output private subnet IDs
    const privateSubnetIds = this.secureVpc.privateSubnets
      .map((subnet) => subnet.subnetId)
      .join(',');

    new CfnOutput(this, 'PrivateSubnetIds', {
      value: privateSubnetIds,
      description: 'Private Subnet IDs',
      exportName: this.getResourceName('private-subnet-ids'),
    });

    // Output public subnet IDs
    const publicSubnetIds = this.secureVpc.publicSubnets
      .map((subnet) => subnet.subnetId)
      .join(',');

    new CfnOutput(this, 'PublicSubnetIds', {
      value: publicSubnetIds,
      description: 'Public Subnet IDs',
      exportName: this.getResourceName('public-subnet-ids'),
    });
  }

  /**
   * Gets the underlying CDK VPC construct.
   *
   * @returns The ec2.Vpc construct
   */
  public get vpc() {
    return this.secureVpc.vpc;
  }
}
