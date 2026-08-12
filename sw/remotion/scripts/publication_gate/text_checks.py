import re


HAN_PATTERN = re.compile(r'[一-鿿]')
TRANSLITERATION_PATTERN = re.compile(r'\b[a-z]+-[a-z]+(?:-[a-z]+)?\b')
TRANSLITERATION_ALLOWLIST = set("""
twenty-six twenty-three twenty-four twenty-eight twenty-one twenty-five twenty-seven twenty-two twenty-nine
thirty-six thirty-eight thirty-nine thirty-two thirty-seven thirty-five thirty-three thirty-four
forty-five forty-three forty-two forty-four forty-six forty-eight forty-nine fifty-three fifty-six fifty-five
fifty-eight sixty-two sixty-six sixty-eight seventy-two seventy-six one-hundred-and-fifty-four
eleven-year-old nine-year-old nineteen-year-old twenty-six-year-old sixty-two-year-old thirty-seven-year-old
well-known well-versed self-evident one-line blood-stained self-taught log-cabin self-examination two-hundred
one-hundred seventeen-hundred six-hundred self-discipline self-evidence life-or-death two-column three-part
flat-footed flat-boat open-mocker iron-gall kid-skin sharp-pitched ill-fitting death-warrants dead-king
most-read rain-lashed one-line-moral mid-sentence self-measurement self-help head-on candle-maker self-doubt
present-day so-called first-hand second-hand high-pitched low-pitched wide-eyed single-handed long-running
well-laid full-color full-time part-time old-fashioned new-found far-reaching ill-fated well-spoken clear-eyed
plain-spoken sharp-tongued tight-lipped all-night all-day all-time non-stop semi-finished half-finished
so-and-so give-and-take back-and-forth life-and-death four-character six-character eight-line ten-stanza
pre-dawn post-war pre-war non-Christian non-believer co-author co-founder time-honored clear-cut full-fledged
high-handed underhanded left-handed good-natured warm-hearted cold-blooded hard-pressed wet-eyed ground-level
eye-level high-level low-level time-keeping self-keeping book-keeping record-keeping
""".split())


def _book_fields(label, book):
    fields = []
    for key in ('summary', 'contextMain', 'contextAfter'):
        if book.get(key):
            fields.append((f'{label} {key}', book[key], False))
    for index, pair in enumerate(book.get('quotePairs', [])):
        if pair.get('quote'):
            fields.append((f'{label} qp[{index}].quote', pair['quote'], True))
        if pair.get('after'):
            fields.append((f'{label} qp[{index}].after', pair['after'], False))
    return fields


def _meta_fields(metadata):
    fields = []
    for key, value in (metadata.get('narrator') or {}).items():
        if isinstance(value, str) and value:
            fields.append((f'meta.en.json narrator.{key}', value, False))
    host = metadata.get('host') or {}
    for key in ('philosophy', 'featuredQuote', 'title', 'bio'):
        if isinstance(host.get(key), str) and host[key]:
            fields.append((f'meta.en.json host.{key}', host[key], key == 'featuredQuote'))
    return fields


def _shorts_fields(label, data):
    return [
        (f'{label} {segment.get("id", "?")}', segment['text'], segment.get('role') == 'celeb')
        for segment in data.get('segments', []) if segment.get('text')
    ]


def _collect_quotes(records, shorts=False):
    output = []
    for label, data in records:
        if shorts:
            for segment in data.get('segments', []):
                quote = segment.get('text', '').strip()
                if segment.get('role') == 'celeb' and quote:
                    output.append((quote, segment.get('quoteSource', ''), f'{label} {segment.get("id", "?")}'))
        else:
            for index, pair in enumerate(data.get('quotePairs', [])):
                quote = pair.get('quote', '').strip()
                if quote:
                    output.append((quote, pair.get('quoteSource', ''), f'{label} qp[{index}]'))
    return output


def run_text_checks(context):
    issues = context.issues
    for label, book in context.books_en:
        for index, pair in enumerate(book.get('quotePairs', [])):
            if pair.get('quote', '').strip() and not pair.get('quoteSource'):
                issues[1].append(f'{label} qp[{index}] missing quoteSource')
        summary = book.get('summary', '')
        body = book.get('contextMain', '') + '\n' + book.get('contextAfter', '') + '\n' + '\n'.join(
            pair.get('quote', '') + '\n' + pair.get('after', '') for pair in book.get('quotePairs', [])
        )
        for image in book.get('images', []):
            anchor = image.get('text', '')
            haystack = summary if image.get('field') == 'summary' else body
            if anchor and anchor not in haystack:
                issues[3].append(f'{label} image "{image.get("file", "?")}" anchor "{anchor}" NOT FOUND')

    for label, data in context.shorts_en:
        for segment in data.get('segments', []):
            if segment.get('role') == 'celeb' and segment.get('text', '').strip() and not segment.get('quoteSource'):
                issues[1].append(f'{label} celeb segment "{segment.get("id", "?")}" missing quoteSource')
            for anchor in segment.get('imageChangeAt', []):
                if anchor.get('text', '') not in segment.get('text', ''):
                    issues[3].append(f'{label} {segment.get("id", "?")} anchor "{anchor.get("text", "")}" NOT FOUND')

    fields = _meta_fields(context.meta_en) if context.meta_en else []
    for label, book in context.books_en:
        fields += _book_fields(label, book)
    for label, data in context.shorts_en:
        fields += _shorts_fields(label, data)

    for field, text, _ in fields:
        if HAN_PATTERN.search(text):
            issues[4].append(f'{field} contains Han: {HAN_PATTERN.findall(text)[:5]}')
    for label, book in context.books_en:
        for key in ('summary', 'contextMain'):
            for index, paragraph in enumerate(book.get(key, '').split('\n\n')):
                hits = [hit for hit in TRANSLITERATION_PATTERN.findall(paragraph) if hit not in TRANSLITERATION_ALLOWLIST]
                if len(hits) > 2:
                    issues[5].append(f'{label} {key} para{index}: {len(hits)} translit: {hits}')

    long_quotes = _collect_quotes(context.books_en)
    for short_quote, short_source, short_location in _collect_quotes(context.shorts_en, shorts=True):
        if not short_source:
            continue
        short_main = short_source.split('—')[0].split('(')[0].strip()
        for long_quote, long_source, long_location in long_quotes:
            long_main = long_source.split('—')[0].split('(')[0].strip()
            if short_main and short_main == long_main:
                short_normal = re.sub(r'\s+', ' ', short_quote).strip()
                long_normal = re.sub(r'\s+', ' ', long_quote).strip()
                if short_normal != long_normal and short_normal not in long_normal and long_normal not in short_normal:
                    issues[6].append(
                        f'Quote src "{short_main}" wording differs:\n'
                        f'    {short_location}: {short_quote[:80]}\n    {long_location}: {long_quote[:80]}'
                    )
                    break

    for field, text, is_quote in fields:
        if is_quote:
            continue
        for sentence in re.split(r"(?<=[.!?'”’\"])\s+|\n\n", text):
            word_count = len([word for word in sentence.split() if word])
            if word_count > 50:
                issues[7].append(f'{field} {word_count}w: "{sentence[:120]}..."')
