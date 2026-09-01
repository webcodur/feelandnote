"""
2-whisper.py — WhisperX 전사 + diff-match-patch 매핑

1) WhisperX로 오디오를 순수 전사 → 단어별 타임스탬프 추출
2) 전사 텍스트와 원문을 diff-match-patch로 대조
3) 매칭된 짝을 기준으로 타임스탬프를 원문 단어에 이식

단일 타겟 스코프:
  --long          : 롱폼(공용/도서/아웃트로)만
  --shorts <N>    : 쇼츠 {N}번 한 개만 (1-based)
  --solo <N>      : 1권 모드(SOLO) {N}번 책 한 권만 (1-based)
  세 플래그 중 정확히 하나 필수.

Usage:
  python scripts/voice/2-whisper.py --episode yi-sun-sin --long
  python scripts/voice/2-whisper.py --episode yi-sun-sin --shorts 1
  python scripts/voice/2-whisper.py --episode elon-musk-ko --solo 1
  python scripts/voice/2-whisper.py --episode yi-sun-sin --long --only D05c-context
  python scripts/voice/2-whisper.py --episode yi-sun-sin --shorts 1 --only S01-hook
"""
import argparse, json, os, sys, glob, io, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

from diff_match_patch import diff_match_patch


def _episode_dir_exists(root, person):
    # 신구조: episodes/.../<person>/_status.json 보유
    found = _find_person_dir(root, person)
    if found is not None:
        return True
    # 옛 구조 폴백
    for status in ['todo', 'live', 'done']:
        if os.path.isdir(os.path.join(root, 'public', 'episodes', status, person)):
            return True
    return False


def _find_person_dir(root, person):
    """episodes/ 재귀 스캔하여 _status.json 보유 인물 폴더 매치."""
    episodes_root = os.path.join(root, 'public', 'episodes')
    inactive = {'excluded', 'pre-todo', 'todo-easy', 'todo-normal', 'todo-hard'}
    statuses = {'todo', 'live', 'done'}

    def walk(d, depth):
        try:
            entries = os.listdir(d)
        except OSError:
            return None
        for name in entries:
            sub = os.path.join(d, name)
            if not os.path.isdir(sub):
                continue
            if name.startswith('_'):
                continue
            if depth == 0 and name in inactive:
                continue
            if depth == 0 and name in statuses:
                found = walk(sub, depth + 1)
                if found:
                    return found
                continue
            if os.path.exists(os.path.join(sub, '_status.json')):
                if name == person:
                    return sub
            else:
                found = walk(sub, depth + 1)
                if found:
                    return found
        return None
    return walk(episodes_root, 0)


def parse_ep_name(ep_name, root=None):
    """ep-name → (person, locale) 파싱.

    locale 접미사(-ko / -en) 필수. TS 계열(scripts/lib/episode.ts)과 동일 규약.
    분리 스키마(에피소드마다 폴더: `elon-musk-3/ko.json`) 우선.
    폴더가 없으면 옛 멀티파트 스키마(`elon-musk/ko-3.json`)로 폴백.
    """
    if ep_name.endswith('-en'):
        rest, lang = ep_name[:-3], 'en'
    elif ep_name.endswith('-ko'):
        rest, lang = ep_name[:-3], 'ko'
    else:
        sys.stderr.write(
            f'✗ --episode 에 locale 접미사가 필수다.\n'
            f'   받은 값: "{ep_name}"\n'
            f'   사용법: "<인물>-ko" (한국어) 또는 "<인물>-en" (영문)\n'
            f'   locale 자동 default 는 음성 덮어쓰기 사고를 막기 위해 차단됐다.\n'
        )
        sys.exit(1)
    # 분리 스키마: 이름 전체가 폴더로 존재하면 그대로 사용
    if root is not None and _episode_dir_exists(root, rest):
        return rest, lang
    m = re.match(r'^(.+)-(\d+)$', rest)
    if m:
        rest = m.group(1)
        lang = f'{lang}-{m.group(2)}'
    return rest, lang


def find_episode_dir(root, person):
    """신구조: episodes/.../<person>/ (_status.json 보유). 옛 구조 폴백 지원."""
    hit = _find_person_dir(root, person)
    if hit is not None:
        return hit
    for status in ['todo', 'live', 'done']:
        d = os.path.join(root, 'public', 'episodes', status, person)
        if os.path.isdir(d):
            return d
    raise FileNotFoundError(f'Episode not found: {person}')


def is_new_layout(episode_dir, base_lang):
    """신구조: meta.{locale}.json 또는 books/ 가 있으면 신구조"""
    return (
        os.path.isfile(os.path.join(episode_dir, f'meta.{base_lang}.json'))
        or os.path.isdir(os.path.join(episode_dir, 'books'))
    )


def _list_book_folders(episode_dir):
    """신구조 책 폴더 목록 (NN- prefix 정렬)"""
    books_dir = os.path.join(episode_dir, 'books')
    if not os.path.isdir(books_dir):
        return []
    entries = []
    for name in os.listdir(books_dir):
        full = os.path.join(books_dir, name)
        if os.path.isdir(full) and len(name) >= 3 and name[:2].isdigit() and name[2] == '-':
            entries.append(name)
    entries.sort()
    return entries


def _load_new_layout_episode(episode_dir, base_lang):
    """신구조 에피소드 로드 — meta.{locale}.json + books/{NN-*}/book.{locale}.json 머지"""
    meta_path = os.path.join(episode_dir, f'meta.{base_lang}.json')
    with open(meta_path, encoding='utf-8') as f:
        meta = json.load(f)
    books = []
    for folder in _list_book_folders(episode_dir):
        bd = os.path.join(episode_dir, 'books', folder)
        bp = os.path.join(bd, f'book.{base_lang}.json')
        if not os.path.isfile(bp):
            continue
        with open(bp, encoding='utf-8') as f:
            books.append(json.load(f))
    meta['books'] = books
    return meta


def resolve_episode_path(script_dir, episode_id):
    """Episode ID → 인물별 디렉토리 파일 경로 (레거시 전용; 신구조에서는 main 이 직접 분기)"""
    root = os.path.join(script_dir, '..', '..')
    person, locale = parse_ep_name(episode_id, root=root)
    parts = locale.split('-')
    base_lang = parts[0]
    part_num = int(parts[1]) if len(parts) > 1 else 1
    filename = f'{base_lang}-{part_num}.json' if part_num > 1 else f'{base_lang}.json'
    return os.path.join(find_episode_dir(root, person), filename)


