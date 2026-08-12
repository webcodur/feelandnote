from .alignment_check import run_alignment_check
from .context import load_context
from .ledger_checks import run_ledger_checks
from .text_checks import run_text_checks


LABELS = {
    1: 'quoteSource resolution',
    2: 'JSON parse',
    3: 'image anchor integrity',
    4: 'Han chars in body',
    5: 'transliteration density',
    6: 'shorts<->longform quote parity',
    7: 'sentences >50 words',
    8: 'ko/en book alignment',
    9: 'orphan upload records',
    10: '_status <-> upload ledger',
}


def run(argv):
    context = load_context(argv)
    run_text_checks(context)
    run_alignment_check(context)
    status, uploads = run_ledger_checks(context)

    print(f'=== Publication Gate (Auto 1-10) — {context.slug} ===')
    print(
        f'    books: {len(context.books_en)} · shorts: {len(context.shorts_en)} · '
        f'status: {status or "none"} · uploads: {len(uploads)}\n'
    )
    for number in range(1, 11):
        items = context.issues[number]
        mark = 'PASS' if not items else 'FAIL'
        print(f'[{mark}] #{number} {LABELS[number]}: {len(items)}')
        for item in items[:8]:
            print(f'    - {item}')
        if len(items) > 8:
            print(f'    ... ({len(items) - 8} more)')
    print()
    failed = sum(1 for number in range(1, 11) if context.issues[number])
    print(f'Auto gate: {10 - failed}/10 PASS')
    return 1 if failed else 0
