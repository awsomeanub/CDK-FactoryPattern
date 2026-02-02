import { StackConstructor, TYPES, StackType } from '../../lib/definitions';
import { VpcStack } from '../stacks/VpcStack';
import { AppStack } from '../stacks/AppStack';

/**
 * Stack registry mapping stack type symbols to their constructors.
 * Used by the factory to instantiate stacks.
 *
 * @example
 * ```typescript
 * // Register all stacks with the factory
 * Object.getOwnPropertySymbols(stackRegistry).forEach(type => {
 *   factory.registerStack(type, stackRegistry[type]);
 * });
 * ```
 */
export const stackRegistry: Record<symbol, StackConstructor> = {
  [TYPES.VpcStack]: VpcStack,
  [TYPES.AppStack]: AppStack,
};

/**
 * Gets a stack constructor by type.
 *
 * @param stackType - The stack type symbol
 * @returns The stack constructor or undefined
 */
export function getStackConstructor(
  stackType: StackType | symbol
): StackConstructor | undefined {
  return stackRegistry[stackType as keyof typeof stackRegistry];
}

/**
 * Gets all registered stack types.
 *
 * @returns Array of registered stack type symbols
 */
export function getRegisteredStackTypes(): symbol[] {
  return Object.getOwnPropertySymbols(stackRegistry);
}

/**
 * Registers all stacks from the registry with a factory.
 *
 * @param factory - The factory to register stacks with
 */
export function registerAllStacks(factory: {
  registerStack: (type: symbol, constructor: StackConstructor) => void;
}): void {
  Object.getOwnPropertySymbols(stackRegistry).forEach((type) => {
    factory.registerStack(type, stackRegistry[type as keyof typeof stackRegistry]);
  });
}
