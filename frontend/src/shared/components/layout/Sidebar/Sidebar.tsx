import styles from "./Sidebar.module.css";

import { Logo } from "../Logo/Logo";
import { MainNav } from "../MainNav/MainNav";

/**
 * src/shared/components/layout/Sidebar/Sidebar.tsx
 *
 * Application sidebar component.
 *
 * Responsibilities:
 * - Render the persistent sidebar layout used across the application
 * - Display application branding (Logo)
 * - Display the main navigation menu
 * - Display footer information (version and copyright)
 *
 * Layout structure:
 * - <aside> root container
 *   - <Logo />       : application brand / home navigation
 *   - <MainNav />    : primary navigation links
 *   - Footer section : version and copyright info
 *
 * Design notes:
 * - Sidebar is rendered once in AppLayout and persists across route changes
 * - Contains no state or business logic
 * - All dynamic content is limited to the current year display
 *
 * Styling:
 * - Uses CSS Modules (Sidebar.module.css)
 * - `sidebar` defines width, background, and layout behavior
 * - `sidebar-footer` styles the bottom informational block
 */

export function Sidebar() {
  return (
    <aside className={styles.sidebar}>
      <Logo />
      <MainNav />
      <div className={styles["sidebar-footer"]}>
        <span>Fish Logger v1.0</span>
        <span>
          © {new Date().getFullYear()} TTL &amp; SEM — engineering team
        </span>
      </div>
    </aside>
  );
}
