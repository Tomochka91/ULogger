import styles from "./MetricsPage.module.css";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Box, Paper, Typography } from "@mui/material";

import { defaultAutocompleteSlotProps } from "../../shared/components/form/FormAutocomplete/AutocompleteSlotProps";
import { FormAutocomplete } from "../../shared/components/form/FormAutocomplete/FormAutocomplete";
import { FormInput } from "../../shared/components/form/FormInput/FormInput";
import { FormRow } from "../../shared/components/form/FormRow/FormRow";
import { getLoggerList, getMetrics } from "../../api/apiConnections";
import type { LoggerList } from "../../shared/types";

/**
 * src/pages/MetricsPage.tsx
 *
 * Metrics viewer page for configured loggers.
 *
 * Responsibilities:
 * - Fetch and display the list of configured loggers for selection
 * - Poll runtime metrics for the selected logger
 * - Render metrics and extra data as formatted, readable text panels
 *
 * Data flow:
 * - Logger list:
 *   - GET /connections/ (cached; low refresh frequency)
 * - Selected logger metrics:
 *   - GET /connections/runtime/{id}/metrics (polled every 1s)
 *
 * React Query notes:
 * - Query keys include `selectedId` to isolate caches per logger
 * - `enabled: selectedId !== null` prevents metrics polling until a logger is selected
 * - `refetchInterval: 1000` implements polling for live-ish updates
 */

/* --------------------------------- Types ---------------------------------- */
/**
 * LoggerOption
 * Minimal option shape used by the logger selector Autocomplete.
 */

type LoggerOption = { id: number; name: string };

/* ------------------------------ Component ---------------------------------- */
export function MetricsPage() {
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

  /* ----------------------------- Runtime metrics --------------------------- */
  /**
   * Poll runtime metrics for the selected logger every 1 second.
   * The query is enabled only after a logger is selected.
   */
  const { data: metricsMessage } = useQuery({
    queryKey: ["metrics", selectedId],
    queryFn: () => getMetrics(selectedId!),
    enabled: selectedId !== null,
    refetchInterval: 1000,
  });

  /**
   * Format `metrics` object into a multi-line `key: value` string.
   */
  const metricsText = useMemo(() => {
    const metrics = metricsMessage?.success
      ? metricsMessage.data.metrics
      : undefined;
    if (!metrics) return "";
    return Object.entries(metrics)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n");
  }, [metricsMessage]);

  /**
   * Format `extra` object into a multi-line `key: value` string.
   */
  const extraText = useMemo(() => {
    const extra = metricsMessage?.success
      ? metricsMessage.data.extra
      : undefined;
    if (!extra) return "";
    return Object.entries(extra)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n");
  }, [metricsMessage]);

  /**
   * Show panels only when at least one section has content.
   */
  const showPanels = metricsText.length > 0 || extraText.length > 0;

  /* --------------------------------- UI ----------------------------------- */
  return (
    <section className={styles.section}>
      <h2>Metrics</h2>

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

      {showPanels && (
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            gap: "var(--gap-standart)",
          }}
        >
          {metricsText.length > 0 && (
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
                {metricsText}
              </Typography>
            </Paper>
          )}

          {extraText.length > 0 && (
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
                {extraText}
              </Typography>
            </Paper>
          )}
        </Box>
      )}
    </section>
  );
}
