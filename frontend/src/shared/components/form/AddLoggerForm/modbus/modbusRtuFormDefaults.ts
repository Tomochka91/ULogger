import type { ModbusRTUSettings } from "../../../../types";

/**
 * src/shared/components/form/AddLoggerForm/modbus/modbusRtuFormDefaults.ts
 *
 * Modbus RTU form defaults.
 *
 * This module defines default settings for the Modbus RTU logger form.
 * Defaults are used when creating a new Modbus RTU logger or when
 * initializing missing configuration sections.
 *
 * Responsibilities:
 * - Provide a canonical default configuration for Modbus RTU
 * - Expose a helper builder function for form initialization
 *
 * Data model:
 * - Produces `ModbusRTUSettings`:
 *   - port: serial port configuration
 *   - poll_interval: polling interval in seconds
 *   - slaves: list of Modbus slave configurations
 *
 * Design notes:
 * - Defaults are defined as a constant object.
 * - Builder returns a new top-level object reference.
 */

/* -------------------------------- Constants -------------------------------- */
/**
 * defaultModbusRtuSettings
 *
 * Default Modbus RTU settings used by AddLoggerForm.
 *
 * Notes:
 * - `slaves` default to an empty array and are configured via
 *   Modbus RTU–specific tabs.
 */

export const defaultModbusRtuSettings: ModbusRTUSettings = {
  port: {
    port: "",
    baudrate: 9600,
    databits: 8,
    parity: "None",
    stopbits: 1,
    flowcontrol: "None",
    autoconnect: false,
    timeout: 1,
  },
  poll_interval: 1,
  slaves: [],
};

/* -------------------------------- Helpers -------------------------------- */
/**
 * buildModbusRtuConfigDefault
 *
 * Returns a default Modbus RTU settings object
 * for form initialization.
 *
 * Notes:
 * - Returns a shallow copy of `defaultModbusRtuSettings`.
 */

export function buildModbusRtuConfigDefault(): ModbusRTUSettings {
  return { ...defaultModbusRtuSettings };
}
