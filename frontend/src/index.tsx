/**
* Copyright (c) 2025
* TTL & SEM Engineering Team
*
* This program is free software: you can redistribute it and/or modify
* it under the terms of the GNU General Public License as published by
* the Free Software Foundation, either version 3 of the License, or
* (at your option) any later version.
*/
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import App from "./app/App.tsx";

/**
 * Application entry point.
 *
 * Responsibilities:
 * - Initializes global React Query configuration
 * - Provides routing with a fixed base path (`/logger/ui`)
 * - Mounts the root React component into the DOM
 *
 * Notes:
 * - React Query cache is configured to reduce unnecessary refetches
 * - BrowserRouter `basename` is required for deployments behind a reverse proxy
 * - React.StrictMode is enabled for development-side effect detection
 */

/**
 * Global React Query client.
 *
 * Default behavior:
 * - `staleTime`: 5 minutes
 *   Query results are considered fresh during this time window.
 *
 * - `refetchOnWindowFocus`: false
 *   Prevents automatic refetch when the browser tab regains focus.
 *   This is important for predictable behavior with polling and live log data.
 */

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

/**
 * Mount React application.
 *
 * Provider hierarchy:
 * - React.StrictMode
 * - QueryClientProvider (React Query)
 * - BrowserRouter (with base path)
 * - App (root component)
 *
 * Routing base path:
 * All application routes are relative to `/logger/ui`
 */

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename="/logger/ui">
        <App />
      </BrowserRouter>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </StrictMode>
);