def load_shorts_content(episode_dir, base_lang, shorts_index):
    """shorts 파일 로드 — 신구조 books/{NN-*}/shorts.{lang}.json 우선, 없으면 레거시 shorts/{lang}-{N}.json.

    신구조에서는 정렬된 책 폴더 중 shorts.{lang}.json 가진 폴더만 모아 N번째(1-based).
    base_lang 은 'ko' 또는 'en' (멀티파트 번호는 쇼츠 경로에 사용하지 않음).
    """
    book_folders = _list_book_folders(episode_dir)
    if book_folders:
        entries = []  # [(path, cfg)] — 폴더순
        for folder in book_folders:
            p = os.path.join(episode_dir, 'books', folder, f'shorts.{base_lang}.json')
            if os.path.exists(p):
                with open(p, 'r', encoding='utf-8') as f:
                    entries.append((p, json.load(f)))
        if entries:
            # slot 부여 — 파일 slot 우선, 없으면 max+폴더순(미발행분 뒤로). slot 전무 시 1..N(폴더순, 기존 동작).
            max_slot = max([c['slot'] for _, c in entries if isinstance(c.get('slot'), int)] + [0])
            for _, c in entries:
                if not isinstance(c.get('slot'), int):
                    max_slot += 1
                    c['slot'] = max_slot
            for _, cfg in entries:
                if cfg.get('slot') == shorts_index:
                    cfg['_shortsIdx1'] = shorts_index
                    return cfg
            print(f'✗ slot {shorts_index} 인 쇼츠 없음: 신구조 slot 목록 {sorted(c["slot"] for _, c in entries)}', file=sys.stderr)
            sys.exit(1)
    path = os.path.join(episode_dir, 'shorts', f'{base_lang}-{shorts_index}.json')
    if not os.path.exists(path):
        print(f'✗ shorts 파일 없음: {path}', file=sys.stderr)
        sys.exit(1)
    with open(path, 'r', encoding='utf-8') as f:
        cfg = json.load(f)
    cfg['_shortsIdx1'] = shorts_index
    return cfg


def load_solo_sections(episode_dir, base_lang, solo_index):
    """1권 모드(SOLO) 자유섹션 로드 — 신구조 books/{NN-*}/solo.{lang}.json.

    solo_index 는 1-based 책 인덱스. 정렬된 책 폴더의 solo_index 번째 폴더에서 solo.{lang}.json 의
    sections 배열을 읽는다. 파일이 없으면 빈 배열(정형부만으로 회차 구성).
    반환: (sections list, book_folder name)
    """
    book_folders = _list_book_folders(episode_dir)
    if solo_index < 1 or solo_index > len(book_folders):
        print(f'✗ solo 인덱스 {solo_index} 가 범위 밖: 책 {len(book_folders)}권 존재', file=sys.stderr)
        sys.exit(1)
    folder = book_folders[solo_index - 1]
    p = os.path.join(episode_dir, 'books', folder, f'solo.{base_lang}.json')
    if not os.path.exists(p):
        return [], folder
    with open(p, 'r', encoding='utf-8') as f:
        data = json.load(f)
    sections = data.get('sections') if isinstance(data, dict) else data
    return (sections or []), folder


def solo_display_text(ep, key):
    """SOLO 키 → 화면 표시 텍스트. 키 형식 'solo-B{NN}/S{nn}-{segId}'.

    정형부(greeting/intro/title/outro)는 책·인물 데이터에서 동적 생성하고,
    그 외 segId 는 solo.{lang}.json sections 에서 id 매칭한다. 없으면 None(=스킵).

    buildSoloSegments(solo-build.ts) 와 동일 규약:
      greeting → narrator.serviceGreeting
      intro    → `오늘의 한 권은 {host.nickname}의 서재에서 꺼낸 {book.title}입니다.`
      title    → `{book.title}\n{book.creator}`
      outro    → `이상으로 {host.nickname}의 한 권, {book.title}이었습니다.`
    """
    m = re.match(r'^solo-B(\d{2})/S\d{2}-(.+)$', key)
    if not m:
        return None
    book_idx = int(m.group(1)) - 1
    seg_id = m.group(2)
    books = ep.get('books', [])
    if book_idx >= len(books):
        return None
    book = books[book_idx]
    host = ep.get('host', {})
    narrator = ep.get('narrator', {})
    title = book.get('title', '')
    creator = book.get('creator', '')
    nickname = host.get('nickname', '')
    is_en = ep.get('locale') == 'en'

    if seg_id == 'greeting':
        return narrator.get('serviceGreeting')
    if seg_id == 'intro':
        if is_en:
            return f"Today's book — {title} by {creator}, brought to you by {host.get('nickname_en', nickname)}."
        return f'오늘의 한 권은 {nickname}의 서재에서 꺼낸 {title}입니다.'
    if seg_id == 'title':
        return f'{title}\n{creator}'
    if seg_id == 'outro':
        if is_en:
            return f"That was {title}, one book from {host.get('nickname_en', nickname)}'s shelf."
        return f'이상으로 {nickname}의 한 권, {title}이었습니다.'

    # 자유섹션 — solo sections 에서 id 매칭
    for s in ep.get('_soloSections', []):
        if s.get('id') == seg_id:
            return s.get('text')
    return None


def field_parts(full, parts):
    """긴 서술 필드의 토막 목록 — field-parts.ts bookFieldParts 와 동일 규약.
    토막 목록 우선, 폴백은 전체 텍스트 1토막. 빈 토막 제외."""
    ps = [p for p in (parts or []) if (p or '').strip()]
    if ps:
        return ps
    return [full] if (full or '').strip() else []


