import { Controller, useFormContext } from "react-hook-form";
import { Box, Divider } from "@mui/material";

import { FormRow } from "../../FormRow/FormRow";
import { FormInput } from "../../FormInput/FormInput";
import { makeNumberChangeHandler } from "../../../../utils/numberField";
import { hasMax2Decimals } from "../../../../utils/validation/hasMaxDecimalPlaces";
import type { LoggerFormValues } from "../loggerForm.types";

/**
 * src/shared/form/AddLoggerForm/tabSettings/PollIntervalTab.tsx
 *
 * Poll interval settings tab.
 *
 * This module renders a reusable tab section for configuring
 * polling interval for loggers that support periodic polling.
 *
 * Responsibilities:
 * - Bind `<prefix>.poll_interval` field
 * - Validate numeric constraints for poll interval
 * - Keep numeric value typed using `makeNumberChangeHandler`
 *
 * Data model:
 * - Writes to `<fieldPrefix>.poll_interval` within LoggerFormValues:
 *   - poll_interval: number (seconds)
 *
 * Design notes:
 * - The component is generic and reused for multiple logger types.
 * - `fieldPrefix` determines the root path in form state.
 */

/* -------------------------------- Types -------------------------------- */
/**
 * PollIntervalTabProps
 *
 * fieldPrefix:
 * - Defines the logger namespace where `poll_interval` is stored.
 */

type PollIntervalTabProps = {
  fieldPrefix: "modbus_rtu" | "modbus_tcp" | "mbox_counter";
};

/* -------------------------------- Component -------------------------------- */
/**
 * PollIntervalTab
 *
 * Editor for `<fieldPrefix>.poll_interval`.
 *
 * Behavior:
 * - Renders a single numeric input field.
 *
 * Validation:
 * - required
 * - minimum value: 0.1
 * - maximum of 2 decimal places
 *
 * Notes:
 * - Value is stored as number in form state.
 * - Intended to be shared between Modbus RTU, Modbus TCP
 *   and MBox Counter configurations.
 */

export function PollIntervalTab({ fieldPrefix }: PollIntervalTabProps) {
  const { control } = useFormContext<LoggerFormValues>();

  return (
    <>
      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: "var(--gap-mini)",
          borderTop: "var(--border-standart)",
          paddingBlock: "var(--pading-equal)",
        }}
      >
        <Controller
          name={`${fieldPrefix}.poll_interval`}
          control={control}
          rules={{
            required: "Poll interval is required",
            min: { value: 0.1, message: "Interval must be ≥ 0.1" },
            validate: (value) =>
              hasMax2Decimals(value) ||
              "Interval can have at most 2 decimal places",
          }}
          render={({ field, fieldState }) => (
            <FormRow label="Poll interval" labelWidth="25%">
              <FormInput
                {...field}
                value={field.value ?? ""}
                type="number"
                id="poll-interval"
                fullWidth
                slotProps={{ htmlInput: { min: "0.1", step: "any" } }}
                onChange={makeNumberChangeHandler(field)}
                helperText={fieldState.error?.message ?? " "}
              />
            </FormRow>
          )}
        />
      </Box>
      <Divider
        orientation="vertical"
        variant="middle"
        flexItem
        sx={{ marginInline: "2rem" }}
      />
    </>
  );
}
