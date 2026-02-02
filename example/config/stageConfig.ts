import { StageConfig } from '../../lib/definitions';

/**
 * Development stage configuration.
 * Used for feature development and testing.
 */
export const devStage: StageConfig = {
  stageName: 'dev',
  displayName: 'Development',
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT || '111111111111',
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  isProduction: false,
  tags: {
    CostCenter: 'development',
    Team: 'platform',
  },
  config: {
    logLevel: 'DEBUG',
    enableDetailedMonitoring: false,
    retainResources: false,
  },
  enabled: true,
};

/**
 * Staging stage configuration.
 * Used for pre-production validation and testing.
 */
export const stagingStage: StageConfig = {
  stageName: 'staging',
  displayName: 'Staging',
  env: {
    account: process.env.CDK_STAGING_ACCOUNT || '222222222222',
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  isProduction: false,
  tags: {
    CostCenter: 'staging',
    Team: 'platform',
  },
  config: {
    logLevel: 'INFO',
    enableDetailedMonitoring: true,
    retainResources: false,
  },
  enabled: true,
};

/**
 * Production stage configuration.
 * Live production environment with enhanced security and monitoring.
 */
export const prodStage: StageConfig = {
  stageName: 'prod',
  displayName: 'Production',
  env: {
    account: process.env.CDK_PROD_ACCOUNT || '333333333333',
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  isProduction: true,
  tags: {
    CostCenter: 'production',
    Team: 'platform',
    Compliance: 'required',
  },
  config: {
    logLevel: 'WARN',
    enableDetailedMonitoring: true,
    retainResources: true,
    enableAlarms: true,
    backupRetentionDays: 30,
  },
  enabled: true,
};

/**
 * All stage configurations.
 * Export as array for iteration.
 */
export const allStages: StageConfig[] = [devStage, stagingStage, prodStage];

/**
 * Gets a stage configuration by name.
 *
 * @param stageName - The stage name to look up
 * @returns The stage configuration or undefined
 */
export function getStageByName(stageName: string): StageConfig | undefined {
  return allStages.find((stage) => stage.stageName === stageName);
}