def get_display_text(ep, key):
    """WAV 파일 키(확장자 없음) → 화면 표시용 원문 텍스트 추출.

    key 형식:
      - 'A1-service-greeting' 등 고정 키
      - 'D{NN}a-title', 'D{NN}b-summary', 'D{NN}c-context'
        (토막 분할 시 'D{NN}b2-summary', 'D{NN}c2-context' 등 번호 부착)
      - 'D{NN}d{N}-quote', 'D{NN}d{N}-after' (quotePairs 동적 배열)
      - 'shorts-{N}/S{NN}-{segId}' (옵션 2: 접두사 필수)
      - 'solo-B{NN}/S{nn}-{segId}' (1권 모드)
    """
    if key.startswith('solo-B'):
        return solo_display_text(ep, key)
    if key == 'A1-service-greeting': return ep.get('narrator', {}).get('serviceGreeting')
    if key == 'A2-service-intro': return ep.get('narrator', {}).get('serviceIntro')
    if key == 'B1-celeb-intro': return ep.get('narrator', {}).get('celebIntro')
    if key == 'B2-philosophy': return ep.get('host', {}).get('philosophy')
    if key == 'A3-featured-quote': return ep.get('host', {}).get('featuredQuote')
    if key == 'E1-outro': return ep.get('narrator', {}).get('outro')
    if key == 'E2-interlude': return ep.get('narrator', {}).get('interlude')
    if key == 'E3-return-intro': return ep.get('narrator', {}).get('returnIntro')
    if key == 'E4-prev-recap': return ep.get('narrator', {}).get('prevRecap')

    # 쿼트페어: D{NN}d{N}{_part?}-(quote|after) — d1=pair0.quote, d2=pair0.after, d3=pair1.quote, ...
    # 후속 맥락 토막 분할 시 d2_2, d2_3 ...(0번 토막은 접미사 없음). quote는 분할 없음.
    m_qp = re.match(r'^D(\d{2})d(\d+)(?:_(\d+))?-(quote|after)$', key)
    if m_qp:
        idx = int(m_qp.group(1)) - 1
        n = int(m_qp.group(2))
        part = int(m_qp.group(3)) - 1 if m_qp.group(3) else 0
        kind = m_qp.group(4)
        pair_idx = (n - 1) // 2
        books = ep.get('books', [])
        if idx < len(books):
            pairs = books[idx].get('quotePairs') or []
            if pair_idx < len(pairs):
                pair = pairs[pair_idx]
                if kind == 'after':
                    ps = field_parts(pair.get('after'), pair.get('afterParts'))
                    return ps[part] if part < len(ps) else None
                return pair.get(kind)
        return None

    # 본문: D{NN}{a|b|c}{part?}-(title|summary|context) — part 없으면 첫 토막, b2=두 번째 토막
    m = re.match(r'^D(\d{2})([a-c])(\d*)-(title|summary|context)$', key)
    if m:
        idx = int(m.group(1)) - 1
        phase = m.group(2)
        part = int(m.group(3)) - 1 if m.group(3) else 0
        books = ep.get('books', [])
        if idx >= len(books):
            return None
        book = books[idx]
        if phase == 'a':
            parts = [book.get('title', '')]
            if book.get('creator'): parts.append(book['creator'])
            year = book.get('stats', {}).get('publishYear', '')
            if year: parts.append(str(year))
            return ' '.join(parts)
        if phase == 'b':
            ps = field_parts(book.get('summary'), book.get('summaryParts'))
            return ps[part] if part < len(ps) else None
        if phase == 'c':
            ps = field_parts(book.get('contextMain'), book.get('contextMainParts'))
            return ps[part] if part < len(ps) else None

    # 쇼츠: shorts-{N}/S{NN}-{segId} — 옵션 2 이후 접두사 필수
    m_short = re.match(r'^shorts-(\d+)/S\d{2}-(.+)$', key)
    if m_short:
        shorts_idx1 = int(m_short.group(1))
        seg_id = m_short.group(2)
        shorts_arr = ep.get('shorts')
        if isinstance(shorts_arr, list):
            for cfg in shorts_arr:
                if cfg and cfg.get('_shortsIdx1') == shorts_idx1:
                    for seg in cfg.get('segments') or []:
                        if seg.get('id') == seg_id:
                            return seg.get('text')
                    break
        return None

    return None


def apply_tts_replace(text, ep, extra=None):
    """tts.replace 치환맵을 텍스트에 적용 — 긴 키부터 치환하여 부분 매칭 충돌 방지.
    쇼츠처럼 본체 밖 파일에 별도 tts.replace가 있을 때는 extra로 주입한다."""
    if not text:
        return text
    replace_map = dict(ep.get('tts', {}).get('replace', {}))
    if extra:
        replace_map.update(extra)
    for k, v in sorted(replace_map.items(), key=lambda x: len(x[0]), reverse=True):
        text = text.replace(k, v)
    return text


def get_tts_text(ep, key):
    """키 → TTS에 실제 전달된 텍스트 (tts.titles + tts.replace 적용)"""
    tts = ep.get('tts', {})
    titles = tts.get('titles', [])

    # title: tts.titles[] 우선, 없으면 display_text
    m = re.match(r'^D(\d{2})a-title$', key)
    if m:
        idx = int(m.group(1)) - 1
        if idx < len(titles) and titles[idx]:
            return titles[idx]
        return get_display_text(ep, key)

    # 그 외: display_text 에 tts.replace 적용
    display = get_display_text(ep, key)

    # 쇼츠 key: 쇼츠 cfg의 tts.replace를 본체에 머지
    extra = None
    m_short = re.match(r'^shorts-(\d+)/S\d{2}-(.+)$', key)
    if m_short:
        shorts_idx1 = int(m_short.group(1))
        for cfg in ep.get('shorts') or []:
            if cfg and cfg.get('_shortsIdx1') == shorts_idx1:
                extra = (cfg.get('tts') or {}).get('replace')
                break

    return apply_tts_replace(display, ep, extra=extra)


def strip(s):
    """비교용 정규화 — 구두점·공백 제거, 소문자"""
    return re.sub(r'[^a-zA-Z0-9\uAC00-\uD7A3\u3040-\u30FF\u4E00-\u9FFF]', '', s).lower()


