# Docs server for development: plain static files, but never cached, so a reload always shows the files on disk.
# (python -m http.server lets the browser reuse ES modules heuristically, which shows stale components after an edit.)
# usage: python3 scripts/serve.py [port]
import sys, os, functools
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()
    def log_message(self, *a):
        pass

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
port = int(sys.argv[1]) if len(sys.argv) > 1 else 8823
ThreadingHTTPServer(('127.0.0.1', port), functools.partial(Handler, directory=root)).serve_forever()
