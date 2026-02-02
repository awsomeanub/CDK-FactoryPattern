/**
 * Environment configuration interface.
 * Provides AWS account and region settings.
 */
export interface EnvironmentConfig {
  /** The AWS account ID */
  readonly account: string;
  /** The AWS region */
  readonly region: string;
}

/**
 * Naming configuration for resource naming conventions.
 * Ensures consistent naming across all resources.
 */
export interface NamingConfig {
  /** The application name prefix */
  readonly appName: string;
  /** The separator character between name parts (default: '-') */
  readonly separator?: string;
  /** Maximum length for generated names */
  readonly maxLength?: number;
  /** Whether to include random suffix for uniqueness */
  readonly includeRandomSuffix?: boolean;
  /** Random suffix length (default: 8) */
  readonly randomSuffixLength?: number;
}

/**
 * Default naming configuration values.
 */
export const DEFAULT_NAMING_CONFIG: Required<NamingConfig> = {
  appName: 'app',
  separator: '-',
  maxLength: 64,
  includeRandomSuffix: false,
  randomSuffixLength: 8,
};

/**
 * Resource naming utility functions.
 */
export const NamingUtils = {
  /**
   * Generates a resource name following naming conventions.
   *
   * @param config - The naming configuration
   * @param stageName - The deployment stage name
   * @param resourceType - The resource type identifier
   * @param resourceName - The specific resource name
   * @returns The generated resource name
   */
  generateName(
    config: NamingConfig,
    stageName: string,
    resourceType: string,
    resourceName: string
  ): string {
    const separator = config.separator ?? DEFAULT_NAMING_CONFIG.separator;
    const maxLength = config.maxLength ?? DEFAULT_NAMING_CONFIG.maxLength;

    let name = [config.appName, stageName, resourceType, resourceName]
      .filter(Boolean)
      .join(separator);

    if (config.includeRandomSuffix) {
      const suffixLength =
        config.randomSuffixLength ?? DEFAULT_NAMING_CONFIG.randomSuffixLength;
      const suffix = NamingUtils.generateRandomSuffix(suffixLength);
      name = `${name}${separator}${suffix}`;
    }

    return name.substring(0, maxLength).toLowerCase();
  },

  /**
   * Generates a random alphanumeric suffix.
   *
   * @param length - The length of the suffix
   * @returns The random suffix string
   */
  generateRandomSuffix(length: number): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },

  /**
   * Generates a stack name following conventions.
   *
   * @param appName - The application name
   * @param stageName - The stage name
   * @param stackName - The stack identifier
   * @returns The generated stack name
   */
  generateStackName(
    appName: string,
    stageName: string,
    stackName: string
  ): string {
    return `${appName}-${stageName}-${stackName}`.replace(/[^a-zA-Z0-9-]/g, '-');
  },

  /**
   * Sanitizes a name for AWS resource naming requirements.
   *
   * @param name - The name to sanitize
   * @param allowedChars - Regular expression for allowed characters
   * @returns The sanitized name
   */
  sanitize(name: string, allowedChars: RegExp = /[^a-zA-Z0-9-]/g): string {
    return name.replace(allowedChars, '-').toLowerCase();
  },
};

/**
 * Application configuration interface.
 * Global settings for the CDK application.
 */
export interface AppConfig {
  /** The application name */
  readonly appName: string;
  /** Default AWS environment configuration */
  readonly defaultEnv?: EnvironmentConfig;
  /** Naming configuration */
  readonly naming?: NamingConfig;
  /** Default tags for all resources */
  readonly defaultTags?: Record<string, string>;
  /** Whether to enable debug logging */
  readonly debug?: boolean;
}

/**
 * Feature flags configuration.
 * Controls optional features across the application.
 */
export interface FeatureFlags {
  /** Enable enhanced monitoring */
  readonly enhancedMonitoring?: boolean;
  /** Enable cost allocation tags */
  readonly costAllocationTags?: boolean;
  /** Enable compliance tagging */
  readonly complianceTagging?: boolean;
  /** Enable drift detection */
  readonly driftDetection?: boolean;
}

/**
 * Cost center configuration for resource tagging.
 */
export interface CostCenterConfig {
  /** The cost center code */
  readonly code: string;
  /** The department name */
  readonly department: string;
  /** The project name */
  readonly project?: string;
  /** The cost owner email */
  readonly owner?: string;
}

/**
 * Compliance configuration for regulated environments.
 */
export interface ComplianceConfig {
  /** Compliance framework (e.g., 'HIPAA', 'SOC2', 'PCI') */
  readonly framework?: string;
  /** Data classification level */
  readonly dataClassification?: 'public' | 'internal' | 'confidential' | 'restricted';
  /** Whether data encryption is required */
  readonly encryptionRequired?: boolean;
  /** Audit logging requirements */
  readonly auditLogging?: boolean;
}
