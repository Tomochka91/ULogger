/**
 * src/shared/utils/formatArguments.ts
 *
 * Turns console-like arguments into a readable text string.
 *
 * Responsibilities:
 * - Combines multiple values into a single message
 * - Formats errors and objects in a readable way
 * - Does not crash on complex or broken objects
 *
 * Common use cases:
 * - Formatting arguments passed to `console.log`, `console.warn`, `console.error`
 * - Preparing debug messages for logging or UI display
 *
 * Formatting rules:
 * - Error:
 *   - Includes error name, message, and stack trace
 * - Object:
 *   - Pretty-printed JSON with indentation when possible
 *   - Falls back to a placeholder string if serialization fails
 * - Other values:
 *   - Converted using `String(...)`
 *
 * @param args - List of values to format
 * @returns A single formatted string containing all arguments
 */

export function formatArgs(args: unknown[]): string {
  return args
    .map((arg) => {
      if (arg instanceof Error) {
        return `${arg.name}: ${arg.message}\n${arg.stack}`;
      }

      if (typeof arg === "object" && arg !== null) {
        try {
          return JSON.stringify(arg, null, 2);
        } catch {
          return "[Unserializable object]";
        }
      }

      return String(arg);
    })
    .join(" ");
}
