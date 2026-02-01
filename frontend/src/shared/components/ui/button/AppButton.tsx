import { Button, type ButtonProps } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";

/**
 * src/shared/components/ui/button/AppButton.tsx
 *
 * Base application button component.
 *
 * Responsibilities:
 * - Provide a single, consistent visual baseline for all buttons in the app
 * - Wrap MUI's Button and enforce design-system styles via `sx`
 * - Allow local overrides while preserving the base look & feel
 *
 * Design notes:
 * - This component does not introduce new behavior
 * - It exists to centralize typography, spacing, borders, and layout rules
 * - All specialized buttons (Start, Stop, Restart, etc.) should build on top of this
 *
 * Styling strategy:
 * - `baseButtonSx` defines the canonical button appearance
 * - Incoming `sx` is shallow-merged on top, allowing safe customization
 */

/* ------------------------------ Base styles -------------------------------- */
/**
 * baseButtonSx
 * Shared styling applied to all application buttons.
 *
 * Includes:
 * - Typography (font family, size, line height)
 * - Spacing (padding, gap)
 * - Visuals (border, radius, shadow)
 * - Layout (inline-flex centering, no text wrapping)
 * - Icon alignment tweaks for MUI startIcon
 */

const baseButtonSx: SxProps<Theme> = {
  fontFamily: "var(--secondary-font)",
  fontSize: "var(--medium-font-size)",
  lineHeight: "var(--line-height-standart)",
  color: "var(--color-gunmetal)",
  padding: "var(--padding-special-small)",
  border: "var(--border-standart)",
  borderRadius: "var(--border-radius-medium)",
  textTransform: "var(--text-uppercase)",
  gap: "var(--gap-standart)",
  boxShadow: 2,
  whiteSpace: "nowrap",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",

  "& .MuiButton-startIcon": {
    marginLeft: 0,
    marginRight: 0,
  },
};

/* --------------------------------- Props ---------------------------------- */
/**
 * AppButtonProps
 *
 * Inherits all props from MUI's Button.
 * No additional props are introduced.
 */

type AppButtonProps = ButtonProps;

/* ------------------------------ Component ---------------------------------- */
export function AppButton({ sx, ...rest }: AppButtonProps) {
  /**
   * Merge base application styles with optional local overrides.
   * Local `sx` values take precedence.
   */
  const mergedSx: SxProps<Theme> = {
    ...(baseButtonSx as object),
    ...(sx as object),
  };

  return <Button {...rest} sx={mergedSx} />;
}
