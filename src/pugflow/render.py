"""Headless browser-backed PNG rendering."""

from __future__ import annotations

import os
import shutil
import subprocess
import tempfile
import threading
from pathlib import Path

from .server import create_server


def find_browser() -> str:
    configured = os.environ.get("PUGFLOW_BROWSER")
    candidates = [configured] if configured else []
    candidates += [shutil.which(name) for name in ("msedge", "chrome", "chromium", "chromium-browser")]
    if os.name == "nt":
        candidates += [
            str(Path(os.environ.get("PROGRAMFILES(X86)", "C:/Program Files (x86)")) / "Microsoft/Edge/Application/msedge.exe"),
            str(Path(os.environ.get("PROGRAMFILES", "C:/Program Files")) / "Google/Chrome/Application/chrome.exe"),
        ]
    for candidate in candidates:
        if candidate and Path(candidate).is_file():
            return candidate
    raise RuntimeError("No Chromium browser found. Install Edge/Chrome/Chromium or set PUGFLOW_BROWSER.")


def render_png(source_path: Path, output_path: Path, *, css_path: Path | None = None, scale: float = 2, timeout: float = 30) -> None:
    source_path = source_path.resolve()
    output_path = output_path.resolve()
    css_path = css_path.resolve() if css_path else None
    if not source_path.is_file():
        raise FileNotFoundError(f"Diagram source not found: {source_path}")
    if css_path and not css_path.is_file():
        raise FileNotFoundError(f"Stylesheet not found: {css_path}")
    server = create_server("127.0.0.1", 0, quiet=True)
    server.render_source = source_path.read_text(encoding="utf-8")
    server.render_styles = css_path.read_text(encoding="utf-8") if css_path else ""
    server.render_result = None
    server.render_error = None
    server.render_event = threading.Event()
    server.asset_root = source_path.parent
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    browser = None
    profile = Path(tempfile.mkdtemp(prefix="pugflow-render-"))
    try:
        url = f"http://127.0.0.1:{server.server_address[1]}/render.html?scale={scale}"
        browser = subprocess.Popen([find_browser(), "--headless=new", "--disable-gpu", "--no-first-run", "--disable-extensions", f"--user-data-dir={profile}", url], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        if not server.render_event.wait(timeout):
            raise RuntimeError(f"Rendering timed out after {timeout:g} seconds.")
        if server.render_error:
            raise RuntimeError(server.render_error)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_bytes(server.render_result)
    finally:
        if browser and browser.poll() is None:
            try:
                browser.wait(timeout=3)
            except subprocess.TimeoutExpired:
                browser.terminate()
                try:
                    browser.wait(timeout=3)
                except subprocess.TimeoutExpired:
                    browser.kill()
        server.shutdown()
        server.server_close()
        thread.join(timeout=2)
        shutil.rmtree(profile, ignore_errors=True)
