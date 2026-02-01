from __future__ import annotations

import os
import sys
from pathlib import Path

import webview

from mock_server import MockServer


def is_frozen() -> bool:
    return bool(getattr(sys, "frozen", False))


def app_dir() -> Path:
    """
    Папка, где лежит exe (в frozen) или папка проекта (в dev).
    """
    if is_frozen():
        return Path(sys.executable).resolve().parent
    # ui/desktop_ui.py -> ui/
    return Path(__file__).resolve().parent


def pick_front_dir() -> Path:
    """
    1) Если задан APP_BUILD_DIR — берём его
    2) Иначе пытаемся взять build/ рядом с exe (или рядом с ui/ в dev)
    3) Иначе fallback на ui/mock_front/
    """
    env = os.getenv("APP_BUILD_DIR")
    if env:
        p = Path(env).resolve()
        if (p / "index.html").exists():
            return p

    base = app_dir()

    # build рядом с exe: dist/app.exe + dist/build/index.html
    candidate = (base / "build").resolve()
    if (candidate / "index.html").exists():
        return candidate

    # fallback на мок
    fallback = (base / "mock_front").resolve()
    if (fallback / "index.html").exists():
        return fallback

    raise FileNotFoundError("UI build not found (build/index.html or mock_front/index.html)")


def select_gui_backend() -> str | None:
    """
    На Linux — фиксируем Qt (иначе pywebview сначала попробует GTK и будет ругаться).
    На Windows/macOS — пусть выберет сам (обычно WebView2 / Cocoa).
    """
    if sys.platform.startswith("linux"):
        return "qt"
    return None


def main():
    front_dir = pick_front_dir()

    # Пока моковый сервер; позже заменим на проверку/старт backend.exe
    server = MockServer(static_dir=front_dir)
    port = server.start()

    url = f"http://127.0.0.1:{port}/"
    window = webview.create_window(
        title="ULogger",
        url=url,
        width=1200,
        height=800,
    )

    def on_closed():
        try:
            window.load_url("about:blank")
        except Exception:
            pass
        server.stop()

    window.events.closed += on_closed

    gui = select_gui_backend()
    if gui:
        webview.start(gui=gui)
    else:
        webview.start()


if __name__ == "__main__":
    main()
