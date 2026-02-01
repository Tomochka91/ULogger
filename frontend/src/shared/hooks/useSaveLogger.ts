import { useCallback } from "react";

import { useCreateLogger } from "./useCreateLogger";
import { useUpdateLogger } from "./useUpdateLogger";
import type { Logger } from "../types";
import type { LoggerFormValues } from "../components/form/AddLoggerForm/loggerForm.types";

/**
 * src/shared/hooks/useSaveLogger.ts
 *
 * Hook that unifies logger creation and update logic.
 *
 * Responsibilities:
 * - Decide whether to create a new logger or update an existing one
 * - Expose a single `saveLogger` function for form submission
 * - Combine loading states from create and update operations
 *
 * Usage:
 *   const { saveLogger, isSaving, isEditMode } = useSaveLogger(selectedLogger);
 *
 * Notes:
 * - Edit mode is enabled when `selectedLogger` is provided
 * - `onSuccess` callback can be passed per save action
 *
 * Used in:
 * - Add / Edit Logger form
 */

export function useSaveLogger(selectedLogger: Logger | null) {
  const { createLogger, isCreating } = useCreateLogger();
  const { updateLoggerMutate, isUpdating } = useUpdateLogger();

  const isEditMode = Boolean(selectedLogger);
  const isSaving = isCreating || isUpdating;

  const saveLogger = useCallback(
    (values: LoggerFormValues, options?: { onSuccess?: () => void }) => {
      const onSuccess = () => {
        options?.onSuccess?.();
      };

      if (isEditMode && selectedLogger) {
        updateLoggerMutate({ id: selectedLogger.id!, values }, { onSuccess });
      } else {
        createLogger(values, { onSuccess });
      }
    },
    [isEditMode, selectedLogger, updateLoggerMutate, createLogger],
  );

  return { saveLogger, isSaving, isEditMode };
}
