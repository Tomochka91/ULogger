import type { ModbusTCPSettings } from "../../../../types";

/**
 * src/shared/components/form/AddLoggerForm/modbus/modbusTcpFormDefaults.ts
 *
 * Modbus TCP form defaults.
 *
 * This module defines default settings for the Modbus TCP logger form.
 * Defaults are used when creating a new Modbus TCP logger or when
 * initializing missing configuration sections.
 *
 * Responsibilities:
 * - Provide a canonical default configuration for Modbus TCP
 * - Expose a helper builder function for form initialization
 *
 * Data model:
 * - Produces `ModbusTCPSettings`:
 *   - host: TCP connection settings
 *   - poll_interval: polling interval in seconds
 *   - slaves: list of Modbus slave configurations
 *
 * Design notes:
 * - Defaults are defined as a constant object.
 * - Builder returns a new top-level object reference.
 */

/* -------------------------------- Constants -------------------------------- */
/**
 * defaultModbusTcpSettings
 *
 * Default Modbus TCP settings used by AddLoggerForm.
 *
 * Notes:
 * - `address` defaults to "0.0.0.0" as a placeholder.
 * - `slaves` default to an empty array and are configured via
 *   Modbus TCP–specific tabs.
 */

export const defaultModbusTcpSettings: ModbusTCPSettings = {
  host: {
    address: "0.0.0.0",
    port: 1502,
    autoconnect: true,
    timeout: 0.5,
  },
  poll_interval: 0.5,
  slaves: [],
};

/* -------------------------------- Helpers -------------------------------- */
/**
 * buildModbusTcpConfigDefault
 *
 * Returns a default Modbus TCP settings object
 * for form initialization.
 *
 * Notes:
 * - Returns a shallow copy of `defaultModbusTcpSettings`.
 */

export function buildModbusTcpConfigDefault(): ModbusTCPSettings {
  return { ...defaultModbusTcpSettings };
}
