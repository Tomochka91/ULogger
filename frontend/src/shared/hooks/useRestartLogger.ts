import { useMutation } from "@tanstack/react-query";

import toast from "react-hot-toast";

import { restartLogger } from "../../api/apiConnections";
import { getErrorMessage } from "../utils/apiHelpers";
import type { LoggerStatus } from "../types";

/**
 * src/shared/hooks/useRestartLogger.ts
 *
 * Hook for restarting a logger worker.
 *
 * Responsibilities:
 * - Send restart command for a specific logger by ID
 * - Expose loading state for UI controls
 * - Show backend or fallback error message on failure
 *
 * Usage:
 *   const { runtimeRestart, isRestarting } = useRestartLogger();
 *   runtimeRestart(loggerId);
 *
 * Used in:
 * - Runtime controls (Restart button)
 */

export function useRestartLogger() {
  const { mutate: runtimeRestart, isPending: isRestarting } = useMutation<
    LoggerStatus,
    unknown,
    number
  >({
    mutationFn: (logId) => restartLogger(logId),

    onError: (err) => {
      toast.error(getErrorMessage(err, "Something went wrong"));
    },
  });

  return { runtimeRestart, isRestarting };
}
