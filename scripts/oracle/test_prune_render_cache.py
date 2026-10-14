import importlib.util
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('prune', Path(__file__).with_name('prune-render-cache.py'))
prune = importlib.util.module_from_spec(spec)
spec.loader.exec_module(prune)


class CacheTests(unittest.TestCase):
    def test_cleanup_pressure_without_progress_is_a_failure(self):
        with tempfile.TemporaryDirectory() as tmp:
            app = Path(tmp)
            recent = app / 'server/app/ko/recent.html'
            recent.parent.mkdir(parents=True)
            recent.write_bytes(b'keep recently generated page')
            os.utime(recent, (9990, 9990))
            result = prune.prune(app, now=10000, free_bytes=49 * prune.GIB,
                                 disk_total_bytes=100 * prune.GIB, execute=True)
            self.assertEqual(result['status'], 'blocked')
            self.assertEqual(result['exitCode'], 1)
            self.assertTrue(recent.exists())
            dry_run = prune.prune(app, now=10000, free_bytes=49 * prune.GIB,
                                  disk_total_bytes=100 * prune.GIB)
            self.assertEqual(dry_run['exitCode'], 0)

    def test_build_time_prerenders_are_preserved_under_pressure(self):
        with tempfile.TemporaryDirectory() as tmp:
            app = Path(tmp)
            root = app / 'server/app/ko'
            root.mkdir(parents=True)
            built = root / 'about.html'
            built.write_bytes(b'build artifact')
            os.utime(built, (0, 0))
            (app / 'prerender-manifest.json').write_text(json.dumps({'routes': {'/ko/about': {}}}))
            result = prune.prune(app, now=1_000_000, free_bytes=0, execute=True)
            self.assertEqual(result['removedBytes'], 0)
            self.assertTrue(built.exists())

    def test_half_disk_reserve_and_shared_slot_budget(self):
        with tempfile.TemporaryDirectory() as tmp:
            apps = [Path(tmp) / slot for slot in ('blue', 'green')]
            files = []
            for i, app in enumerate(apps):
                file = app / 'server/app/ko/content/cached.html'
                file.parent.mkdir(parents=True)
                file.write_bytes(b'0123456789')
                os.utime(file, (10000 + i, 10000 + i))
                files.append(file)
            result = prune.prune_apps(apps, now=20000, free_bytes=51 * prune.GIB,
                                      disk_total_bytes=100 * prune.GIB, execute=True)
            self.assertFalse(result['pressure'])
            self.assertEqual(result['cacheBytes'], 20)
            self.assertEqual(result['removedBytes'], 0)
            result = prune.prune_apps(apps, now=20000, free_bytes=49 * prune.GIB,
                                      disk_total_bytes=100 * prune.GIB, batch_bytes=10)
            self.assertTrue(result['pressure'])
            self.assertEqual(result['freeTargetBytes'], 50 * prune.GIB)
            self.assertTrue(all(file.exists() for file in files))
            result = prune.prune_apps(apps, now=20000, free_bytes=49 * prune.GIB,
                                      disk_total_bytes=100 * prune.GIB, batch_bytes=10, execute=True)
            self.assertEqual(result['removedBytes'], 10)
            self.assertEqual(result['status'], 'progress')
            self.assertEqual(result['exitCode'], 0)
            self.assertFalse(files[0].exists())
            self.assertTrue(files[1].exists())

    def test_combined_cache_limit_triggers_pressure_with_enough_free_disk(self):
        with tempfile.TemporaryDirectory() as tmp:
            apps = [Path(tmp) / slot for slot in ('blue', 'green')]
            for app in apps:
                app.mkdir()
            inventories = [{str(app / 'server/app/ko/cache'): (5 * prune.GIB, 0, 1, 0)}
                           for app in apps]
            with patch.object(prune, 'inventory', side_effect=inventories), \
                    patch.object(prune, 'checked_group', return_value=None):
                result = prune.prune_apps(apps, free_bytes=60 * prune.GIB,
                                          disk_total_bytes=100 * prune.GIB)
            self.assertTrue(result['pressure'])
            self.assertEqual(result['cacheBytes'], 10 * prune.GIB)

    def test_segment_inventory_keeps_one_summary_and_rejects_changed_page(self):
        with tempfile.TemporaryDirectory() as tmp:
            app = Path(tmp)
            root = app / 'server/app/en/celeb/person.with.dots'
            segments = Path(str(root) + '.segments')
            segments.mkdir(parents=True)
            html = Path(str(root) + '.html')
            html.write_bytes(b'old')
            os.utime(html, (0, 0))
            for i in range(100):
                file = segments / f'{i}.rsc'
                file.write_bytes(b'old')
                os.utime(file, (0, 0))
            snapshot = prune.inventory(app)
            self.assertEqual(len(snapshot), 1)
            self.assertEqual(snapshot[str(root)][:3], (303, 0, 101))
            new = segments / 'new.rsc'
            new.write_bytes(b'new')
            os.utime(new, (9990, 9990))
            with patch.object(prune, 'inventory', return_value=snapshot):
                result = prune.prune(app, now=10000, free_bytes=0, execute=True)
            self.assertEqual(result['removedBytes'], 0)
            self.assertTrue(html.exists() and new.exists())
            result = prune.prune(app, now=10000, free_bytes=0, execute=True)
            # The new segment is recent, so the whole page remains intact.
            self.assertEqual(result['removedBytes'], 0)

    def test_symlinks_cannot_escape_cache_and_fetch_retention_is_separate(self):
        with tempfile.TemporaryDirectory() as tmp:
            app = Path(tmp) / 'app'
            root = app / 'server/app/en'
            root.mkdir(parents=True)
            outside = Path(tmp) / 'outside'
            outside.mkdir()
            protected = outside / 'protected.html'
            protected.write_bytes(b'keep')
            os.utime(protected, (0, 0))
            try:
                (root / 'escape').symlink_to(outside, target_is_directory=True)
                (root / 'escape.html').symlink_to(protected)
            except OSError:
                self.skipTest('Symlink creation requires local permission')
            fetch = app / 'cache/fetch-cache'
            fetch.mkdir(parents=True)
            (fetch / 'recent').write_bytes(b'keep')
            old = fetch / 'old'
            old.write_bytes(b'expired')
            os.utime(old, (0, 0))
            result = prune.prune(app, now=1_000_000, free_bytes=0, execute=True)
            self.assertEqual(result['selectedGroups'], 1)
            self.assertFalse(old.exists())
            self.assertTrue(protected.exists())
            self.assertTrue((fetch / 'recent').exists())

    def test_old_page_evicted_as_group_recent_and_compiled_files_survive(self):
        with tempfile.TemporaryDirectory() as tmp:
            app = Path(tmp)
            def write(name, age):
                file = app / name
                file.parent.mkdir(parents=True, exist_ok=True)
                file.write_bytes(b'0123456789')
                os.utime(file, (1_000_000 - age, 1_000_000 - age))
                return file
            old = [write('server/app/en/celeb/old' + suffix, 300_000)
                   for suffix in ('.html', '.rsc', '.meta', '.segments/_full.segment.rsc')]
            recent = write('server/app/en/celeb/recent.html', 10)
            code = write('server/app/en/celeb/old.js', 300_000)
            result = prune.prune(app, now=1_000_000, free_bytes=20 * prune.GIB, batch_bytes=39, execute=True)
            self.assertEqual(result['removedBytes'], 0)
            self.assertTrue(all(p.exists() for p in old))
            result = prune.prune(app, now=1_000_000, free_bytes=20 * prune.GIB, batch_bytes=40)
            self.assertEqual(result['selectedBytes'], 40)
            self.assertTrue(all(p.exists() for p in old))
            result = prune.prune(app, now=1_000_000, free_bytes=20 * prune.GIB, batch_bytes=40, execute=True)
            self.assertEqual(result['removedBytes'], 40)
            self.assertFalse(any(p.exists() for p in old))
            self.assertTrue(recent.exists() and code.exists())

    def test_pressure_keeps_recently_regenerated_group(self):
        with tempfile.TemporaryDirectory() as tmp:
            app = Path(tmp)
            root = app / 'server/app/ko'
            root.mkdir(parents=True)
            for name, age in [('old.html', 8000), ('mixed.html', 8000), ('mixed.rsc', 10), ('new.html', 10)]:
                file = root / name
                file.write_bytes(b'x')
                os.utime(file, (10000 - age, 10000 - age))
            result = prune.prune(app, now=10000, free_bytes=0, execute=True)
            self.assertEqual(result['selectedGroups'], 1)
            self.assertFalse((root / 'old.html').exists())
            self.assertTrue((root / 'mixed.html').exists())


if __name__ == '__main__':
    unittest.main()
