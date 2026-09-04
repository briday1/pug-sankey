import json
import sys
import threading
import unittest
from pathlib import Path
from urllib.request import urlopen


ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "src"))

from pugflow import __version__  # noqa: E402
from pugflow.cli import build_parser  # noqa: E402
from pugflow.server import create_server  # noqa: E402


class ServerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = create_server("127.0.0.1", 0, quiet=True)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.base_url = f"http://127.0.0.1:{cls.server.server_address[1]}"

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join(timeout=2)

    def get(self, path):
        with urlopen(f"{self.base_url}{path}", timeout=3) as response:
            return response.status, response.headers, response.read()

    def test_serves_the_editor_and_bundled_assets(self):
        status, headers, body = self.get("/")
        self.assertEqual(status, 200)
        self.assertIn(b"Pugflow", body)
        self.assertIn(f"Version <span>{__version__}</span>".encode(), body)
        self.assertIn(b"https://github.com/briday1/pugflow", body)
        self.assertIn(b"https://pypi.org/project/pugflow/", body)
        self.assertEqual(body.count(b"Open Documentation"), 1)
        self.assertEqual(headers["X-Content-Type-Options"], "nosniff")

        status, headers, bundle = self.get("/app.mjs")
        self.assertEqual(status, 200)
        self.assertEqual(headers.get_content_type(), "text/javascript")
        self.assertIn(b"Pugflow showcase", bundle)

        status, headers, docs = self.get("/docs.html")
        self.assertEqual(status, 200)
        self.assertEqual(headers.get_content_type(), "text/html")
        self.assertIn(b"Complete offline reference", docs)

    def test_health_endpoint(self):
        status, headers, body = self.get("/healthz")
        self.assertEqual(status, 200)
        self.assertEqual(headers.get_content_type(), "application/json")
        self.assertEqual(json.loads(body), {"status": "ok", "version": __version__})

    def test_serves_an_optional_paired_gui_project(self):
        self.server.project_pug = "#canvas\n"
        self.server.project_css = "@node card { fill: #fff; }\n"
        self.assertEqual(self.get("/__project.pug")[2], b"#canvas\n")
        self.assertEqual(self.get("/__project.css")[2], b"@node card { fill: #fff; }\n")

    def test_cli_accepts_numbered_demos_and_defaults_to_one(self):
        self.assertIsNone(build_parser().parse_args([]).demo)
        self.assertEqual(build_parser().parse_args(["--demo"]).demo, 1)
        self.assertEqual(build_parser().parse_args(["--demo", "10"]).demo, 10)
        with self.assertRaises(SystemExit):
            build_parser().parse_args(["--demo", "11"])


if __name__ == "__main__":
    unittest.main()
