import { useStartLogger } from "./useStartLogger";
import { useStopLogger } from "./useStopLogger";
import { useRestartLogger } from "./useRestartLogger";

/**
 * src/shared/hooks/useRuntimeControls.ts
 *
 * Combined hook for controlling logger runtime state.
 *
 * Responsibilities:
 * - Aggregate start, stop, and restart runtime actions
 * - Expose unified loading states for UI controls
 * - Simplify usage in runtime-related components
 *
 * Usage:
 *   const {
 *     runtimeStart,
 *     isStarting,
 *     runtimeStop,
 *     isStopping,
 *     runtimeRestart,
 *     isRestarting,
 *   } = useRuntimeControls();
 *
 * Used in:
 * - RuntimeControls component
 * - Logger runtime management pages
 */

export function useRuntimeControls() {
  const { runtimeStart, isStarting } = useStartLogger();
  const { runtimeStop, isStopping } = useStopLogger();
  const { runtimeRestart, isRestarting } = useRestartLogger();

  return {
    runtimeStart,
    isStarting,
    runtimeStop,
    isStopping,
    runtimeRestart,
    isRestarting,
  };
}
