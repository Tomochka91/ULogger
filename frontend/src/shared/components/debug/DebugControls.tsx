import { Stack } from "@mui/material";

import { ResetButton } from "../ui/button/ResetButton";
import { AutoscrollButton } from "../ui/button/AutoscrollButton";

/**
 * src/shared/components/debug/DebugControls.tsx
 *
 * Control panel for the Debug page.
 *
 * Responsibilities:
 * - Provide user actions related to debug log management
 * - Expose controls for clearing logs and toggling autoscroll behavior
 *
 * Design notes:
 * - This component is purely presentational
 * - It does not own any state or business logic
 * - All behavior is delegated via callback props
 *
 * Composition:
 * - ClearButton: clears all accumulated debug messages
 * - AutoscrollButton: toggles automatic scrolling in the log view
 *
 * Layout:
 * - Uses MUI Stack for horizontal alignment and spacing
 * - Controls are spaced to opposite ends for visual balance
 */

/* --------------------------------- Props ---------------------------------- */
/**
 * DebugControlsProps
 *
 * @property autoscroll          - Current autoscroll state
 * @property onToggleAutoscroll  - Callback to toggle autoscroll
 * @property onClear             - Callback to clear all debug messages
 */

type DebugControlsProps = {
  autoscroll: boolean;
  onToggleAutoscroll: () => void;
  onClear: () => void;
};

/* ------------------------------ Component ---------------------------------- */
export function DebugControls({
  autoscroll,
  onToggleAutoscroll,
  onClear,
}: DebugControlsProps) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center">
      <ResetButton onClick={onClear} label="Clear logs" />
      <AutoscrollButton onToggle={onToggleAutoscroll} autoscroll={autoscroll} />
    </Stack>
  );
}
