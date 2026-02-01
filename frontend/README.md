# Fish Logger — Frontend

## Overview

The frontend is a single-page application (SPA) that provides a unified web interface for configuring, monitoring, and debugging various data loggers (serial, Modbus, TCP/IP, proprietary devices).

The application is designed as a configuration and observability layer on top of the backend API. It allows users to:

- Create and manage logger instances
- Configure device-specific parameters
- Manage database connections
- Monitor metrics and runtime state
- Debug data flow and protocol-level communication

The frontend is built with a strong focus on type safety, modularity, and extensibility, allowing new logger types and configuration forms to be added with minimal changes.

---

## Technology Stack

- **React**
  Component-based UI architecture
- **TypeScript**
  Strict typing across UI, state, and API contracts
- **React Router**
  Declarative routing
- **Material UI (MUI)**
  UI components and layout system
- **React Hook Form**  
  Used for form state management, validation, and dynamic form composition.
- **Tanstack/React Query**  
  Used for server state management, API interaction, caching, and mutations.
- **Vite**
  Fast development and build tooling

---

## Application Structure

The application is organized around logical sections (routes), each responsible for a specific aspect of system configuration or monitoring.

### Routes

| Route         | Page             | Description                                 |
| ------------- | ---------------- | ------------------------------------------- |
| `/`           | HomePage         | Entry point and system overview             |
| `/add`        | AddPage          | Create a new logger instance                |
| `/loggers`    | LoggersPage      | List and manage existing loggers            |
| `/connection` | DBConnectionPage | Database connection configuration           |
| `/statistics` | MetricsPage      | Runtime metrics and counters                |
| `/debug`      | DebugPage        | Low-level debugging and raw data inspection |

---

## Forms Architecture

Forms are a core part of the application and are built around a unified architectural approach:

- Logger types are modeled using discriminated unions
- Each logger type has its own default configuration builder
- Switching a logger type rebuilds only the type-specific part of the form
- Common fields are preserved during type changes

There is a strict separation between:

- UI-oriented form values
- Backend-compatible payload structures

This approach simplifies maintenance and allows new logger types to be added with minimal changes.

---

## State Management

- Local form state is handled via **react-hook-form**
- Server state and asynchronous operations are handled via **React Query**
- Logger form state can be preserved across edits and navigation when required

---

## Development

### Install Dependencies

```bash
npm install
```

### Run in Development Mode

```bash
npm run dev
```

### Build for Production

```bash
npm run build
```

---

## Extensibility

To add a new logger type:

1. Define the logger type in the shared type registry
2. Create a configuration schema and default builder
3. Implement a settings UI component
4. Register the type in the dispatcher and builders map

No changes to existing logger implementations are required.

---

## Project Status

The project is under active development.
New logger types, configuration options, and UI improvements are added incrementally as the system evolves.

---

## Design & UI

The interface design was created by the author of the project.

---

## License

ULogger is free and open-source software.

Copyright © 2025  
**TTL & SEM Engineering Team**
Original author: TTL & SEM Engineering Team

Licensed under the **GNU General Public License v3.0 (GPL-3.0)**.  
See the `LICENSE` file for full license text.

---
