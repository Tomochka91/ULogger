import { useMutation } from "@tanstack/react-query";

import toast from "react-hot-toast";

import { startMboxLogger } from "../../api/apiConnections";
import { getErrorMessage } from "../utils/apiHelpers";

type MboxStartVariables = {
  logId: number;
  send: boolean;
};

/**
 * src/shared/hooks/useMboxStartLogger.ts
 *
 * Hook for sending a start command to an MBox logger.
 *
 * Responsibilities:
 * - Send a start command for a specific MBox logger
 * - Handle backend errors and show user-friendly messages
 * - Detect common runtime issues (e.g. worker not started)
 *
 * Usage:
 *   const { mboxStart, isMboxStarting } = useMboxStartLogger();
 *   mboxStart({ logId, send: true });
 *
 * Notes:
 * - If the logger worker is not running, a warning toast is shown
 *   instead of a generic error.
 */

export function useMboxStartLogger() {
  const { mutate: mboxStart, isPending: isMboxStarting } = useMutation<
    string,
    unknown,
    MboxStartVariables
  >({
    mutationFn: ({ logId, send }) => startMboxLogger(logId, send),

    onError: (err) => {
      const msg = getErrorMessage(err, "Something went wrong");
      if (msg.includes("Serial port is not open")) {
        toast("First start the logger (worker), then send the command.", {
          icon: "⚠️",
        });
        return;
      }
      toast.error(msg);
    },
  });

  return { mboxStart, isMboxStarting };
}
