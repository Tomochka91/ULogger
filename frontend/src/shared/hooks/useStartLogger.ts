import { useMutation } from "@tanstack/react-query";

import toast from "react-hot-toast";

import { startLogger } from "../../api/apiConnections";
import { getErrorMessage } from "../utils/apiHelpers";
import type { LoggerStatus } from "../types";

/**
 * src/shared/hooks/useStartLogger.ts
 *
 * Hook for starting a logger worker.
 *
 * Responsibilities:
 * - Send start command for a logger by ID
 * - Expose loading state for UI controls
 * - Show backend or fallback error message on failure
 *
 * Usage:
 *   const { runtimeStart, isStarting } = useStartLogger();
 *   runtimeStart(loggerId);
 *
 * Used in:
 * - RuntimeControls
 * - Logger runtime pages
 */

export function useStartLogger() {
  const { mutate: runtimeStart, isPending: isStarting } = useMutation<
    LoggerStatus,
    unknown,
    number
  >({
    mutationFn: (logId) => startLogger(logId),

    onError: (err) => {
      toast.error(getErrorMessage(err, "Something went wrong"));
    },
  });

  return { runtimeStart, isStarting };
}
