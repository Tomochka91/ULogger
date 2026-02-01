import { BsPause, BsPlay } from "react-icons/bs";
import { AppButton } from "./AppButton";

/**
 * Toggle button for debug log autoscroll.
 *
 * - Built on top of AppButton
 * - Reflects current state via icon, label, and variant
 * - Calls `onToggle` when clicked
 *
 * Props:
 * - autoscroll: current autoscroll state
 * - onToggle: callback to toggle autoscroll
 */

type AutoscrollButtonProps = {
  autoscroll: boolean;
  onToggle: () => void;
};

export function AutoscrollButton({
  autoscroll,
  onToggle,
}: AutoscrollButtonProps) {
  const isOn = autoscroll;

  return (
    <AppButton
      variant={isOn ? "contained" : "outlined"}
      startIcon={isOn ? <BsPause color="var(--color-gunmetal)" /> : <BsPlay />}
      onClick={onToggle}
      sx={{
        justifyContent: "space-between",
        minWidth: "22rem",
        "&:hover": {
          bgcolor: "var(--color-tropical-mint)",
        },
        ...(isOn
          ? {
              backgroundColor: "var(--color-tropical-mint)",
              "&:hover": {
                bgcolor: "var(--color-lemon-chiffon)",
              },
            }
          : {}),
      }}
    >
      Autoscroll: {isOn ? "On" : "Off"}
    </AppButton>
  );
}
