/**
 * Source of a debug message.
 *
 * - "front": message originated from the frontend
 * - "back": message originated from the backend
 */
export type DebugMessageSource = "front" | "back";

/**
 * Severity level of a debug message.
 */
export type DebugMessageLevel = "info" | "warn" | "error";

/**
 * Debug message displayed in the Debug page.
 */
export interface DebugMessage {
  id: string;
  text: string;
  source: DebugMessageSource;
  level?: DebugMessageLevel;
  timestamp: Date;
}
