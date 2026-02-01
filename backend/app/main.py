# Copyright (c) 2025
# TTL & SEM Engineering Team
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.

"""
ULogger backend entry point.

Responsibilities:
- Initialize FastAPI application and API routers
- Set up CORS and static UI routes
- Manage application lifespan (startup/shutdown) via runtime manager
- Provide health check endpoint
- Start Uvicorn server in background
- Integrate system tray icon with server controls (start/stop/restart)
- Ensure single instance execution using lock file
- Load frontend UI from build directory
"""

import os
import sys
import time
import threading
import socket
import requests
import webview
import uvicorn
import tempfile
import pystray
from pathlib import Path
from typing import IO

from PIL import Image, ImageDraw

from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from starlette.responses import FileResponse, JSONResponse

from backend.app.api.routers import api_router
from backend.app.api.deps import get_runtime_manager


origins = [
    # "http://localhost:5173",
    # "http://192.168.1.58:5173",
]


def acquire_single_instance_lock(app_id: str = "fishlogger") -> IO[str] | None:
    """
    Returns an opened lock file (must be kept open until process exit),
    or None if another instance is already running.
    """
    lock_path = Path(tempfile.gettempdir()) / f"{app_id}.lock"
    f = open(lock_path, "w", encoding="utf-8")

    try:
        if sys.platform.startswith("win"):
            import msvcrt
            # Locking 1 byte is enough; keep the lock for the entire process lifetime
            msvcrt.locking(f.fileno(), msvcrt.LK_NBLCK, 1)
        else:
            import fcntl
            fcntl.flock(f.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        f.write(str(os.getpid()))
        f.flush()
        return f
    except Exception:
        try:
            f.close()
        except Exception:
            pass
        return None

# -------------------------
# Paths
# -------------------------

def base_dir() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parent
    return Path(__file__).resolve().parent

def build_dir() -> Path:
    env = os.getenv("APP_BUILD_DIR")
    if env:
        return Path(env).resolve()
    return base_dir() / "build"


# -------------------------
# FastAPI app
# -------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    runtime_manager = get_runtime_manager()
    yield
    runtime_manager.shutdown_all(timeout=5.0)

app = FastAPI(
    title="Fish Logger",
    docs_url="/logger/docs",
    openapi_url="/logger/openapi.json",
    version="1.0",
    lifespan=lifespan
)

if origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"]
    )

app.include_router(api_router, prefix="/logger")

@app.get("/logger/health")
def healthcheck():
    return {"status": "ok"}


# -------------------------
# Static UI (/logger/ui)
# -------------------------

BUILD = build_dir()

if BUILD.exists():
    app.mount("/logger/ui", StaticFiles(directory=str(BUILD), html=True), name="ui")

    @app.exception_handler(404)
    async def spa_fallback(request: Request, exc):
        if request.url.path.startswith("/logger") and not request.url.path.startswith("/logger/ui"):
            return JSONResponse({"detail": "Not Found"}, status_code=404)

        index = BUILD / "index.html"
        if index.exists():
            return FileResponse(index)

        return JSONResponse({"detail": "UI build not found"}, status_code=404)


# -------------------------
# Uvicorn control
# -------------------------

def pick_port() -> int:
    s = socket.socket()
    s.bind(("127.0.0.1", 0))
    port = s.getsockname()[1]
    s.close()
    return port


def start_server(port: int, holder: dict):
    config = uvicorn.Config(app, host="127.0.0.1", port=port, log_level="info")
    server = uvicorn.Server(config)
    holder["server"] = server
    server.run()


def wait_ready(port: int):
    url = f"http://127.0.0.1:{port}/logger/health"
    while True:
        try:
            if requests.get(url, timeout=0.5).status_code == 200:
                return
        except Exception:
            pass
        time.sleep(0.1)


# -------------------------
# Tray icon
# -------------------------

