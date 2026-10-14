#!/usr/bin/env python3
"""Native PostgreSQL logical snapshot plus private runtime configuration."""
import hashlib
import json
import os
import pathlib
import shutil
import subprocess
import sys
from datetime import datetime, timezone

root = pathlib.Path('/opt/feelandnote/database')
target = pathlib.Path(sys.argv[1]).resolve()
container = sys.argv[2] if len(sys.argv) > 2 else 'feelandnote-db'
if container not in ('feelandnote-db', 'feelandnote-db-verify'):
    raise SystemExit('Unknown database container.')
if target.exists():
    raise SystemExit('Snapshot destination already exists; refusing to overwrite it.')
os.umask(0o077)
target.mkdir(parents=True, mode=0o700)


def run(*args):
    return subprocess.run(args, check=True, capture_output=True).stdout


session = subprocess.Popen(['docker', 'exec', '-i', container, 'psql', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'postgres'],
    stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)


def sql(query):
    session.stdin.write(query.rstrip(';') + ';\n')
    session.stdin.flush()
    value = session.stdout.readline().strip()
    if not value:
        raise SystemExit('Snapshot query failed; no credentials or records were printed.')
    return value


session.stdin.write('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;\n')
snapshot_id = sql('select pg_export_snapshot()')
(target / 'roles.sql').write_bytes(run('docker', 'exec', container, 'pg_dumpall', '-U', 'postgres', '--roles-only'))
(target / 'database.dump').write_bytes(run('docker', 'exec', container, 'pg_dump', '-U', 'postgres', '-d', 'postgres', '-Fc', '--snapshot=' + snapshot_id))
# Both the archive and all verification counts use the same exported snapshot.
tables = json.loads(sql("select jsonb_agg(t) from (select schemaname,tablename from pg_tables where schemaname in ('public','auth','private','storage','db_functions') order by 1,2) t"))
baseline = {}
for table in tables:
    relation = '"' + table['schemaname'].replace('"', '""') + '"."' + table['tablename'].replace('"', '""') + '"'
    baseline[table['schemaname'] + '.' + table['tablename']] = int(sql('select count(*) from ' + relation))
(target / 'baseline.json').write_text(json.dumps(baseline))
for name in ('secrets', 'auth'):
    shutil.copytree(root / name, target / name, ignore=shutil.ignore_patterns('node_modules'))
    for original in (root / name).rglob('*'):
        if original.is_file():
            metadata = original.stat()
            os.chown(target / original.relative_to(root), metadata.st_uid, metadata.st_gid)
for name in ('compose.yaml', 'Dockerfile.postgres', 'gateway.conf.template'):
    shutil.copyfile(root / name, target / name)
files = {str(path.relative_to(target)): {'bytes': path.stat().st_size, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}
         for path in target.rglob('*') if path.is_file()}
manifest = {'format': 'postgres-native-v1', 'created_at': datetime.now(timezone.utc).isoformat(),
            'server_version': sql("show server_version"), 'files': files}
(target / 'manifest.json').write_text(json.dumps(manifest, indent=2))
session.stdin.write('ROLLBACK;\n\\q\n')
session.stdin.flush()
session.communicate(timeout=10)
print(json.dumps({'format': manifest['format'], 'tables': len(baseline), 'auth_users': baseline['auth.users'], 'snapshot_created': True}))
