import type { SerialPortSettings } from "./serial-port";

/**
 * Supported Modbus variable encoding formats.
 *
 * Includes signed/unsigned integers, floats, byte orders,
 * and optional scaling.
 */
export type ModbusEncodingType =
  | "u16"
  | "s16"
  | "u16_scaled"
  | "s16_scaled"
  | "u32_abcd"
  | "u32_cdab"
  | "s32_abcd"
  | "s32_cdab"
  | "u32_scaled_abcd"
  | "u32_scaled_cdab"
  | "s32_scaled_abcd"
  | "s32_scaled_cdab"
  | "f32_abcd"
  | "f32_cdab"
  | "f32_scaled_abcd"
  | "f32_scaled_cdab";

/**
 * Single Modbus variable definition.
 */
export type ModbusVariable = {
  name: string;
  address: number;
  encoding: ModbusEncodingType;
  k: number;
  b: number;
  default: number | null;
};

/**
 * Modbus slave configuration.
 */
export type ModbusSlave = {
  slave_name: string;
  slave_id: number;
  variables: ModbusVariable[];
};

/**
 * Modbus TCP host configuration.
 */
export type ModbusHost = {
  address: string;
  port: number;
  autoconnect: boolean;
  timeout: number;
};

/**
 * Modbus RTU logger settings.
 */
export type ModbusRTUSettings = {
  port: SerialPortSettings;
  poll_interval: number;
  slaves: ModbusSlave[];
};

/**
 * Modbus TCP logger settings.
 */
export type ModbusTCPSettings = {
  host: ModbusHost;
  poll_interval: number;
  slaves: ModbusSlave[];
};
