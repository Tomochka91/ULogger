import styles from "./AppLayout.module.css";

import { Outlet } from "react-router";

import { LoggerFormStateProvider } from "../../../context/addLoggerForm/loggerFormStateProvider";
import { Sidebar } from "../Sidebar/Sidebar";

/**
 * src/shared/components/layout/AppLayout/AppLayout.tsx
 *
 * Main application layout component.
 *
 * Responsibilities:
 * - Define the global page structure shared across all routes
 * - Render the persistent sidebar navigation
 * - Provide a layout container for routed page content
 * - Scope logger form state to routed pages via a dedicated provider
 *
 * Layout structure:
 * - Root container (`div.app`)
 *   - <Sidebar />: persistent navigation panel
 *   - <main>: primary content area
 *     - LoggerFormStateProvider
 *       - <Outlet />: renders the active route component
 *
 * Routing notes:
 * - Uses react-router's <Outlet /> to render child routes
 * - AppLayout is mounted once and reused across all nested routes
 *
 * State scoping:
 * - LoggerFormStateProvider wraps only the routed content
 * - This ensures:
 *   - Logger form state is shared between relevant pages
 *   - State is reset automatically when AppLayout unmounts
 *   - Sidebar remains unaffected by form-related state
 *
 * Design notes:
 * - AppLayout contains no business logic
 * - Acts as a structural and compositional boundary
 * - Keeps global navigation and page content clearly separated
 *
 * Styling:
 * - Uses CSS Modules (AppLayout.module.css)
 * - `app` defines the overall layout grid/flex
 * - `main` defines the scrollable content area
 */

export function AppLayout() {
  return (
    <div className={styles.app}>
      <Sidebar />
      <main className={styles.main}>
        <LoggerFormStateProvider>
          <Outlet />
        </LoggerFormStateProvider>
      </main>
    </div>
  );
}
