import {
  useCallback,
  useEffect,
  useReducer,
  type PropsWithChildren,
} from "react";

import { debugReducer, initialState } from "./debugReducer";
import type {
  DebugMessage,
  DebugMessageLevel,
  DebugMessageSource,
} from "../../types/debug";
import { DebugContext, type DebugContextValue } from "./debugContext";
import { formatArgs } from "../../utils/formatArguments";

/**
 * src/shared/context/debug/debugProvider.ts
 *
 * Debug context provider implementation.
 *
 * This provider owns debug state (messages + autoscroll) and exposes
 * actions to mutate it via a reducer-driven state machine.
 *
 * Responsibilities:
 * - Manage debug state with `useReducer(debugReducer, initialState)`
 * - Provide stable action functions (push/clear/toggle)
 * - (Optional instrumentation) Intercept `console.log/warn/error` and mirror
 *   them into the debug message stream
 * - Expose the context value to all descendants via DebugContext.Provider
 *
 * State model:
 * - messages: appended in chronological order
 * - autoscroll: UI preference flag for log viewers
 *
 * Side effects:
 * - On mount: patch console methods to forward output into the debug stream
 * - On unmount: restore original console methods
 *
 * Notes:
 * - Message defaults are applied here (level="info", source="front").
 * - Timestamp is captured at creation time.
 */

export function DebugProvider({ children }: PropsWithChildren) {
  const [state, dispatch] = useReducer(debugReducer, initialState);

  /**
   * Append a new debug message to the store.
   *
   * @param payload.text   Message text (required)
   * @param payload.level  Optional message level (defaults to "info")
   * @param payload.source Optional message source (defaults to "front")
   */

  const pushMessage = useCallback(
    (payload: {
      text: string;
      level?: DebugMessageLevel;
      source?: DebugMessageSource;
    }) => {
      const msg: DebugMessage = {
        id: crypto.randomUUID(),
        text: payload.text,
        level: payload.level ?? "info",
        source: payload.source ?? "front",
        timestamp: new Date(),
      };

      dispatch({ type: "ADD_MESSAGE", payload: msg });
    },
    []
  );

  /**
   * Clear all accumulated debug messages.
   */
  const clearMessages = useCallback(() => {
    dispatch({ type: "CLEAR_MESSAGES" });
  }, []);

  /**
   * Toggle the autoscroll UI preference.
   */
  const toggleAutoscroll = useCallback(() => {
    dispatch({ type: "TOGGLE_AUTOSCROLL" });
  }, []);

  /**
   * Mirror console output into the debug log stream.
   *
   * - Preserves original console behavior by calling the original methods.
   * - Converts console arguments into a string using `formatArgs`.
   * - Restores original console functions on cleanup.
   */
  useEffect(() => {
    const origLog = console.log;
    const origWarn = console.warn;
    const origErr = console.error;

    console.log = (...args) => {
      origLog(...args);
      pushMessage({ text: formatArgs(args), level: "info" });
    };

    console.warn = (...args) => {
      origWarn(...args);
      pushMessage({ text: formatArgs(args), level: "warn" });
    };

    console.error = (...args) => {
      origErr(...args);
      pushMessage({ text: formatArgs(args), level: "error" });
    };

    return () => {
      console.log = origLog;
      console.warn = origWarn;
      console.error = origErr;
    };
  }, [pushMessage]);

  /**
   * Context value exposed to consumers through DebugContext.
   */
  const value: DebugContextValue = {
    messages: state.messages,
    autoscroll: state.autoscroll,

    pushMessage,
    clearMessages,
    toggleAutoscroll,
  };

  return (
    <DebugContext.Provider value={value}>{children}</DebugContext.Provider>
  );
}
