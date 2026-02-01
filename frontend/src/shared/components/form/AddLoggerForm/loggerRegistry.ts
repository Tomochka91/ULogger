import { buildEasySerialConfigDefault } from "./easy-serial/easySerialFormDefaults";
import { buildMboxCounterConfigDefault } from "./mbox/mboxCounterFormDefaults";
import { buildMboxConfigDefault } from "./mbox/mboxFormDefaults";
import { buildModbusRtuConfigDefault } from "./modbus/modbusRtuFormDefaults";
import { buildModbusTcpConfigDefault } from "./modbus/modbusTcpFormDefaults";
import type {
  EasySerialSettings,
  ModbusRTUSettings,
  ModbusTCPSettings,
} from "../../../types";
import type { MboxSettings } from "../../../types/logger-mbox";
import type { MboxCounterSettings } from "../../../types/logger-mbox-counter";

/**
 * src/shared/components/form/AddLoggerForm/loggerRegistry.ts
 *
 * Logger registry and configuration builders.
 *
 * This module defines:
 * - the list of supported logger types
 * - a type-safe mapping between logger type and its config shape
 * - factory functions to build default configs for each logger
 *
 * Main purpose:
 * - Centralize logger type definitions
 * - Avoid switch/if chains when working with logger-specific configs
 * - Guarantee type safety between logger type and its settings
 */

/* -------------------------------- Constants -------------------------------- */
/**
 * USED_LOGGERS
 *
 * Ordered list of all supported logger types.
 *
 * Used to:
 * - Iterate over all loggers (e.g. when building form defaults)
 * - Derive the `UsedLoggerType` union
 *
 * Order is not important for logic, but should stay stable
 * for predictable form initialization.
 */

export const USED_LOGGERS = [
  "easy_serial",
  "modbus_rtu",
  "modbus_tcp",
  "mbox",
  "mbox_counter",
] as const;

/**
 * UsedLoggerType
 *
 * Union of all supported logger type strings.
 *
 * Example:
 *   "easy_serial" | "modbus_rtu" | "modbus_tcp" | "mbox" | "mbox_counter"
 */
export type UsedLoggerType = (typeof USED_LOGGERS)[number];

/* -------------------------------- Types -------------------------------- */
/**
 * LoggerConfigMap
 *
 * Maps logger type → corresponding settings type.
 *
 * This is the key piece that keeps the registry type-safe:
 * - if a new logger type is added,
 *   TypeScript forces updating this map
 */

type LoggerConfigMap = {
  easy_serial: EasySerialSettings;
  modbus_rtu: ModbusRTUSettings;
  modbus_tcp: ModbusTCPSettings;
  mbox: MboxSettings;
  mbox_counter: MboxCounterSettings;
};

/* -------------------------------- Registry -------------------------------- */
/**
 * LOGGER_CONFIG_BUILDERS
 *
 * Registry of factory functions that create default
 * configuration objects for each logger type.
 *
 * Used by:
 * - createLoggerDefaultValues
 *
 * Guarantees:
 * - each logger type has exactly one config builder
 * - builder return type matches logger settings type
 */

export const LOGGER_CONFIG_BUILDERS: {
  [K in UsedLoggerType]: () => LoggerConfigMap[K];
} = {
  easy_serial: buildEasySerialConfigDefault,
  modbus_rtu: buildModbusRtuConfigDefault,
  modbus_tcp: buildModbusTcpConfigDefault,
  mbox: buildMboxConfigDefault,
  mbox_counter: buildMboxCounterConfigDefault,
};
