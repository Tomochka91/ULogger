import { useMutation, useQueryClient } from "@tanstack/react-query";

import toast from "react-hot-toast";

import { postLogger } from "../../api/apiConnections";
import { mapFormValuesToPayload } from "../components/form/AddLoggerForm/mappers/mapFormValuesToPayload";
import { getErrorMessage } from "../utils/apiHelpers";
import type { Logger } from "../types";
import type { LoggerFormValues } from "../components/form/AddLoggerForm/loggerForm.types";

/**
 * src/shared/hooks/useCreateLogger.ts
 *
 * Hook for creating a new logger from form data.
 *
 * Responsibilities:
 * - Convert logger form values into API payload
 * - Send create request to the backend
 * - Refresh logger list after successful creation
 * - Show user feedback via toast messages
 *
 * Usage:
 *   const { createLogger, isCreating } = useCreateLogger();
 *
 * Used in:
 * - AddLoggerForm
 */

export function useCreateLogger() {
  const queryClient = useQueryClient();
  const { mutate: createLogger, isPending: isCreating } = useMutation<
    Logger,
    unknown,
    LoggerFormValues
  >({
    mutationFn: (values) => {
      const payload = mapFormValuesToPayload(values);
      return postLogger(payload);
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["logger-list"] });
      toast.success("New logger was created");
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, "Failed to create logger"));
    },
  });

  return { createLogger, isCreating };
}
