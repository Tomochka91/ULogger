import json
import threading
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlparse


class MockHandler(SimpleHTTPRequestHandler):
    # Папка, откуда отдаём статику
    static_dir: Path = Path(".")

    def translate_path(self, path: str) -> str:
        # Переопределяем, чтобы раздавать файлы из static_dir
        parsed = urlparse(path)
        rel = parsed.path.lstrip("/") or "index.html"
        return str((self.static_dir / rel).resolve())

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/health":
            payload = {"status": "ok", "source": "mock_server"}
            data = json.dumps(payload).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)
            return

        # Всё остальное — как статические файлы
        return super().do_GET()

    def log_message(self, format: str, *args):
        # потише в консоли
        return


class MockServer:
    def __init__(self, static_dir: Path, host: str = "127.0.0.1", port: int = 0):
        self.static_dir = static_dir.resolve()
        self.host = host
        self.port = port
        self._httpd: ThreadingHTTPServer | None = None
        self._thread: threading.Thread | None = None

    def start(self) -> int:
        handler = type("H", (MockHandler,), {})
        handler.static_dir = self.static_dir

        self._httpd = ThreadingHTTPServer((self.host, self.port), handler)
        self.port = self._httpd.server_address[1]

        self._thread = threading.Thread(target=self._httpd.serve_forever, daemon=True)
        self._thread.start()
        return self.port

    def stop(self):
        if not self._httpd:
            return
        self._httpd.shutdown()
        self._httpd.server_close()
        self._httpd = None
