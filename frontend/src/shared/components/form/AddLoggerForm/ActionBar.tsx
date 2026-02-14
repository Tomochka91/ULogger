import { useFormContext, useFormState } from "react-hook-form";

import { Box } from "@mui/material";
import { ResetButton } from "../../ui/button/ResetButton";
import { SaveButton } from "../../ui/button/SaveButton";
import type { LoggerFormValues } from "./loggerForm.types";

/**
 * src/shared/components/form/AddLoggerForm/ActionBar.tsx
 *
 * AddLoggerForm action bar.
 *
 * This module renders the bottom action controls of AddLoggerForm:
 * - Reset button
 * - Save / Update button
 *
 * Responsibilities:
 * - Subscribe to form validity (`isValid`) via `useFormState`
 * - Enable/disable Save button based on validation state
 * - Display correct label depending on edit mode
 *
 * Design goals:
 * - Isolate form-state subscription (`isValid`) from the main form component
 * - Prevent unnecessary re-renders of AddLoggerForm when validation changes
 * - Keep UI logic separate from form orchestration logic
 *
 * Performance notes:
 * - Uses `useFormState({ control })` instead of reading `formState`
 *   directly from parent.
 * - This ensures only ActionBar re-renders when `isValid` changes.
 * - The main AddLoggerForm remains stable.
 *
 * Props:
 * - isSaving: loading state for save operation
 * - isEditMode: determines button label (Create / Update)
 * - onClear: handler to reset form to defaults
 */

interface ActionBarProps {
  isSaving: boolean;
  isEditMode: boolean;
  onClear: () => void;
}

export function ActionBar({ onClear, isSaving, isEditMode }: ActionBarProps) {
  const { control } = useFormContext<LoggerFormValues>();
  const { isValid } = useFormState({ control });

  return (
    <Box
      sx={{
        display: "inline-flex",
        gap: "var(--gap-standart)",
        flexShrink: 0,
      }}
    >
      <ResetButton onClick={onClear} label="Reset" />
      <SaveButton
        loading={isSaving}
        disabled={!isValid}
        label={isEditMode ? "Update logger" : "Create logger"}
        startIcon={true}
      />
    </Box>
  );
}
