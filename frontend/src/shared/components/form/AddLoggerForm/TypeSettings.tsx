import { Box } from "@mui/material";

import { EasySerialSettings } from "./easy-serial/EasySerialSettings";
import { MboxSettings } from "./mbox/MboxSettings";
import { ModbusRtuSettings } from "./modbus/ModbusRtuSettings";
import { ModbusTcpSettings } from "./modbus/ModbusTcpSettings";
import { MboxCounterSettings } from "./mbox/MboxCounterSettings";
import type { LoggerTypeRegistry } from "../../../types";

/**
 * src/shared/components/form/AddLoggerForm/TypeSettings.tsx
 *
 * Logger type settings dispatcher.
 *
 * This module selects and renders the appropriate
 * settings UI based on the selected logger type.
 *
 * Responsibilities:
 * - Act as a single entry point for all logger-specific settings
 * - Route logger type → corresponding settings container
 *
 * Design notes:
 * - The component itself contains no form logic
 * - All form state handling is delegated to child components
 */

interface TypeSettingsProps {
  type: LoggerTypeRegistry;
}

/* -------------------------------- Component -------------------------------- */
/**
 * TypeSettings
 *
 * Wrapper component for logger-specific settings.
 *
 * Behavior:
 * - If `type` is not defined, nothing is rendered
 * - Otherwise, renders a styled container with
 *   settings for the selected logger type
 */

export function TypeSettings({ type }: TypeSettingsProps) {
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
