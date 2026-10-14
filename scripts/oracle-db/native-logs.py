#!/usr/bin/env python3
"""Show diagnostic logs after removing all known deployment credentials."""
import json
import pathlib
import subprocess
import sys
import urllib.parse

root = pathlib.Path('/opt/feelandnote/database/secrets')
secrets = []


def walk(value):
    if isinstance(value, dict):
        for item in value.values():
            walk(item)
    elif isinstance(value, list):
        for item in value:
            walk(item)
    elif isinstance(value, str) and len(value) >= 6:
        secrets.append(value)
        if '://' in value:
            try:
                password = urllib.parse.urlparse(value).password
                if password:
                    secrets.extend([password, urllib.parse.unquote(password)])
            except ValueError:
                pass


for path in root.glob('*.json'):
    walk(json.loads(path.read_text()))
secrets.append((root / 'postgres-password').read_text())
for name in sys.argv[1:]:
    if name not in ('feelandnote-rest', 'feelandnote-auth', 'feelandnote-gateway', 'feelandnote-db-verify', 'feelandnote-db'):
        raise SystemExit('Unknown native service.')
    result = subprocess.run(['docker', 'logs', '--tail', '15', name], capture_output=True)
    log = (result.stdout + result.stderr).decode()
    for value in sorted(set(secrets), key=len, reverse=True):
        log = log.replace(value, '[redacted]')
    print(name, log)
