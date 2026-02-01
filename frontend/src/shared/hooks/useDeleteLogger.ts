import { useMutation, useQueryClient } from "@tanstack/react-query";

import toast from "react-hot-toast";

import { deleteLogger } from "../../api/apiConnections";
import { getErrorMessage } from "../utils/apiHelpers";

/**
 * src/shared/hooks/useDeleteLogger.ts
 *
 * Hook for deleting an existing logger.
 *
 * Responsibilities:
 * - Send delete request to the backend using logger ID
 * - Refresh logger list cache after successful deletion
 * - Show success or error feedback via toast messages
 *
 * Usage:
 *   const { removeLogger, isDeleting } = useDeleteLogger();
 *
 * Used in:
 * - Logger list page
 * - Logger settings / actions
 */

export function useDeleteLogger() {
  const queryClient = useQueryClient();

  const { mutate: removeLogger, isPending: isDeleting } = useMutation<
    void,
    unknown,
    number
  >({
    mutationFn: (logId) => deleteLogger(logId),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["logger-list"] });
      toast.success("Logger successfully deleted");
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, "Something went wrong"));
    },
  });

  return { removeLogger, isDeleting };
}
