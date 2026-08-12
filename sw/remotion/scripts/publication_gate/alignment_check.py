import os
import re


YEAR_PATTERN = re.compile(r'^\s*(\d{3,4})\s*$')


def _publication_year(book):
    match = YEAR_PATTERN.match(str((book.get('stats') or {}).get('publishYear', '')))
    return match.group(1) if match else None


def _local_cover(book):
    thumbnail = book.get('thumbnail_url')
    return thumbnail if isinstance(thumbnail, str) and thumbnail and not thumbnail.startswith('http') else None


def run_alignment_check(context):
    cover_uses = {}
    for book in context.book_ko.values():
        cover = _local_cover(book)
        if cover:
            cover_uses[cover] = cover_uses.get(cover, 0) + 1

    def unique_cover(book):
        cover = _local_cover(book)
        return cover if cover and cover_uses.get(cover) == 1 else None

    def find_home(english_book, current_dir):
        year, cover = _publication_year(english_book), unique_cover(english_book)
        if year:
            for folder, korean_book in sorted(context.book_ko.items()):
                if folder != current_dir and _publication_year(korean_book) == year:
                    return folder
        if cover:
            for folder, korean_book in sorted(context.book_ko.items()):
                if folder != current_dir and unique_cover(korean_book) == cover:
                    return folder
        return None

    for folder in sorted(context.book_en_by_dir):
        korean_book = context.book_ko.get(folder)
        english_book = context.book_en_by_dir[folder]
        if not korean_book:
            continue
        ko_year, en_year = _publication_year(korean_book), _publication_year(english_book)
        ko_cover, en_cover = _local_cover(korean_book), _local_cover(english_book)
        signal = None
        if ko_year and en_year:
            if ko_year != en_year:
                signal = f'publishYear ko={ko_year} en={en_year}'
        elif ko_cover and en_cover and ko_cover != en_cover and unique_cover(english_book) and find_home(english_book, folder):
            signal = f'cover ko={os.path.basename(ko_cover)} en={os.path.basename(en_cover)}'
        if not signal:
            continue
        home = find_home(english_book, folder)
        hint = f' — en content belongs to "{home}"' if home else ''
        context.issues[8].append(
            f'books/{folder}: ko="{korean_book.get("title", "?")}" but '
            f'en="{english_book.get("title", "?")}" ({signal}){hint}'
        )
