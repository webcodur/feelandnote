#!/usr/bin/env python3
"""Restore a verified native snapshot into an empty, explicitly named PGDATA."""
import argparse
import hashlib
import json
import os
import pathlib
import re
import subprocess
import time

parser = argparse.ArgumentParser()
parser.add_argument('snapshot')
parser.add_argument('--data-dir', required=True)
parser.add_argument('--container', default='feelandnote-db-restore-verify')
parser.add_argument('--network', default='feelandnote-restore-verify')
args = parser.parse_args()
source = pathlib.Path(args.snapshot).resolve()
target = pathlib.Path(args.data_dir).resolve()
if target.exists() or subprocess.run(['docker', 'inspect', args.container], capture_output=True).returncode == 0:
    raise SystemExit('Restore destination/container already exists; nothing was changed.')
if not args.container.startswith('feelandnote-db') or target in (pathlib.Path('/'), pathlib.Path('/opt/feelandnote'), source) or source in target.parents:
    raise SystemExit('Invalid restore destination.')
if args.network == 'feelandnote-db_default':
    raise SystemExit('Recovery verification must use an isolated network.')
manifest = json.loads((source / 'manifest.json').read_text())
if manifest['format'] != 'postgres-native-v1':
    raise SystemExit('This restore requires a native PostgreSQL snapshot.')
for name, expected in manifest['files'].items():
    path = (source / name).resolve()
    if not path.is_relative_to(source) or path.is_symlink() or not path.is_file() or hashlib.sha256(path.read_bytes()).hexdigest() != expected['sha256']:
        raise SystemExit('Snapshot file verification failed; nothing was changed.')
os.umask(0o077)
target.mkdir(parents=True, mode=0o700)
if subprocess.run(['docker', 'network', 'inspect', args.network], capture_output=True).returncode:
    subprocess.run(['docker', 'network', 'create', args.network], check=True)


def run(*command, **kwargs):
    return subprocess.run(command, capture_output=True, check=True, **kwargs).stdout


def sql(query):
    return run('docker', 'exec', '-i', args.container, 'psql', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'postgres', input=query.encode()).decode().strip()


run('docker', 'run', '-d', '--name', args.container, '--network', args.network, '--network-alias', 'db',
    '--mount', f'type=bind,src={target},dst=/var/lib/postgresql/data',
    '--mount', f'type=bind,src={source},dst=/restore,readonly',
    '--mount', f'type=bind,src={source}/secrets/web-revalidate,dst=/run/secrets/web-revalidate,readonly',
    '-e', 'POSTGRES_PASSWORD_FILE=/restore/secrets/postgres-password',
    'feelandnote/postgres:17.11-net0.20.3', '-c', 'shared_preload_libraries=pg_stat_statements,pg_net')
for _ in range(60):
    if subprocess.run(['docker', 'exec', args.container, 'pg_isready', '-h', '127.0.0.1', '-U', 'postgres'], capture_output=True).returncode == 0:
        break
    time.sleep(1)
else:
    raise SystemExit('Restore container did not become ready.')
roles = re.sub(r'^CREATE ROLE postgres;\n', '', (source / 'roles.sql').read_text(), flags=re.M)
roles = re.sub(r' GRANTED BY [^\s;]+', '', roles)
sql(roles)
try:
    run('docker', 'exec', args.container, 'pg_restore', '--exit-on-error', '-U', 'postgres', '-d', 'postgres', '/restore/database.dump')
except subprocess.CalledProcessError as error:
    (target.parent / (target.name + '-restore-error.log')).write_bytes(error.stderr)
    raise SystemExit('Database restore failed; details in the private restore log.')
baseline = json.loads((source / 'baseline.json').read_text())
differences = []
for relation, count in baseline.items():
    schema, table = relation.split('.', 1)
    quoted = '"' + schema.replace('"', '""') + '"."' + table.replace('"', '""') + '"'
    actual = int(sql('select count(*) from ' + quoted))
    if actual != count:
        differences.append({'table': relation, 'snapshot': count, 'restored': actual})
# The dump and verification counts use the same exported transaction snapshot.
if differences:
    print(json.dumps({'row_count_differences': differences}))
    raise SystemExit('Restored counts differ from the snapshot baseline.')
print(json.dumps({'restored': True, 'verified_tables': len(baseline), 'auth_users': baseline['auth.users']}))
