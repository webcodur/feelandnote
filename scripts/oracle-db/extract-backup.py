#!/usr/bin/env python3
"""Extract the locally decrypted backup into a new private directory."""
import os
import json
import pathlib
import tarfile
import sys

archive = pathlib.Path(sys.argv[1]).resolve()
target = pathlib.Path(sys.argv[2]).resolve()
if target.exists():
    raise SystemExit('Extraction destination exists; refusing to overwrite it.')
os.umask(0o077)
target.mkdir(mode=0o700, parents=True)
with tarfile.open(archive, 'r:gz') as handle:
    for member in handle.getmembers():
        if member.issym() or member.islnk() or not (target / member.name).resolve().is_relative_to(target):
            raise SystemExit('Unexpected archive path.')
    handle.extractall(target, filter='data')
if json.loads((target / 'manifest.json').read_text()).get('format') != 'postgres-native-v1':
    raise SystemExit('This recovery requires a native PostgreSQL backup.')
# The safe tar filter deliberately removes ownership metadata. Restore only the
# two service-readable secret files to their fixed unprivileged container UIDs.
for secret in (target / 'secrets').iterdir():
    if not secret.is_file():
        raise SystemExit('Unexpected secret directory entry.')
    secret.chmod(0o600)
    uid = 1000 if secret.name == 'auth.json' else 999 if secret.name == 'web-revalidate' else 0
    os.chown(secret, uid, uid)
(target / 'secrets').chmod(0o700)
print('Extracted backup privately; no credentials or personal records were printed.')
