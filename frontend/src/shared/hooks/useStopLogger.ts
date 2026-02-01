import { useMutation } from "@tanstack/react-query";

import toast from "react-hot-toast";

import { stopLogger } from "../../api/apiConnections";
import { getErrorMessage } from "../utils/apiHelpers";
import type { LoggerStatus } from "../types";

/**
 * src/shared/hooks/useStopLogger.ts
 *
 * Hook for stopping a logger worker.
 *
 * Responsibilities:
 * - Send stop command for a logger by ID
 * - Expose loading state for UI controls
 * - Show backend or fallback error message on failure
 *
 * Usage:
 *   const { runtimeStop, isStopping } = useStopLogger();
 *   runtimeStop(loggerId);
 *
 * Used in:
 * - RuntimeControls
 * - Logger runtime pages
 */

export function useStopLogger() {
  const { mutate: runtimeStop, isPending: isStopping } = useMutation<
    LoggerStatus,
    unknown,
    number
  >({
    mutationFn: (logId) => stopLogger(logId),

    onError: (err) => {
      toast.error(getErrorMessage(err, "Something went wrong"));
    },
  });

  return { runtimeStop, isStopping };
}
