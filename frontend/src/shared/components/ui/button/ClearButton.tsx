import { BsTrash } from "react-icons/bs";
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

type ClearButtonProps = {
  label?: string;
  onClick: () => void;
};

export function ClearButton({ label = "Reset", onClick }: ClearButtonProps) {
  return (
    <AppButton
      variant="outlined"
      startIcon={<BsTrash />}
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
