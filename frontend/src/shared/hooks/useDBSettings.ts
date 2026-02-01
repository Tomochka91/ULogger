import { useMutation } from "@tanstack/react-query";

import toast from "react-hot-toast";

import { postDBSettings } from "../../api/apiDB";
import { getErrorMessage } from "../utils/apiHelpers";
import type { DBSettings } from "../types";

/**
 * src/shared/hooks/useDBSettingsTest.ts
 *
 * Hook for testing database connection settings.
 *
 * Responsibilities:
 * - Send DB settings to the backend with "test" action
 * - Report whether the connection is valid
 * - Show success or error feedback via toast messages
 *
 * Usage:
 *   const { testMutate, isTesting } = useDBSettingsTest();
 *
 * Used in:
 * - DB connection form (Test connection button)
 */

export function useDBSettingsTest() {
  const { mutate: testMutate, isPending: isTesting } = useMutation({
    mutationFn: (values: DBSettings) =>
      postDBSettings({
        action: "test",
        settings: values,
      }),

    onSuccess: () => {
      toast.success("Connection successful");
    },

    onError: (err) => {
      toast.error(getErrorMessage(err, "Connection test failed"));
    },
  });

  return { testMutate, isTesting };
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
 * Usage:
 *   const { saveMutate, isSaving } = useDBSettingsSave();
 *
 * Used in:
 * - DB connection form (Save button)
 */

export function useDBSettingsSave() {
  const { mutate: saveMutate, isPending: isSaving } = useMutation({
    mutationFn: (values: DBSettings) =>
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
