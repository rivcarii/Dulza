"""Sube el número de versión de la app en los dos lugares donde vive.

Uso:  python .dev/version.py 1.7.0

- sw.js        VERSION = 'dulza-v1.7.0'   (los dispositivos descargan la versión nueva y avisan «Hay una versión nueva»)
- js/core.js   D.version = '1.7.0'        (se ve en Ajustes)

Después de cambiar la versión: git add -A, git commit y git push; con GitHub Pages la app se actualiza sola.
"""
import os
import re
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))


def sub(path, pattern, repl):
    full = os.path.join(ROOT, path)
    with open(full, encoding='utf-8') as f:
        text = f.read()
    new, n = re.subn(pattern, repl, text, count=1)
    if n != 1:
        sys.exit(f'No encontré la versión en {path}')
    with open(full, 'w', encoding='utf-8', newline='') as f:
        f.write(new)


if len(sys.argv) != 2 or not re.fullmatch(r'\d+\.\d+\.\d+', sys.argv[1]):
    sys.exit('Uso: python .dev/version.py 1.7.0')

v = sys.argv[1]
sub('sw.js', r"const VERSION = 'dulza-v[\d.]+';", f"const VERSION = 'dulza-v{v}';")
sub('js/core.js', r"D\.version = '[\d.]+';", f"D.version = '{v}';")
print(f'Versión {v} en sw.js y js/core.js')
