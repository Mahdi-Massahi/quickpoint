#!/usr/bin/env python3
"""QuickPoint development server with live reload.

Usage:
    python serve.py [presentation-path] [port]

If no path is given, a native folder picker dialog will open.

Examples:
    python serve.py
    python serve.py examples/HybridIntelligence
    python serve.py ~/Documents/MyPresentation 3000
"""

import http.server
import json
import os
import sys
import time
import webbrowser
import threading
import subprocess
import urllib.parse


LIVE_RELOAD_SCRIPT = '''
<script>
(function() {
    let lastMtime = 0;
    setInterval(async () => {
        try {
            const res = await fetch('/__mtime');
            const mtime = await res.json();
            if (lastMtime && mtime > lastMtime) location.reload();
            lastMtime = mtime;
        } catch {}
    }, 500);
})();
</script>
'''


def get_max_mtime(directory):
    """Get the most recent modification time across all files in a directory."""
    max_mtime = 0
    for root, _, files in os.walk(directory):
        for f in files:
            try:
                mt = os.path.getmtime(os.path.join(root, f))
                if mt > max_mtime:
                    max_mtime = mt
            except OSError:
                pass
    return max_mtime


class QuickPointHandler(http.server.SimpleHTTPRequestHandler):
    """Serves the app from project root and the presentation from any path on disk."""

    presentation_dir = None

    def do_GET(self):
        # Serve max mtime of presentation files as JSON
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == '/__mtime':
            mtime = get_max_mtime(self.presentation_dir)
            body = json.dumps(mtime).encode()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', len(body))
            self.end_headers()
            self.wfile.write(body)
            return

        # For index.html, inject the live reload script
        if parsed.path.endswith('/index.html') and not parsed.path.startswith('/presentation'):
            return self.serve_with_livereload()

        super().do_GET()

    def serve_with_livereload(self):
        path = self.translate_path(self.path)
        try:
            with open(path, 'rb') as f:
                content = f.read().decode()
        except (FileNotFoundError, IsADirectoryError):
            self.send_error(404)
            return

        content = content.replace('</body>', LIVE_RELOAD_SCRIPT + '</body>')
        body = content.encode()

        self.send_response(200)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.send_header('Content-Length', len(body))
        self.end_headers()
        self.wfile.write(body)

    def translate_path(self, path):
        path = urllib.parse.unquote(path.split('?', 1)[0].split('#', 1)[0])

        if path.startswith('/presentation/'):
            rel = path[len('/presentation/'):]
            return os.path.join(self.presentation_dir, rel)
        if path == '/presentation':
            return self.presentation_dir

        return super().translate_path(path)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def log_message(self, format, *args):
        if args and isinstance(args[0], str) and args[0].startswith('GET'):
            return
        super().log_message(format, *args)


def pick_folder(project_root):
    """Open a native macOS folder picker dialog."""
    script = f'''
    set chosenFolder to choose folder with prompt "Select a presentation folder (must contain config.json)" default location POSIX file "{project_root}"
    return POSIX path of chosenFolder
    '''
    result = subprocess.run(
        ['osascript', '-e', script],
        capture_output=True, text=True,
    )
    if result.returncode != 0:
        print('No folder selected.')
        sys.exit(0)

    return result.stdout.strip().rstrip('/')


def main():
    project_root = os.path.dirname(os.path.abspath(__file__))
    os.chdir(project_root)

    if len(sys.argv) >= 2 and not sys.argv[1].startswith('-'):
        presentation = os.path.abspath(sys.argv[1].rstrip('/'))
    else:
        presentation = pick_folder(project_root)

    port = int(sys.argv[2]) if len(sys.argv) > 2 else 8080

    config_path = os.path.join(presentation, 'config.json')
    if not os.path.exists(config_path):
        print(f'Error: {config_path} not found')
        sys.exit(1)

    QuickPointHandler.presentation_dir = presentation

    url = f'http://localhost:{port}/src/index.html?config=/presentation/config.json'

    server = http.server.HTTPServer(('localhost', port), QuickPointHandler)

    print(f'Presentation: {presentation}')
    print(f'Serving: {url}')
    print('Press Ctrl+C to stop\n')

    threading.Timer(0.5, lambda: webbrowser.open(url)).start()

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\nStopped.')
        server.shutdown()


if __name__ == '__main__':
    main()
