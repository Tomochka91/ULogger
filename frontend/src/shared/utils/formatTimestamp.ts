import { format } from "date-fns";

/**
 * Formats a Date object into a short, readable timestamp string.
 *
 * - Uses a compact `yy/MM/dd HH:mm:ss` format
 * - Intended for logs, debug output, and UI timestamps
 *
 * @param input - Date to format
 * @returns Formatted timestamp string
 */

export function formatTimestamp(input: Date): string {
  const formatted = format(input, "yy/MM/dd HH:mm:ss");

  return formatted;
}
