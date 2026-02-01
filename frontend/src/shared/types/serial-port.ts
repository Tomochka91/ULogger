/**
 * Serial port connection settings.
 *
 * Used by serial-based loggers (Easy Serial, Modbus RTU, MBox, etc.).
 */
export type SerialPortSettings = {
  port: string;
  baudrate: number;
  databits: number;
  parity: string;
  stopbits: number;
  flowcontrol: string;
  autoconnect: boolean;
  timeout: number;
};

/**
 * Information about an available serial port.
 *
 * Used for port selection in UI.
 */
export type SerialPort = {
  name: string;
  description: string;
  hwid: string;
};
