import styles from "./LoggersPage.module.css";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Box, Chip, Fade, Paper, Typography } from "@mui/material";

import { FormRow } from "../../shared/components/form/FormRow/FormRow";
import { FormAutocomplete } from "../../shared/components/form/FormAutocomplete/FormAutocomplete";
import { FormInput } from "../../shared/components/form/FormInput/FormInput";
import {
  getLoggerList,
  getLoggerStatus,
  getLogsMessage,
} from "../../api/apiConnections";
import { defaultAutocompleteSlotProps } from "../../shared/components/form/FormAutocomplete/AutocompleteSlotProps";
import { RuntimeControls } from "../../shared/components/runtime/RuntimeControls";
import { useRuntimeControls } from "../../shared/hooks/useRuntimeControls";
import { useMboxStartLogger } from "../../shared/hooks/useMboxStartLogger";
import { MboxStartButton } from "../../shared/components/ui/button/MboxStartButton";
import type { LoggerList } from "../../shared/types";

/**
 * src/pages/LoggersPage.tsx
 *
 * Runtime logs and control page for configured loggers.
 *
 * Responsibilities:
 * - Fetch and display the list of configured loggers for selection
 * - Poll runtime logs and runtime status for the selected logger
 * - Render message/error panels when data is available
 * - Provide runtime lifecycle controls (start/stop/restart)
 * - Provide MBox-specific "send start command" control when applicable
 *
 * Data flow overview:
 * - Logger list:
 *   - GET /connections/ (cached; low refresh frequency)
 * - Selected logger runtime:
 *   - GET /connections/runtime/{id}/logs    (polled every 1s)
 *   - GET /connections/runtime/{id}/status  (polled every 1s)
 *
 * React Query notes:
 * - Query keys include `selectedId` to maintain isolated caches per logger
 * - `enabled: selectedId !== null` prevents queries from running until a logger is selected
 * - Runtime queries use `refetchInterval: 1000` to implement polling
 */

/* --------------------------------- Types ---------------------------------- */
/**
 * LoggerOption
 * Minimal option shape used by the logger selector Autocomplete.
 */

type LoggerOption = { id: number; name: string };

/**
 * LoggerStateType
 * UI-level runtime state union used for the status chip.
 * Must match backend runtime status values (`loggerStatus.data.state`).
 */

type LoggerStateType = "created" | "running" | "stopping" | "stopped" | "error";

/**
 * LOGGER_STATE_META
 * Maps runtime state → label and CSS color var for Chip styling.
 */

const LOGGER_STATE_META: Record<
  LoggerStateType,
  { label: string; colorVar: string }
> = {
  created: {
    label: "created",
    colorVar: "var(--color-blue-munsell)",
  },
  running: {
    label: "running",
    colorVar: "var(--color-jungle-green)",
  },
  stopping: {
    label: "stopping",
    colorVar: "var(--color-prusian-blue)",
  },
  stopped: {
    label: "stopped",
    colorVar: "var(--color-gunmetal)",
  },
  error: {
    label: "error",
    colorVar: "var(--color-bittersweet-shimmer)",
  },
} as const;

