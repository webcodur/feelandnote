import json
import os
import re

from .context import LINEUP


SHORTS_KEY = re.compile(r'^(ko|en)-shorts-(\d+)$')


def _slots_for(context, locale):
    found = []
    for book_dir in context.book_dirs:
        if not os.path.isfile(f'{book_dir}/book.{locale}.json'):
            continue
        shorts_path = f'{book_dir}/shorts.{locale}.json'
        if not os.path.isfile(shorts_path):
            continue
        try:
            with open(shorts_path, encoding='utf-8') as stream:
                found.append(json.load(stream).get('slot'))
        except Exception:
            found.append(None)
    output = {slot for slot in found if isinstance(slot, int)}
    next_slot = max(output) if output else 0
    for slot in found:
        if not isinstance(slot, int):
            next_slot += 1
            output.add(next_slot)
    return output


def run_ledger_checks(context):
    lineup_entry = None
    if os.path.isfile(LINEUP):
        try:
            with open(LINEUP, encoding='utf-8') as stream:
                lineup_entry = (json.load(stream) or {}).get(context.slug)
        except Exception as error:
            context.issues[2].append(f'{LINEUP}: {error}')
    uploads = (lineup_entry or {}).get('uploads') or {}
    valid_slots = _slots_for(context, 'ko') | _slots_for(context, 'en')

    for key in sorted(uploads):
        match = SHORTS_KEY.match(key)
        if not match:
            continue
        slot = int(match.group(2))
        if slot not in valid_slots:
            video_id = (uploads[key] or {}).get('videoId', '?')
            context.issues[9].append(
                f'lineup "{context.slug}.uploads.{key}" (videoId {video_id}) has no slot {slot} '
                f'— current slots {sorted(valid_slots) or "none"}. '
                f'Rendering slot {slot} would duplicate a published video.'
            )

    status = None
    status_path = f'{context.base}/_status.json'
    if os.path.isfile(status_path):
        try:
            with open(status_path, encoding='utf-8') as stream:
                status = (json.load(stream) or {}).get('status')
        except Exception as error:
            context.issues[2].append(f'_status.json: {error}')

    if status == 'done' and not uploads:
        context.issues[10].append(
            f'_status=done (= published) but lineup has 0 upload records for "{context.slug}". '
            f'Either the status is wrong or the ledger lost its entries.'
        )
    elif status in ('todo', 'live') and uploads:
        context.issues[10].append(
            f'_status={status} (= not published) but lineup records '
            f'{len(uploads)} upload(s): {", ".join(sorted(uploads))}. '
            f'Published material exists — status should be done.'
        )
    return status, uploads
