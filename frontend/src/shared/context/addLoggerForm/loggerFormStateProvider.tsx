import { useState } from "react";

import { createLoggerDefaultValues } from "../../components/form/AddLoggerForm/loggerDefaults";
import {
  LoggerFormStateContext,
  type LoggerFormPersistedState,
} from "./loggerFormContext";
import type { UsedLoggerType } from "../../components/form/AddLoggerForm/loggerRegistry";

/**
 * src/shared/context/addLoggerForm/LoggerFormStateProvider.tsx
 *
 * Logger form state provider.
 *
 * This module implements a React Provider that owns and manages
 * persisted Add/Edit Logger form state.
 *
 * Responsibilities:
 * - Initialize logger form state using registry defaults
 * - Store persisted form values across component remounts
 * - Expose `{ state, setState }` via LoggerFormStateContext
 *
 * Typical usage:
 * - Wrap Add/Edit Logger routes or pages with this provider
 * - Consume state via LoggerFormStateContext or a custom hook
 *
 * Persistence scope:
 * - The lifetime of persisted state depends on where this provider
 *   is mounted in the component tree.
 */

/* -------------------------------- Constants -------------------------------- */
/**
 * DEFAULT_LOGGER_TYPE
 *
 * Logger type used to initialize form values when creating a new logger.
 *
 * Must be a valid type registered in the logger registry.
 */

const DEFAULT_LOGGER_TYPE: UsedLoggerType = "easy_serial";

/* -------------------------------- Provider -------------------------------- */
/**
 * LoggerFormStateProvider
 *
 * React provider component that owns persisted logger form state.
 *
 * Initialization:
 * - Uses lazy initialization to create default form values
 *   via `createLoggerDefaultValues(DEFAULT_LOGGER_TYPE)`
 *
 * State:
 * - values: current snapshot of logger form values
 *
 * Notes:
 * - Editing an existing logger should overwrite state explicitly
 *   after loading data from the backend.
 * - No business logic is implemented here by design.
 */

export function LoggerFormStateProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, setState] = useState<LoggerFormPersistedState>(() => ({
    values: createLoggerDefaultValues(DEFAULT_LOGGER_TYPE),
  }));

  return (
    <LoggerFormStateContext.Provider value={{ state, setState }}>
      {children}
    </LoggerFormStateContext.Provider>
  );
}