/* ------------------------------ Component ---------------------------------- */
export function LoggersPage() {
  /**
   * Selected logger id (single source of truth for selection).
   */
  const [selectedId, setSelectedId] = useState<number | null>(null);

  /* ------------------------------ Logger list ------------------------------ */
  /**
   * Load all configured loggers.
   * Cached for 5 minutes to avoid unnecessary refetching.
   */
  const { data: loggerList } = useQuery<LoggerList>({
    queryKey: ["logger-list"],
    queryFn: getLoggerList,
    staleTime: 5 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  /**
   * Resolve the selected logger object from the list (used for type checks).
   */
  const selectedLogger = useMemo(() => {
    if (!selectedId) return null;
    return (loggerList ?? []).find((l) => l.id === selectedId) ?? null;
  }, [loggerList, selectedId]);

  /**
   * Whether the currently selected logger is an MBox logger.
   * Used to conditionally render the MBox start command button.
   */
  const isMboxLogger = selectedLogger?.type === "mbox";

  /**
   * Transform the logger list into Autocomplete options.
   */
  const options: LoggerOption[] = useMemo(
    () =>
      (loggerList ?? [])
        .filter((log) => typeof log.id === "number")
        .map((log) => ({ id: log.id as number, name: log.name })),
    [loggerList]
  );

  /**
   * Convert selectedId into the corresponding Autocomplete option.
   */
  const selectedOption = useMemo(
    () => options.find((opt) => opt.id === selectedId) ?? null,
    [options, selectedId]
  );

  /* ---------------------------- Runtime: logs ------------------------------ */
  /**
   * Poll runtime logs for the selected logger every 1 second.
   * The query is enabled only after a logger is selected.
   */
  const { data: logsMessage } = useQuery({
    queryKey: ["runtime-logs", selectedId],
    queryFn: () => getLogsMessage(selectedId!),
    enabled: selectedId !== null,
    refetchInterval: 1000,
  });

  /**
   * Normalize runtime logs response to always provide arrays for rendering.
   */
  const { messages, errors } = useMemo<{
    messages: string[];
    errors: string[];
  }>(() => {
    if (!logsMessage?.success || !logsMessage.data) {
      return { messages: [], errors: [] };
    }

    return {
      messages: logsMessage.data.messages ?? [],
      errors: logsMessage.data.errors ?? [],
    };
  }, [logsMessage]);

  const hasMessages = messages.length > 0;
  const hasErrors = errors.length > 0;
  const showPanels = hasMessages || hasErrors;

  /* --------------------------- Runtime: status ----------------------------- */
  /**
   * Poll runtime status for the selected logger every 1 second.
   * Used for the status chip and for gating MBox commands.
   */
  const { data: loggerStatus } = useQuery({
    queryKey: ["logger-status", selectedId],
    queryFn: () => getLoggerStatus(selectedId!),
    enabled: selectedId !== null,
    refetchInterval: 1000,
  });

  /**
   * Extract the runtime state and map it to Chip styling metadata.
   */
  const loggerState: LoggerStateType | null =
    loggerStatus?.success && loggerStatus.data ? loggerStatus.data.state : null;

  const chipMeta = loggerState ? LOGGER_STATE_META[loggerState] : null;

  const showStatusChip = selectedId !== null && chipMeta !== null;

  /**
   * True when the logger worker is running (used to allow MBox command send).
   */
  const isWorkerRunning = loggerState === "running";

  /* -------------------------- Runtime controls ----------------------------- */
  /**
   * Start/stop/restart controls encapsulated in a dedicated hook.
   */
  const {
    runtimeStart,
    isStarting,
    runtimeStop,
    isStopping,
    runtimeRestart,
    isRestarting,
  } = useRuntimeControls();

  const handleStartLogger = () => {
    if (!selectedId) return;
    runtimeStart(selectedId!);
  };

  const handleStopLogger = () => {
    if (!selectedId) return;
    runtimeStop(selectedId!);
  };

  const handleRestartLogger = () => {
    if (!selectedId) return;
    runtimeRestart(selectedId!);
  };

  /* ----------------------------- MBox control ------------------------------ */
  /**
   * MBox command sender hook.
   * The UI button is rendered only for MBox loggers.
   */
  const { mboxStart, isMboxStarting } = useMboxStartLogger();

  /**
   * Send the MBox "start command" only when the worker is running,
   * otherwise show a warning toast.
   */
  const handleMboxStart = () => {
    if (!selectedId) return;

    if (!isWorkerRunning) {
      toast("First start the logger (worker), then send the command.", {
        icon: "⚠️",
      });
      return;
    }
    mboxStart({ logId: selectedId, send: true });
  };

  /* --------------------------------- UI ----------------------------------- */
  return (
    <section className={styles.section}>
      <h2>Runtime logs</h2>
      <Box
        sx={{
          display: "flex",
          gap: "var(--gap-medium)",
          alignItems: "stretch",
        }}
      >
        <FormRow label="Select logger:" labelWidth="20%">
          <FormAutocomplete
            fullWidth
            options={options}
            value={selectedOption}
            getOptionLabel={(opt) => (opt as LoggerOption).name}
            onChange={(_e, val) => {
              const newVal = val as LoggerOption | null;
              setSelectedId(newVal?.id ?? null);
            }}
            slotProps={defaultAutocompleteSlotProps}
            renderInput={(params) => (
              <FormInput {...params} placeholder="Select logger" />
            )}
          />
        </FormRow>

        {selectedId && (
          <Box sx={{ minWidth: "8rem", display: "flex" }}>
            <Fade in={showStatusChip} timeout={250}>
              <Chip
                label={chipMeta?.label}
                variant="outlined"
                sx={{
                  fontFamily: "var(--main-font)",
                  fontWeight: "var(--font-weight-8)",
                  fontSize: "var(--small-font-size)",
                  color: chipMeta?.colorVar,
                  borderColor: chipMeta?.colorVar,
                  backgroundColor: "transparent",
                  height: "100%",
                  alignSelf: "stretch",
                  borderRadius: "999px",
                  minWidth: "8rem",
                  justifyContent: "center",
                }}
              />
            </Fade>
          </Box>
        )}
      </Box>

      {showPanels && (
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            gap: "var(--gap-standart)",
          }}
        >
          {hasMessages && (
            <Paper
              elevation={24}
              sx={{
                flex: 1,
                minHeight: 0,
                overflowY: "auto",
                p: "var(--pading-equal)",
              }}
            >
              <Typography
                component="pre"
                sx={{
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  fontSize: "var(--standart-font-size)",
                  fontFamily: "var(--secondary-font)",
                  fontWeight: "var(--font-weight-2)",
                }}
              >
                {messages.join("\n")}
              </Typography>
            </Paper>
          )}

          {hasErrors && (
            <Paper
              elevation={24}
              sx={{
                flex: 1,
                minHeight: 0,
                overflowY: "auto",
                p: "var(--pading-equal)",
                fontFamily: "var(--secondary-font)",
              }}
            >
              <Typography
                component="pre"
                sx={{
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  fontSize: "var(--standart-font-size)",
                  fontFamily: "var(--secondary-font)",
                  fontWeight: "var(--font-weight-2)",
                }}
              >
                {errors.join("\n")}
              </Typography>
            </Paper>
          )}
        </Box>
      )}

      <Box
        display="flex"
        justifyContent="space-between"
        gap="var(--gap-standart)"
      >
        <RuntimeControls
          disabled={!selectedId}
          isStarting={isStarting}
          isStopping={isStopping}
          isRestarting={isRestarting}
          onStart={handleStartLogger}
          onStop={handleStopLogger}
          onRestart={handleRestartLogger}
        />

        {isMboxLogger && (
          <MboxStartButton
            disabled={!selectedId || isMboxStarting}
            onClick={handleMboxStart}
            loading={isMboxStarting}
          />
        )}
      </Box>
    </section>
  );
}
