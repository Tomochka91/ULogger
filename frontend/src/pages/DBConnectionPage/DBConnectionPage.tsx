import styles from "./DBConnectionPage.module.css";

import { DBForm } from "../../shared/components/form/DBForm/DBForm";

/**
 * src/pages/DBConnectionPage.tsx
 *
 * Page component for configuring SQL database connection settings.
 *
 * Responsibilities:
 * - Provide a dedicated page for database connection configuration
 * - Render the DBForm component that handles all DB-related logic
 * - Apply page-level layout and styling
 *
 * Design notes:
 * - This page is a thin wrapper without business logic
 * - All validation, actions (test/apply/save), and API interaction
 *   are encapsulated inside DBForm
 * - Keeps page responsibilities focused on structure and presentation
 *
 * UI structure:
 * - <section> container with page-specific styling
 * - Section title describing the purpose of the page
 * - DBForm component for user interaction
 *
 * Styling:
 * - Uses CSS Modules (DBConnectionPage.module.css)
 * - `section` class ensures consistent spacing and layout
 */

export function DBConnectionPage() {
  return (
    <section className={styles.section}>
      <h2>SQL DataBase connection settings</h2>
      <DBForm />
    </section>
  );
}
