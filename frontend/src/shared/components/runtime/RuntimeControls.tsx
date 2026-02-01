import { Box } from "@mui/material";

import { StartButton } from "../ui/button/StartButton";
import { StopButton } from "../ui/button/StopButton";
import { RestartButton } from "../ui/button/RestartButton";

/**
 * src/shared/components/runtime/RuntimeControls.tsx
 *
 * Runtime lifecycle control panel for a logger worker.
 *
 * Responsibilities:
 * - Provide UI controls to manage logger runtime lifecycle
 * - Expose Start / Stop / Restart actions
 * - Reflect in-progress states via loading indicators
 * - Respect a global disabled state when no logger is selected
 *
 * Design notes:
 * - This component is purely presentational
 * - It does not contain any runtime or API logic
 * - All behavior is delegated to callback props
 *
 * Composition:
 * - StartButton   : starts the logger worker
 * - StopButton    : stops the logger worker
 * - RestartButton : restarts the logger worker
 *
 * Layout:
 * - Uses MUI Box for horizontal layout
 * - Spacing is controlled via CSS variable (`--gap-standart`)
 */

/* --------------------------------- Props ---------------------------------- */
/**
 * RuntimeControlsProps
 *
 * @property disabled      - Disables all controls (e.g. when no logger selected)
 * @property isStarting    - Shows loading state on Start button
 * @property isStopping    - Shows loading state on Stop button
 * @property isRestarting  - Shows loading state on Restart button
 * @property onStart       - Callback invoked when Start is clicked
 * @property onStop        - Callback invoked when Stop is clicked
 * @property onRestart     - Callback invoked when Restart is clicked
 */

type RuntimeControlsProps = {
  disabled: boolean;
  isStarting: boolean;
  isStopping: boolean;
  isRestarting: boolean;
  onStart: () => void;
  onStop: () => void;
  onRestart: () => void;
};

/* ------------------------------ Component ---------------------------------- */
export function RuntimeControls({
  disabled,
  isStarting,
  isStopping,
  isRestarting,
  onStart,
  onStop,
  onRestart,
}: RuntimeControlsProps) {
  return (
    <Box display="flex" gap="var(--gap-standart)">
      <StartButton onClick={onStart} loading={isStarting} disabled={disabled} />
      <StopButton onClick={onStop} loading={isStopping} disabled={disabled} />
      <RestartButton
        onClick={onRestart}
        loading={isRestarting}
        disabled={disabled}
      />
    </Box>
  );
}
