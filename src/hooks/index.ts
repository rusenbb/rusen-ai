/**
 * Shared Hooks Library
 *
 * Unified hooks for consistent functionality across all demos.
 * Import from '@/hooks' for tree-shakeable exports.
 *
 * @example
 * ```tsx
 * import { useAPI } from '@/hooks';
 *
 * const { generate, isGenerating, error } = useAPI('auto', {
 *   useCase: 'paper-pilot',
 * });
 * ```
 */

export {
  useAPI,
  type GenerationResult,
  type GenerateOptions,
  type UseAPIReturn,
  type UseAPIConfig,
} from "./useAPI";
