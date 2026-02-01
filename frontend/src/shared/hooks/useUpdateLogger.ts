import { useMutation, useQueryClient } from "@tanstack/react-query";

import toast from "react-hot-toast";

import { updateLogger } from "../../api/apiConnections";
import { mapFormValuesToPayload } from "../components/form/AddLoggerForm/mappers/mapFormValuesToPayload";
import { getErrorMessage } from "../utils/apiHelpers";
import type { Logger } from "../types";
import type { LoggerFormValues } from "../components/form/AddLoggerForm/loggerForm.types";

/**
 * src/shared/hooks/useUpdateLogger.ts
 *
 * Hook for updating an existing logger.
 *
 * Responsibilities:
 * - Convert logger form values into API payload
 * - Send update request for a specific logger by ID
 * - Refresh logger list cache after successful update
 * - Show success or error feedback via toast messages
 *
 * Usage:
 *   const { updateLoggerMutate, isUpdating } = useUpdateLogger();
 *   updateLoggerMutate({ id: loggerId, values });
 *
 * Used in:
 * - Edit Logger form
 * - useSaveLogger hook
 */

export function useUpdateLogger() {
  const queryClient = useQueryClient();
  const { mutate: updateLoggerMutate, isPending: isUpdating } = useMutation<
    Logger,
    unknown,
    { id: number; values: LoggerFormValues }
  >({
    mutationFn: ({ id, values }) => {
      const payload = mapFormValuesToPayload(values);
      return updateLogger(id, payload);
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["logger-list"] });
      toast.success("Logger was updated");
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, "Failed to update logger"));
    },
  });

  return { updateLoggerMutate, isUpdating };
}
