import styles from "./MainNav.module.css";

import {
  BsFileEarmarkPlus,
  BsReverseListColumnsReverse,
  BsDatabaseGear,
  BsBoxes,
  BsBug,
} from "react-icons/bs";

import { AppNavLink } from "../AppNavLink/AppNavLink";

/**
 * src/shared/components/layout/MainNav/MainNav.tsx
 *
 * Main navigation menu for the application sidebar.
 *
 * Responsibilities:
 * - Render the primary navigation links for all main application pages
 * - Provide clear visual grouping of navigation items
 * - Combine icons and captions into consistent navigation entries
 *
 * Design notes:
 * - Uses AppNavLink to ensure consistent styling and active-route handling
 * - Icons are sourced from `react-icons/bs` (Bootstrap Icons set)
 * - Navigation structure is static and declarative
 *
 * Navigation items:
 * - /add         -> Logger settings (create/configure logger)
 * - /loggers     -> Runtime logs and controls
 * - /connection  -> Database connection settings
 * - /statistics  -> Metrics viewer
 * - /debug       -> Debug log viewer
 *
 * UI structure:
 * - <nav> root element
 * - <ul> list container for navigation items
 * - <li> per navigation entry
 * - Each entry uses AppNavLink with:
 *   - an icon
 *   - a caption label
 *
 * Styling:
 * - Uses CSS Modules (MainNav.module.css)
 * - `nav-list` defines vertical layout and spacing
 * - `caption` styles the text label next to each icon
 */

export function MainNav() {
  return (
    <nav>
      <ul className={styles["nav-list"]}>
        <li>
          <AppNavLink to="/add">
            <BsFileEarmarkPlus />
            <span className={styles.caption}>Settings</span>
          </AppNavLink>
        </li>
        <li>
          <AppNavLink to="/loggers">
            <BsReverseListColumnsReverse />
            <span className={styles.caption}>Runtime logs</span>
          </AppNavLink>
        </li>
        <li>
          <AppNavLink to="/connection">
            <BsDatabaseGear />
            <span className={styles.caption}>DB Connection</span>
          </AppNavLink>
        </li>
        <li>
          <AppNavLink to="/statistics">
            <BsBoxes />
            <span className={styles.caption}>Metrics</span>
          </AppNavLink>
        </li>
        <li>
          <AppNavLink to="/debug">
            <BsBug />
            <span className={styles.caption}>Debug</span>
          </AppNavLink>
        </li>
      </ul>
    </nav>
  );
}
