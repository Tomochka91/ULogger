import { useMutation } from "@tanstack/react-query";

import toast from "react-hot-toast";

import { postDBSettings, type DbActionResponse } from "../../api/apiDB";
import { getErrorMessage, isAbortError } from "../utils/apiHelpers";
import type { DBSettings } from "../types";
import { useCallback, useRef } from "react";

/**
 * src/shared/hooks/useDBSettingsTest.ts
 *
 * Hook for testing database connection settings.
 *
 * Responsibilities:
 * - Send DB settings to the backend with "test" action
 * - Support cancellation of an in-flight test request
 * - Report whether the connection is valid
 * - Show success or error feedback via toast messages
 *
 * Cancellation model:
 * - Internally uses `AbortController`
 * - The active controller is stored in a ref (`abortRef`)
 * - When a new test starts, any previous test request is aborted
 * - `cancelTest()` explicitly aborts the current request
 * - Aborted requests throw `AbortError`
 * - `AbortError` is detected via `isAbortError()` and ignored
 *   (no toast, no error state propagation)
 *
 * UX contract:
 * - While `isTesting === true`, the UI may display a loading state
 * - The same Test button can act as a "Cancel" button
 * - Cancellation does NOT trigger error feedback
 *
 * React Query:
 * - Uses `useMutation<DbActionResponse, unknown, DBSettings>`
 * - `isPending` is exposed as `isTesting`
 *
 * Usage:
 *   const { testMutate, isTesting, cancelTest } = useDBSettingsTest();
 *
 * Used in:
 * - DB connection form (Test / Cancel button)
 */

export function useDBSettingsTest() {
  const abortRef = useRef<AbortController | null>(null);

  const { mutate: testMutate, isPending: isTesting } = useMutation<
    DbActionResponse,
    unknown,
    DBSettings
  >({
    mutationFn: async (values) => {
      abortRef.current?.abort();

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        return await postDBSettings(
          {
            action: "test",
            settings: values,
          },
          controller.signal,
        );
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
      }
    },

    onSuccess: () => {
      toast.success("Connection successful");
    },

    onError: (err) => {
      if (isAbortError(err)) return;

      toast.error(getErrorMessage(err, "Connection test failed"));
    },
  });

  const cancelTest = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { testMutate, isTesting, cancelTest };
}

/**
 * src/shared/hooks/useDBSettingsSave.ts
 *
 * Hook for saving database connection settings.
 *
 * Responsibilities:
 * - Send DB settings to the backend with "save" action
 * - Persist connection settings on the server
 * - Show success or error feedback via toast messages
 *
 * Behavior:
 * - Uses React Query `useMutation`
 * - Exposes `isPending` as `isSaving`
 * - Does not support cancellation (save is expected to be short-lived)
 *
 * Usage:
 *   const { saveMutate, isSaving } = useDBSettingsSave();
 *
 * Used in:
 * - DB connection form (Save button)
 */

export function useDBSettingsSave() {
  const { mutate: saveMutate, isPending: isSaving } = useMutation<
    DbActionResponse,
    unknown,
    DBSettings
  >({
    mutationFn: (values) =>
      postDBSettings({
        action: "save",
        settings: values,
      }),

    onSuccess: () => {
      toast.success("Settings saved");
    },

    onError: (err) => {
      toast.error(getErrorMessage(err, "Failed to save settings"));
    },
  });

  return { saveMutate, isSaving };
}
