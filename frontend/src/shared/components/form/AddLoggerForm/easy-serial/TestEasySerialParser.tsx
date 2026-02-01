import { useMemo, useState } from "react";
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
 * This module provides an interactive UI for testing
 * EasySerial parser settings against raw input text.
 *
 * Responsibilities:
 * - Read current parser configuration from form state
 * - Allow user to input raw serial text
 * - Invoke backend parser test via `useEasySerialParserTest`
 * - Display parsed output or error message
 *
 * Data flow:
 * - Reads full form state via `useFormContext`
 * - Maps form values to backend parser settings using
 *   `mapParserFormToSettings`
 * - Sends `{ raw_text, parser_settings }` to test endpoint
 *
 * Design notes:
 * - Local component state is used for raw input text.
 * - Output is memoized to avoid unnecessary re-renders.
 * - This component is EasySerial-specific and used inside `FramerTab`.
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
  const handleTest = () => {
    const values = getValues();

    testParser({
      raw_text: rawText,
      parser_settings: mapParserFormToSettings(values),
    });
  };

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
