import { Construct } from 'constructs';
import { Duration, Stack } from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { BaseConstruct, BaseConstructProps } from './base';

/**
 * Environment variables for Lambda function.
 */
export type EnvironmentVariables = Record<string, string>;

/**
 * VPC configuration for Lambda function.
 */
export interface LambdaVpcConfig {
  /** The VPC to deploy the Lambda into */
  readonly vpc: ec2.IVpc;
  /** Subnets to use (default: private subnets) */
  readonly subnets?: ec2.SubnetSelection;
  /** Security groups to attach */
  readonly securityGroups?: ec2.ISecurityGroup[];
}

/**
 * Properties for configuring the SecureLambda construct.
 */
export interface SecureLambdaProps extends BaseConstructProps {
  /** The function name suffix (will be prefixed with app/stage) */
  readonly functionName: string;
  /** The Lambda function code */
  readonly code: lambda.Code;
  /** The Lambda handler (e.g., 'index.handler') */
  readonly handler: string;
  /** The Lambda runtime (default: Node.js 20.x per org standards) */
  readonly runtime?: lambda.Runtime;
  /** Memory size in MB (default: 512 per org standards) */
  readonly memorySize?: number;
  /** Timeout duration (default: 30 seconds per org standards) */
  readonly timeout?: Duration;
  /** Environment variables */
  readonly environment?: EnvironmentVariables;
  /** Log retention in days (default: 7 per org standards) */
  readonly logRetention?: logs.RetentionDays;
  /** Enable X-Ray tracing (default: true per org standards) */
  readonly tracing?: lambda.Tracing;
  /** Reserved concurrent executions (optional) */
  readonly reservedConcurrentExecutions?: number;
  /** Description for the function */
  readonly description?: string;
  /** Lambda layers to attach */
  readonly layers?: lambda.ILayerVersion[];
  /** VPC configuration (optional) */
  readonly vpc?: LambdaVpcConfig;
  /** Architecture (default: X86_64) */
  readonly architecture?: lambda.Architecture;
  /** Enable Provisioned Concurrency (optional, for prod latency-sensitive functions) */
  readonly provisionedConcurrency?: number;
  /** Dead letter queue/topic ARN (optional) */
  readonly deadLetterQueueEnabled?: boolean;
  /** Enable insights (default: true for prod) */
  readonly insightsVersion?: lambda.LambdaInsightsVersion;
}

/**
 * SecureLambda construct implementing organizational Lambda standards.
 *
 * Organizational Standards:
 * - Runtime: Node.js 20.x
 * - Memory: 512MB
 * - Timeout: 30 seconds
 * - X-Ray Tracing: Active
 * - Log Retention: 7 days
 *
 * @example
 * ```typescript
 * const fn = new SecureLambda(this, 'ProcessorFunction', {
 *   context: {
 *     stageName: 'prod',
 *     appName: 'myapp',
 *     isProduction: true,
 *   },
 *   functionName: 'processor',
 *   code: lambda.Code.fromAsset('lambda/processor'),
 *   handler: 'index.handler',
 *   environment: {
 *     TABLE_NAME: table.tableName,
 *   },
 * });
 *
 * // Access the underlying function
 * const underlyingFn = fn.function;
 * ```
 */
export class SecureLambda extends BaseConstruct<SecureLambdaProps> {
  /** The underlying CDK Lambda Function construct */
  public readonly function: lambda.Function;

  /** The function name */
  public readonly functionName: string;

  /** The function ARN */
  public readonly functionArn: string;

  /** The function role */
  public readonly role: iam.IRole;

