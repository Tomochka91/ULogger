# Backend Service

## Overview
This repository contains the backend core of the project.  
The backend manages **industrial device loggers**, provides a **FastAPI-based HTTP API** for configuration and runtime control, processes incoming data, and writes results to a PostgreSQL database.

The architecture is modular and extensible: each device type is implemented as an isolated logger with a shared runtime and configuration model.

---

## Responsibilities

- Device communication and data acquisition
- Logger lifecycle management (start / stop / runtime state)
- Data parsing, transformation, and validation
- Database persistence
- HTTP API for frontend and external tools
- Integration and hardware-in-the-loop testing

---

## Technology Stack

- Python 3.10+ (recommended: 3.11 / 3.12)
- FastAPI / Starlette
- Pydantic v2
- SQLAlchemy 2.x
- PostgreSQL (psycopg-binary)
- pyserial (RS-232 / RS-485)
- pymodbus (RTU / TCP)
- pythonnet (optional .NET / CLR interop)
- pytest (unit and integration testing)

---

## Project Structure

```
backend/
├── app/
│   ├── api/                    # HTTP API layer
│   │   ├── deps.py              # Dependency injection
│   │   └── routers/             # API routers
│   │       ├── connections.py
│   │       ├── connection_logs.py
│   │       ├── connection_runtime.py
│   │       ├── db_settings.py
│   │       ├── easy_serial_parser.py
│   │       ├── mbox_commands.py
│   │       └── serial_ports.py
│   │
│   ├── core/                   # Core services
│   │   ├── db_client.py
│   │   ├── db_writer.py
│   │   ├── query_template.py
│   │   └── settings_manager.py
│   │
│   ├── loggers/                # Logger implementations
│   │   ├── base.py              # Base logger interfaces
│   │   ├── manager.py           # Runtime logger manager
│   │   ├── models.py            # Logger runtime models
│   │   ├── easy_serial/         # Easy Serial logger
│   │   ├── mbox/                # MBox logger
│   │   ├── mbox_counter/        # External counter logger
│   │   ├── modbus_rtu/          # Modbus RTU logger
│   │   └── modbus_tcp/          # Modbus TCP logger
│   │
│   ├── schemas/                # Pydantic schemas
│   ├── build/                  # Frontend HTTP Mock (replace by real pages)
│   ├── config.py               # Application configuration
│   └── main.py                 # Application entry point
│
├── config/                     # Static configuration
│   └── app_settings.json
│
├── tests/                      # Unit and integration tests
│
├── .env                        # Example environment configuration
└── README.md
```

---

## Logger Architecture

Each logger:
- encapsulates protocol-specific logic,
- runs in its own worker,
- reports runtime state,
- emits structured data for storage.

Supported logger types:
- Easy Serial
- MBox
- MBox Counter
- Modbus RTU
- Modbus TCP

New logger types can be added by implementing the base logger interface and registering them in the logger manager.

---

## Configuration

Configuration is provided via Frontend, environment variables and JSON files.

Example `.env`:
```
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
LOG_LEVEL=INFO
```

Static defaults may be defined in:
```
config/app_settings.json
```

---

## Dependencies

Virtual environments are intentionally not committed.

Dependencies are expected to be installed from external files:
- `requirements.txt` – pinned versions (lock file)
- `requirements.in` – minimal dependency list

Install dependencies:
```
pip install -r requirements.txt
```

---

## Running the Backend

Run directly:
```
python -m app.main
```

Or via Uvicorn:
```
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

API endpoints:
- Swagger UI: `/docs`
- ReDoc: `/redoc`

---

## Testing

The project includes extensive unit and integration tests, including
virtual device simulations and protocol-level checks.

Run tests:
```
pytest
```

---

## Packaging

The backend is prepared for standalone Windows builds.

Build steps:
1. Create and activate a virtual environment
2. Install pinned dependencies
3. Build using PyInstaller or auto-py-to-exe

---

## Notes

- `venv`, IDE caches, and generated binaries are excluded by design
- Dependency versions should always be pinned for reproducible builds
- Some loggers require physical hardware or virtual emulators for testing

---

## License

This project is free and open-source software.

Copyright © 2025  
**TTL & SEM Engineering Team**

The project is licensed under the **GNU General Public License v3.0 (GPL-3.0)**.

You are free to:
- use the software for any purpose,
- study how it works and modify it,
- redistribute copies,
- distribute modified versions,

under the terms of the GNU GPL v3 license.

Any distributed derivative work must remain licensed under the same GPL-3.0 license.

The full license text is available at:  
https://www.gnu.org/licenses/gpl-3.0.en.html

