import type { SxProps, Theme } from "@mui/material/styles";

import { AppButton } from "./AppButton";
import { LoaderMini } from "../loader/LoaderMini";
import { Box } from "@mui/material";

/**
 * Button for testing connections or configurations.
 *
 * - Built on top of AppButton
 * - Supports loading and disabled states
 * - Commonly used in forms to validate settings before saving
 *
 * Props:
 * - loading: shows loader and disables the button
 * - disabled: disables the button
 * - onClick: callback invoked on button click
 * - label: optional button label (defaults to "Test connection")
 * - sx: optional style overrides
 */

type TestButtonProps = {
  loading?: boolean;
  disabled?: boolean;
  onClick: () => void;
  label?: string;
  sx?: SxProps<Theme>;
};

export function TestButton({
  loading = false,
  disabled = false,
  onClick,
  label = "Test connection",
  sx,
}: TestButtonProps) {
  return (
    <AppButton
      type="button"
      variant="outlined"
      disabled={disabled}
      onClick={onClick}
      sx={{
        flex: 1,
        minWidth: "auto",
        color: "var(--color-gunmetal)",
        bgcolor: "var(--color-lemon-chiffon)",
        borderColor: "var(--color-lemon-chiffon)",
        "&:hover": {
          bgcolor: "var(--color-vanilla)",
          borderColor: "var(--color-vanilla)",
        },
        ...sx,
      }}
    >
      {loading ? (
        <Box
          sx={{ display: "inline-flex", alignItems: "center", gap: "0.6rem" }}
        >
          <LoaderMini />
          {label}
        </Box>
      ) : (
        label
      )}
    </AppButton>
  );
}
