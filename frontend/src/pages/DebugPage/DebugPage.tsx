import styles from "./DebugPage.module.css";

import { useMemo, useState } from "react";

import { DebugSearchBar } from "../../shared/components/debug/DebugSearchBar";
import { DebugLogView } from "../../shared/components/debug/DebugLogView";
import { DebugControls } from "../../shared/components/debug/DebugControls";
import { useDebug } from "../../shared/hooks/useDebug";

/**
 * src/pages/DebugPage.tsx
 *
 * Debug log viewer page.
 *
 * Responsibilities:
 * - Display runtime/debug messages provided by the Debug context
 * - Provide client-side search/filtering over debug messages
 * - Expose user controls for log management (autoscroll, clear)
 *
 * Design notes:
 * - This page does not own or mutate debug data directly
 * - All debug state is managed by DebugProvider and accessed via useDebug()
 * - Filtering is performed purely at the view layer
 *
 * Data flow:
 * - DebugProvider → useDebug() → DebugPage
 * - DebugPage filters messages → passes them to DebugLogView
 * - User actions are forwarded back to DebugProvider via callbacks
 */

/* ------------------------------ Component ---------------------------------- */
export function DebugPage() {
  const { messages, autoscroll, clearMessages, toggleAutoscroll } = useDebug();
  const [search, setSearch] = useState("");

  /**
   * Client-side filtering of debug messages.
   *
   * - When search is empty, all messages are displayed
   * - Filtering is case-insensitive
   * - Matches against message text and source fields
   *
   * Memoized to avoid unnecessary recalculations on large log streams.
   */

  const filteredMessages = useMemo(() => {
    if (!search.trim()) return messages;

    const query = search.toLowerCase();
    return messages.filter((msg) => {
      return (
        msg.text.toLowerCase().includes(query) ||
        msg.source.toLowerCase().includes(query)
      );
    });
  }, [messages, search]);

  return (
    <section className={styles.section}>
      <h2>Debug</h2>
      <DebugSearchBar value={search} onChange={setSearch} />

      <DebugLogView messages={filteredMessages} autoscroll={autoscroll} />

      <DebugControls
        autoscroll={autoscroll}
        onToggleAutoscroll={toggleAutoscroll}
        onClear={clearMessages}
      />
    </section>
  );
}
