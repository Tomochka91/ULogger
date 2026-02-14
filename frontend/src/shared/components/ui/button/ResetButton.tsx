import { BsArrowRepeat } from "react-icons/bs";
import { AppButton } from "./AppButton";

/**
 * Button for clearing or resetting data.
 *
 * - Built on top of AppButton
 * - Displays a trash icon to indicate destructive/reset action
 * - Allows custom label text
 *
 * Props:
 * - label: optional button label (defaults to "Reset")
 * - onClick: callback invoked on button click
 */

type ResetButtonProps = {
  label?: string;
  onClick: () => void;
};

export function ResetButton({ label = "Reset", onClick }: ResetButtonProps) {
  return (
    <AppButton
      variant="outlined"
      startIcon={<BsArrowRepeat />}
      onClick={onClick}
      sx={{
        "&:hover": {
          bgcolor: "var(--color-lemon-chiffon)",
        },
      }}
    >
      {label}
    </AppButton>
  );
}