def map_whisper_to_display(whisper_words, display_text, duration, tts_replace=None):
    """diff-match-patch로 WhisperX 전사 결과를 원문 단어에 매핑.
    tts_replace가 주어지면 치환 키 word의 duration이 실제 발음 음절수 대비 너무 짧은 경우
    (예: '1865년' 원문 ↔ '천팔백육십오 년' 실제 발음) 이웃 단어 사이 gap을 흡수해 확장."""
    display_words = display_text.split()
    if not whisper_words or not display_words:
        return [{'word': w, 'start': 0, 'end': duration} for w in display_words]

    # 1) 전사 텍스트와 원문을 연결 문자열로 만듦 (공백 제거)
    w_joined = ''.join(strip(w['word']) for w in whisper_words)
    d_joined = ''.join(strip(w) for w in display_words)

    # 2) diff-match-patch로 대조
    dmp = diff_match_patch()
    diffs = dmp.diff_main(w_joined, d_joined)
    dmp.diff_cleanupSemantic(diffs)

    # 3) diff를 걸으면서 whisper 문자 위치 → display 문자 위치 매핑 테이블 구축
    #    whisper_char_idx → display_char_idx (EQUAL 구간만)
    w_char_to_time = []  # whisper_char_idx → (start, end) 시각
    ci = 0
    for w in whisper_words:
        n = len(strip(w['word']))
        for _ in range(n):
            w_char_to_time.append((w['start'], w['end']))
            ci += 1

    # diff에서 EQUAL 구간의 whisper char → display char 매핑
    w_pos = 0  # whisper 문자열 포인터
    d_pos = 0  # display 문자열 포인터
    d_char_times = [None] * len(d_joined)  # display 문자별 시각
    last_delete_times = []  # 직전 DELETE 구간 타이밍 (치환 감지용)

    for op, text in diffs:
        n = len(text)
        if op == 0:  # EQUAL
            last_delete_times = []
            for i in range(n):
                if w_pos + i < len(w_char_to_time):
                    d_char_times[d_pos + i] = w_char_to_time[w_pos + i]
            w_pos += n
            d_pos += n
        elif op == -1:  # DELETE (whisper에만 있음)
            last_delete_times = [w_char_to_time[w_pos + i] for i in range(n) if w_pos + i < len(w_char_to_time)]
            w_pos += n
        elif op == 1:  # INSERT (display에만 있음)
            # DELETE→INSERT 치환: 삭제 구간 타이밍을 삽입 구간에 비례 이식
            # (숫자 "1800" ↔ 한글 발음 "천팔백" 등)
            if last_delete_times:
                for i in range(n):
                    src_idx = int(i * len(last_delete_times) / n)
                    d_char_times[d_pos + i] = last_delete_times[src_idx]
                last_delete_times = []
            d_pos += n

    # 4) display 단어별 시각 결정
    result = []
    d_char_idx = 0
    for dw in display_words:
        n = len(strip(dw))
        times = [d_char_times[d_char_idx + i] for i in range(n) if d_char_idx + i < len(d_char_times) and d_char_times[d_char_idx + i] is not None]
        d_char_idx += n

        if times:
            start = min(t[0] for t in times)
            end = max(t[1] for t in times)
            result.append({'word': dw, 'start': round(start, 3), 'end': round(end, 3)})
        else:
            # 매칭 실패 — 이전/다음에서 보간
            prev_end = result[-1]['end'] if result else 0
            result.append({'word': dw, 'start': round(prev_end, 3), 'end': round(prev_end, 3)})

    # 5) 보간: 타임스탬프 없는 단어에 이전/다음에서 시간 배분
    for i in range(len(result)):
        if result[i]['start'] == result[i]['end'] and i > 0:
            prev_end = result[i - 1]['end']
            # 다음 유효 시각 찾기
            next_start = duration
            for j in range(i + 1, len(result)):
                if result[j]['start'] != result[j]['end']:
                    next_start = result[j]['start']
                    break
            # 누락 구간 균등 분배
            gap_count = 0
            for j in range(i, len(result)):
                if result[j]['start'] == result[j]['end']:
                    gap_count += 1
                else:
                    break
            seg = (next_start - prev_end) / max(gap_count, 1)
            for j in range(gap_count):
                result[i + j]['start'] = round(prev_end + j * seg, 3)
                result[i + j]['end'] = round(prev_end + (j + 1) * seg, 3)

    # 6) overlap 해소: start가 이전 단어 start 이하인 경우 균등 분배
    for i in range(1, len(result)):
        if result[i]['start'] <= result[i - 1]['start']:
            # overlap 구간 범위 파악 (연속된 overlap 묶음)
            group_start = i - 1
            group_end = i
            while group_end + 1 < len(result) and result[group_end + 1]['start'] <= result[group_end]['start']:
                group_end += 1
            # 묶음의 시간 범위: 첫 단어 start ~ 마지막 단어 end
            t_start = result[group_start]['start']
            t_end = max(result[j]['end'] for j in range(group_start, group_end + 1))
            count = group_end - group_start + 1
            seg = (t_end - t_start) / count
            for j in range(count):
                result[group_start + j]['start'] = round(t_start + j * seg, 3)
                result[group_start + j]['end'] = round(t_start + (j + 1) * seg, 3)

    # 7) tts.replace 역매핑 후처리: display word가 치환 키("1865년")면 whisper_words 내에서
    #    치환값("천팔백육십오 년")의 연속 토큰 시퀀스를 찾아 전체 구간(첫 token.start ~ 마지막 token.end)을
    #    해당 display word의 timing으로 이식. diff-match-patch의 글자수 차이 매핑 문제를 근본 해결.
    if tts_replace:
        for i, dw in enumerate(display_words):
            # display word가 치환 키와 매칭되는지 (조사·구두점 붙은 변형 허용)
            matched_key = None
            for key in tts_replace:
                # 정확 일치 또는 "키+조사/구두점" 형태
                if dw == key or (dw.startswith(key) and len(dw) > len(key) and not strip(dw[len(key):])[:1].isalnum()):
                    matched_key = key
                    break
            if not matched_key:
                continue
            replaced_value = tts_replace[matched_key]
            target_tokens = replaced_value.split()
            if not target_tokens:
                continue
            # whisper_words 연속 sequence에서 target_tokens 매칭 찾기 (strip 비교로 구두점 무시)
            target_stripped = [strip(t) for t in target_tokens]
            found_range = None
            for j in range(len(whisper_words) - len(target_tokens) + 1):
                if all(strip(whisper_words[j + k]['word']).startswith(target_stripped[k])
                       or target_stripped[k].startswith(strip(whisper_words[j + k]['word']))
                       for k in range(len(target_tokens))):
                    found_range = (whisper_words[j]['start'], whisper_words[j + len(target_tokens) - 1]['end'])
                    break
            if found_range:
                result[i]['start'] = round(found_range[0], 3)
                result[i]['end'] = round(found_range[1], 3)

    return result


def is_celeb_voice_key(key):
    """ElevenLabs 자동 라우팅 대상 — 키(확장자 없음) 기반"""
    return (
        key in ('A3-featured-quote', 'B2-philosophy')
        or bool(re.match(r'^D\d{2}d-quote$', key))
        or bool(re.match(r'^D\d{2}d\d+-quote$', key))
        or bool(re.match(r'^shorts-\d+/S\d{2}-celeb-', key))
        or bool(re.match(r'^shorts-\d+/S\d{2}-book-quote', key))
    )


def path_to_key(wav_path, default_dir):
    """wav 절대 경로 → default_dir 기준 상대 키 (확장자 제거, 슬래시 정규화).

    default_dir 이외 엔진(elevenlabs 등)에 있어도 동일 상대 경로를 키로 쓴다.
    """
    # 엔진 디렉토리의 공통 부모가 voice_dir 이므로, elevenlabs 쪽 파일은
    # voice_dir/elevenlabs/<subpath> 형태다. default_dir 기준 상대 경로를 만들려면
    # 엔진 디렉토리만 잘라내면 된다.
    voice_dir = os.path.dirname(default_dir)
    for engine in (os.listdir(voice_dir) if os.path.isdir(voice_dir) else []):
        eng_dir = os.path.join(voice_dir, engine)
        if os.path.isdir(eng_dir) and wav_path.startswith(eng_dir + os.sep):
            rel = os.path.relpath(wav_path, eng_dir)
            return rel.replace('\\', '/').removesuffix('.wav')
    # 폴백 — default_dir 기준
    rel = os.path.relpath(wav_path, default_dir)
    return rel.replace('\\', '/').removesuffix('.wav')


# ─── 세력도(Faction) 모드 ───

