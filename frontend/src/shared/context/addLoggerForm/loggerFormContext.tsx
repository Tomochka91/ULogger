import React, { createContext } from "react";

import { type LoggerFormValues } from "../../components/form/AddLoggerForm/loggerForm.types";

/**
 * src/shared/context/addLoggerForm/loggerFormContext.tsx
 *
 * Logger form context definition.
 *
 * This module defines the persisted state shape for the Add/Edit Logger form
 * and exports a typed React Context instance.
 *
 * The context is responsible only for holding state and exposing a setter.
 * Business logic and mutations are expected to live in hooks or providers.
 *
 * Responsibilities:
 * - Define the persisted logger form state type
 * - Define the public context value shape (state + setter)
 * - Create and export a typed React context
 *
 * Design notes:
 * - The default context value is `undefined` to enforce correct usage.
 * - Consumers are expected to access this context via a custom hook
 *   (e.g. `useLoggerFormState()`), which should throw when the provider is missing.
 */

/* --------------------------------- Types ---------------------------------- */
/**
 * LoggerFormPersistedState
 *
 * Persisted snapshot of Add/Edit Logger form data.
 *
 * State:
 * - values: current form values compatible with AddLoggerForm
 *
 */

export type LoggerFormPersistedState = {
  values: LoggerFormValues;
};

/* -------------------------------- Context --------------------------------- */
/**
 * LoggerFormStateContext
 *
 * Typed React context used to share persisted logger form state.
 *
 * Exposes:
 * - state: current persisted form state
 * - setState: React state setter for updating persisted state
 *
 * Default value is `undefined` so consumers can detect missing provider.
 */

export const LoggerFormStateContext = createContext<
  | {
      state: LoggerFormPersistedState;
      setState: React.Dispatch<React.SetStateAction<LoggerFormPersistedState>>;
    }
  | undefined
>(undefined);
