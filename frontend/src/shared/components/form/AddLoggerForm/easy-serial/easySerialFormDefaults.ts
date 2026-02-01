import type { EasySerialSettings } from "../../../../types";

/**
 * src/shared/components/form/AddLoggerForm/easy-serial/easySerialFormDefaults.ts
 *
 * EasySerial form defaults.
 *
 * This module defines default settings for the EasySerial logger form.
 * Defaults are used when creating a new logger or when initializing
 * missing settings in the form state.
 *
 * Responsibilities:
 * - Provide a canonical `defaultEasySerialSettings` object
 * - Provide a helper builder to create a default config instance
 *
 * Data model:
 * - Produces `EasySerialSettings`:
 *   - port: serial port configuration
 *   - parser: framing + field extraction configuration
 *
 * Design notes:
 * - Defaults are defined in a constant and returned by a builder function.
 * - Builder returns a new object reference for form initialization.
 */

/* -------------------------------- Constants -------------------------------- */
/**
 * defaultEasySerialSettings
 *
 * Default EasySerial settings used by AddLoggerForm.
 *
 * Notes:
 * - terminator is stored as escaped string ("\\n") to represent newline.
 * - fields default to empty array; user configures via FramerTab.
 */

export const defaultEasySerialSettings: EasySerialSettings = {
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
  parser: {
    preamble: "",
    terminator: "\\n",
    separator: ";",
    encoding: "utf-8",
    fields: [],
  },
};

/* -------------------------------- Helpers -------------------------------- */
/**
 * buildEasySerialConfigDefault
 *
 * Returns a default EasySerial settings object for form initialization.
 *
 * Notes:
 * - Returns a shallow copy of `defaultEasySerialSettings`
 *   (nested objects are shared).
 */

export function buildEasySerialConfigDefault(): EasySerialSettings {
  return { ...defaultEasySerialSettings };
}
