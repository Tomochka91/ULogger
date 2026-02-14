import { Controller, type Control } from "react-hook-form";
import { Box, IconButton } from "@mui/material";
import { BsTrash } from "react-icons/bs";

import { FormRow } from "../FormRow/FormRow";
import { createLoggerDefaultValues } from "./loggerDefaults";
import { mapLoggerToFormValues } from "./mappers/mapLoggerToFormValues";
import { FormAutocomplete } from "../FormAutocomplete/FormAutocomplete";
import { defaultAutocompleteSlotProps } from "../FormAutocomplete/AutocompleteSlotProps";
import { FormInput } from "../FormInput/FormInput";

import type { LoggerFormValues } from "./loggerForm.types";
import type { Logger } from "../../../types";

/**
 * src/shared/components/form/AddLoggerForm/LoggerNameSettings.tsx
 *
 * Logger name selector + edit-mode loader.
 *
 * This module encapsulates the "Logger name" field together with the
 * autocomplete UX for selecting an existing logger to edit.
 *
 * Responsibilities:
 * - Bind the `name` form field
 * - Provide autocomplete over existing logger names
 * - On selection:
 *   - if empty → reset form to NEW_LOGGER_DEFAULTS and clear selected logger
 *   - if existing logger → map API model to form values and reset RHF state
 *   - if unknown name → keep typed name, clear selected logger
 * - Expose delete request action for the currently selected logger
 *
 * Data flow:
 * - Reads current `name` value from RHF via Controller render props
 * - Uses `getLoggerByName(name)` (provided by parent) to resolve selection
 * - Uses `mapLoggerToFormValues(logger)` to convert backend logger → form values
 * - Calls `reset(...)` to apply a full form state update
 * - Lifts selection state up via `onSelectedLoggerChange(logger | null)`
 * - Triggers deletion via `onRequestDelete(logger)`
 *
 * Design / performance notes:
 * - Extracted from AddLoggerForm to isolate re-renders caused by typing
 *   into the name/autocomplete field.
 * - Uses props for external dependencies (logger list lookup, reset),
 *   keeping this component UI-focused and predictable.
 *
 * Caveats:
 * - `reset()` reinitializes the entire form, so it is expected to cause
 *   a form-wide update when switching between existing loggers/new logger.
 */

interface LoggerNameSettingsProps {
  control: Control<LoggerFormValues>;
  reset: (values: LoggerFormValues) => void;
  autocompleteOptions: string[];
  onSelectedLoggerChange: (logger: Logger | null) => void;
  getLoggerByName: (name: string | null | undefined) => Logger | null;
  onRequestDelete: (logger: Logger) => void;
}

const NEW_LOGGER_DEFAULTS = createLoggerDefaultValues("easy_serial");

export function LoggerNameSettings({
  control,
  onSelectedLoggerChange,
  reset,
  getLoggerByName,
  autocompleteOptions,
  onRequestDelete,
}: LoggerNameSettingsProps) {
  return (
    <FormRow label="Logger name" labelWidth="25%">
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: "var(--gap-standart)",
        }}
      >
        <Controller
          name="name"
          control={control}
          rules={{ required: "Logger name is required" }}
          render={({ field, fieldState }) => {
            const { value, onChange, ref } = field;

            const handleSelectLogger = (
              _event: React.SyntheticEvent,
              newInputValue: string | null,
            ) => {
              const name = newInputValue ?? "";
              onChange(name);

              if (!name) {
                onSelectedLoggerChange(null);
                reset(NEW_LOGGER_DEFAULTS);
                return;
              }

              const logger = getLoggerByName(name);

              if (logger) {
                onSelectedLoggerChange(logger);
                const mapped = mapLoggerToFormValues(logger);
                reset(mapped);
              } else {
                onSelectedLoggerChange(null);
              }
            };

            const selectedLoggerObj = getLoggerByName(value);

            return (
              <>
                <FormAutocomplete
                  fullWidth
                  freeSolo
                  forcePopupIcon
                  options={autocompleteOptions}
                  inputValue={value}
                  onInputChange={handleSelectLogger}
                  slotProps={defaultAutocompleteSlotProps}
                  renderInput={(params) => (
                    <FormInput
                      {...params}
                      inputRef={ref}
                      value={params.inputProps.value ?? ""}
                      placeholder="New logger"
                      helperText={fieldState.error?.message ?? " "}
                    />
                  )}
                />

                {selectedLoggerObj && (
                  <IconButton
                    onClick={() => onRequestDelete(selectedLoggerObj)}
                    size="small"
                    sx={{
                      color: "var(--color-indian-red)",
                      flexShrink: 0,
                      alignSelf: "flex-start",
                    }}
                  >
                    <BsTrash color="var(--color-indian-red)" />
                  </IconButton>
                )}
              </>
            );
          }}
        />
      </Box>
    </FormRow>
  );
}