  /**
   * Creates a new SecureLambda with organizational standards.
   *
   * @param scope - The parent construct scope
   * @param id - The construct identifier
   * @param props - The Lambda function configuration properties
   */
  constructor(scope: Construct, id: string, props: SecureLambdaProps) {
    super(scope, id, props);

    this.validateProps(props);

    const runtime = props.runtime ?? lambda.Runtime.NODEJS_20_X;
    const memorySize = props.memorySize ?? 512;
    const timeout = props.timeout ?? Duration.seconds(30);
    const logRetention = props.logRetention ?? logs.RetentionDays.ONE_WEEK;
    const tracing = props.tracing ?? lambda.Tracing.ACTIVE;
    const architecture = props.architecture ?? lambda.Architecture.X86_64;

    const fullFunctionName = this.getResourceName(props.functionName);

    this.log(`Creating Lambda function: ${fullFunctionName}`);

    // Build environment variables with standard additions
    const environment: EnvironmentVariables = {
      ...props.environment,
      STAGE: this.context.stageName,
      APP_NAME: this.context.appName,
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
    };

    // Build function props
    const functionProps: lambda.FunctionProps = {
      functionName: fullFunctionName,
      runtime,
      handler: props.handler,
      code: props.code,
      memorySize,
      timeout,
      environment,
      logRetention,
      tracing,
      architecture,
      description: props.description ?? `${fullFunctionName} Lambda function`,
      reservedConcurrentExecutions: props.reservedConcurrentExecutions,
      layers: props.layers,
      ...(props.vpc && {
        vpc: props.vpc.vpc,
        vpcSubnets: props.vpc.subnets ?? {
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        securityGroups: props.vpc.securityGroups,
      }),
      ...(this.isProd() &&
        props.insightsVersion && {
          insightsVersion: props.insightsVersion,
        }),
    };

    this.function = new lambda.Function(this, 'Function', functionProps);

    // Enable Provisioned Concurrency if specified
    if (props.provisionedConcurrency && props.provisionedConcurrency > 0) {
      this.enableProvisionedConcurrency(props.provisionedConcurrency);
    }

    // Enable Dead Letter Queue if specified
    if (props.deadLetterQueueEnabled) {
      this.enableDeadLetterQueue();
    }

    this.functionName = this.function.functionName;
    this.functionArn = this.function.functionArn;
    this.role = this.function.role!;

    this.log('Lambda function created successfully');
  }

  /**
   * Validates the Lambda function properties.
   *
   * @param props - The function properties to validate
   */
  private validateProps(props: SecureLambdaProps): void {
    if (!props.functionName || props.functionName.trim().length === 0) {
      throw new Error('functionName is required and cannot be empty');
    }

    if (!props.handler || props.handler.trim().length === 0) {
      throw new Error('handler is required and cannot be empty');
    }

    if (props.memorySize && (props.memorySize < 128 || props.memorySize > 10240)) {
      throw new Error('memorySize must be between 128 and 10240 MB');
    }

    if (props.timeout && props.timeout.toSeconds() > 900) {
      throw new Error('timeout cannot exceed 900 seconds (15 minutes)');
    }

    if (props.runtime && !this.isSupportedRuntime(props.runtime)) {
      this.log(
        `Warning: Runtime ${props.runtime.name} may not be recommended. Consider using Node.js 20.x`,
        'warn'
      );
    }
  }

  /**
   * Checks if the runtime is a recommended/supported runtime.
   *
   * @param runtime - The Lambda runtime to check
   * @returns True if the runtime is supported
   */
  private isSupportedRuntime(runtime: lambda.Runtime): boolean {
    const supportedRuntimes = [
      lambda.Runtime.NODEJS_20_X,
      lambda.Runtime.NODEJS_18_X,
      lambda.Runtime.PYTHON_3_12,
      lambda.Runtime.PYTHON_3_11,
      lambda.Runtime.JAVA_21,
      lambda.Runtime.JAVA_17,
      lambda.Runtime.DOTNET_8,
    ];

    return supportedRuntimes.some((r) => r.name === runtime.name);
  }

  /**
   * Enables Provisioned Concurrency for the function.
   *
   * @param concurrency - Number of provisioned concurrent executions
   */
  private enableProvisionedConcurrency(concurrency: number): void {
    const version = this.function.currentVersion;
    const alias = new lambda.Alias(this, 'Alias', {
      aliasName: 'live',
      version,
      provisionedConcurrentExecutions: concurrency,
    });
    this.log(`Enabled Provisioned Concurrency: ${concurrency} on alias: ${alias.aliasName}`);
  }

  /**
   * Enables Dead Letter Queue for the function.
   */
  private enableDeadLetterQueue(): void {
    // Import SQS for DLQ
    const sqs = require('aws-cdk-lib/aws-sqs') as typeof import('aws-cdk-lib/aws-sqs');
    const destinations = require('aws-cdk-lib/aws-lambda-destinations') as typeof import('aws-cdk-lib/aws-lambda-destinations');
    
    const dlq = new sqs.Queue(this, 'DeadLetterQueue', {
      queueName: `${this.getResourceName(this.props.functionName)}-dlq`,
      retentionPeriod: Duration.days(14),
    });

    this.function.configureAsyncInvoke({
      onFailure: new destinations.SqsDestination(dlq),
      maxEventAge: Duration.hours(6),
      retryAttempts: 2,
    });

    // Grant send message permissions
    dlq.grantSendMessages(this.function);
    
    this.log('Enabled Dead Letter Queue');
  }

  /**
   * Adds an environment variable to the function.
   *
   * @param key - Environment variable name
   * @param value - Environment variable value
   */
  public addEnvironment(key: string, value: string): void {
    this.function.addEnvironment(key, value);
  }

  /**
   * Adds a Lambda layer to the function.
   *
   * @param layer - The Lambda layer to add
   */
  public addLayers(...layers: lambda.ILayerVersion[]): void {
    this.function.addLayers(...layers);
  }

  /**
   * Adds a permission to invoke the function.
   *
   * @param id - Permission identifier
   * @param options - Permission options
   */
  public addPermission(id: string, options: lambda.Permission): void {
    this.function.addPermission(id, options);
  }

  /**
   * Grants invoke permissions on the function to a grantee.
   *
   * @param grantee - The IAM grantee (e.g., API Gateway)
   */
  public grantInvoke(grantee: iam.IGrantable): void {
    this.function.grantInvoke(grantee);
  }

  /**
   * Adds a managed policy to the function's execution role.
   *
   * @param policy - The managed policy to add
   */
  public addManagedPolicy(policy: iam.IManagedPolicy): void {
    this.role.addManagedPolicy(policy);
  }

  /**
   * Adds an inline policy to the function's execution role.
   *
   * @param id - Policy identifier
   * @param policy - The policy document
   */
  public addToRolePolicy(statement: iam.PolicyStatement): void {
    this.function.addToRolePolicy(statement);
  }

  /**
   * Creates a function URL for direct invocation.
   *
   * @param options - Function URL options
   * @returns The function URL
   */
  public addFunctionUrl(
    options?: lambda.FunctionUrlOptions
  ): lambda.FunctionUrl {
    return this.function.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.AWS_IAM,
      ...options,
    });
  }
}
