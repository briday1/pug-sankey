"""Command-line interface for Pugflow."""

from __future__ import annotations

import argparse
from pathlib import Path

from . import __version__
from .server import serve
from .render import render_png


def build_parser():
    parser = argparse.ArgumentParser(
        prog="pugflow",
        description="Open the editor or render a Pug diagram to PNG.",
    )
    parser.add_argument("input", nargs="?", type=Path, help="Pug source to render. Omit to open the editor.")
    parser.add_argument("-o", "--output", type=Path, help="PNG output path (default: input filename with .png).")
    parser.add_argument("--css", type=Path, help="External reusable-style CSS file.")
    parser.add_argument("--scale", type=float, default=2, help="PNG scale multiplier (default: 2).")
    parser.add_argument("--timeout", type=float, default=30, help="Headless rendering timeout in seconds (default: 30).")
    parser.add_argument("--host", default="127.0.0.1", help="Interface to bind (default: 127.0.0.1).")
    parser.add_argument("--port", default=4173, type=int, help="Port to bind; use 0 for an available port (default: 4173).")
    parser.add_argument("--no-browser", action="store_true", help="Do not open the application in the default browser.")
    parser.add_argument("--vim", action="store_true", help="Open the GUI with Vim editing mode enabled.")
    parser.add_argument("--gui", action="store_true", help="Open the input Pug and optional CSS in the GUI instead of rendering.")
    parser.add_argument(
        "--demo",
        nargs="?",
        const=1,
        type=int,
        choices=range(1, 11),
        metavar="N",
        help="Open the GUI with demo N (1-10; default: 1).",
    )
    parser.add_argument("--quiet", action="store_true", help="Suppress HTTP request logging.")
    parser.add_argument("--version", action="version", version=f"%(prog)s {__version__}")
    return parser


def main(argv=None):
    args = build_parser().parse_args(argv)
    if args.input and not args.gui:
        if args.scale <= 0:
            raise SystemExit("--scale must be greater than zero")
        output = args.output or args.input.with_suffix(".png")
        try:
            render_png(args.input, output, css_path=args.css, scale=args.scale, timeout=args.timeout)
        except (OSError, RuntimeError) as error:
            raise SystemExit(f"error: {error}") from error
        print(f"Wrote {output}")
        return
    if args.output:
        raise SystemExit("--output requires rendering an input .pug file")
    if args.css and not args.input:
        raise SystemExit("--css requires an input .pug file")
    css_path = args.css
    if args.input and css_path is None:
        candidate = args.input.with_suffix(".css")
        css_path = candidate if candidate.is_file() else None
    serve(args.host, args.port, open_browser=not args.no_browser, quiet=args.quiet, vim=args.vim,
          demo=args.demo, pug_path=args.input, css_path=css_path)


if __name__ == "__main__":
    main()