def faction_quote_text(person, lang):
    """인물 원대사(발화 스타일 prefix 제외) — 의미 덩어리(chunks) join 우선, 없으면 통대사.
       faction-align.ts 의 chunks 와 동일 텍스트라 단어 매핑이 어긋나지 않는다."""
    if lang == 'en':
        chunks = person.get('quoteEnChunks')
        if chunks:
            return ' '.join(c.strip() for c in chunks if c and c.strip())
        return (person.get('quoteEn') or person.get('quote') or '').strip()
    chunks = person.get('quoteChunks')
    if chunks:
        return ' '.join(c.strip() for c in chunks if c and c.strip())
    return (person.get('quote') or '').strip()


def faction_scene_beats(cluster):
    """장면 발화 — 클러스터 직속 beats 와 서사 항목(isPerson=false)이 쥔 beats."""
    for beat in cluster.get('beats') or []:
        yield beat
    for entry in cluster.get('people') or []:
        if entry.get('isPerson') is False:
            for beat in entry.get('beats') or []:
                yield beat


def faction_scene_beat_file(beat, lang):
    """장면 발화 음원 파일명 — 명시 voiceFile > 영구 신원(id) > 본문 해시(id 없는 옛 데이터 폴백).
       규칙은 Faction/voice-names.ts 의 vnBeatVoiceFile 과 100% 같아야 한다(FNV-1a, 36진법)."""
    if beat.get('voiceFile'):
        return beat['voiceFile']
    if beat.get('id'):
        return f"scene-{beat['id']}-en.wav" if lang == 'en' else f"scene-{beat['id']}.wav"
    speaker = (beat.get('speakerEn') or beat.get('speaker')) if lang == 'en' else beat.get('speaker')
    key = f"{(speaker or '').strip()}\n{faction_beat_text(beat, lang)}"
    h = 0x811c9dc5
    for ch in key.strip().replace('\r\n', '\n'):
        h ^= ord(ch)
        h = (h * 0x01000193) & 0xFFFFFFFF
    digits = '0123456789abcdefghijklmnopqrstuvwxyz'
    s = ''
    n = h
    while n:
        s = digits[n % 36] + s
        n //= 36
    return f'scene-{s or "0"}.wav'


def faction_beat_text(beat, lang):
    """장면 발화 원문(발화 스타일 prefix 제외) — 화면 조판용 줄바꿈·빈 줄을 한 흐름으로 편다.
       faction/data.ts 의 beatNarrationTextOf 와 같은 결과라 단어 매핑이 어긋나지 않는다."""
    text = (beat.get('textEn') or beat.get('text')) if lang == 'en' else beat.get('text')
    return ' '.join((text or '').split())


def faction_part_clusters(data, part):
    """쇼츠 편 N 에 들어가는 (gi, ci) 집합 — shared/lib/faction-shorts.ts factionShortsSegments 와 같은 규칙.
       편은 이야기 순서 위의 경계로만 갈린다: 세력 sequence 의 {kind:'cut'}(장면 사이·세력 끝)과
       컷의 shortsCutBefore(장면 안). 장면 한가운데서 갈린 장면은 양쪽 편에 다 속한다(인물 음원은 장면 단위라 둘 다 필요).
       옛 group.part 배정은 폐기했다(26.08.28) — 읽지 않는다."""
    segments = [set()]
    for gi, g in enumerate(data.get('groups', [])):
        if g.get('disabled') or g.get('longformOnly'):
            continue
        clusters = g.get('clusters') or []
        sequence = g.get('sequence') or [{'kind': 'cluster', 'clusterIndex': i} for i in range(len(clusters))]
        for item in sequence:
            if item.get('kind') == 'cut':
                if segments[-1]:
                    segments.append(set())
                continue
            if item.get('kind') != 'cluster':
                continue
            ci = item.get('clusterIndex')
            if ci is None or ci >= len(clusters):
                continue
            beats = clusters[ci].get('beats') or []
            inner = [bi for bi, b in enumerate(beats) if bi > 0 and b.get('shortsCutBefore') is True]
            segments[-1].add((gi, ci))
            for _ in inner:
                if segments[-1]:
                    segments.append(set())
                segments[-1].add((gi, ci))
    segments = [s for s in segments if s]
    if part is None or part < 1 or part > len(segments):
        return None
    return segments[part - 1]


def faction_quote_targets(data, lang, part=None):
    """faction-data.json → {stem: 원대사}. buildCues/vnPersonQuote 인덱싱을 재현한다(렌더·faction-align 과 동일 키).
       모든 세력이 clusters 를 가지므로 인물 카드 키는 항상 F{gi}C{ci}P{pi}-quote 다(solo 세력 포함).
       장면 발화(beats)는 데이터에 박힌 voiceFile 을 stem 으로 쓴다 — 파일명 해시(vnSceneBeat)를 재현하지
       않는다. 합성된 발화는 voiceFile 이 있고, 없으면 음원 자체가 없어 전사할 대상도 아니다.
       같은 stem 을 인물 카드와 장면 발화가 함께 쥐면 장면 발화가 이긴다(렌더가 읽는 원천).
       part 지정 시 그 편 경계 안의 장면만(faction_part_clusters). disabled 제외."""
    out = {}
    part_clusters = faction_part_clusters(data, part) if part is not None else None
    for gi, g in enumerate(data.get('groups', [])):
        if g.get('disabled'):
            continue
        for ci, cluster in enumerate(g.get('clusters') or []):
            if part_clusters is not None and (gi, ci) not in part_clusters:
                continue
            for pi, p in enumerate(cluster.get('people', [])):
                if p.get('disabled'):
                    continue
                q = faction_quote_text(p, lang)
                if q:
                    out[f'F{gi + 1:02d}C{ci + 1:02d}P{pi + 1:02d}-quote'] = q
            for beat in faction_scene_beats(cluster):
                t = faction_beat_text(beat, lang)
                if t:
                    out[os.path.splitext(faction_scene_beat_file(beat, lang))[0]] = t
    return out


