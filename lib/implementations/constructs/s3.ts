import { Construct } from 'constructs';
import { RemovalPolicy, Duration } from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import { BaseConstruct, BaseConstructProps } from './base';

/**
 * Lifecycle rule configuration for S3 bucket.
 */
export interface LifecycleRuleConfig {
  /** Rule ID for identification */
  readonly id?: string;
  /** Whether the rule is enabled */
  readonly enabled?: boolean;
  /** Prefix to filter objects */
  readonly prefix?: string;
  /** Days to move to Infrequent Access storage */
  readonly transitionToIaAfterDays?: number;
  /** Days to move to Glacier storage */
  readonly transitionToGlacierAfterDays?: number;
  /** Days to expire/delete objects */
  readonly expirationDays?: number;
  /** Days to expire non-current versions */
  readonly noncurrentVersionExpirationDays?: number;
}

/**
 * CORS configuration for S3 bucket.
 */
export interface CorsRuleConfig {
  /** Allowed HTTP methods */
  readonly allowedMethods: s3.HttpMethods[];
  /** Allowed origins (e.g., ['https://example.com']) */
  readonly allowedOrigins: string[];
  /** Allowed headers */
  readonly allowedHeaders?: string[];
  /** Exposed headers */
  readonly exposedHeaders?: string[];
  /** Max age in seconds for preflight cache */
  readonly maxAge?: number;
}

/**
 * Properties for configuring the S3Bucket construct.
 */
export interface S3BucketProps extends BaseConstructProps {
  /** The bucket name suffix (will be prefixed with app/stage/account) */
  readonly bucketName: string;
  /** Enable versioning (default: false, recommended true for prod) */
  readonly versioned?: boolean;
  /** Encryption type (default: S3_MANAGED per org standards) */
  readonly encryption?: s3.BucketEncryption;
  /** Block public access (default: BLOCK_ALL per org standards) */
  readonly blockPublicAccess?: s3.BlockPublicAccess;
  /** Object ownership (default: BUCKET_OWNER_ENFORCED per org standards) */
  readonly objectOwnership?: s3.ObjectOwnership;
  /** Removal policy (default: RETAIN for prod, DESTROY for non-prod) */
  readonly removalPolicy?: RemovalPolicy;
  /** Enable auto-delete objects when bucket is deleted (default: false) */
  readonly autoDeleteObjects?: boolean;
  /** Enable access logging to another bucket */
  readonly serverAccessLogsBucket?: s3.IBucket;
  /** Prefix for access logs */
  readonly serverAccessLogsPrefix?: string;
  /** Lifecycle rules for object management */
  readonly lifecycleRules?: LifecycleRuleConfig[];
  /** CORS configuration */
  readonly cors?: CorsRuleConfig[];
  /** Enable intelligent tiering */
  readonly intelligentTiering?: boolean;
  /** Enable event bridge notifications */
  readonly eventBridgeEnabled?: boolean;
}

/**
 * S3Bucket construct implementing organizational S3 standards.
 *
 * Organizational Standards:
 * - Encryption: S3_MANAGED (server-side encryption)
 * - Public Access: BLOCK_ALL (no public access)
 * - Object Ownership: BUCKET_OWNER_ENFORCED
 * - Versioning: Configurable (recommended for production)
 *
 * @example
 * ```typescript
 * const bucket = new S3Bucket(this, 'DataBucket', {
 *   context: {
 *     stageName: 'prod',
 *     appName: 'myapp',
 *     isProduction: true,
 *   },
 *   bucketName: 'data',
 *   versioned: true,
 * });
 *
 * // Access the underlying bucket
 * const underlyingBucket = bucket.bucket;
 * ```
 */
export class S3Bucket extends BaseConstruct<S3BucketProps> {
  /** The underlying CDK S3 Bucket construct */
  public readonly bucket: s3.Bucket;

  /** The bucket name */
  public readonly bucketName: string;

  /** The bucket ARN */
  public readonly bucketArn: string;

  /**
   * Creates a new S3Bucket with organizational standards.
   *
   * @param scope - The parent construct scope
   * @param id - The construct identifier
   * @param props - The S3 bucket configuration properties
   */
  constructor(scope: Construct, id: string, props: S3BucketProps) {
    super(scope, id, props);

    this.validateProps(props);

    const versioned = props.versioned ?? (this.isProd() ? true : false);
    const encryption = props.encryption ?? s3.BucketEncryption.S3_MANAGED;
    const blockPublicAccess =
      props.blockPublicAccess ?? s3.BlockPublicAccess.BLOCK_ALL;
    const objectOwnership =
      props.objectOwnership ?? s3.ObjectOwnership.BUCKET_OWNER_ENFORCED;
    const removalPolicy =
      props.removalPolicy ??
      (this.isProd() ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY);
    const autoDeleteObjects =
      props.autoDeleteObjects ?? (!this.isProd() ? true : false);
    const eventBridgeEnabled = props.eventBridgeEnabled ?? this.isProd();

    // Generate bucket name with lowercase and hyphens only
    const fullBucketName = this.getResourceName(props.bucketName)
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-');

    this.log(`Creating S3 bucket: ${fullBucketName}`);

    this.bucket = new s3.Bucket(this, 'Bucket', {
      bucketName: fullBucketName,
      versioned,
      encryption,
      blockPublicAccess,
      objectOwnership,
      removalPolicy,
      autoDeleteObjects:
        removalPolicy === RemovalPolicy.DESTROY ? autoDeleteObjects : false,
      enforceSSL: true,
      serverAccessLogsBucket: props.serverAccessLogsBucket,
      serverAccessLogsPrefix: props.serverAccessLogsPrefix,
      eventBridgeEnabled,
    });

    // Apply lifecycle rules
    if (props.lifecycleRules) {
      this.applyLifecycleRules(props.lifecycleRules);
    }

    // Apply CORS rules
    if (props.cors) {
      this.applyCorsRules(props.cors);
    }

    // Apply intelligent tiering
    if (props.intelligentTiering) {
      this.enableIntelligentTiering();
    }

    this.bucketName = this.bucket.bucketName;
    this.bucketArn = this.bucket.bucketArn;

    this.log('S3 bucket created successfully');
  }

