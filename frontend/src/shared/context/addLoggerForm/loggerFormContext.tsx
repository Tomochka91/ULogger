import { createContext } from "react";

import { type LoggerFormValues } from "../../components/form/AddLoggerForm/loggerForm.types";

/**
 * src/shared/context/addLoggerForm/loggerFormContext.tsx
 *
 * Logger form draft context definition.
 *
 * This module defines the persisted draft mechanism for the Add/Edit Logger form
 * and exports a typed React Context instance.
 *
 * The purpose of this context is to preserve form values between:
 * - tab navigation
 * - component unmount/mount
 * - page switches
 *
 * It does NOT expose raw React state anymore.
 * Instead, it provides an abstraction layer:
 * - getDraft(): returns the latest persisted form values
 * - setDraft(values): updates the persisted draft snapshot
 *
 * Responsibilities:
 * - Define the persisted draft value shape
 * - Define the public context API (getDraft / setDraft)
 * - Create and export a typed React context
 *
 * Architecture notes:
 * - Draft persistence is intentionally decoupled from React Hook Form
 *   internal state to prevent global re-renders on every field change.
 * - Draft updates are throttled/debounced externally (see DraftSaver).
 * - Consumers must use a custom hook (useLoggerFormState)
 *   to ensure the provider exists.
 *
 * Design decision:
 * - Default context value is `undefined` to enforce proper provider usage.
 * - The custom hook should throw if used outside LoggerFormStateProvider.
 */

export const LoggerFormStateContext = createContext<
  | {
      getDraft: () => LoggerFormValues;
      setDraft: (values: LoggerFormValues) => void;
    }
  | undefined
>(undefined);