def run_faction(args):
    """세력도 전사 — factions/<ep>/voice/*.wav 를 WhisperX 로 전사하고, 인물 대사(원문)에 단어 타이밍을
       매핑해 voice/2-word-timings.json(키=wav stem)에 쓴다. 이후 pnpm voice:faction-align 이 이 파일을 읽는다."""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    root = os.path.join(script_dir, '..', '..')
    ep_name = args.episode
    lang = 'en' if args.lang == 'en' else 'ko'
    faction_dir = os.path.join(root, 'public', 'factions', ep_name)
    voice_dir = os.path.join(faction_dir, 'voice')
    data_path = os.path.join(faction_dir, 'faction-data.json')
    if not os.path.isfile(data_path):
        print(f'✗ faction-data.json 없음: {data_path}', file=sys.stderr)
        sys.exit(1)
    with open(data_path, encoding='utf-8') as f:
        data = json.load(f)
    targets_text = faction_quote_targets(data, lang, args.part)

    # part 지정 시 그 편 인물 wav 만 전사 — targets_text 키(stem)에 있는 wav 만 남긴다
    wav_files = sorted(glob.glob(os.path.join(voice_dir, '*.wav')))
    wav_files = [f for f in wav_files if os.path.splitext(os.path.basename(f))[0] in targets_text]
    if args.only:
        filters = [s.strip() for s in args.only.split(',') if s.strip()]
        wav_files = [f for f in wav_files if any(flt in os.path.basename(f) for flt in filters)]

    part_label = f' {args.part}편' if args.part is not None else ''
    print(f'세력도: {ep_name}{part_label} ({lang}) · 모델 {args.model} (whisperx + diff-match-patch)')
    print(f'{len(wav_files)}개 WAV 분석\n')

    import whisperx
    import torch
    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    compute = 'float16' if device == 'cuda' else 'int8'
    asr_model = whisperx.load_model(args.model, device, compute_type=compute)

    results = {}
    for wav_path in wav_files:
        stem = os.path.splitext(os.path.basename(wav_path))[0]
        display_text = targets_text.get(stem)
        if not display_text:
            print(f'[{stem}] 건너뜀 — faction-data.json 에 대사 없음')
            continue
        try:
            audio = whisperx.load_audio(wav_path)
            asr_result = asr_model.transcribe(audio, language=lang)
            if not asr_result['segments']:
                print(f'[{stem}] 건너뜀 — 세그먼트 없음')
                continue
            duration = asr_result['segments'][-1]['end']
            align_model, metadata = whisperx.load_align_model(language_code=lang, device=device)
            aligned = whisperx.align(asr_result['segments'], align_model, metadata, audio, device)
            whisper_words = []
            for w in aligned.get('word_segments', []):
                if 'start' in w and 'end' in w:
                    whisper_words.append({'word': w['word'], 'start': round(w['start'], 3), 'end': round(w['end'], 3)})
            words = map_whisper_to_display(whisper_words, display_text, duration) if whisper_words else []
            results[stem] = words
            preview = ' '.join(w['word'] for w in words[:8]) + ('...' if len(words) > 8 else '')
            print(f'[{stem}] {len(whisper_words)}w→{len(words)}w: {preview}')
        except Exception as e:
            print(f'[{stem}] 건너뜀 — {e}')

    out_path = os.path.join(voice_dir, '2-word-timings.json')
    existing_targets = {}
    if os.path.exists(out_path):
        try:
            with open(out_path, encoding='utf-8') as f:
                existing_targets = json.load(f).get('targets', {})
        except Exception:
            existing_targets = {}
    merged = {**existing_targets, **results}
    out_data = {'episode': ep_name, 'lang': lang, 'model': args.model, 'engine': 'whisperx+diff', 'targets': merged}
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(out_data, f, indent=2, ensure_ascii=False)
    print(f'\n-> {out_path}')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--episode', required=True)
    parser.add_argument('--model', default='base')
    parser.add_argument('--only', default=None, help='쉼표 구분. 키 contains 매칭 (e.g. D05c-context,S01-hook)')
    parser.add_argument('--shorts', type=int, default=None, help='쇼츠 번호 (1-based). --long/--solo 와 동시 지정 불가')
    parser.add_argument('--solo', type=int, default=None, help='1권 모드 책 번호 (1-based). --long/--shorts 와 동시 지정 불가')
    parser.add_argument('--long', action='store_true', help='롱폼만 처리. --shorts/--solo 와 동시 지정 불가')
    parser.add_argument('--faction', action='store_true', help='세력도(factions/) 모드. --episode 는 폴더명, --lang 로 ko|en')
    parser.add_argument('--lang', default='ko', help='세력도 모드 언어 (ko|en). --faction 일 때만 사용')
    parser.add_argument('--part', type=int, default=None, help='세력도 편(part) — 그 편 인물만 전사. --faction 모드')
    # pnpm 이 스크립트로 넘기는 구분자 `--` 를 제거한다(4-align.ts 와 동일 규약).
    # 남겨두면 argparse 가 `--` 이후를 positional 로 처리해 --episode 를 못 읽는다.
    argv = [a for a in sys.argv[1:] if a != '--']
    args = parser.parse_args(argv)

    # 세력도 모드 — 북리커맨드 에피소드 구조와 무관하게 factions/ 를 직접 처리하고 종료
    if args.faction:
        run_faction(args)
        return

    # 단일 타겟 스코프 — --long / --shorts / --solo 중 정확히 하나 필수
    is_long = bool(args.long)
    shorts_index = args.shorts  # None 또는 int
    solo_index = args.solo      # None 또는 int
    scope_count = sum([is_long, shorts_index is not None, solo_index is not None])
    if scope_count != 1:
        print('✗ --long / --shorts <N> / --solo <N> 중 정확히 하나만 지정해야 한다.', file=sys.stderr)
        print('  사용: python scripts/voice/2-whisper.py --episode <name> (--long | --shorts <N> | --solo <N>)', file=sys.stderr)
        sys.exit(1)
    if shorts_index is not None and shorts_index < 1:
        print(f'✗ --shorts 인자는 1 이상 정수여야 한다. 받은 값: {shorts_index}', file=sys.stderr)
        sys.exit(1)
    if solo_index is not None and solo_index < 1:
        print(f'✗ --solo 인자는 1 이상 정수여야 한다. 받은 값: {solo_index}', file=sys.stderr)
        sys.exit(1)

    script_dir = os.path.dirname(os.path.abspath(__file__))
    root = os.path.join(script_dir, '..', '..')
    person, locale = parse_ep_name(args.episode, root=root)
    episode_dir = find_episode_dir(root, person)
    voice_dir = os.path.join(episode_dir, 'voice', locale)

    base_lang = locale.split('-')[0]  # 멀티파트에서 'ko-2' → 'ko'

    if is_new_layout(episode_dir, base_lang):
        ep = _load_new_layout_episode(episode_dir, base_lang)
    else:
        ep_path = resolve_episode_path(script_dir, args.episode)
        with open(ep_path, encoding='utf-8') as f:
            ep = json.load(f)
    lang = 'en' if ep.get('locale') == 'en' else 'ko'

    # 쇼츠 외부 파일 로드 — 3-timings.ts 와 동일한 구조로 ep['shorts'] 주입
    if shorts_index is not None:
        short_cfg = load_shorts_content(episode_dir, base_lang, shorts_index)
        ep['shorts'] = [short_cfg]
    else:
        # 롱폼/솔로 스코프에서는 쇼츠 데이터를 참조하지 않는다
        ep['shorts'] = []

    # 솔로 자유섹션 로드 — solo_display_text 가 _soloSections 에서 id 매칭한다
    if solo_index is not None:
        solo_sections, _solo_folder = load_solo_sections(episode_dir, base_lang, solo_index)
        ep['_soloSections'] = solo_sections

    vs_path = os.path.join(voice_dir, 'voice-select.json')
    vs = None
    default_engine = 'gemini'
    if os.path.exists(vs_path):
        with open(vs_path) as f:
            vs = json.load(f)
        default_engine = vs.get('default', 'gemini')

    default_dir = os.path.join(voice_dir, default_engine)

    # --- WAV 파일 스캔 (스코프별) ---
    if is_long:
        # 롱폼: default_dir 바로 밑 *.wav (서브디렉토리 제외)
        wav_files = sorted(glob.glob(os.path.join(default_dir, '*.wav')))
    elif shorts_index is not None:
        # 쇼츠 N: default_dir/shorts-{N}/*.wav 만
        shorts_sub = os.path.join(default_dir, f'shorts-{shorts_index}')
        wav_files = sorted(glob.glob(os.path.join(shorts_sub, '*.wav')))
    else:
        # 솔로 N: default_dir/solo-B{NN}/*.wav (gemini) + elevenlabs 쪽도 함께 스캔
        solo_nn = f'{solo_index:02d}'
        solo_sub = os.path.join(default_dir, f'solo-B{solo_nn}')
        wav_files = sorted(glob.glob(os.path.join(solo_sub, '*.wav')))
        ele_solo_sub = os.path.join(voice_dir, 'elevenlabs', f'solo-B{solo_nn}')
        if os.path.isdir(ele_solo_sub):
            existing_solo_keys = {path_to_key(f, default_dir) for f in wav_files}
            for ef in sorted(glob.glob(os.path.join(ele_solo_sub, '*.wav'))):
                if path_to_key(ef, default_dir) not in existing_solo_keys:
                    wav_files.append(ef)
            wav_files = sorted(wav_files)

    # voice-select slots 처리 — 특정 파일을 다른 엔진에서 가져온다 (키는 'shorts-N/...' 또는 basename)
    if vs and vs.get('slots'):
        for slot_key, engine in vs['slots'].items():
            slot_rel = slot_key  # 예: 'D01d1-quote.wav' 또는 'shorts-1/S03-celeb-mid.wav'
            slot_path = os.path.join(voice_dir, engine, slot_rel)
            if not os.path.exists(slot_path):
                continue
            # 스코프와 맞는 slot만 교체 대상
            slot_is_shorts = slot_rel.startswith('shorts-')
            slot_is_solo = slot_rel.startswith('solo-B')
            if is_long and (slot_is_shorts or slot_is_solo):
                continue
            if shorts_index is not None and not slot_rel.startswith(f'shorts-{shorts_index}/'):
                continue
            if solo_index is not None and not slot_rel.startswith(f'solo-B{solo_index:02d}/'):
                continue
            # default_engine 쪽 같은 상대 경로 파일은 제거 (교체)
            default_slot_path = os.path.join(default_dir, slot_rel)
            wav_files = [f for f in wav_files if os.path.normpath(f) != os.path.normpath(default_slot_path)]
            wav_files.append(slot_path)
        wav_files = sorted(wav_files)

    # ElevenLabs 자동 라우팅: celeb 파일이 elevenlabs 쪽에 있으면 우선 사용
    ele_dir = os.path.join(voice_dir, 'elevenlabs')
    if os.path.isdir(ele_dir):
        # 1) default_dir에 placeholder가 있는 경우 — 교체
        for wf in list(wav_files):
            key = path_to_key(wf, default_dir)
            if is_celeb_voice_key(key):
                ele_path = os.path.join(ele_dir, key + '.wav')
                if os.path.exists(ele_path) and os.path.normpath(wf) != os.path.normpath(ele_path):
                    wav_files = [f for f in wav_files if os.path.normpath(f) != os.path.normpath(wf)]
                    wav_files.append(ele_path)
        # 2) default_dir에 placeholder 없이 elevenlabs에만 있는 celeb 파일 — 추가 발견
        #    솔로는 위 WAV 스캔에서 이미 elevenlabs/solo-B{NN} 를 합쳤으므로 여기서는 건너뛴다.
        if solo_index is not None:
            ele_candidates = []
        elif is_long:
            ele_candidates = sorted(glob.glob(os.path.join(ele_dir, '*.wav')))
        else:
            ele_candidates = sorted(glob.glob(os.path.join(ele_dir, f'shorts-{shorts_index}', '*.wav')))
        existing_keys = {path_to_key(f, default_dir) for f in wav_files}
        for ef in ele_candidates:
            key = path_to_key(ef, default_dir)
            if is_celeb_voice_key(key) and key not in existing_keys:
                wav_files.append(ef)
        wav_files = sorted(wav_files)

    if not wav_files:
        scope_label = '--long' if is_long else (f'--shorts {shorts_index}' if shorts_index is not None else f'--solo {solo_index}')
        print(f'WAV 파일 없음 ({scope_label}): {default_dir}')
        sys.exit(1)

    # --- 유효 키 목록 생성 (스코프별) ---
    valid_keys = set()
    if is_long:
        if ep.get('narrator', {}).get('serviceGreeting'): valid_keys.add('A1-service-greeting')
        if ep.get('narrator', {}).get('serviceIntro'): valid_keys.add('A2-service-intro')
        if ep.get('narrator', {}).get('celebIntro'): valid_keys.add('B1-celeb-intro')
        if ep.get('host', {}).get('philosophy'): valid_keys.add('B2-philosophy')
        if ep.get('host', {}).get('featuredQuote'): valid_keys.add('A3-featured-quote')
        if ep.get('narrator', {}).get('outro'): valid_keys.add('E1-outro')
        if ep.get('narrator', {}).get('interlude'): valid_keys.add('E2-interlude')
        if ep.get('narrator', {}).get('returnIntro'): valid_keys.add('E3-return-intro')
        if ep.get('narrator', {}).get('prevRecap'): valid_keys.add('E4-prev-recap')
        for i, book in enumerate(ep.get('books', [])):
            idx = f'{i+1:02d}'
            valid_keys.add(f'D{idx}a-title')
            # 토막 분할 — 첫 토막은 기존 키, 둘째부터 b2/c2 식 번호 부착
            for p in range(len(field_parts(book.get('summary'), book.get('summaryParts')))):
                valid_keys.add(f'D{idx}b-summary' if p == 0 else f'D{idx}b{p+1}-summary')
            for p in range(len(field_parts(book.get('contextMain'), book.get('contextMainParts')))):
                valid_keys.add(f'D{idx}c-context' if p == 0 else f'D{idx}c{p+1}-context')
            # 쿼트페어: d1=pair0.quote, d2=pair0.after, d3=pair1.quote, ...
            for qi, pair in enumerate(book.get('quotePairs') or []):
                if pair.get('quote'):
                    valid_keys.add(f'D{idx}d{qi*2+1}-quote')
                if pair.get('after'):
                    # 후속 맥락 토막 분할 — 첫 토막은 기존 키, 둘째부터 d{N}_2 식 접미사
                    for p in range(len(field_parts(pair.get('after'), pair.get('afterParts')))):
                        valid_keys.add(f'D{idx}d{qi*2+2}-after' if p == 0 else f'D{idx}d{qi*2+2}_{p+1}-after')
    elif shorts_index is not None:
        # 쇼츠 N — 해당 쇼츠의 segments 만
        short_cfg = ep['shorts'][0]
        si = 0
        for seg in short_cfg.get('segments') or []:
            if seg.get('id') == 'cta':
                si += 1
                continue
            valid_keys.add(f'shorts-{shorts_index}/S{si+1:02d}-{seg["id"]}')
            si += 1
    else:
        # 솔로 N — buildSoloSegments(solo-build.ts) 마디 전체 순서대로 키 생성.
        #   [greeting?] → intro → title → 자유섹션(빈 텍스트 제외) → outro
        # nn 은 1-based 전체 마디 인덱스. vnSolo(bookIndex, segIndex, segId) 와 동일.
        solo_nn = f'{solo_index:02d}'
        marker_ids = []
        if ep.get('narrator', {}).get('serviceGreeting'):
            marker_ids.append('greeting')
        marker_ids.append('intro')
        marker_ids.append('title')
        for s in ep.get('_soloSections', []):
            if (s.get('text') or '').strip():
                marker_ids.append(s['id'])
        marker_ids.append('outro')
        for seg_i, seg_id in enumerate(marker_ids):
            valid_keys.add(f'solo-B{solo_nn}/S{seg_i+1:02d}-{seg_id}')

    # --- 잔존 WAV 감지 ---
    orphaned = [f for f in wav_files if path_to_key(f, default_dir) not in valid_keys]
    if orphaned:
        print(f'⚠ 잔존 WAV {len(orphaned)}건 — 에피소드에 해당 세그먼트 없음:')
        for f in orphaned:
            print(f'  {path_to_key(f, default_dir)}.wav')
        wav_files = [f for f in wav_files if f not in orphaned]

    # --- --only 필터 (키 contains) ---
    if args.only:
        filters = [s.strip() for s in args.only.split(',') if s.strip()]
        wav_files = [f for f in wav_files if any(flt in path_to_key(f, default_dir) for flt in filters)]

    scope_label = '롱폼' if is_long else (f'쇼츠 {shorts_index}' if shorts_index is not None else f'솔로 B{solo_index:02d}')
    print(f'에피소드: {args.episode} ({scope_label})')
    print(f'모델: {args.model} (whisperx + diff-match-patch)')
    print(f'{len(wav_files)}개 WAV 분석\n')

    import whisperx
    import torch
    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    compute = 'float16' if device == 'cuda' else 'int8'
    asr_model = whisperx.load_model(args.model, device, compute_type=compute)

    results = {}
    for wav_path in wav_files:
        key = path_to_key(wav_path, default_dir)

        try:
            audio = whisperx.load_audio(wav_path)
            display_text = get_display_text(ep, key)
            tts_text = get_tts_text(ep, key)
            # diff 매칭은 TTS 텍스트(실제 발화) 기준, 출력은 display 텍스트(화면 표시)
            match_text = tts_text or display_text

            # 1) WhisperX 순수 전사
            asr_result = asr_model.transcribe(audio, language=lang)
            if not asr_result['segments']:
                print(f'[{key}] 건너뜀 — 세그먼트 없음')
                continue
            duration = asr_result['segments'][-1]['end']

            # 2) WhisperX alignment (전사 결과 기준)
            align_model, metadata = whisperx.load_align_model(language_code=lang, device=device)
            aligned = whisperx.align(asr_result['segments'], align_model, metadata, audio, device)

            whisper_words = []
            for w in aligned.get('word_segments', []):
                if 'start' in w and 'end' in w:
                    whisper_words.append({'word': w['word'], 'start': round(w['start'], 3), 'end': round(w['end'], 3)})

            # 3) diff-match-patch로 매핑 (Whisper → match_text → display_text)
            if display_text and whisper_words:
                replace_table = dict(ep.get('tts', {}).get('replace', {}) or {})
                if shorts_index is not None:
                    short_cfg_replace = (ep.get('shorts') or [{}])[0].get('tts', {}).get('replace', {}) or {}
                    replace_table.update(short_cfg_replace)

                if match_text != display_text:
                    tts_words = map_whisper_to_display(whisper_words, match_text, duration)
                    words = map_whisper_to_display(tts_words, display_text, duration, replace_table)
                else:
                    words = map_whisper_to_display(whisper_words, display_text, duration, replace_table)
            else:
                words = whisper_words

            results[key] = words
            d_count = len(display_text.split()) if display_text else '?'
            preview = ' '.join(w['word'] for w in words[:8])
            if len(words) > 8: preview += '...'
            print(f'[{key}] {len(whisper_words)}w→{len(words)}w (원문{d_count}): {preview}')

        except Exception as e:
            print(f'[{key}] 건너뜀 — {e}')

    # --- 저장: 스코프 밖 기존 데이터는 보존, 스코프 안은 valid_keys + 신규 결과로 재구성 ---
    out_path = os.path.join(voice_dir, '2-word-timings.json')
    existing_targets = {}
    if os.path.exists(out_path):
        try:
            with open(out_path, 'r', encoding='utf-8') as f:
                existing = json.load(f)
            existing_targets = existing.get('targets', {})
        except Exception:
            existing_targets = {}

    if is_long:
        # 롱폼 스코프: 쇼츠·솔로 데이터는 그대로, 롱폼은 valid_keys 교집합만 남기고 신규 결과로 덮어씀
        def in_scope(k):
            return not (k.startswith('shorts-') or k.startswith('solo-B'))
        cleaned = {
            k: v for k, v in existing_targets.items()
            if (not in_scope(k)) or (k in valid_keys)
        }
    elif shorts_index is not None:
        # 쇼츠 N 스코프: 다른 쇼츠·롱폼·솔로 데이터는 그대로, 이 쇼츠만 재구성
        prefix = f'shorts-{shorts_index}/'
        def in_scope(k):
            return k.startswith(prefix)
        cleaned = {
            k: v for k, v in existing_targets.items()
            if (not in_scope(k)) or (k in valid_keys)
        }
    else:
        # 솔로 N 스코프: 다른 솔로·롱폼·쇼츠 데이터는 그대로, 이 솔로 책만 재구성
        prefix = f'solo-B{solo_index:02d}/'
        def in_scope(k):
            return k.startswith(prefix)
        cleaned = {
            k: v for k, v in existing_targets.items()
            if (not in_scope(k)) or (k in valid_keys)
        }
    merged = {**cleaned, **results}
    out_data = {'episode': args.episode, 'model': args.model, 'engine': 'whisperx+diff', 'targets': merged}
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(out_data, f, indent=2, ensure_ascii=False)
    print(f'\n-> {out_path}')


if __name__ == '__main__':
    main()
