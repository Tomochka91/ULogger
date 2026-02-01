import { Controller, useFormContext } from "react-hook-form";
import { Box, Divider } from "@mui/material";

import { FormRow } from "../../FormRow/FormRow";
import { FormInput } from "../../FormInput/FormInput";
import type { LoggerFormValues } from "../loggerForm.types";

/**
 * src/shared/form/AddLoggerForm/tabSettings/MissDefaultTab.tsx
 *
 * MBox miss-default values settings tab.
 *
 * This module renders the tab section for configuring
 * default values used when an MBox message is marked as "missed".
 *
 * Responsibilities:
 * - Bind default fallback fields for missed packets
 * - Provide simple text inputs for all miss-default values
 *
 * Data model:
 * - Writes to `mbox.miss_default` within LoggerFormValues:
 *   - fish_name: string
 *   - fish_grade: string
 *   - n_weight: string
 *   - r_weight: string
 *   - sn: string
 *
 * Design notes:
 * - Uses `useFormContext` to integrate with AddLoggerForm state.
 * - Layout follows a simple vertical FormRow stack.
 * - No validation rules are applied; values are optional.
 */

/* -------------------------------- Component -------------------------------- */
/**
 * MissDefaultTab
 *
 * Editor for `mbox.miss_default` fallback values.
 *
 * Behavior:
 * - Allows the user to specify default values
 *   used when packet data is missing or invalid.
 *
 * Notes:
 * - All fields are optional and stored as strings.
 * - Displayed helper text is reserved for future validation.
 */

export function MissDefaultTab() {
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
          name="mbox.miss_default.fish_name"
          control={control}
          render={({ field, fieldState }) => (
            <FormRow label="Fish name" labelWidth="25%">
              <FormInput
                {...field}
                value={field.value ?? ""}
                id="mbox-fish-name"
                fullWidth
                helperText={fieldState.error?.message ?? " "}
              />
            </FormRow>
          )}
        />

        <Controller
          name="mbox.miss_default.fish_grade"
          control={control}
          render={({ field, fieldState }) => (
            <FormRow label="Fish grade" labelWidth="25%">
              <FormInput
                {...field}
                value={field.value ?? ""}
                id="mbox-fish-grade"
                fullWidth
                helperText={fieldState.error?.message ?? " "}
              />
            </FormRow>
          )}
        />

        <Controller
          name="mbox.miss_default.n_weight"
          control={control}
          render={({ field, fieldState }) => (
            <FormRow label="N Weight" labelWidth="25%">
              <FormInput
                {...field}
                value={field.value ?? ""}
                id="mbox-n-weight"
                fullWidth
                helperText={fieldState.error?.message ?? " "}
              />
            </FormRow>
          )}
        />

        <Controller
          name="mbox.miss_default.r_weight"
          control={control}
          render={({ field, fieldState }) => (
            <FormRow label="R Weight" labelWidth="25%">
              <FormInput
                {...field}
                value={field.value ?? ""}
                id="mbox-r-weight"
                fullWidth
                helperText={fieldState.error?.message ?? " "}
              />
            </FormRow>
          )}
        />

        <Controller
          name="mbox.miss_default.sn"
          control={control}
          render={({ field, fieldState }) => (
            <FormRow label="SN" labelWidth="25%">
              <FormInput
                {...field}
                value={field.value ?? ""}
                id="mbox-sn"
                fullWidth
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
