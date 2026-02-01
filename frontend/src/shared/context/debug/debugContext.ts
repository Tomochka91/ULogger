import { createContext } from "react";
import type {
  DebugMessage,
  DebugMessageLevel,
  DebugMessageSource,
} from "../../types/debug";

/**
 * src/shared/context/debug/debugContext.ts
 *
 * Debug context definition.
 *
 * This module defines the shape of the debug context (state + actions)
 * and exports a React Context instance used by the DebugProvider and
 * consumed via the `useDebug()` hook.
 *
 * Responsibilities:
 * - Define the public DebugContext API (`DebugContextValue`)
 * - Create and export a typed React context (`DebugContext`)
 *
 * Design notes:
 * - The default context value is `undefined` to enforce correct usage.
 * - Consumers should use the `useDebug()` hook, which throws a clear error
 *   when used outside of a DebugProvider.
 */

/* --------------------------------- Types ---------------------------------- */
/**
 * DebugContextValue
 * Public interface exposed through DebugContext.
 *
 * State:
 * - messages: accumulated debug messages
 * - autoscroll: UI preference for log autoscroll
 *
 * Actions:
 * - pushMessage: append a new debug message
 * - clearMessages: clear all messages
 * - toggleAutoscroll: invert autoscroll flag
 *
 * Payload defaults (applied in provider):
 * - level defaults to "info"
 * - source defaults to "front"
 */

export interface DebugContextValue {
  messages: DebugMessage[];
  autoscroll: boolean;

  pushMessage: (payload: {
    text: string;
    level?: DebugMessageLevel;
    source?: DebugMessageSource;
  }) => void;

  clearMessages: () => void;
  toggleAutoscroll: () => void;
}

/* -------------------------------- Context --------------------------------- */
/**
 * DebugContext
 * Typed React context used to share debug state/actions across the app.
 *
 * Default value is `undefined` so consumers can detect missing provider.
 */

export const DebugContext = createContext<DebugContextValue | undefined>(
  undefined
);
