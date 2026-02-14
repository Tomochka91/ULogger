import type { MboxSettings } from "../../../../types/logger-mbox";

/**
 * src/shared/components/form/AddLoggerForm/mbox/mboxFormDefaults.ts
 *
 * MBox logger form defaults.
 *
 * This module defines default settings for the MBox logger form.
 * Defaults are used when creating a new MBox logger or initializing
 * missing configuration sections.
 *
 * Responsibilities:
 * - Provide canonical default settings for MBox logger
 * - Expose helper builder for form initialization
 * - Expose a subset of defaults related to external counter integration
 *
 * Data model:
 * - Produces `MboxSettings`, including:
 *   - serial port configuration
 *   - processing parameters (tare, encoding, error handling)
 *   - external counter integration settings
 *   - miss handling strategy and defaults
 *
 * Design notes:
 * - Defaults are centralized here to keep form initialization consistent.
 * - Some defaults are also re-exported separately for counter-related logic.
 */

/* -------------------------------- Constants -------------------------------- */
/**
 * defaultMboxSettings
 *
 * Default MBox settings used by AddLoggerForm.
 *
 * Notes:
 * - `miss_default` defines fallback values inserted
 *   when packets are missing or invalid.
 * - External counter integration is disabled by default.
 */

export const defaultMboxSettings: MboxSettings = {
  port: {
    port: "",
    baudrate: 9600,
    databits: 8,
    parity: "None",
    stopbits: 1,
    flowcontrol: "None",
    autoconnect: false,
    timeout: 0.5,
  },
  mbox_id: 1,
  tare: 0.5,
  treat_zero_as_error: true,
  treat_duplicate_as_error: true,
  error_label_zero: "no weight",
  error_label_duplicate: "no weight",
  encoding: "ascii",
  ext_counter: false,
  counter_connection_id: null,
  counter_device_id: null,
  counter_clean_timeout: 6.5,
  counter_miss_timeout: 4.5,
  miss_strategy: "last",
  miss_default: {
    fish_name: "",
    fish_grade: "",
    n_weight: "",
    r_weight: "",
    sn: "",
  },
  miss_insert_limit: 1,
  miss_error_label: "scales error",
};

/* -------------------------------- Helpers -------------------------------- */
/**
 * buildMboxConfigDefault
 *
 * Returns a default MBox settings object for form initialization.
 *
 * Notes:
 * - Returns a shallow copy of `defaultMboxSettings`.
 */

export function buildMboxConfigDefault(): MboxSettings {
  return { ...defaultMboxSettings };
}

/**
 * MBOX_COUNTER_DEFAULTS
 *
 * Subset of MBox defaults related to external counter integration.
 *
 * Used when enabling or resetting external counter settings
 * without touching unrelated MBox configuration.
 */

export const MBOX_COUNTER_DEFAULTS = {
  counter_connection_id: defaultMboxSettings.counter_connection_id,
  counter_device_id: defaultMboxSettings.counter_device_id,
  counter_clean_timeout: defaultMboxSettings.counter_clean_timeout,
  counter_miss_timeout: defaultMboxSettings.counter_miss_timeout,
  miss_strategy: defaultMboxSettings.miss_strategy,
  miss_insert_limit: defaultMboxSettings.miss_insert_limit,
  miss_error_label: defaultMboxSettings.miss_error_label,
};
