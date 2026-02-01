import { Controller, useFormContext } from "react-hook-form";
import { Box, Divider } from "@mui/material";

import { FormRow } from "../../FormRow/FormRow";
import { FormInput } from "../../FormInput/FormInput";
import { ipRegex } from "../../../../utils/validation/regex";
import { FormCheckbox } from "../../FormCheckBox/FormCheckBox";
import { makeNumberChangeHandler } from "../../../../utils/numberField";
import { hasMax2Decimals } from "../../../../utils/validation/hasMaxDecimalPlaces";
import type { LoggerFormValues } from "../loggerForm.types";

/**
 * src/shared/form/AddLoggerForm/tabSettings/HostTab.tsx
 *
 * Modbus TCP host connection settings tab.
 *
 * This module renders the tab section for configuring
 * Modbus TCP connection parameters.
 *
 * Responsibilities:
 * - Bind Modbus TCP host settings:
 *   - address, port, timeout, autoconnect
 * - Validate network-related numeric and format constraints
 * - Keep numeric values typed using `makeNumberChangeHandler`
 *
 * Data model:
 * - Writes to `modbus_tcp.host` within LoggerFormValues:
 *   - address: string (IPv4)
 *   - port: number
 *   - timeout: number (seconds)
 *   - autoconnect: boolean
 *
 * Design notes:
 * - Uses `useFormContext` to integrate with AddLoggerForm state.
 * - Layout follows a simple vertical FormRow stack.
 * - Validation errors are displayed inline via helper text.
 */

/* -------------------------------- Component -------------------------------- */
/**
 * HostTab
 *
 * Editor for `modbus_tcp.host` connection settings.
 *
 * Validation:
 * - address: required, must match IPv4 format
 * - port: required integer in range [1..65535]
 * - timeout: required number ≥ 0.1, max 2 decimal places
 *
 * Notes:
 * - `makeNumberChangeHandler` is used to ensure numeric values
 *   are stored as numbers in form state.
 */

export function HostTab() {
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
          name="modbus_tcp.host.address"
          control={control}
          rules={{
            required: "IP Address is required",
            pattern: { value: ipRegex, message: "Invalid IPv4 address" },
          }}
          render={({ field, fieldState }) => (
            <FormRow label="Host" labelWidth="25%">
              <FormInput
                {...field}
                value={field.value ?? ""}
                id="modbus-host"
                inputMode="decimal"
                placeholder="192.162.1.56"
                fullWidth
                helperText={fieldState.error?.message ?? " "}
              />
            </FormRow>
          )}
        />

        <Controller
          name="modbus_tcp.host.port"
          control={control}
          rules={{
            required: "Port is required",
            min: { value: 1, message: "Port must be ≥ 1" },
            max: { value: 65535, message: "Port must be ≤ 65535" },
            validate: (value) =>
              typeof value !== "number"
                ? true
                : Number.isInteger(value) || "Port must be an integer",
          }}
          render={({ field, fieldState }) => (
            <FormRow label="Port" labelWidth="25%">
              <FormInput
                {...field}
                value={field.value ?? ""}
                onChange={makeNumberChangeHandler(field)}
                id="modbus-port"
                inputMode="numeric"
                placeholder="1502"
                fullWidth
                helperText={fieldState.error?.message ?? " "}
              />
            </FormRow>
          )}
        />

        <Controller
          name="modbus_tcp.host.timeout"
          control={control}
          rules={{
            required: "Timeout is required",
            min: { value: 0.1, message: "Timeout must be ≥ 0.1" },
            validate: (value) =>
              hasMax2Decimals(value) ||
              "Timeout can have at most 2 decimal places",
          }}
          render={({ field, fieldState }) => (
            <FormRow label="Timeout" labelWidth="25%">
              <FormInput
                {...field}
                type="number"
                slotProps={{ htmlInput: { min: "0.1", step: "any" } }}
                value={field.value ?? ""}
                onChange={makeNumberChangeHandler(field)}
                id="modbus-timeout"
                inputMode="decimal"
                fullWidth
                helperText={fieldState.error?.message ?? " "}
              />
            </FormRow>
          )}
        />

        <Controller
          name="modbus_tcp.host.autoconnect"
          control={control}
          render={({ field }) => (
            <FormRow label="Autoconnect" labelWidth="25%">
              <FormCheckbox
                id="modbus-autoconnect"
                checked={!!field.value}
                onChange={(e) => field.onChange(e.target.checked)}
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
