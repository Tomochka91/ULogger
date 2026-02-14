import { useCallback, useMemo, useRef } from "react";

import { createLoggerDefaultValues } from "../../components/form/AddLoggerForm/loggerDefaults";
import { LoggerFormStateContext } from "./loggerFormContext";
import type { UsedLoggerType } from "../../components/form/AddLoggerForm/loggerRegistry";
import type { LoggerFormValues } from "../../components/form/AddLoggerForm/loggerForm.types";

/**
 * src/shared/context/addLoggerForm/LoggerFormStateProvider.tsx
 *
 * Logger form draft provider.
 *
 * This provider stores a persisted snapshot ("draft") of Add/Edit Logger form values
 * so the form can survive:
 * - route/page navigation
 * - component unmount/mount
 * - tab switching (depending on provider placement)
 *
 * IMPORTANT: This provider does NOT use React state for draft storage.
 * It uses a ref (`useRef`) to avoid triggering global re-renders on every field change.
 *
 * Public API (via LoggerFormStateContext):
 * - getDraft(): returns the latest persisted form values
 * - setDraft(values): updates the persisted draft snapshot
 *
 * Responsibilities:
 * - Initialize draft values using registry defaults
 * - Persist the latest form snapshot in memory (ref)
 * - Expose stable `getDraft` / `setDraft` functions through context
 *
 * Initialization:
 * - Default draft is created via `createLoggerDefaultValues(DEFAULT_LOGGER_TYPE)`
 *
 * Performance notes:
 * - Storing draft in `useRef` prevents provider value changes when the draft updates.
 * - `setDraft` updates only `draftRef.current` (no re-render).
 * - `ctxValue` is memoized and remains stable, so consumers are not re-rendered
 *   due to draft updates.
 * - Draft updates should be throttled/debounced outside (see DraftSaver).
 *
 * Persistence scope:
 * - The lifetime of the draft equals the lifetime of this provider instance.
 * - Mount this provider at the route/page level if you want drafts to survive
 *   between internal tab navigation, but reset on full app reload.
 */

const DEFAULT_LOGGER_TYPE: UsedLoggerType = "easy_serial";

/**
 * LoggerFormPersistedState
 *
 * Internal ref-backed container for the persisted form draft.
 * Wrapped as an object to keep the structure extensible.
 */

export type LoggerFormPersistedState = {
  values: LoggerFormValues;
};

export function LoggerFormStateProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const draftRef = useRef<LoggerFormPersistedState>({
    values: createLoggerDefaultValues(DEFAULT_LOGGER_TYPE),
  });

  const setDraft = useCallback((values: LoggerFormValues) => {
    draftRef.current = { values };
  }, []);

  const getDraft = useCallback(() => draftRef.current.values, []);

  const ctxValue = useMemo(
    () => ({ getDraft, setDraft }),
    [getDraft, setDraft],
  );

  return (
    <LoggerFormStateContext.Provider value={ctxValue}>
      {children}
    </LoggerFormStateContext.Provider>
  );
}
