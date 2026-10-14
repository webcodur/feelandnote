#!/usr/bin/env python3
"""Read-only HTTP checks and token metadata; credentials never enter output."""
import base64
import json
import pathlib
import urllib.error
import urllib.request
import sys

keys = json.loads(pathlib.Path('/opt/feelandnote/database/secrets/gateway.json').read_text())
for name in ('anonJwt', 'serviceJwt'):
    claims = json.loads(base64.urlsafe_b64decode(keys[name].split('.')[1] + '=='))
    print(name, json.dumps({key: claims.get(key) for key in ('iss', 'aud', 'role', 'iat', 'exp')}))
base = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8000'
for path, headers in [
    ('/auth/v1/health', {}),
    ('/auth/v1/.well-known/jwks.json', {}),
    ('/rest/v1/celebs?select=id,slug&limit=1', {'apikey': keys['publicKey']}),
    ('/rest/v1/contents?select=id,locales:content_locales(locale,title)&limit=1', {'apikey': keys['publicKey']}),
    ('/rest/v1/user_accounts?select=id&limit=1', {'apikey': keys['publicKey']}),
    ('/rest/v1/user_accounts?select=id&limit=1', {'apikey': keys['serverKey']}),
]:
    try:
        key = headers.get('apikey', keys['publicKey'])
        with urllib.request.urlopen(urllib.request.Request(base + path, headers={**headers, 'apikey': key, 'Authorization': 'Bearer ' + key, 'User-Agent': 'node'}), timeout=15) as response:
            data = json.loads(response.read())
            print(json.dumps({'path': path.split('?')[0], 'privilege': 'server' if headers.get('apikey') == keys['serverKey'] else 'public',
                              'status': response.status, 'rows': len(data) if isinstance(data, list) else None}))
    except urllib.error.HTTPError as error:
        print(json.dumps({'path': path.split('?')[0], 'status': error.code}))
        raise SystemExit('API smoke test failed; response data was not printed.')
