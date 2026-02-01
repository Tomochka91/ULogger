import type {
  EasySerialSettings,
  LoggerBase,
  ModbusRTUSettings,
  ModbusTCPSettings,
} from "../../../types";
import type { MboxSettings } from "../../../types/logger-mbox";
import type { MboxCounterSettings } from "../../../types/logger-mbox-counter";

/**
 * src/shared/components/form/AddLoggerForm/loggerForm.types.ts
 *
 * AddLoggerForm discriminated union types.
 *
 * This module defines the form value shape for each logger type.
 *
 * Key idea:
 * - Form state always contains common LoggerBase fields
 * - Exactly one logger config is "active" (non-null) depending on `type`
 * - All other logger configs are explicitly null
 *
 * Why this is useful:
 * - TypeScript can narrow the form type by checking `type`
 * - UI tabs/components can safely assume the correct config exists
 * - Prevents accidentally mixing configs from different logger types
 */

/* -------------------------------- Types -------------------------------- */
/**
 * EasySerialLoggerFormType
 *
 * Active config: easy_serial
 * All other logger configs: null
 */

export type EasySerialLoggerFormType = LoggerBase & {
  type: "easy_serial";
  easy_serial: EasySerialSettings;
  modbus_rtu: null;
  modbus_tcp: null;
  mbox: null;
  mbox_counter: null;
};

/**
 * ModbusRtuLoggerFormType
 *
 * Active config: modbus_rtu
 * All other logger configs: null
 */

export type ModbusRtuLoggerFormType = LoggerBase & {
  type: "modbus_rtu";
  modbus_rtu: ModbusRTUSettings;
  easy_serial: null;
  modbus_tcp: null;
  mbox: null;
  mbox_counter: null;
};

/**
 * ModbusTcpLoggerFormType
 *
 * Active config: modbus_tcp
 * All other logger configs: null
 */

export type ModbusTcpLoggerFormType = LoggerBase & {
  type: "modbus_tcp";
  modbus_tcp: ModbusTCPSettings;
  modbus_rtu: null;
  easy_serial: null;
  mbox: null;
  mbox_counter: null;
};

/**
 * MboxLoggerFormType
 *
 * Active config: mbox
 * All other logger configs: null
 */

export type MboxLoggerFormType = LoggerBase & {
  type: "mbox";
  mbox: MboxSettings;
  modbus_tcp: null;
  modbus_rtu: null;
  easy_serial: null;
  mbox_counter: null;
};

/**
 * MboxCounterLoggerFormType
 *
 * Active config: mbox_counter
 * All other logger configs: null
 */

export type MboxCounterLoggerFormType = LoggerBase & {
  type: "mbox_counter";
  mbox_counter: MboxCounterSettings;
  mbox: null;
  modbus_tcp: null;
  modbus_rtu: null;
  easy_serial: null;
};

/**
 * LoggerFormValues
 *
 * Union of all logger form shapes.
 *
 * Typical pattern:
 * - if (values.type === "mbox") { values.mbox is guaranteed non-null }
 * - values.easy_serial / values.modbus_* / values.mbox_counter remain null
 */

export type LoggerFormValues =
  | EasySerialLoggerFormType
  | ModbusRtuLoggerFormType
  | ModbusTcpLoggerFormType
  | MboxLoggerFormType
  | MboxCounterLoggerFormType;
