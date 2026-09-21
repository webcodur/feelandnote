import importlib.util
import os
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('prune', Path(__file__).with_name('prune-render-cache.py'))
prune = importlib.util.module_from_spec(spec)
spec.loader.exec_module(prune)


class CacheTests(unittest.TestCase):
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
