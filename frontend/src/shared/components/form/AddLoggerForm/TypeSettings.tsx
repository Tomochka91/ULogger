import { useFormContext, useWatch } from "react-hook-form";

import { Box } from "@mui/material";

import { EasySerialSettings } from "./easy-serial/EasySerialSettings";
import { MboxSettings } from "./mbox/MboxSettings";
import { ModbusRtuSettings } from "./modbus/ModbusRtuSettings";
import { ModbusTcpSettings } from "./modbus/ModbusTcpSettings";
import { MboxCounterSettings } from "./mbox/MboxCounterSettings";
import type { LoggerTypeRegistry } from "../../../types";
import type { LoggerFormValues } from "./loggerForm.types";

/**
 * src/shared/components/form/AddLoggerForm/TypeSettings.tsx
 *
 * Logger type settings dispatcher.
 *
 * This module dynamically renders logger-specific configuration
 * sections based on the currently selected logger type.
 *
 * Responsibilities:
 * - Subscribe to the `type` field in the form state
 * - Render the corresponding settings component
 * - Provide a consistent layout wrapper for all logger-specific tabs
 *
 * Data flow:
 * - Uses `useFormContext` to access RHF control
 * - Subscribes to `type` via `useWatch({ name: "type" })`
 * - Delegates all form logic to the selected child settings component
 *
 * Design / performance notes:
 * - The component intentionally subscribes only to `type`,
 *   avoiding full-form subscriptions.
 * - Extracted to isolate re-renders caused by logger type switching.
 * - Child components (EasySerialSettings, MboxSettings, etc.)
 *   are responsible for their own field subscriptions.
 *
 * Behavior:
 * - If `type` is undefined → renders nothing
 * - If `type` changes → previous settings unmount, new settings mount
 *
 * Extensibility:
 * - To add a new logger type:
 *   1. Implement the corresponding settings component
 *   2. Add a new case to `renderSettings`
 */

export function TypeSettings() {
  const { control } = useFormContext<LoggerFormValues>();
  const type = useWatch({ control, name: "type" });

  if (!type) return null;

  return (
    <Box
      sx={{
        width: "100%",
        p: "var(--pading-equal)",
        borderRadius: "var(--border-radius-medium)",
        border: "var(--border-standart)",
        boxShadow: 1,
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: 0,
        overflow: "auto",
      }}
    >
      {renderSettings(type)}
    </Box>
  );
}

/* -------------------------------- Helpers -------------------------------- */
/**
 * renderSettings
 *
 * Maps logger type to its settings component.
 *
 * Logic:
 * - Uses a switch on `LoggerTypeRegistry`
 * - Each case returns the corresponding settings container
 *
 * Notes:
 * - Centralized mapping keeps TypeSettings simple
 * - Adding a new logger type requires adding one case here
 */

function renderSettings(type: LoggerTypeRegistry) {
  switch (type) {
    case "easy_serial":
      return <EasySerialSettings />;
    case "mbox":
      return <MboxSettings />;
    case "modbus_rtu":
      return <ModbusRtuSettings />;
    case "modbus_tcp":
      return <ModbusTcpSettings />;
    case "mbox_counter":
      return <MboxCounterSettings />;
    default:
      return null;
  }
}
