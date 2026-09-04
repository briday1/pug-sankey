"""Dependency-free HTTP server for the Pugflow frontend."""

from __future__ import annotations

import json
import threading
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import quote, urlsplit

from . import __version__


STATIC_ROOT = Path(__file__).resolve().with_name("web")


class DiagramRequestHandler(SimpleHTTPRequestHandler):
    """Serve packaged assets and expose a small health endpoint."""

    server_version = f"Pugflow/{__version__}"
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map, ".mjs": "text/javascript"}

    def __init__(self, *args, directory=None, **kwargs):
        super().__init__(*args, directory=str(directory or STATIC_ROOT), **kwargs)

    def do_GET(self):  # noqa: N802 - required by BaseHTTPRequestHandler
        path = urlsplit(self.path).path
        if path == "/healthz":
            payload = json.dumps({"status": "ok", "version": __version__}).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(payload)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(payload)
            return
        if path == "/__render_source.pug" and hasattr(self.server, "render_source"):
            return self._send_text(self.server.render_source, "text/plain; charset=utf-8")
        if path == "/__render_styles.css" and hasattr(self.server, "render_styles"):
            return self._send_text(self.server.render_styles, "text/css; charset=utf-8")
        if path == "/__project.pug" and hasattr(self.server, "project_pug"):
            return self._send_text(self.server.project_pug, "text/plain; charset=utf-8")
        if path == "/__project.css" and hasattr(self.server, "project_css"):
            return self._send_text(self.server.project_css, "text/css; charset=utf-8")
        if hasattr(self.server, "asset_root") and path not in {"/", "/render.html"}:
            asset = (self.server.asset_root / path.lstrip("/")).resolve()
            if asset.is_relative_to(self.server.asset_root.resolve()) and asset.is_file():
                self.directory = str(self.server.asset_root)
        super().do_GET()

    def do_POST(self):  # noqa: N802 - required by BaseHTTPRequestHandler
        path = urlsplit(self.path).path
        if path not in {"/__render_output", "/__render_error"} or not hasattr(self.server, "render_event"):
            self.send_error(404)
            return
        payload = self.rfile.read(int(self.headers.get("Content-Length", "0")))
        if path == "/__render_output":
            self.server.render_result = payload
        else:
            self.server.render_error = payload.decode("utf-8", errors="replace")
        self.send_response(204)
        self.end_headers()
        self.server.render_event.set()

    def _send_text(self, value, content_type):
        payload = value.encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def end_headers(self):
        if urlsplit(self.path).path != "/healthz":
            self.send_header("Cache-Control", "no-cache")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        super().end_headers()

    def log_message(self, format, *args):
        if not getattr(self.server, "quiet", False):
            super().log_message(format, *args)


class DiagramServer(ThreadingHTTPServer):
    """Threaded development/desktop server with clean process shutdown."""

    allow_reuse_address = True
    daemon_threads = True


def create_server(host="127.0.0.1", port=4173, *, quiet=False):
    """Create a configured server without starting its blocking loop."""

    if not STATIC_ROOT.joinpath("index.html").is_file():
        raise RuntimeError(
            f"Packaged web assets are missing from {STATIC_ROOT}."
        )
    server = DiagramServer((host, port), DiagramRequestHandler)
    server.quiet = quiet
    return server


def serve(host="127.0.0.1", port=4173, *, open_browser=True, quiet=False, vim=False, demo=False, pug_path=None, css_path=None):
    """Run the web application until interrupted and return the bound URL."""

    server = create_server(host, port, quiet=quiet)
    if pug_path:
        server.project_pug = Path(pug_path).read_text(encoding="utf-8")
        server.project_css = Path(css_path).read_text(encoding="utf-8") if css_path else ""
    actual_port = server.server_address[1]
    browser_host = "127.0.0.1" if host in {"0.0.0.0", "::"} else host
    query = []
    if vim: query.append("vim=1")
    if demo: query.append(f"demo={int(demo)}")
    if pug_path:
        query.extend(["project=1", f"name={quote(Path(pug_path).stem)}", f"pug_name={quote(Path(pug_path).name)}"])
        if css_path: query.append(f"css_name={quote(Path(css_path).name)}")
    url = f"http://{browser_host}:{actual_port}" + ("?" + "&".join(query) if query else "")
    print(f"Pugflow {__version__}: {url}")
    print("Press Ctrl+C to stop.")

    if open_browser:
        threading.Timer(0.25, webbrowser.open, args=(url,)).start()

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping Pugflow.")
    finally:
        server.server_close()
    return url
