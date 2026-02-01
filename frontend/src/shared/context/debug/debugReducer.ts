import type { DebugMessage } from "../../types/debug";

/**
 * src/shared/context/debug/debugReducer.ts
 *
 * Reducer and state model for the Debug context.
 *
 * Responsibilities:
 * - Define the DebugState shape (messages + autoscroll)
 * - Provide initial state defaults
 * - Implement a reducer handling the supported DebugAction set
 *
 * Design notes:
 * - The reducer is a pure function: no side effects, no mutations.
 * - Messages are appended in arrival order.
 * - Autoscroll is stored as a boolean UI preference.
 */

/* --------------------------------- State ---------------------------------- */
/**
 * DebugState
 * - messages: ordered list of debug messages
 * - autoscroll: whether UI log viewers should autoscroll to newest messages
 */

export interface DebugState {
  messages: DebugMessage[];
  autoscroll: boolean;
}

/**
 * Initial debug state.
 * - starts with an empty message list
 * - autoscroll enabled by default
 */

export const initialState: DebugState = {
  messages: [],
  autoscroll: true,
};

/* -------------------------------- Actions --------------------------------- */
/**
 * DebugAction
 * Supported reducer actions.
 *
 * - ADD_MESSAGE: appends a message to the end of the list
 * - CLEAR_MESSAGES: removes all messages
 * - TOGGLE_AUTOSCROLL: flips the autoscroll boolean
 */

export type DebugAction =
  | { type: "ADD_MESSAGE"; payload: DebugMessage }
  | { type: "CLEAR_MESSAGES" }
  | { type: "TOGGLE_AUTOSCROLL" };

/* -------------------------------- Reducer --------------------------------- */
/**
 * debugReducer
 * Pure reducer function for debug state updates.
 *
 * @param state  Current debug state
 * @param action Action to apply
 * @returns Updated debug state
 */

export function debugReducer(
  state: DebugState,
  action: DebugAction
): DebugState {
  switch (action.type) {
    case "ADD_MESSAGE":
      return { ...state, messages: [...state.messages, action.payload] };
    case "CLEAR_MESSAGES":
      return { ...state, messages: [] };
    case "TOGGLE_AUTOSCROLL":
      return { ...state, autoscroll: !state.autoscroll };
    default:
      return state;
  }
}
