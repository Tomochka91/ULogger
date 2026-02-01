import type { SerialPortSettings } from "./serial-port";

/**
 * MBox logger settings.
 *
 * Describes how weight data is read, validated, and handled.
 */
export type MboxSettings = {
  port: SerialPortSettings;
  mbox_id: number;
  tare: number;
  treat_zero_as_error: boolean;
  treat_duplicate_as_error: boolean;
  error_label_zero: string;
  error_label_duplicate: string;
  encoding: string;
  ext_counter: boolean;
  counter_connection_id: number | null;
  counter_device_id: number | null;
  counter_clean_timeout: number;
  counter_miss_timeout: number;
  miss_strategy: "last" | "default";
  miss_insert_limit: number;
  miss_error_label: string;
  miss_default: MboxMissDefault;
};

/**
 * Default values used when packets are missing.
 */
type MboxMissDefault = {
  fish_name: string;
  fish_grade: string;
  n_weight: string;
  r_weight: string;
  sn: string;
};

/**
 * Available external counters for MBox.
 *
 * Returned by the backend to populate counter selection UI.
 */
export type MboxAvailableCounters = {
  success: boolean;
  data: {
    counter_connection_id: number;
    counter_connection_name: string;
    device_id: number;
    device_name: string;
    serial: number;
    runtime_state: string;
    total_count: number;
  }[];
};
