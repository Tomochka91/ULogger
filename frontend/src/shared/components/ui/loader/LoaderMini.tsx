import { Box } from "@mui/material";

/**
 * src/shared/components/ui/loader/LoaderMini.tsx
 *
 * Lightweight inline loading spinner component.
 *
 * Responsibilities:
 * - Display a small, unobtrusive loading indicator
 * - Be usable inside buttons and compact UI elements
 * - Allow basic visual customization (size, thickness, colors)
 *
 * Design notes:
 * - Implemented using a simple CSS border spinner
 * - Uses MUI Box for styling via the `sx` prop
 * - Intended for inline usage (e.g. inside buttons, labels)
 *
 * Behavior:
 * - Spinner rotates continuously using a CSS keyframes animation
 * - No internal state; purely presentational
 *
 * Props:
 * - size: diameter of the spinner in pixels (default: 14)
 * - thickness: border thickness in pixels (default: 2)
 * - color: color of the active (top) border (default: Indian Red)
 * - secondaryColor: color of the inactive border (default: translucent black)
 */

interface LoaderMiniProps {
  size?: number;
  thickness?: number;
  color?: string;
  secondaryColor?: string;
}

/* ------------------------------ Component ---------------------------------- */
export function LoaderMini({
  size = 14,
  thickness = 2,
  color = "var(--color-indian-red)",
  secondaryColor = "rgba(0, 0, 0, 0.1)",
}: LoaderMiniProps) {
  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: "50%",
        border: `${thickness}px solid ${secondaryColor}`,
        borderTopColor: color,
        animation: "spin 0.6s linear infinite",
        display: "inline-block",
        "@keyframes spin": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
      }}
    />
  );
}
