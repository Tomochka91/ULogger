import { Controller, useFormContext } from "react-hook-form";
import { Box, Divider } from "@mui/material";

import { hasMax3Decimals } from "../../../../utils/validation/hasMaxDecimalPlaces";
import { FormRow } from "../../FormRow/FormRow";
import { FormInput } from "../../FormInput/FormInput";
import { makeNumberChangeHandler } from "../../../../utils/numberField";
import { FormCheckbox } from "../../FormCheckBox/FormCheckBox";
import type { LoggerFormValues } from "../loggerForm.types";

/**
 * src/shared/form/AddLoggerForm/tabSettings/ProcessingTab.tsx
 *
 * MBox processing settings tab.
 *
 * This module renders the tab section for configuring MBox-specific
 * processing parameters and error handling behavior.
 *
 * Responsibilities:
 * - Bind MBox processing fields:
 *   - encoding, mbox_id, tare
 *   - error label strings for "zero" and "duplicate"
 *   - flags to treat zero/duplicate as errors
 * - Validate numeric constraints for mbox_id and tare
 * - Keep numeric values typed using `makeNumberChangeHandler`
 *
 * Data model:
 * - Writes to `mbox.*` within LoggerFormValues:
 *   - encoding: string
 *   - mbox_id: number
 *   - tare: number
 *   - error_label_zero: string
 *   - error_label_duplicate: string
 *   - treat_zero_as_error: boolean
 *   - treat_duplicate_as_error: boolean
 *
 * Design notes:
 * - Uses `useFormContext` to integrate with AddLoggerForm state.
 * - Layout follows a vertical FormRow stack.
 * - Numeric values are stored as numbers in form state.
 */

/* -------------------------------- Component -------------------------------- */
/**
 * ProcessingTab
 *
 * Editor for MBox processing and error handling settings.
 *
 * Validation:
 * - mbox_id: integer > 0 (optional unless enforced elsewhere)
 * - tare: max 3 decimal places
 *
 * Notes:
 * - Error label fields are plain strings (optional).
 * - Checkboxes toggle whether certain conditions are treated as errors.
 */

export function ProcessingTab() {
  const { control } = useFormContext<LoggerFormValues>();

  return (
    <>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          borderTop: "var(--border-standart)",
          paddingBlock: "var(--pading-equal) 1.2rem",
        }}
      >
        <Controller
          name="mbox.encoding"
          control={control}
          render={({ field, fieldState }) => (
            <FormRow label="Encoding" labelWidth="40%">
              <FormInput
                {...field}
                value={field.value ?? ""}
                id="mbox-encoding"
                fullWidth
                helperText={fieldState.error?.message ?? " "}
              />
            </FormRow>
          )}
        />

        <Controller
          name="mbox.mbox_id"
          control={control}
          rules={{
            validate: (val) => {
              if (typeof val !== "number") return true;
              if (val <= 0) return "Id must be greater than 0";
              if (!Number.isInteger(val)) return "Id must be an integer";
              return true;
            },
          }}
          render={({ field, fieldState }) => (
            <FormRow label="Mbox id" labelWidth="40%">
              <FormInput
                {...field}
                type="number"
                id="mbox-id"
                slotProps={{ htmlInput: { step: 1, min: 1 } }}
                value={field.value ?? ""}
                onChange={makeNumberChangeHandler(field)}
                fullWidth
                helperText={fieldState.error?.message ?? " "}
              />
            </FormRow>
          )}
        />

        <Controller
          name="mbox.tare"
          control={control}
          rules={{
            validate: (value) =>
              hasMax3Decimals(value) ||
              "Tare can have at most 3 decimal places",
          }}
          render={({ field, fieldState }) => (
            <FormRow label="Tare" labelWidth="40%">
              <FormInput
                {...field}
                type="number"
                value={field.value ?? ""}
                onChange={makeNumberChangeHandler(field)}
                id="mbox-tare"
                inputMode="decimal"
                fullWidth
                helperText={fieldState.error?.message ?? " "}
              />
            </FormRow>
          )}
        />

        <Controller
          name="mbox.error_label_zero"
          control={control}
          render={({ field, fieldState }) => (
            <FormRow label="Error label zero" labelWidth="40%">
              <FormInput
                {...field}
                value={field.value ?? ""}
                id="mbox-label-zero"
                fullWidth
                helperText={fieldState.error?.message ?? " "}
              />
            </FormRow>
          )}
        />

        <Controller
          name="mbox.error_label_duplicate"
          control={control}
          render={({ field, fieldState }) => (
            <FormRow label="Error label duplicate" labelWidth="40%">
              <FormInput
                {...field}
                value={field.value ?? ""}
                id="mbox-label-duplicate"
                fullWidth
                helperText={fieldState.error?.message ?? " "}
              />
            </FormRow>
          )}
        />

        <Controller
          name="mbox.treat_zero_as_error"
          control={control}
          render={({ field }) => (
            <FormRow label="Treat zero as error:" labelWidth="40%">
              <FormCheckbox
                id="mbox-zero"
                checked={!!field.value}
                onChange={(e) => field.onChange(e.target.checked)}
                sx={{ mb: "0.8rem" }}
              />
            </FormRow>
          )}
        />

        <Controller
          name="mbox.treat_duplicate_as_error"
          control={control}
          render={({ field }) => (
            <FormRow label="Treat duplicate as error:" labelWidth="40%">
              <FormCheckbox
                id="mbox-duplicate"
                checked={!!field.value}
                onChange={(e) => field.onChange(e.target.checked)}
                sx={{ mb: "0.8rem" }}
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
