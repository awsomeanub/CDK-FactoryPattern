import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { BaseConstruct, BaseConstructProps } from './base';

/**
 * Properties for configuring the SecureVpc construct.
 */
export interface SecureVpcProps extends BaseConstructProps {
  /** The CIDR block for the VPC (default: 10.0.0.0/16) */
  readonly cidr?: string;
  /** The maximum number of Availability Zones to use (default: 2, min: 2) */
  readonly maxAzs?: number;
  /** Number of NAT Gateways to create (default: 1 for non-prod, maxAzs for prod) */
  readonly natGateways?: number;
  /** Whether to enable DNS hostnames (default: true) */
  readonly enableDnsHostnames?: boolean;
  /** Whether to enable DNS support (default: true) */
  readonly enableDnsSupport?: boolean;
  /** Enable VPC Flow Logs (default: true for prod) */
  readonly enableFlowLogs?: boolean;
  /** Custom subnet configuration (optional, uses org standards by default) */
  readonly subnetConfiguration?: ec2.SubnetConfiguration[];
}

/**
 * Organizational standard configuration for VPC subnets.
 * Creates public, private with egress, and isolated subnets.
 */
const DEFAULT_SUBNET_CONFIGURATION: ec2.SubnetConfiguration[] = [
  {
    name: 'Public',
    subnetType: ec2.SubnetType.PUBLIC,
    cidrMask: 24,
  },
  {
    name: 'Private',
    subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
    cidrMask: 24,
  },
  {
    name: 'Isolated',
    subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
    cidrMask: 24,
  },
];

/**
 * SecureVpc construct implementing organizational VPC standards.
 *
 * Organizational Standards:
 * - CIDR: 10.0.0.0/16 (default)
 * - Minimum 2 Availability Zones
 * - Private subnets with NAT Gateway for egress
 * - Public subnets for load balancers/bastion hosts
 * - Isolated subnets for databases
 * - VPC Flow Logs enabled for production
 *
 * @example
 * ```typescript
 * const vpc = new SecureVpc(this, 'Vpc', {
 *   context: {
 *     stageName: 'prod',
 *     appName: 'myapp',
 *     isProduction: true,
 *   },
 *   maxAzs: 3,
 * });
 *
 * // Access the underlying VPC
 * const underlyingVpc = vpc.vpc;
 * ```
 */
export class SecureVpc extends BaseConstruct<SecureVpcProps> {
  /** The underlying CDK VPC construct */
  public readonly vpc: ec2.Vpc;

  /** The public subnets in the VPC */
  public readonly publicSubnets: ec2.ISubnet[];

  /** The private subnets with NAT gateway access */
  public readonly privateSubnets: ec2.ISubnet[];

  /** The isolated subnets (no internet access) */
  public readonly isolatedSubnets: ec2.ISubnet[];

  /**
   * Creates a new SecureVpc with organizational standards.
   *
   * @param scope - The parent construct scope
   * @param id - The construct identifier
   * @param props - The VPC configuration properties
   */
  constructor(scope: Construct, id: string, props: SecureVpcProps) {
    super(scope, id, props);

    this.validateProps(props);

    const cidr = props.cidr ?? '10.0.0.0/16';
    const maxAzs = Math.max(props.maxAzs ?? 2, 2); // Enforce minimum 2 AZs
    const natGateways = props.natGateways ?? (this.isProd() ? maxAzs : 1);
    const enableDnsHostnames = props.enableDnsHostnames ?? true;
    const enableDnsSupport = props.enableDnsSupport ?? true;
    const enableFlowLogs = props.enableFlowLogs ?? this.isProd();

    this.log(`Creating VPC with CIDR ${cidr}, ${maxAzs} AZs, ${natGateways} NAT Gateways`);

    this.vpc = new ec2.Vpc(this, 'Vpc', {
      vpcName: this.getResourceName('vpc'),
      ipAddresses: ec2.IpAddresses.cidr(cidr),
      maxAzs,
      natGateways,
      enableDnsHostnames,
      enableDnsSupport,
      subnetConfiguration:
        props.subnetConfiguration ?? DEFAULT_SUBNET_CONFIGURATION,
      restrictDefaultSecurityGroup: true,
    });

    // Store subnet references
    this.publicSubnets = this.vpc.publicSubnets;
    this.privateSubnets = this.vpc.privateSubnets;
    this.isolatedSubnets = this.vpc.isolatedSubnets;

    // Enable VPC Flow Logs for production environments
    if (enableFlowLogs) {
      this.createFlowLogs();
    }

    this.log('VPC created successfully');
  }

  /**
   * Validates the VPC properties against organizational standards.
   *
   * @param props - The VPC properties to validate
   */
  private validateProps(props: SecureVpcProps): void {
    if (props.maxAzs !== undefined && props.maxAzs < 2) {
      this.log(
        `Warning: maxAzs (${props.maxAzs}) is less than minimum (2). Using 2 AZs.`,
        'warn'
      );
    }

    if (props.cidr) {
      const cidrMatch = props.cidr.match(/\/(\d+)$/);
      if (cidrMatch) {
        const prefix = parseInt(cidrMatch[1], 10);
        if (prefix > 16) {
          this.log(
            `Warning: CIDR prefix /${prefix} may not provide enough IP addresses for organizational needs.`,
            'warn'
          );
        }
      }
    }
  }

  /**
   * Creates VPC Flow Logs to CloudWatch Logs.
   * Used for network traffic monitoring and compliance.
   */
  private createFlowLogs(): void {
    this.log('Creating VPC Flow Logs');
    this.vpc.addFlowLog('FlowLog', {
      destination: ec2.FlowLogDestination.toCloudWatchLogs(),
      trafficType: ec2.FlowLogTrafficType.ALL,
    });
  }

  /**
   * Adds a VPC endpoint for AWS services to enable private connectivity.
   *
   * @param service - The AWS service endpoint to add
   * @param options - Optional endpoint configuration
   * @returns The created interface endpoint
   */
  public addInterfaceEndpoint(
    service: ec2.InterfaceVpcEndpointAwsService,
    options?: Partial<ec2.InterfaceVpcEndpointOptions>
  ): ec2.InterfaceVpcEndpoint {
    return this.vpc.addInterfaceEndpoint(service.shortName, {
      service,
      subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      privateDnsEnabled: true,
      ...options,
    });
  }

  /**
   * Adds a Gateway VPC endpoint for S3 or DynamoDB.
   *
   * @param service - The gateway endpoint service (S3 or DynamoDB)
   * @param options - Optional endpoint configuration
   * @returns The created gateway endpoint
   */
  public addGatewayEndpoint(
    service: ec2.GatewayVpcEndpointAwsService,
    options?: Partial<ec2.GatewayVpcEndpointOptions>
  ): ec2.GatewayVpcEndpoint {
    return this.vpc.addGatewayEndpoint(service.toString(), {
      service,
      ...options,
    });
  }
}
