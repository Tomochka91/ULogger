import { Controller, useFormContext } from "react-hook-form";
import { Box, Divider } from "@mui/material";

import { FormRow } from "../../FormRow/FormRow";
import { FormInput } from "../../FormInput/FormInput";
import type { LoggerFormValues } from "../loggerForm.types";

/**
 * src/shared/form/AddLoggerForm/tabSettings/DBWriterTab.tsx
 *
 * Database writer settings tab.
 *
 * This module renders the settings tab responsible for configuring
 * the database writer query template used by the logger.
 *
 * Responsibilities:
 * - Bind `query_template` field to AddLoggerForm react-hook-form state
 * - Provide a multiline text input for editing SQL / query templates
 * - Integrate into the common settings tab layout (top border + divider)
 *
 * Data model:
 * - Writes directly to the root-level `query_template` field
 *   in `LoggerFormValues`.
 *
 * Design notes:
 * - Implemented as a minimal tab with a single controlled field.
 * - Uses `useFormContext` to integrate with the parent form.
 * - Does not perform validation itself; validation (if required)
 *   is expected to be handled elsewhere.
 * - Multiline input is intentionally unopinionated about content
 *   (SQL dialect, placeholders, etc.).
 */

/* -------------------------------- Component -------------------------------- */
/**
 * DBWriterTab
 *
 * Editor for the database writer query template.
 *
 * UI behavior:
 * - Renders a multiline FormInput with a reasonable max height.
 * - Uses FormRow for consistent label alignment with other tabs.
 * - Displays a vertical divider to match the two-column settings layout.
 */

export function DBWriterTab() {
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
          name="query_template"
          control={control}
          render={({ field }) => (
            <FormRow label="DB Writer" labelWidth="25%">
              <FormInput
                {...field}
                value={field.value ?? ""}
                id="db-writer"
                fullWidth
                multiline
                minRows={5}
                maxRows={15}
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
