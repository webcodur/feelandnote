#!/usr/bin/env python3
"""Render the gateway configuration without exposing API credentials."""
import json
import pathlib
import sys

root = pathlib.Path('/opt/feelandnote/database')
keys = json.loads((root / 'secrets/gateway.json').read_text())
config = (root / 'gateway.conf.template').read_text()
guard = '''if ($request_method !~ ^(GET|HEAD|OPTIONS)$) { return 503; }
    if ($uri ~ ^/auth/v1/(authorize|callback|verify)$) { return 503; }
    if ($uri ~ ^/rest/v1/rpc/) { return 503; }'''
config = config.replace('WRITE_GUARD', guard if '--readonly' in sys.argv else '')
for marker, name in [('PUBLIC_KEY', 'publicKey'), ('SERVER_KEY', 'serverKey'), ('ANON_JWT', 'anonJwt'), ('SERVICE_JWT', 'serviceJwt')]:
    literal = '"' + keys[name].replace('\\', '\\\\').replace('"', '\\"').replace('$', '\\$') + '"'
    config = config.replace(marker, literal)
(root / 'secrets/nginx.conf').write_text(config)
(root / 'secrets/nginx.conf').chmod(0o600)
print('Gateway configuration rendered privately.')
