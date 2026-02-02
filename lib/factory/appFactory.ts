import { App, Stack } from 'aws-cdk-lib';
import {
  IAppFactory,
  PipelineConfig,
  StageConfig,
  StackConfig,
  StageSetupHook,
  StackType,
  FactoryStackProps,
  StageContext,
  StackConstructor,
} from '../definitions';
import { StackFactory } from './stackFactory';

/**
 * CDK App Factory for orchestrating multi-stage deployment.
 * Creates and manages stacks across multiple deployment stages.
 *
 * @example
 * ```typescript
 * const factory = new CdkAppFactory({
 *   pipelineName: 'MyPipeline',
 *   appName: 'myapp',
 *   stages: [devStage, stagingStage, prodStage],
 *   stacks: [
 *     { type: TYPES.VpcStack },
 *     { type: TYPES.AppStack, dependsOn: [TYPES.VpcStack] },
 *   ],
 * });
 *
 * // Register stack constructors
 * factory.registerStack(TYPES.VpcStack, VpcStack);
 * factory.registerStack(TYPES.AppStack, AppStack);
 *
 * // Synthesize all stacks
 * factory.synth();
 * ```
 */
export class CdkAppFactory implements IAppFactory {
  /** The CDK App instance */
  private readonly app: App;

  /** The pipeline configuration */
  private readonly pipelineConfig: PipelineConfig;

  /** The stack factory for creating stacks */
  private readonly stackFactory: StackFactory;

  /** Stage setup hooks */
  private readonly stageSetupHooks: StageSetupHook[] = [];

  /** Map of stage name to created stacks */
  private readonly stacks: Map<string, Map<StackType | symbol, Stack>> =
    new Map();

  /** Whether synthesis has been performed */
  private synthesized: boolean = false;

  /** Debug mode flag */
  private readonly debug: boolean;

  /**
   * Creates a new CdkAppFactory.
   *
   * @param pipelineConfig - The pipeline configuration
   * @param debug - Whether to enable debug logging
   */
  constructor(pipelineConfig: PipelineConfig, debug: boolean = false) {
    this.validatePipelineConfig(pipelineConfig);

    this.pipelineConfig = pipelineConfig;
    this.debug = debug;
    this.stackFactory = new StackFactory(debug);

    this.app = new App({
      context: {
        pipelineName: pipelineConfig.pipelineName,
        appName: pipelineConfig.appName,
      },
    });

    this.log(
      `CdkAppFactory initialized for pipeline: ${pipelineConfig.pipelineName}`
    );
  }

  /**
   * Validates the pipeline configuration.
   *
   * @param config - The pipeline configuration to validate
   * @throws Error if configuration is invalid
   */
  private validatePipelineConfig(config: PipelineConfig): void {
    if (!config.pipelineName || config.pipelineName.trim().length === 0) {
      throw new Error('pipelineName is required');
    }

    if (!config.appName || config.appName.trim().length === 0) {
      throw new Error('appName is required');
    }

    if (!config.stages || config.stages.length === 0) {
      throw new Error('At least one stage is required');
    }

    if (!config.stacks || config.stacks.length === 0) {
      throw new Error('At least one stack configuration is required');
    }

    // Validate each stage
    config.stages.forEach((stage, index) => {
      if (!stage.stageName) {
        throw new Error(`Stage at index ${index} is missing stageName`);
      }
      if (!stage.env) {
        throw new Error(`Stage '${stage.stageName}' is missing env configuration`);
      }
    });
  }

  /**
   * Registers a stack constructor for a given type.
   *
   * @param stackType - The stack type symbol
   * @param constructor - The stack constructor
   */
  public registerStack(
    stackType: StackType | symbol,
    constructor: StackConstructor
  ): void {
    this.stackFactory.registerStack(stackType, constructor);
  }

  /**
   * Adds a stage setup hook that runs before stage deployment.
   *
   * @param hook - The hook function to add
   */
  public addStageSetupHook(hook: StageSetupHook): void {
    this.stageSetupHooks.push(hook);
  }

  /**
   * Gets the pipeline configuration.
   *
   * @returns The pipeline configuration
   */
  public getPipelineConfig(): PipelineConfig {
    return this.pipelineConfig;
  }

  /**
   * Gets all synthesized stacks.
   *
   * @returns Map of stage name to stack instances
   */
  public getStacks(): Map<string, Map<StackType | symbol, Stack>> {
    return this.stacks;
  }

  /**
   * Gets the CDK App instance.
   *
   * @returns The CDK App
   */
  public getApp(): App {
    return this.app;
  }

  /**
   * Synthesizes all stacks in the pipeline.
   * Creates stacks for each enabled stage in deployment order.
   */
  public synth(): void {
    if (this.synthesized) {
      this.log('Warning: synth() has already been called', 'warn');
      return;
    }

    this.log('Starting synthesis...');

    const enabledStages = this.getEnabledStages();
    this.log(`Processing ${enabledStages.length} stages`);

    for (const stage of enabledStages) {
      this.processStage(stage);
    }

    this.synthesized = true;
    this.log('Synthesis complete');
  }

