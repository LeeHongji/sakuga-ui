# Static server for the film page. Root is the repository, so the film imports the library from ../../src. No caching, so edits show up on reload.   usage: serve.py [port]
import sys, http.server, functools, pathlib
ROOT = pathlib.Path(__file__).resolve().parents[2]
class H(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store'); super().end_headers()
    def log_message(self, *a): pass
port = int(sys.argv[1]) if len(sys.argv) > 1 else 8830
http.server.ThreadingHTTPServer(('127.0.0.1', port), functools.partial(H, directory=str(ROOT))).serve_forever()
