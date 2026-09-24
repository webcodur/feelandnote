#!/usr/bin/env python3
"""Bounded runtime cache eviction. Dry-run unless --execute is supplied."""
import argparse
import json
import os
from pathlib import Path
import shutil
import time

GIB = 1024 ** 3
MAX_BATCH_BYTES = 256 * 1024 ** 2
MAX_CACHE_BYTES = 12 * GIB
MIN_FREE_BYTES = 10 * GIB
NORMAL_AGE = 72 * 3600
PRESSURE_AGE = 3600
FETCH_AGE = 7 * 86400


def inventory(app):
    groups = {}
    for locale in ('en', 'ko'):
        root = app / 'server/app' / locale
        if root.is_symlink() or (root.exists() and root.resolve() != root):
            raise RuntimeError('Cache locale must not resolve through symlinks')
        for directory, dirs, files in os.walk(root, followlinks=False):
            dirs[:] = [d for d in dirs if not (Path(directory) / d).is_symlink()]
            for name in files:
                file = Path(directory) / name
                if file.is_symlink():
                    continue
                relative = file.relative_to(root)
                segments = next((i for i, part in enumerate(relative.parts) if part.endswith('.segments')), None)
                if segments is not None:
                    if not name.endswith('.rsc'):
                        continue
                    stem = root.joinpath(*relative.parts[:segments], relative.parts[segments][:-9])
                elif file.suffix in ('.html', '.rsc', '.meta'):
                    stem = file.with_suffix('')
                else:
                    continue  # Never delete JS, manifests, or compiled route code.
                try:
                    stat = file.stat()
                    groups.setdefault(str(stem), []).append((file, stat.st_size, stat.st_mtime_ns))
                except FileNotFoundError:
                    continue
    fetch = app / 'cache/fetch-cache'
    if fetch.exists() and fetch.resolve() != fetch:
        raise RuntimeError('Fetch cache must not resolve through symlinks')
    if not fetch.is_symlink() and fetch.exists():
        for file in fetch.iterdir():
            if file.is_file() and not file.is_symlink():
                stat = file.stat()
                groups['fetch:' + str(file)] = [(file, stat.st_size, stat.st_mtime_ns)]
    return groups


def prune(app, *, execute=False, free_bytes=None, now=None, batch_bytes=MAX_BATCH_BYTES):
    now = time.time() if now is None else now
    groups = inventory(app)
    total = sum(size for files in groups.values() for _, size, _ in files)
    free_bytes = shutil.disk_usage(app).free if free_bytes is None else free_bytes
    pressure = total > MAX_CACHE_BYTES or free_bytes < MIN_FREE_BYTES
    cutoff = now - (PRESSURE_AGE if pressure else NORMAL_AGE)
    candidates = sorted(groups.items(), key=lambda item: max(mtime for _, _, mtime in item[1]))
    selected = removed = 0
    pages = 0
    for name, files in candidates:
        newest = max(mtime for _, _, mtime in files) / 1e9
        if newest >= (now - FETCH_AGE if name.startswith('fetch:') else cutoff):
            continue
        size = sum(size for _, size, _ in files)
        if selected + size > batch_bytes:
            continue  # Preserve page groups; do not partially evict to fill the budget.
        try:
            if any(file.is_symlink() or file.stat().st_mtime_ns != mtime or file.stat().st_size != length
                   for file, length, mtime in files):
                continue  # Rendering resumed after the scan.
        except FileNotFoundError:
            continue
        selected += size
        pages += 1
        if execute:
            # HTML first: subsequent HTML requests become cache misses and regenerate the page.
            for file, length, _ in sorted(files, key=lambda row: row[0].suffix != '.html'):
                try:
                    file.unlink()
                    removed += length
                except FileNotFoundError:
                    pass
            # Only remove now-empty segment directories, never an entire cache tree.
            for directory in sorted({f.parent for f, _, _ in files}, key=lambda p: len(p.parts), reverse=True):
                while directory != app and directory.name not in ('en', 'ko', 'fetch-cache'):
                    try:
                        directory.rmdir()
                    except OSError:
                        break
                    directory = directory.parent
    return dict(execute=execute, pressure=pressure, cacheBytes=total, freeBytes=free_bytes,
                selectedGroups=pages, selectedBytes=selected, removedBytes=removed)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--execute', action='store_true')
    args = parser.parse_args()
    slots = Path('/opt/feelandnote/web/slots').resolve(strict=True)
    current = Path('/opt/feelandnote/web/current').resolve(strict=True)
    if current.parent != slots or current.name not in ('blue', 'green'):
        raise RuntimeError('Current release must resolve to a fixed Blue/Green slot')
    app = current / 'sw/web/.next-verify'
    if app.resolve(strict=True) != app:
        raise RuntimeError('Build directory must not redirect outside the active slot')
    print(json.dumps(prune(app, execute=args.execute)))
