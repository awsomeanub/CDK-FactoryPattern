import { Construct } from 'constructs';
import { Tags } from 'aws-cdk-lib';

/**
 * Context interface providing environment and configuration information
 * for constructs within the factory pattern.
 */
export interface ConstructContext {
  /** The deployment stage name (e.g., 'dev', 'staging', 'prod') */
  readonly stageName: string;
  /** The application name for resource naming */
  readonly appName: string;
  /** The AWS region for deployment */
  readonly region?: string;
  /** The AWS account ID for deployment */
  readonly accountId?: string;
  /** Whether this is a production environment */
  readonly isProduction: boolean;
}

/**
 * Base properties interface for all factory constructs.
 * Extend this interface for construct-specific properties.
 */
export interface BaseConstructProps {
  /** The construct context providing environment information */
  readonly context: ConstructContext;
  /** Optional custom tags to apply to resources */
  readonly tags?: Record<string, string>;
}

/**
 * Abstract base class for all factory pattern constructs.
 * Provides common functionality such as naming conventions, tagging,
 * and context-aware resource configuration.
 *
 * @example
 * ```typescript
 * class MyConstruct extends BaseConstruct<MyConstructProps> {
 *   constructor(scope: Construct, id: string, props: MyConstructProps) {
 *     super(scope, id, props);
 *     // Implement construct resources
 *   }
 * }
 * ```
 */
export abstract class BaseConstruct<
  T extends BaseConstructProps = BaseConstructProps
> extends Construct {
  /** The construct context providing environment information */
  protected readonly context: ConstructContext;
  /** The construct properties */
  protected readonly props: T;

  /**
   * Creates a new BaseConstruct.
   *
   * @param scope - The parent construct scope
   * @param id - The construct identifier
   * @param props - The construct properties including context
   */
  constructor(scope: Construct, id: string, props: T) {
    super(scope, id);

    this.context = props.context;
    this.props = props;

    this.applyTags(props.tags);
  }

  /**
   * Generates a standardized resource name following organizational naming conventions.
   * Format: {appName}-{stageName}-{resourceName}
   *
   * @param resourceName - The base name of the resource
   * @returns The fully qualified resource name
   */
  protected getResourceName(resourceName: string): string {
    return `${this.context.appName}-${this.context.stageName}-${resourceName}`;
  }

  /**
   * Checks if the current deployment is to a production environment.
   *
   * @returns True if deploying to production
   */
  protected isProd(): boolean {
    return this.context.isProduction;
  }

  /**
   * Applies tags to the construct and all its children.
   *
   * @param customTags - Optional custom tags to apply
   */
  private applyTags(customTags?: Record<string, string>): void {
    const defaultTags: Record<string, string> = {
      Environment: this.context.stageName,
      Application: this.context.appName,
      ManagedBy: 'CDK-FactoryPattern',
    };

    const allTags = { ...defaultTags, ...customTags };

    Object.entries(allTags).forEach(([key, value]) => {
      Tags.of(this).add(key, value);
    });
  }

  /**
   * Logs a message with construct context information.
   * Used for debugging and operational awareness.
   *
   * @param message - The message to log
   * @param level - The log level (default: 'info')
   */
  protected log(
    message: string,
    level: 'info' | 'warn' | 'error' = 'info'
  ): void {
    const prefix = `[${this.context.appName}/${this.context.stageName}/${this.node.id}]`;
    const logMessage = `${prefix} ${message}`;

    switch (level) {
      case 'error':
        console.error(logMessage);
        break;
      case 'warn':
        console.warn(logMessage);
        break;
      default:
        console.log(logMessage);
    }
  }
}
