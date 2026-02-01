import type { LoggerBase } from "../../../types";
import type { LoggerFormValues } from "./loggerForm.types";
import {
  LOGGER_CONFIG_BUILDERS,
  USED_LOGGERS,
  type UsedLoggerType,
} from "./loggerRegistry";

/**
 * src/shared/components/form/AddLoggerForm/loggerDefaults.ts
 *
 * Logger form default values and helpers.
 *
 * This module builds initial form values for AddLoggerForm
 * based on selected logger type.
 *
 * Main idea:
 * - Common logger fields are shared across all logger types
 * - Logger-specific configs are generated via registry builders
 * - Only the selected logger type gets its config;
 *   all other configs are set to null
 */

/* -------------------------------- Constants -------------------------------- */
/**
 * MBOX_DEFAULT_QUERY_TEMPLATE
 *
 * Default SQL template used for MBox logger.
 *
 * Notes:
 * - Injected automatically when logger type is "mbox"
 * - Uses placeholder-based substitution on backend side
 */

export const MBOX_DEFAULT_QUERY_TEMPLATE =
  "INSERT INTO storehouse_view VALUES (DEFAULT, DEFAULT, DEFAULT, {mbox_id}, {on_error}, NULL, {created_at}, {fish_name}, {fish_grade}, {lot}, {n_weight}, {r_weight}, {sn}, {error_info}, {tare});";

/**
 * defaultLoggerCommonFields
 *
 * Base fields shared by all logger types.
 *
 * These values form the foundation of LoggerFormValues
 * regardless of the specific logger implementation.
 */

export const defaultLoggerCommonFields: LoggerBase = {
  name: "",
  type: "easy_serial",
  autostart: false,
  db_user: "",
  db_password: "",
  table_name: "",
  enabled: false,
  query_template: "",
};

/* -------------------------------- Types -------------------------------- */
/**
 * LoggerFormDefaultsMap
 *
 * Maps logger type → corresponding form value shape.
 *
 * Used to preserve correct typing when building defaults
 * for a specific logger type.
 */

type LoggerFormDefaultsMap = {
  [K in UsedLoggerType]: Extract<LoggerFormValues, { type: K }>;
};

/* -------------------------------- Helpers -------------------------------- */
/**
 * createLoggerDefaultValues
 *
 * Builds initial form values for the selected logger type.
 *
 * Logic:
 * 1. Start with common logger fields
 * 2. Override `type`
 * 3. Inject default SQL template for MBox logger
 * 4. Generate config for the selected logger type
 * 5. Set configs for all other logger types to null
 *
 * Result:
 * - Form state contains exactly one active logger config
 * - All unused logger configs are explicitly null
 */

export function createLoggerDefaultValues<T extends UsedLoggerType>(
  type: T,
): LoggerFormDefaultsMap[T] {
  /**
   * Base logger fields.
   * `query_template` is overridden only for MBox logger.
   */
  const base: LoggerBase & { type: T } = {
    ...defaultLoggerCommonFields,
    type,
    query_template:
      type === "mbox"
        ? MBOX_DEFAULT_QUERY_TEMPLATE
        : defaultLoggerCommonFields.query_template,
  };

  /**
   * Logger-specific configs container.
   *
   * Only one config (matching `type`) will be populated.
   * All others are explicitly set to null.
   */
  const configs: Partial<Record<UsedLoggerType, unknown>> = {};

  USED_LOGGERS.forEach((loggerType) => {
    if (loggerType === type) {
      const buildConfig = LOGGER_CONFIG_BUILDERS[loggerType] as () => unknown;
      configs[loggerType] = buildConfig();
    } else {
      configs[loggerType] = null;
    }
  });

  /**
   * Final form defaults:
   * - common fields
   * - selected logger config
   * - nulls for all other logger configs
   */
  return {
    ...base,
    ...(configs as Record<UsedLoggerType, unknown>),
  } as LoggerFormDefaultsMap[T];
}