  /**
   * Gets the enabled stages based on configuration and filters.
   *
   * @returns Array of enabled stage configurations
   */
  private getEnabledStages(): StageConfig[] {
    let stages = this.pipelineConfig.stages.filter(
      (stage) => stage.enabled !== false
    );

    // Apply stage filter if specified
    if (
      this.pipelineConfig.stageFilter &&
      this.pipelineConfig.stageFilter.length > 0
    ) {
      const filterSet = new Set(this.pipelineConfig.stageFilter);
      stages = stages.filter((stage) => filterSet.has(stage.stageName));
      this.log(
        `Applied stage filter: ${this.pipelineConfig.stageFilter.join(', ')}`
      );
    }

    return stages;
  }

  /**
   * Processes a single stage, creating all configured stacks.
   *
   * @param stage - The stage configuration to process
   */
  private processStage(stage: StageConfig): void {
    this.log(`Processing stage: ${stage.stageName}`);

    // Run stage setup hooks
    this.runStageSetupHooks(stage);

    // Initialize stack map for this stage
    const stageStacks = new Map<StackType | symbol, Stack>();
    this.stacks.set(stage.stageName, stageStacks);

    // Create stacks in order
    const enabledStacks = this.getEnabledStacks();
    const sortedStacks = this.sortStacksByDependencies(enabledStacks);

    for (const stackConfig of sortedStacks) {
      const stack = this.createStackForStage(stage, stackConfig, stageStacks);
      if (stack) {
        stageStacks.set(stackConfig.type, stack);
      }
    }

    this.log(
      `Stage ${stage.stageName}: Created ${stageStacks.size} stacks`
    );
  }

  /**
   * Runs stage setup hooks for a stage.
   *
   * @param stage - The stage configuration
   */
  private runStageSetupHooks(stage: StageConfig): void {
    for (const hook of this.stageSetupHooks) {
      try {
        hook(stage.stageName, stage, this.pipelineConfig);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.log(
          `Stage setup hook failed for ${stage.stageName}: ${errorMessage}`,
          'error'
        );
        throw error;
      }
    }
  }

  /**
   * Gets enabled stack configurations.
   *
   * @returns Array of enabled stack configurations
   */
  private getEnabledStacks(): StackConfig[] {
    return this.pipelineConfig.stacks.filter(
      (stack) => stack.enabled !== false
    );
  }

  /**
   * Sorts stacks by their dependencies (topological sort).
   *
   * @param stacks - Array of stack configurations
   * @returns Sorted array of stack configurations
   */
  private sortStacksByDependencies(stacks: StackConfig[]): StackConfig[] {
    const sorted: StackConfig[] = [];
    const visited = new Set<symbol | StackType>();
    const visiting = new Set<symbol | StackType>();

    const visit = (stack: StackConfig): void => {
      if (visited.has(stack.type)) return;
      if (visiting.has(stack.type)) {
        throw new Error(
          `Circular dependency detected for stack: ${stack.type.description ?? String(stack.type)}`
        );
      }

      visiting.add(stack.type);

      // Visit dependencies first
      if (stack.dependsOn) {
        for (const depType of stack.dependsOn) {
          const depStack = stacks.find((s) => s.type === depType);
          if (depStack) {
            visit(depStack);
          }
        }
      }

      visiting.delete(stack.type);
      visited.add(stack.type);
      sorted.push(stack);
    };

    for (const stack of stacks) {
      visit(stack);
    }

    return sorted;
  }

  /**
   * Creates a stack for a specific stage.
   *
   * @param stage - The stage configuration
   * @param stackConfig - The stack configuration
   * @param deployedStacks - Map of already deployed stacks
   * @returns The created stack or undefined
   */
  private createStackForStage(
    stage: StageConfig,
    stackConfig: StackConfig,
    deployedStacks: Map<StackType | symbol, Stack>
  ): Stack | undefined {
    if (!this.stackFactory.hasStack(stackConfig.type)) {
      this.log(
        `Warning: Stack type not registered: ${stackConfig.type.description ?? String(stackConfig.type)}`,
        'warn'
      );
      return undefined;
    }

    const stageContext: StageContext = {
      stage,
      pipeline: this.pipelineConfig,
      deployedStacks: deployedStacks as Map<StackType | symbol, unknown>,
    };

    const props: FactoryStackProps = {
      stageConfig: stage,
      pipelineConfig: this.pipelineConfig,
      stageContext,
      customProps: stackConfig.props,
      env: stage.env,
    };

    try {
      const stack = this.stackFactory.createStack(
        this.app,
        stackConfig.type,
        props
      );

      // Add dependencies
      if (stackConfig.dependsOn) {
        for (const depType of stackConfig.dependsOn) {
          const depStack = deployedStacks.get(depType);
          if (depStack) {
            stack.addDependency(depStack);
          }
        }
      }

      return stack;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.log(
        `Failed to create stack ${stackConfig.type.description ?? String(stackConfig.type)} for stage ${stage.stageName}: ${errorMessage}`,
        'error'
      );
      throw error;
    }
  }

  /**
   * Logs a message with factory context.
   *
   * @param message - The message to log
   * @param level - The log level
   */
  private log(
    message: string,
    level: 'info' | 'warn' | 'error' = 'info'
  ): void {
    if (!this.debug && level === 'info') return;

    const prefix = `[CdkAppFactory/${this.pipelineConfig.pipelineName}]`;
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
