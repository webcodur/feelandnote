import glob
import json
import os


ROOT = 'sw/remotion/public/episodes'
LINEUP = 'sw/remotion/scripts/youtube/youtube-lineup.json'


class GateContext:
    def __init__(self, slug):
        self.slug = slug
        self.base = f'{ROOT}/{slug}'
        self.issues = {number: [] for number in range(1, 13)}
        self.meta_en = None
        self.books_en = []
        self.shorts_en = []
        self.book_ko = {}
        self.book_en_by_dir = {}
        self.book_dirs = []

    def load(self, path):
        """Parse JSON and record check #2 failures instead of crashing."""
        try:
            with open(path, encoding='utf-8') as stream:
                return json.load(stream)
        except Exception as error:
            self.issues[2].append(f'{self.relative(path)}: {error}')
            return None

    def relative(self, path):
        return os.path.relpath(path, self.base).replace(os.sep, '/')


def resolve_slug(argv):
    """Accept `<slug>` and tolerate the retired `<stage> <slug>` call."""
    args = [arg for arg in argv[1:] if not arg.startswith('-')]
    if not args:
        print('usage: py -3.12 sw/remotion/scripts/publication-gate.py <slug>')
        raise SystemExit(2)
    if len(args) >= 2 and not os.path.isdir(f'{ROOT}/{args[0]}') and os.path.isdir(f'{ROOT}/{args[1]}'):
        print(f'ℹ stage arg "{args[0]}" ignored — stage folders no longer exist\n')
        return args[1]
    return args[0]


def load_context(argv):
    context = GateContext(resolve_slug(argv))
    if not os.path.isdir(context.base):
        print(f'❌ episode not found: {context.base}')
        raise SystemExit(2)

    meta_en_path = f'{context.base}/meta.en.json'
    context.meta_en = context.load(meta_en_path) if os.path.isfile(meta_en_path) else None
    if context.meta_en is None and not os.path.isfile(meta_en_path):
        print(f'❌ meta.en.json not found: {meta_en_path}')
        raise SystemExit(2)
    context.load(f'{context.base}/meta.ko.json')

    context.book_dirs = sorted(
        folder for folder in glob.glob(f'{context.base}/books/*') if os.path.isdir(folder)
    )
    for book_dir in context.book_dirs:
        for filename, bucket in (
            ('book.en.json', context.books_en),
            ('shorts.en.json', context.shorts_en),
        ):
            path = f'{book_dir}/{filename}'
            if not os.path.isfile(path):
                continue
            data = context.load(path)
            if data is not None:
                bucket.append((context.relative(path), data))
                if filename == 'book.en.json':
                    context.book_en_by_dir[os.path.basename(book_dir)] = data

        for filename in ('book.ko.json', 'shorts.ko.json'):
            path = f'{book_dir}/{filename}'
            if not os.path.isfile(path):
                continue
            data = context.load(path)
            if data is not None and filename == 'book.ko.json':
                context.book_ko[os.path.basename(book_dir)] = data

    if not context.books_en:
        print(f'❌ no books/*/book.en.json under {context.base}')
        raise SystemExit(2)
    return context
