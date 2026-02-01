import { Controller, useFieldArray, useFormContext } from "react-hook-form";
import { Box, IconButton, Typography } from "@mui/material";
import { BsPlus, BsTrash } from "react-icons/bs";

import { FormInput } from "../../FormInput/FormInput";
import { HelperText } from "../../FormHelperText/HelperText";
import { makeNumberChangeHandler } from "../../../../utils/numberField";
import { FormCheckbox } from "../../FormCheckBox/FormCheckBox";
import type { LoggerFormValues } from "../loggerForm.types";

/**
 * src/shared/form/AddLoggerForm/tabSettings/DevicesTab.tsx
 *
 * MBox Counter devices settings tab.
 *
 * This module renders the tab section for editing the list of devices
 * associated with an `mbox_counter` logger.
 *
 * Responsibilities:
 * - Manage the `mbox_counter.devices` array via `useFieldArray`
 * - Provide UI for adding/removing devices
 * - Render device fields in a grid "table" layout:
 *   - device_id, name, serial, enabled
 * - Validate numeric fields (device id / serial) using RHF rules
 * - Keep numeric values typed using `makeNumberChangeHandler`
 *
 * Data model:
 * - Writes to `mbox_counter.devices[]` within LoggerFormValues.
 *   Each device entry includes:
 *   - device_id: number
 *   - name: string
 *   - serial: number
 *   - enabled: boolean
 *
 * Design notes:
 * - Layout is implemented using CSS grid to emulate a table.
 * - Header row is styled separately using the same grid template.
 * - Empty state is shown when no devices exist.
 * - Row striping improves readability; odd rows get an alternate background.
 */

/* -------------------------------- Constants -------------------------------- */
/**
 * tableColumnHeading
 *
 * Column metadata used to render the header row.
 */

const tableColumnHeading = [
  { key: "id", label: "Device Id" },
  { key: "name", label: "Device Name" },
  { key: "serial", label: "Serial" },
  { key: "enabled", label: "Enabled" },
];

/**
 * tableSx
 *
 * Shared SX configuration for the grid table layout.
 *
 * Columns:
 * - 3 flexible columns for id/name/serial
 * - enabled column sized to content
 * - actions column (trash icon) sized to content
 */

const tableSx = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr) minmax(8rem, max-content) min-content",
  columnGap: "var(--gap-mini)",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "white",
  border: "var(--border-standart)",
  paddingInline: "1rem",
};

/* -------------------------------- Component -------------------------------- */
/**
 * DevicesTab
 *
 * Editor for `mbox_counter.devices` array.
 *
 * Behavior:
 * - Add (+): appends a new device with default values.
 * - Remove (trash): removes a device at index.
 * - Empty state: shows helper text when `fields.length === 0`.
 *
 * Validation:
 * - device_id: required integer > 0
 * - serial: required integer in range [0..65535]
 *
 * Notes:
 * - Uses `useFormContext` to access parent AddLoggerForm state.
 * - Uses `useFieldArray` for dynamic list management.
 */
export function DevicesTab() {
  const { control } = useFormContext<LoggerFormValues>();

  const { fields, append, remove } = useFieldArray({
    control,
    name: "mbox_counter.devices",
  });

  /**
   * handleAddField
   *
   * Appends a new device entry with sensible defaults.
   *
   * Defaults:
   * - device_id: 1
   * - name: empty
   * - serial: 0
   * - enabled: true
   */
  const handleAddField = () => {
    append({
      device_id: 1,
      name: "",
      serial: 0,
      enabled: true,
    });
  };

  return (
    <Box
      sx={{
        gridColumn: "1/-1",
        borderTop: "var(--border-standart)",
        paddingBlock: "1.2rem",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
      }}
    >
      <Box sx={{ ...tableSx, backgroundColor: "var(--color-mint-cream)" }}>
        {tableColumnHeading.map((col) => (
          <Typography
            key={col.key}
            component="h3"
            sx={{
              textAlign: "center",
              fontSize: "var(--medium-font-size)",
              fontFamily: "var(--secondary-font)",
              lineHeight: "var( --line-height-standart)",
              color: "var(--color-jungle-green)",
            }}
          >
            {col.label}
          </Typography>
        ))}
        <IconButton onClick={handleAddField} size="small">
          <BsPlus />
        </IconButton>
      </Box>

      <Box
        sx={{
          flex: 1,
          minHeight: "10vh",
          overflowY: "auto",
        }}
      >
        {fields.length === 0 && (
          <HelperText
            sx={{
              fontSize: "var(--small-font-size)",
              padding: "var(--padding-mini)",
            }}
          >
            There are no devices yet. Click + to add.
          </HelperText>
        )}

        {fields.map((item, index) => {
          return (
            <Box
              key={item.id}
              sx={{
                ...tableSx,
                borderTop: 0,
                padding: "1rem 1rem 0",
                "&:nth-of-type(odd)": {
                  backgroundColor: "var(--color-honeydew)",
                  "& .MuiOutlinedInput-root": {
                    backgroundColor: "white",
                  },
                },
                "&:last-of-type": {
                  borderBottom: "var(--border-standart)",
                },
              }}
            >
              <Controller
                name={`mbox_counter.devices.${index}.device_id`}
                control={control}
                rules={{
                  required: "Device Id is required",
                  validate: (val) => {
                    if (typeof val !== "number") return true;
                    if (val <= 0) return "Id must be greater than 0";
                    if (!Number.isInteger(val)) return "Id must be an integer";
                    return true;
                  },
                }}
                render={({ field, fieldState }) => (
                  <FormInput
                    {...field}
                    value={field.value ?? ""}
                    type="number"
                    slotProps={{ htmlInput: { step: 1, min: 1 } }}
                    onChange={makeNumberChangeHandler(field)}
                    placeholder="Device Id"
                    helperText={fieldState.error?.message ?? " "}
                  />
                )}
              />

              <Controller
                name={`mbox_counter.devices.${index}.name`}
                control={control}
                render={({ field }) => (
                  <FormInput
                    {...field}
                    value={field.value ?? ""}
                    placeholder="Device name"
                    helperText={" "}
                  />
                )}
              />

              <Controller
                name={`mbox_counter.devices.${index}.serial`}
                control={control}
                rules={{
                  required: "Serial is required",
                  min: { value: 0, message: "Port must be ≥ 0" },
                  max: { value: 65535, message: "Serial must be ≤ 65535" },
                  validate: (value) =>
                    typeof value !== "number"
                      ? true
                      : Number.isInteger(value) || "Serial must be an integer",
                }}
                render={({ field, fieldState }) => (
                  <FormInput
                    {...field}
                    value={field.value ?? ""}
                    onChange={makeNumberChangeHandler(field)}
                    inputMode="numeric"
                    placeholder="Serial"
                    helperText={fieldState.error?.message ?? " "}
                  />
                )}
              />

              <Controller
                name={`mbox_counter.devices.${index}.enabled`}
                control={control}
                render={({ field }) => (
                  <FormCheckbox
                    checked={!!field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                    sx={{ mb: "1rem" }}
                  />
                )}
              />

              <IconButton
                onClick={() => remove(index)}
                size="small"
                sx={{ mb: "1rem" }}
              >
                <BsTrash color="var(--color-indian-red)" />
              </IconButton>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
