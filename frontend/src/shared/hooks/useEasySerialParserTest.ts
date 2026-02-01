import { useMutation } from "@tanstack/react-query";

import { postEasySerialParserTest } from "../../api/apiConnections";
import type {
  EasySerialParserTest,
  EasySerialParserTestResponse,
} from "../types";

/**
 * src/shared/hooks/useEasySerialParserTest.ts
 *
 * Hook for testing Easy Serial parser configuration.
 *
 * Responsibilities:
 * - Send raw input text and parser settings to the backend
 * - Receive parsed result or parser error
 * - Expose mutation state for UI feedback
 *
 * Usage:
 *   const { mutate, data, error, isPending } = useEasySerialParserTest();
 *
 * Used in:
 * - Easy Serial logger configuration form
 * - Parser test / preview UI
 */

export function useEasySerialParserTest() {
  return useMutation<EasySerialParserTestResponse, Error, EasySerialParserTest>(
    { mutationFn: postEasySerialParserTest },
  );
}
