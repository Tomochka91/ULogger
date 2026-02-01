import { Route, Routes } from "react-router";
import { Toaster } from "react-hot-toast";
import "./global.css";
import { DebugProvider } from "../shared/context/debug/debugProvider";
import { AppLayout } from "../shared/components/layout/AppLayout/AppLayout";
import { HomePage } from "../pages/HomePage/HomePage";
import { AddPage } from "../pages/AddPage/AddPage";
import { LoggersPage } from "../pages/LoggersPage/LoggersPage";
import { DBConnectionPage } from "../pages/DBConnectionPage/DBConnectionPage";
import { DebugPage } from "../pages/DebugPage/DebugPage";
import { MetricsPage } from "../pages/MetricsPage/MetricsPage";

/**
 * src/app/App.tsx
 *
 * Root application component.
 * Defines the global application structure, routing, layout composition,
 * context providers, and global UI services.
 *
 * Responsibilities:
 * - Register global context providers (DebugProvider)
 * - Configure application routing using react-router
 * - Apply the main application layout (AppLayout)
 * - Mount global UI services (toast notifications)
 *
 * Design notes:
 * - App.tsx contains no business logic
 * - Acts purely as a composition/root wiring layer
 * - All pages are rendered inside a shared layout via nested routing
 *
 * Dependencies:
 * - react-router: routing and nested layouts
 * - DebugProvider: global debug/context state
 * - AppLayout: shared UI shell (navigation, header, outlet)
 * - react-hot-toast: global toast notification system
 * - Global CSS variables and styles
 */

/* --------------------------------- Routing --------------------------------- */
/**
 * Routing model:
 *
 * <AppLayout>
 *   └── <Outlet /> renders the active page
 *
 * All routes defined here share the same layout.
 *
 * Routes:
 * - /              -> HomePage        (index route)
 * - /add           -> AddPage
 * - /loggers       -> LoggersPage
 * - /connection    -> DBConnectionPage
 * - /statistics    -> MetricsPage
 * - /debug         -> DebugPage
 */

/* ------------------------------ Global Context ------------------------------ */
/**
 * DebugProvider:
 * - Wraps the entire application
 * - Exposes debug-related state and helpers
 * - Accessible from any page, layout, or component
 */

/* ------------------------------ Global UI ----------------------------------- */
/**
 * Toaster (react-hot-toast):
 * - Provides application-wide toast notifications
 * - Configured once at the root level
 * - Styling is aligned with the app design system via CSS variables
 */

/* ------------------------------ Component ---------------------------------- */
function App() {
  return (
    <DebugProvider>
      <div className="frame">
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<HomePage />} />
            <Route path={"/add"} element={<AddPage />} />
            <Route path={"/loggers"} element={<LoggersPage />} />
            <Route path={"/connection"} element={<DBConnectionPage />} />
            <Route path={"/statistics"} element={<MetricsPage />} />
            <Route path={"/debug"} element={<DebugPage />} />
          </Route>
        </Routes>
      </div>

      <Toaster
        position="top-center"
        gutter={12}
        containerStyle={{ margin: "8px" }}
        toastOptions={{
          success: {
            duration: 3000,
          },
          error: { duration: 5000 },
          style: {
            fontFamily: "var(--main-font)",
            fontSize: "var(--medium-font-size)",
            maxWidth: "50rem",
            padding: "var(--padding-main)",
            backgroundColor: "var(--color-lemon-chiffon)",
            color: "var(--color-gunmetal)",
          },
        }}
      />
    </DebugProvider>
  );
}

export default App;
