import styles from "./AddPage.module.css";

import { AddLoggerForm } from "../../shared/components/form/AddLoggerForm/AddLoggerForm";

/**
 * src/pages/AddPage.tsx
 *
 * Page component for creating and configuring a new logger.
 *
 * Responsibilities:
 * - Provide a dedicated page for logger creation
 * - Render the AddLoggerForm responsible for all logger configuration logic
 * - Apply page-level layout and styling
 *
 * Design notes:
 * - This page contains no business logic or state management
 * - All form handling, validation, and submission logic is encapsulated
 *   inside AddLoggerForm
 * - The page acts purely as a visual and structural wrapper
 *
 * UI structure:
 * - <section> container with page-specific styling
 * - Section title ("Logger settings")
 * - AddLoggerForm component
 *
 * Styling:
 * - Uses CSS Modules (AddPage.module.css)
 * - `section` class controls spacing and layout consistency
 */

export function AddPage() {
  return (
    <section className={styles.section}>
      <h2>Logger settings</h2>
      <AddLoggerForm />
    </section>
  );
}
