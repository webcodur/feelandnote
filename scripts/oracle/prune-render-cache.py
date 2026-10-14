#!/usr/bin/env python3
"""Bounded runtime cache eviction. Dry-run unless --execute is supplied."""
import argparse
import json
import os
import stat
from pathlib import Path
import shutil
import time

GIB = 1024 ** 3
MAX_BATCH_BYTES = 256 * 1024 ** 2
MAX_CACHE_BYTES = 8 * GIB
MIN_FREE_BYTES = 10 * GIB
MIN_FREE_FRACTION = 0.5
NORMAL_AGE = 72 * 3600
PRESSURE_AGE = 3600
FETCH_AGE = 7 * 86400


def render_files(root, segment_stem=None):
    if not os.path.isdir(root):
        return
    with os.scandir(root) as entries:
        for entry in entries:
            if entry.is_symlink():
                continue
            try:
                if entry.is_dir(follow_symlinks=False):
                    stem = segment_stem
                    if stem is None and entry.name.endswith('.segments'):
                        stem = entry.path[:-9]
                    yield from render_files(entry.path, stem)
                elif ((segment_stem is not None and entry.name.endswith('.rsc')) or
                      (segment_stem is None and entry.name.endswith(('.html', '.rsc', '.meta')))):
                    stat = entry.stat(follow_symlinks=False)
                    stem = segment_stem or entry.path.rsplit('.', 1)[0]
                    yield stem, entry.path, stat.st_size, stat.st_mtime_ns
            except FileNotFoundError:
                continue


def summarize(records):
    size = newest = count = fingerprint = 0
    for file, length, mtime in records:
        size += length
        newest = max(newest, mtime)
        count += 1
        fingerprint ^= hash((str(file), length, mtime))
    return size, newest, count, fingerprint


def group_files(stem):
    if stem.startswith('fetch:'):
        paths = [stem[6:]]
    else:
        paths = [stem + suffix for suffix in ('.html', '.rsc', '.meta')]
    files = []
    for path in paths:
        try:
            if os.path.islink(path):
                continue
            stat = os.stat(path, follow_symlinks=False)
            files.append((Path(path), stat.st_size, stat.st_mtime_ns))
        except FileNotFoundError:
            continue
    segments = stem + '.segments'
    if not stem.startswith('fetch:') and not os.path.islink(segments):
        files.extend((Path(file), size, mtime)
                     for _, file, size, mtime in render_files(segments, stem))
    return files


def inventory(app):
    # Keep one compact summary per page, rather than every segment's Path/stat tuple.
    # Large caches otherwise exceed the cleaner's memory/time budget before eviction.
    groups = {}
    manifest = app / 'prerender-manifest.json'
    protected = set()
    if manifest.exists():
        routes = json.loads(manifest.read_text()).get('routes', {})
        protected = {str(app / 'server/app' / route.lstrip('/')) for route in routes}
    for locale in ('en', 'ko'):
        root = app / 'server/app' / locale
        if root.is_symlink() or (root.exists() and root.resolve() != root):
            raise RuntimeError('Cache locale must not resolve through symlinks')
        for stem, file, size, mtime in render_files(str(root)):
            if stem in protected:
                continue  # Build-time prerenders belong to the retained release.
            previous = groups.get(stem, (0, 0, 0, 0))
            groups[stem] = (previous[0] + size, max(previous[1], mtime), previous[2] + 1,
                            previous[3] ^ hash((file, size, mtime)))
    fetch = app / 'cache/fetch-cache'
    if fetch.exists() and fetch.resolve() != fetch:
        raise RuntimeError('Fetch cache must not resolve through symlinks')
    if not fetch.is_symlink() and fetch.exists():
        with os.scandir(fetch) as entries:
            for entry in entries:
                if entry.is_file(follow_symlinks=False) and not entry.is_symlink():
                    stat = entry.stat(follow_symlinks=False)
                    groups['fetch:' + entry.path] = summarize([(entry.path, stat.st_size, stat.st_mtime_ns)])
    return groups


def checked_group(name, summary):
    files = group_files(name)
    if summarize(files) != summary:
        return None
    try:
        if any(parent.resolve() != parent for parent in {file.parent for file, _, _ in files}):
            return None
        for file, length, mtime in files:
            info = file.lstat()
            if stat.S_ISLNK(info.st_mode) or info.st_mtime_ns != mtime or info.st_size != length:
                return None
    except FileNotFoundError:
        return None
    return files


def remove_group(app, files):
    removed = 0
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
    return removed


def prune_apps(apps, *, execute=False, free_bytes=None, disk_total_bytes=None,
               now=None, batch_bytes=MAX_BATCH_BYTES):
    now = time.time() if now is None else now
    groups = {}
    owners = {}
    for app in apps:
        if app.resolve(strict=True) != app:
            raise RuntimeError('Build directory must not redirect outside its slot')
        for name, summary in inventory(app).items():
            groups[name] = summary
            owners[name] = app
    total = sum(summary[0] for summary in groups.values())
    disk = shutil.disk_usage(apps[0])
    simulated_free = free_bytes is not None
    free_bytes = disk.free if free_bytes is None else free_bytes
    disk_total_bytes = disk.total if disk_total_bytes is None else disk_total_bytes
    free_target = max(MIN_FREE_BYTES, int(disk_total_bytes * MIN_FREE_FRACTION))
    pressure = total > MAX_CACHE_BYTES or free_bytes < free_target
    cutoff = now - (PRESSURE_AGE if pressure else NORMAL_AGE)
    candidates = sorted(groups.items(), key=lambda item: item[1][1])
    selected = removed = 0
    pages = 0
    for name, summary in candidates:
        size, newest_ns, _, _ = summary
        newest = newest_ns / 1e9
        if newest >= (now - FETCH_AGE if name.startswith('fetch:') else cutoff):
            continue
        if selected + size > batch_bytes:
            continue  # Preserve page groups; do not partially evict to fill the budget.
        files = checked_group(name, summary)
        if files is None:
            continue
        selected += size
        pages += 1
        if execute:
            removed += remove_group(owners[name], files)
    free_after = free_bytes + removed if simulated_free else shutil.disk_usage(apps[0]).free
    remaining_pressure = total - removed > MAX_CACHE_BYTES or free_after < free_target
    status = ('dry-run' if not execute else
              'ok' if not remaining_pressure else 'progress' if removed else 'blocked')
    # A bounded batch can need more runs, but no progress under pressure is a failure.
    exit_code = 1 if status == 'blocked' else 0
    return dict(execute=execute, status=status, exitCode=exit_code,
                pressure=pressure, cacheBytes=total, freeBytes=free_bytes,
                freeTargetBytes=free_target, selectedGroups=pages, selectedBytes=selected,
                removedBytes=removed, freeBytesAfter=free_after)


def prune(app, **kwargs):
    return prune_apps([app], **kwargs)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--execute', action='store_true')
    args = parser.parse_args()
    slots = Path('/opt/feelandnote/web/slots').resolve(strict=True)
    current = Path('/opt/feelandnote/web/current').resolve(strict=True)
    if current.parent != slots or current.name not in ('blue', 'green'):
        raise RuntimeError('Current release must resolve to a fixed Blue/Green slot')
    apps = [slot / 'sw/web/.next-verify' for slot in (slots / 'blue', slots / 'green')
            if (slot / 'sw/web/.next-verify').is_dir()]
    # Both slots share the disk. Old inactive render caches must not escape the budget.
    result = prune_apps(apps, execute=args.execute)
    print(json.dumps(result), flush=True)
    raise SystemExit(result['exitCode'])
