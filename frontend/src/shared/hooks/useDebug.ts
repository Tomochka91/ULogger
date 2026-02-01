import { useContext } from "react";

import { DebugContext } from "../context/debug/debugContext";

/**
 * src/shared/hooks/useDebug.ts
 *
 * Convenience hook for consuming DebugContext.
 *
 * Responsibilities:
 * - Provide a single, typed access point to DebugContext
 * - Enforce correct usage by throwing a clear error when used
 *   outside of a DebugProvider
 *
 * Usage:
 *   const { messages, autoscroll, pushMessage } = useDebug();
 *
 * Errors:
 * - Throws if DebugContext is undefined, which usually means the component
 *   is rendered outside of <DebugProvider>.
 */

export function useDebug() {
  const context = useContext(DebugContext);
  if (!context) throw new Error("useDebug must be used inside DebugProvider");
  return context;
}
