import type { EasySerialSettings } from "./logger-easy-serial";
import type { MboxSettings } from "./logger-mbox";
import type { MboxCounterSettings } from "./logger-mbox-counter";
import type { ModbusRTUSettings, ModbusTCPSettings } from "./logger-modbus";

/**
 * All supported logger types in the app.
 *
 * Used as a discriminator for logger settings and UI forms.
 */
export type LoggerTypeRegistry =
  | "easy_serial"
  | "mbox"
  | "modbus_rtu"
  | "modbus_tcp"
  | "mbox_counter";

/**
 * Common fields shared by all logger configurations.
 *
 * Notes:
 * - `id` is optional for new loggers (before saving)
 * - DB fields are nullable because some loggers may not use DB output
 */
export type LoggerBase = {
  id?: number;
  name: string;
  type: LoggerTypeRegistry;
  autostart: boolean;
  db_user: string | null;
  db_password: string | null;
  table_name: string | null;
  enabled: boolean;
  query_template: string | null;
};

/**
 * Easy Serial logger configuration.
 *
 * Only `easy_serial` is populated; other settings are `null`.
 */
export type EasySerialLogger = LoggerBase & {
  type: "easy_serial";
  easy_serial: EasySerialSettings;
  modbus_rtu: null;
  modbus_tcp: null;
  mbox: null;
  mbox_counter: null;
};

/**
 * Modbus RTU logger configuration.
 *
 * Only `modbus_rtu` is populated; other settings are `null`.
 */
export type ModbusRtuLogger = LoggerBase & {
  type: "modbus_rtu";
  modbus_rtu: ModbusRTUSettings;
  easy_serial: null;
  modbus_tcp: null;
  mbox: null;
  mbox_counter: null;
};

/**
 * Modbus TCP logger configuration.
 *
 * Only `modbus_tcp` is populated; other settings are `null`.
 */
export type ModbusTcpLogger = LoggerBase & {
  type: "modbus_tcp";
  modbus_tcp: ModbusTCPSettings;
  easy_serial: null;
  modbus_rtu: null;
  mbox: null;
  mbox_counter: null;
};

/**
 * MBox logger configuration.
 *
 * Only `mbox` is populated; other settings are `null`.
 */
export type MboxLogger = LoggerBase & {
  type: "mbox";
  mbox: MboxSettings;
  modbus_tcp: null;
  easy_serial: null;
  modbus_rtu: null;
  mbox_counter: null;
};

/**
 * MBox external counter logger configuration.
 *
 * Only `mbox_counter` is populated; other settings are `null`.
 */
export type MboxCounterLogger = LoggerBase & {
  type: "mbox_counter";
  mbox_counter: MboxCounterSettings;
  mbox: null;
  modbus_tcp: null;
  easy_serial: null;
  modbus_rtu: null;
};

/**
 * Logger shape returned by the API.
 *
 * Discriminated union by `type`.
 */
export type Logger =
  | EasySerialLogger
  | ModbusRtuLogger
  | ModbusTcpLogger
  | MboxLogger
  | MboxCounterLogger;

/**
 * List of loggers returned by the API.
 */
export type LoggerList = Logger[];

/**
 * Runtime logs response for a specific logger.
 */
export type LogsMessage = {
  success: boolean;
  data: {
    conn_id: number;
    name: string;
    registered: boolean;
    messages: string[];
    errors: string[];
  };
  error: string;
};

/**
 * Runtime metrics response for a specific logger.
 */
export type MetricsMessage = {
  success: boolean;
  data: {
    conn_id: number;
    registered: boolean;
    metrics: Record<string, number>;
    extra: Record<string, number>;
  };
};

/**
 * Runtime worker state for a logger connection.
 */
export type LoggerStateType =
  | "created"
  | "running"
  | "stopping"
  | "stopped"
  | "error";

/**
 * Runtime status response for a logger connection.
 */
export type LoggerStatus = {
  success: boolean;
  data: {
    conn_id: number;
    name: string;
    enabled: false;
    registered: boolean;
    state: LoggerStateType;
    last_error: string | null;
  } | null;
  error: string | null;
};
