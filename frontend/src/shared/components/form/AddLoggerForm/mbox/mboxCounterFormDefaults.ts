import type { MboxCounterSettings } from "../../../../types/logger-mbox-counter";

/**
 * src/shared/components/form/AddLoggerForm/mbox/mboxCounterFormDefaults.ts
 *
 * MBox Counter form defaults.
 *
 * This module defines default settings for the MBox Counter logger form.
 * Defaults are used when creating a new logger or initializing
 * missing configuration sections.
 *
 * Responsibilities:
 * - Provide a canonical default configuration for MBox Counter
 * - Expose a helper builder function for form initialization
 *
 * Data model:
 * - Produces `MboxCounterSettings`:
 *   - port: serial port configuration
 *   - poll_interval: polling interval in seconds
 *   - devices: list of counter devices
 *
 * Design notes:
 * - Defaults are defined in a constant object.
 * - Builder returns a new top-level object reference.
 */

/* -------------------------------- Constants -------------------------------- */
/**
 * defaultMboxCounterSettings
 *
 * Default MBox Counter settings used by AddLoggerForm.
 *
 * Notes:
 * - devices default to an empty array and are configured via DevicesTab.
 */

export const defaultMboxCounterSettings: MboxCounterSettings = {
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
  devices: [],
};

/* -------------------------------- Helpers -------------------------------- */
/**
 * buildMboxCounterConfigDefault
 *
 * Returns a default MBox Counter settings object
 * for form initialization.
 *
 * Notes:
 * - Returns a shallow copy of `defaultMboxCounterSettings`.
 */

export function buildMboxCounterConfigDefault(): MboxCounterSettings {
  return { ...defaultMboxCounterSettings };
}
