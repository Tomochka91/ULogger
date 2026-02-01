import { useContext } from "react";

import { LoggerFormStateContext } from "../context/addLoggerForm/loggerFormContext";

/**
 * src/shared/hooks/useLoggerFormState.ts
 *
 * Convenience hook for accessing logger form state context.
 *
 * Responsibilities:
 * - Provide typed access to LoggerFormStateContext
 * - Enforce correct usage within LoggerFormStateProvider
 *
 * Usage:
 *   const formState = useLoggerFormState();
 *
 * Errors:
 * - Throws if used outside of <LoggerFormStateProvider>
 */

export function useLoggerFormState() {
  const context = useContext(LoggerFormStateContext);
  if (!context) {
    throw new Error(
      "useLoggerFormState must be used within LoggerFormStateProvider",
    );
  }

  return context;
}
