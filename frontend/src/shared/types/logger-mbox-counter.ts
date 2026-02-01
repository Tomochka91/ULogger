import type { SerialPortSettings } from "./serial-port";

/**
 * External counter device description for MBox counter logger.
 */
export type MboxCounterDevices = {
  device_id: number;
  name: string;
  serial: number;
  enabled: boolean;
};

/**
 * Settings for MBox external counter logger.
 */
export type MboxCounterSettings = {
  port: SerialPortSettings;
  poll_interval: number;
  devices: MboxCounterDevices[];
};
