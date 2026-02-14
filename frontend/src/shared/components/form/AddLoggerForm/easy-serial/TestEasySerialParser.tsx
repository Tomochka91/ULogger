import { useCallback, useMemo, useState } from "react";
import { useFormContext } from "react-hook-form";
import { Box, Paper, Stack, Typography } from "@mui/material";

import { useEasySerialParserTest } from "../../../../hooks/useEasySerialParserTest";
import { mapParserFormToSettings } from "../mappers/mapParserFormToSettings";
import { FormInput } from "../../FormInput/FormInput";
import { TestButton } from "../../../ui/button/TestButton";
import { HelperText } from "../../FormHelperText/HelperText";
import type { LoggerFormValues } from "../loggerForm.types";

/**
 * src/shared/components/form/AddLoggerForm/easy-serial/TestEasySerialParser.tsx
 *
 * EasySerial parser test panel.
 *
 * Interactive UI for testing EasySerial parser settings against raw input text.
 *
 * Responsibilities:
 * - Read the current EasySerial parser configuration from RHF form state
 * - Accept raw serial text input from the user
 * - Call backend "test parser" endpoint via `useEasySerialParserTest`
 * - Render parsed output (pretty JSON) or a backend error message
 *
 * Data flow:
 * - Reads ONLY the `easy_serial.parser` subtree using `getValues("easy_serial.parser")`
 *   to avoid pulling the entire form object (important for large forms/perf).
 * - Maps parser form subtree to backend DTO via `mapParserFormToSettings`
 * - Sends `{ raw_text, parser_settings }` to the test endpoint
 *
 * Design notes:
 * - Local component state is used for raw text input.
 * - `handleTest` is memoized with `useCallback` to keep a stable handler reference.
 * - Output formatting is memoized with `useMemo` to avoid recomputing JSON on re-renders.
 * - Does not mutate any form state; this is a pure "helper tool" for configuration.
 */

/* -------------------------------- Component -------------------------------- */
/**
 * TestEasySerialParser
 *
 * Parser testing widget for EasySerial logger configuration.
 *
 * Behavior:
 * - User pastes raw serial text into textarea.
 * - Clicking "Test" sends text and current parser settings to backend.
 * - Parsed result is rendered as formatted JSON.
 * - Parser errors are displayed inline.
 *
 * Notes:
 * - The component does not mutate form state.
 * - Intended as a development / configuration aid only.
 */

export function TestEasySerialParser() {
  const { getValues } = useFormContext<LoggerFormValues>();
  const [rawText, setRawText] = useState("");

  const {
    mutate: testParser,
    data,
    error,
    isPending,
    isError,
  } = useEasySerialParserTest();

  /**
   * handleTest
   *
   * Collects current form values and triggers parser test.
   */
  const handleTest = useCallback(() => {
    // Perf: read only the parser subtree instead of the whole form state
    const parser = getValues("easy_serial.parser");

    testParser({
      raw_text: rawText,
      parser_settings: mapParserFormToSettings(parser),
    });
  }, [getValues, rawText, testParser]);

  /**
   * output
   *
   * Memoized representation of test response:
   * - parser error string, if present
   * - otherwise formatted JSON of parsed fields
   */
  const output = useMemo(() => {
    if (!data) return "";
    return data.error ? data.error : JSON.stringify(data.parsed, null, 2);
  }, [data]);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--gap-standart)",
        fontFamily: "var(--secondary-font)",
        padding: "var(--pading-equal) 0",
        borderTop: "var(--border-standart)",
      }}
    >
      <Typography
        component="h3"
        sx={{ fontFamily: "inherit", fontSize: "var(--medium-font-size)" }}
      >
        Test Easy Serial Parser
      </Typography>

      <Stack direction="row" spacing="var(--gap-standart)">
        <FormInput
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          multiline
          minRows={8}
          maxRows={8}
          placeholder="Paste raw text here…"
          fullWidth
          helperText={" "}
        />

        <TestButton
          onClick={handleTest}
          loading={isPending}
          label="Test"
          sx={{ alignSelf: "start" }}
        ></TestButton>
      </Stack>

      {isError && (
        <HelperText sx={{ color: "var(--color-indian-red)" }}>
          {error?.message}
        </HelperText>
      )}

      <Paper
        variant="outlined"
        sx={{
          flex: 1,
          padding: "var(--padding-mini)",
          minHeight: "14.4rem",
          maxHeight: "14.4rem",
          overflowY: "auto",
          overflowX: "hidden",
          whiteSpace: "pre-wrap",
          overflowWrap: "anywhere",
          wordBreak: "break-word",
          fontFamily: "inherit",
          fontSize: "var(--standart-font-size)",
        }}
      >
        {output || (
          <Typography sx={{ fontFamily: "inherit", opacity: 0.6 }}>
            Response will appear here
          </Typography>
        )}
      </Paper>
    </Box>
  );
}