def tray_icon_image(running: bool, size: int = 64) -> Image.Image:
    """
    Fish shape = icon form
    Color indicates server status
    """
    color = (40, 160, 80, 255) if running else (200, 60, 60, 255)

    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # Fish body
    d.ellipse((10, 18, size - 18, size - 18), fill=color)

    # Tail
    d.polygon(
        [
            (size - 18, size // 2),
            (size - 4, size // 2 - 10),
            (size - 4, size // 2 + 10),
        ],
        fill=color,
    )

    # Eye
    d.ellipse((18, size // 2 - 6, 26, size // 2 + 2), fill=(255, 255, 255, 255))
    d.ellipse((21, size // 2 - 3, 24, size // 2), fill=(0, 0, 0, 255))

    return img


def server_status_text(running: bool) -> str:
    return "Server: RUNNING" if running else "Server: STOPPED"

# -------------------------
# Main
# -------------------------

def main():
    lock_handle = acquire_single_instance_lock()
    if lock_handle is None:
        # Already running — exit silently
        return

    # port = pick_port()
    port = int(os.getenv("APP_PORT", "8000"))
    holder = {}
    quitting = False

    server_running = False
    server_thread: threading.Thread | None = None

    def health_ok(timeout_s: float = 0.25) -> bool:
        try:
            r = requests.get(f"http://127.0.0.1:{port}/logger/health", timeout=timeout_s)
            return r.status_code == 200
        except Exception:
            return False

    window = webview.create_window(
        "Fish Logger v1.0",
        f"http://127.0.0.1:{port}/logger/ui/",
        width=1200,
        height=800,
    )

    # Close button → minimize to tray
    def on_closing():
        nonlocal quitting
        if not quitting:
            window.hide()
            return False

    window.events.closing += on_closing

    # --- Tray actions (defined upfront, menu is built dynamically) ---

    def tray_open(icon, item):
        window.show()
        window.restore()

    def tray_toggle_server(icon, item):
        if server_running:
            stop_backend()
        else:
            start_backend()
            if server_running:
                window.load_url(f"http://127.0.0.1:{port}/logger/ui/")

    def tray_restart(icon, item):
        restart_backend()
        if server_running:
            window.load_url(f"http://127.0.0.1:{port}/logger/ui/")

    def tray_exit(icon, item):
        nonlocal quitting
        quitting = True
        stop_backend()
        icon.stop()
        window.destroy()

    def build_tray_menu():
        status_text = server_status_text(server_running)
        toggle_text = "Stop server" if server_running else "Start server"

        return pystray.Menu(
            pystray.MenuItem(status_text, lambda icon, item: None, enabled=True),
            pystray.Menu.SEPARATOR,

            pystray.MenuItem("Open UI", tray_open),
            pystray.MenuItem(toggle_text, tray_toggle_server),
            pystray.MenuItem("Restart server", tray_restart),
            pystray.MenuItem("Shutdown", tray_exit),
        )

    tray = pystray.Icon(
        "Fish Logger",
        tray_icon_image(False),
        "Fish Logger",
        menu=build_tray_menu(),
    )

    def set_server_running(running: bool):
        nonlocal server_running
        server_running = running
        tray.icon = tray_icon_image(running)
        tray.menu = build_tray_menu()
        tray.visible = True

    # --- Backend control ---

    def start_backend():
        nonlocal server_thread
        # If health endpoint already responds, assume the server is running
        if health_ok():
            set_server_running(True)
            return
            
        # Clear cached managers before restart (required for clean restarts)    
        from backend.app.api import deps
        deps.get_runtime_manager.cache_clear()
        deps.get_settings_manager.cache_clear()

        # Start server in a background thread
        holder.clear()
        server_thread = threading.Thread(target=start_server, args=(port, holder), daemon=True)
        server_thread.start()

        # Wait for server readiness with timeout
        t0 = time.time()
        while time.time() - t0 < 8.0:
            if health_ok():
                set_server_running(True)
                return
            time.sleep(0.1)

        # Server failed to start
        set_server_running(False)

    def stop_backend():
        # If server does not respond, just update the status
        srv = holder.get("server")
        if srv:
            srv.should_exit = True
        holder.clear()

        # Allow time for port release (important on Windows)
        t0 = time.time()
        while time.time() - t0 < 3.0:
            if not health_ok():
                break
            time.sleep(0.1)

        set_server_running(False)

    def restart_backend():
        stop_backend()
        time.sleep(2.0)
        start_backend()

    # Start tray icon loop
    threading.Thread(target=tray.run, daemon=True).start()

    # Start backend immediately
    start_backend()

    # If backend failed, UI will still open but return 404/errors
    if sys.platform.startswith("linux"):
        webview.start(gui="qt")
    else:
        webview.start()


if __name__ == "__main__":
    main()
