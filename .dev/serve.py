"""Servidor local de desarrollo para Dulza.

Uso:  python .dev/serve.py [puerto]

Sirve la carpeta del proyecto sin caché y acepta POST /__save?name=assets/x.png
(solo para generar los iconos desde el navegador durante el desarrollo).
"""
import http.server
import os
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 5173


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        '.webmanifest': 'application/manifest+json',
        '.js': 'text/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.svg': 'image/svg+xml',
        '.html': 'text/html; charset=utf-8',
    }

    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def do_POST(self):
        if not self.path.startswith('/__save'):
            self.send_error(404)
            return
        from urllib.parse import urlparse, parse_qs
        name = parse_qs(urlparse(self.path).query).get('name', [''])[0]
        target = os.path.abspath(os.path.join(ROOT, name))
        if not target.startswith(os.path.join(ROOT, 'assets')):
            self.send_error(400, 'solo se puede escribir en assets/')
            return
        n = int(self.headers.get('Content-Length', 0))
        data = self.rfile.read(n)
        with open(target, 'wb') as f:
            f.write(data)
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(('ok %d bytes' % len(data)).encode())

    def log_message(self, fmt, *args):
        pass


if __name__ == '__main__':
    with http.server.ThreadingHTTPServer(('127.0.0.1', PORT), Handler) as srv:
        print('Dulza en http://127.0.0.1:%d' % PORT, flush=True)
        srv.serve_forever()
