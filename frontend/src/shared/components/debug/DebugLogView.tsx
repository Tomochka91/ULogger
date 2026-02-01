import { useEffect, useRef } from "react";

import { Box, Chip, Paper, Typography } from "@mui/material";

import { formatTimestamp } from "../../utils/formatTimestamp";
import type { DebugMessage, DebugMessageLevel } from "../../types";

/**
 * src/shared/components/debug/DebugLogView.tsx
 *
 * Debug message list renderer with optional autoscroll behavior.
 *
 * Responsibilities:
 * - Render a scrollable list of DebugMessage items
 * - Display message metadata (timestamp, source, level) and message text
 * - Auto-scroll to the newest message when `autoscroll` is enabled
 * - Render an empty-state message when there are no messages
 *
 * Design notes:
 * - This component is presentational and stateless with respect to debug data
 * - Scrolling is controlled via a DOM ref and an effect tied to message updates
 * - Uses MUI Paper as the scroll container and Box rows for each message
 *
 * UI conventions:
 * - Timestamp is shown as a compact caption
 * - Source is shown as an uppercase Chip (special color for backend source)
 * - Level is shown as an uppercase outlined Chip with severity-based color
 * - Text is rendered as <pre> with wrapping to preserve formatting
 */

/* --------------------------------- Props ---------------------------------- */
/**
 * DebugLogViewProps
 *
 * @property messages   - Debug messages to render
 * @property autoscroll - If true, scroll container jumps to bottom on updates
 */

type DebugLogViewProps = {
  messages: DebugMessage[];
  autoscroll: boolean;
};

/* ------------------------------ Component ---------------------------------- */
export function DebugLogView({ messages, autoscroll }: DebugLogViewProps) {
  /**
   * Ref to the scrollable Paper container.
   * Used to implement autoscroll by adjusting scrollTop.
   */
  const containerRef = useRef<HTMLDivElement | null>(null);

  /**
   * Autoscroll effect:
   * - When enabled, jump to the bottom whenever messages change.
   * - Does nothing when autoscroll is disabled or the ref is not mounted.
   */
  useEffect(() => {
    if (!autoscroll) return;

    const element = containerRef.current;

    if (!element) return;

    element.scrollTop = element.scrollHeight;
  }, [messages, autoscroll]);

  /**
   * Map a debug message level to an MUI Chip color.
   */
  const getLevelColor = (level?: DebugMessageLevel) => {
    switch (level) {
      case "error":
        return "error";
      case "warn":
        return "warning";
      case "info":
        return "default";
    }
  };

  return (
    <Paper
      ref={containerRef}
      elevation={24}
      sx={{
        flex: 1,
        minHeight: 0,
        overflowY: "auto",
        p: "var(--pading-equal)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--gap-mini)",
        fontFamily: "var(--secondary-font)",
        fontSize: "var(--standart-font-size)",
      }}
    >
      {messages.length === 0 ? (
        /**
         * Empty state when there are no messages to display.
         */
        <Typography
          sx={{
            textAlign: "center",
            mt: "var(--margin-big)",
            fontFamily: "var(--secondary-font)",
            fontSize: "var(--medium-font-size)",
            color: "var(--color-rich-black)",
          }}
        >
          No messages to show
        </Typography>
      ) : (
        /**
         * Message rows.
         * Each row shows timestamp, source chip, optional level chip, and message text.
         */
        messages.map((msg) => (
          <Box
            key={msg.id}
            sx={{
              display: "flex",
              gap: "var(--gap-standart)",
              justifyContent: "center",
              alignItems: "center",
              py: "var(--padding-mini)",
              borderBottom: "1px solid",
              borderColor: "divider",
              "&:last-of-type": {
                borderBottom: "none",
              },
            }}
          >
            {/* Timestamp */}
            <Typography
              variant="caption"
              sx={{
                width: "max-content",
                color: "var(--color-cadet-grey)",
                fontSize: "var(--mini-font-size)",
                fontFamily: "var(--secondary-font)",
              }}
            >
              {formatTimestamp(msg.timestamp)}
            </Typography>

            {/* Message source */}
            <Chip
              size="small"
              label={msg.source}
              color={msg.source === "back" ? "primary" : "default"}
              sx={{
                textTransform: "uppercase",
                fontSize: "var(--mini-font-size)",
                fontFamily: "var(--secondary-font)",
              }}
            />

            {/* Optional severity level */}
            {msg.level && (
              <Chip
                size="small"
                label={msg.level}
                color={getLevelColor(msg.level)}
                variant="outlined"
                sx={{
                  textTransform: "uppercase",
                  fontSize: "var(--mini-font-size)",
                  fontFamily: "var(--secondary-font)",
                }}
              />
            )}

            {/* Message body */}
            <Typography
              component="pre"
              sx={{
                m: 0,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                flex: 1,
                fontSize: "var(--small-font-size)",
                fontFamily: "var(--secondary-font)",
                fontWeight: "var(--font-weight-1)",
              }}
            >
              {msg.text}
            </Typography>
          </Box>
        ))
      )}
    </Paper>
  );
}