  /**
   * Validates the S3 bucket properties.
   *
   * @param props - The bucket properties to validate
   */
  private validateProps(props: S3BucketProps): void {
    if (!props.bucketName || props.bucketName.trim().length === 0) {
      throw new Error('bucketName is required and cannot be empty');
    }

    if (props.blockPublicAccess !== s3.BlockPublicAccess.BLOCK_ALL) {
      this.log(
        'Warning: Using non-BLOCK_ALL public access deviates from org standards',
        'warn'
      );
    }

    if (
      props.removalPolicy === RemovalPolicy.DESTROY &&
      this.isProd() &&
      !props.autoDeleteObjects
    ) {
      this.log(
        'Warning: DESTROY removal policy in production requires autoDeleteObjects',
        'warn'
      );
    }
  }

  /**
   * Applies lifecycle rules to the bucket.
   *
   * @param rules - Array of lifecycle rule configurations
   */
  private applyLifecycleRules(rules: LifecycleRuleConfig[]): void {
    rules.forEach((rule, index) => {
      const transitions: s3.Transition[] = [];

      if (rule.transitionToIaAfterDays) {
        transitions.push({
          storageClass: s3.StorageClass.INFREQUENT_ACCESS,
          transitionAfter: Duration.days(rule.transitionToIaAfterDays),
        });
      }

      if (rule.transitionToGlacierAfterDays) {
        transitions.push({
          storageClass: s3.StorageClass.GLACIER,
          transitionAfter: Duration.days(rule.transitionToGlacierAfterDays),
        });
      }

      this.bucket.addLifecycleRule({
        id: rule.id ?? `rule-${index}`,
        enabled: rule.enabled ?? true,
        prefix: rule.prefix,
        transitions: transitions.length > 0 ? transitions : undefined,
        expiration: rule.expirationDays
          ? Duration.days(rule.expirationDays)
          : undefined,
        noncurrentVersionExpiration: rule.noncurrentVersionExpirationDays
          ? Duration.days(rule.noncurrentVersionExpirationDays)
          : undefined,
      });

      this.log(`Applied lifecycle rule: ${rule.id ?? `rule-${index}`}`);
    });
  }

  /**
   * Applies CORS rules to the bucket.
   *
   * @param rules - Array of CORS rule configurations
   */
  private applyCorsRules(rules: CorsRuleConfig[]): void {
    rules.forEach((rule) => {
      this.bucket.addCorsRule({
        allowedMethods: rule.allowedMethods,
        allowedOrigins: rule.allowedOrigins,
        allowedHeaders: rule.allowedHeaders,
        exposedHeaders: rule.exposedHeaders,
        maxAge: rule.maxAge,
      });
    });
    this.log(`Applied ${rules.length} CORS rules`);
  }

  /**
   * Enables intelligent tiering lifecycle rule.
   */
  private enableIntelligentTiering(): void {
    this.bucket.addLifecycleRule({
      id: 'intelligent-tiering',
      enabled: true,
      transitions: [
        {
          storageClass: s3.StorageClass.INTELLIGENT_TIERING,
          transitionAfter: Duration.days(0),
        },
      ],
    });
    this.log('Enabled intelligent tiering');
  }

  /**
   * Grants read permissions on the bucket to a grantee.
   *
   * @param grantee - The IAM grantee (e.g., Lambda function)
   */
  public grantRead(grantee: iam.IGrantable): void {
    this.bucket.grantRead(grantee);
  }

  /**
   * Grants write permissions on the bucket to a grantee.
   *
   * @param grantee - The IAM grantee (e.g., Lambda function)
   */
  public grantWrite(grantee: iam.IGrantable): void {
    this.bucket.grantWrite(grantee);
  }

  /**
   * Grants full read/write permissions on the bucket to a grantee.
   *
   * @param grantee - The IAM grantee (e.g., Lambda function)
   */
  public grantReadWrite(grantee: iam.IGrantable): void {
    this.bucket.grantReadWrite(grantee);
  }

  /**
   * Grants put permissions on the bucket to a grantee.
   *
   * @param grantee - The IAM grantee (e.g., Lambda function)
   * @param objectsKeyPattern - Optional key pattern to restrict access
   */
  public grantPut(grantee: iam.IGrantable, objectsKeyPattern?: string): void {
    this.bucket.grantPut(grantee, objectsKeyPattern);
  }

  /**
   * Grants delete permissions on the bucket to a grantee.
   *
   * @param grantee - The IAM grantee (e.g., Lambda function)
   * @param objectsKeyPattern - Optional key pattern to restrict access
   */
  public grantDelete(grantee: iam.IGrantable, objectsKeyPattern?: string): void {
    this.bucket.grantDelete(grantee, objectsKeyPattern);
  }
}
