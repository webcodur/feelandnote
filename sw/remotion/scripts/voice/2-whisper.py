"""
whisper-words.py — WhisperX 전사 + diff-match-patch 매핑

1) WhisperX로 오디오를 순수 전사 → 단어별 타임스탬프 추출
2) 전사 텍스트와 원문을 diff-match-patch로 대조
3) 매칭된 짝을 기준으로 타임스탬프를 원문 단어에 이식

Usage:
  python scripts/voice/whisper-words.py --episode alexander-the-great
  python scripts/voice/whisper-words.py --episode alexander-the-great --only D05b-summary
"""
import argparse, json, os, sys, glob, io, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

from diff_match_patch import diff_match_patch


def parse_ep_name(ep_name):
    """ep-name → (person, locale) 파싱"""
    rest, lang = ep_name, 'ko'
    if rest.endswith('-en'):
        lang = 'en'
        rest = rest[:-3]
    m = re.match(r'^(.+)-(\d+)$', rest)
    if m:
        rest = m.group(1)
        lang = f'{lang}-{m.group(2)}'
    return rest, lang


def find_episode_dir(root, person):
    """todo/live/done 3단 구조에서 에피소드 디렉토리 탐색"""
    for status in ['todo', 'live', 'done']:
        d = os.path.join(root, 'public', 'episodes', status, person)
        if os.path.isdir(d):
            return d
    raise FileNotFoundError(f'Episode not found: {person}')


def resolve_episode_path(script_dir, episode_id):
    """Episode ID → 인물별 디렉토리 파일 경로"""
    root = os.path.join(script_dir, '..', '..')
    person, locale = parse_ep_name(episode_id)
    parts = locale.split('-')
    base_lang = parts[0]
    part_num = int(parts[1]) if len(parts) > 1 else 1
    filename = f'{base_lang}-{part_num}.json' if part_num > 1 else f'{base_lang}.json'
    return os.path.join(find_episode_dir(root, person), filename)


def get_display_text(ep, fname):
    """WAV 파일명 → 화면 표시용 원문 텍스트 추출"""
    key = fname.replace('.wav', '')
    if key == 'A1-service-greeting': return ep.get('narrator', {}).get('serviceGreeting')
    if key == 'A2-service-intro': return ep.get('narrator', {}).get('serviceIntro')
    if key == 'B1-celeb-intro': return ep.get('narrator', {}).get('celebIntro')
    if key == 'B2-philosophy': return ep.get('host', {}).get('philosophy')
    if key == 'A3-featured-quote': return ep.get('host', {}).get('featuredQuote')
    if key == 'E1-outro': return ep.get('narrator', {}).get('outro')
    m = re.match(r'D(\d{2})([a-e])-(.+)', key)
    if m:
        idx = int(m.group(1)) - 1
        phase = m.group(2)
        if phase == 'a' and idx < len(ep.get('books', [])):
            book = ep['books'][idx]
            parts = [book.get('title', '')]
            if book.get('creator'): parts.append(book['creator'])
            year = book.get('stats', {}).get('publishYear', '')
            if year: parts.append(str(year))
            return ' '.join(parts)
        field_map = {'b': 'summary', 'c': 'context', 'd': 'directQuote', 'e': 'contextAfter'}
        field = field_map.get(phase)
        if field and idx < len(ep.get('books', [])):
            return ep['books'][idx].get(field)
    m = re.match(r'S\d{2}-(.+)', key)
    if m:
        seg_id = m.group(1)
        for seg in ep.get('shorts', {}).get('segments', []):
            if seg.get('id') == seg_id:
                return seg.get('text')
    return None


def apply_tts_replace(text, ep):
    """tts.replace 치환맵을 텍스트에 적용 — 긴 키부터 치환하여 부분 매칭 충돌 방지"""
    if not text:
        return text
    replace_map = ep.get('tts', {}).get('replace', {})
    for k, v in sorted(replace_map.items(), key=lambda x: len(x[0]), reverse=True):
        text = text.replace(k, v)
    return text


def get_tts_text(ep, fname):
    """WAV 파일명 → TTS에 실제 전달된 텍스트 (tts.titles + tts.replace 적용)"""
    key = fname.replace('.wav', '')
    tts = ep.get('tts', {})
    titles = tts.get('titles', [])

    # title: tts.titles[] 우선, 없으면 display_text
    m = re.match(r'D(\d{2})a-title', key)
    if m:
        idx = int(m.group(1)) - 1
        if idx < len(titles) and titles[idx]:
            return titles[idx]
        return get_display_text(ep, fname)

    # 그 외: display_text에 tts.replace 적용
    display = get_display_text(ep, fname)
    return apply_tts_replace(display, ep)


def strip(s):
    """비교용 정규화 — 구두점·공백 제거, 소문자"""
    return re.sub(r'[^a-zA-Z0-9\uAC00-\uD7A3\u3040-\u30FF\u4E00-\u9FFF]', '', s).lower()


def map_whisper_to_display(whisper_words, display_text, duration):
    """diff-match-patch로 WhisperX 전사 결과를 원문 단어에 매핑"""
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

    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--episode', required=True)
    parser.add_argument('--model', default='base')
    parser.add_argument('--only', default=None)
    parser.add_argument('--shorts', action='store_true', help='쇼츠(S*.wav)만')
    parser.add_argument('--long', action='store_true', help='롱폼(S* 제외)만')
    args = parser.parse_args()

    script_dir = os.path.dirname(os.path.abspath(__file__))
    root = os.path.join(script_dir, '..', '..')
    person, locale = parse_ep_name(args.episode)
    voice_dir = os.path.join(find_episode_dir(root, person), 'voice', locale)

    ep_path = resolve_episode_path(script_dir, args.episode)
    with open(ep_path, encoding='utf-8') as f:
        ep = json.load(f)
    lang = 'en' if ep.get('locale') == 'en' else 'ko'

    vs_path = os.path.join(voice_dir, 'voice-select.json')
    vs = None
    default_engine = 'gemini'
    if os.path.exists(vs_path):
        with open(vs_path) as f:
            vs = json.load(f)
        default_engine = vs.get('default', 'gemini')

    default_dir = os.path.join(voice_dir, default_engine)
    wav_files = sorted(glob.glob(os.path.join(default_dir, '*.wav')))

    if vs and vs.get('slots'):
        for slot_file, engine in vs['slots'].items():
            slot_path = os.path.join(voice_dir, engine, slot_file)
            if os.path.exists(slot_path):
                wav_files = [f for f in wav_files if os.path.basename(f) != slot_file]
                wav_files.append(slot_path)
        wav_files = sorted(wav_files)

    # ElevenLabs 자동 라우팅: celeb 파일이 elevenlabs에 존재하면 우선 사용
    import re
    def is_celeb_voice(fname):
        k = fname.replace('.wav', '')
        return k in ('A3-featured-quote', 'B2-philosophy') or bool(re.match(r'^D\d{2}d-quote$', k)) or bool(re.match(r'^S\d{2}-celeb-', k)) or bool(re.match(r'^S\d{2}-book-quote', k))

    ele_dir = os.path.join(voice_dir, 'elevenlabs')
    if os.path.isdir(ele_dir):
        for wf in list(wav_files):
            bn = os.path.basename(wf)
            if is_celeb_voice(bn):
                ele_path = os.path.join(ele_dir, bn)
                if os.path.exists(ele_path) and wf != ele_path:
                    wav_files = [f for f in wav_files if f != wf]
                    wav_files.append(ele_path)
        wav_files = sorted(wav_files)

    if not wav_files:
        print(f'WAV 파일 없음: {default_dir}')
        sys.exit(1)

    # 유효 WAV 키 목록 생성 (에피소드 JSON 기준)
    valid_keys = set()
    if ep.get('narrator', {}).get('serviceGreeting'): valid_keys.add('A1-service-greeting')
    if ep.get('narrator', {}).get('serviceIntro'): valid_keys.add('A2-service-intro')
    if ep.get('narrator', {}).get('celebIntro'): valid_keys.add('B1-celeb-intro')
    if ep.get('host', {}).get('philosophy'): valid_keys.add('B2-philosophy')
    if ep.get('host', {}).get('featuredQuote'): valid_keys.add('A3-featured-quote')
    if ep.get('narrator', {}).get('outro'): valid_keys.add('E1-outro')
    for i, book in enumerate(ep.get('books', [])):
        idx = f'{i+1:02d}'
        valid_keys.add(f'D{idx}a-title')
        valid_keys.add(f'D{idx}b-summary')
        valid_keys.add(f'D{idx}c-context')
        if book.get('directQuote'): valid_keys.add(f'D{idx}d-quote')
        if book.get('contextAfter'): valid_keys.add(f'D{idx}e-context-after')
    if ep.get('shorts', {}).get('segments'):
        si = 0
        for seg in ep['shorts']['segments']:
            if seg.get('id') == 'cta': si += 1; continue
            valid_keys.add(f'S{si+1:02d}-{seg["id"]}')
            si += 1

    # 잔존 WAV 감지
    orphaned = [f for f in wav_files if os.path.basename(f).replace('.wav', '') not in valid_keys]
    if orphaned:
        print(f'⚠ 잔존 WAV {len(orphaned)}건 — 에피소드에 해당 세그먼트 없음:')
        for f in orphaned:
            print(f'  {os.path.basename(f)}')
        wav_files = [f for f in wav_files if f not in orphaned]

    if args.shorts:
        wav_files = [f for f in wav_files if os.path.basename(f).startswith('S')]
    elif args.long:
        wav_files = [f for f in wav_files if not os.path.basename(f).startswith('S')]
    elif args.only:
        filters = args.only.split(',')
        wav_files = [f for f in wav_files if any(flt in os.path.basename(f) for flt in filters)]

    print(f'에피소드: {args.episode}')
    print(f'모델: {args.model} (whisperx + diff-match-patch)')
    print(f'{len(wav_files)}개 WAV 분석\n')

    import whisperx
    import torch
    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    compute = 'float16' if device == 'cuda' else 'int8'
    asr_model = whisperx.load_model(args.model, device, compute_type=compute)

    results = {}
    for wav_path in wav_files:
        fname = os.path.basename(wav_path)
        key = fname.replace('.wav', '')

        try:
            audio = whisperx.load_audio(wav_path)
            display_text = get_display_text(ep, fname)
            tts_text = get_tts_text(ep, fname)
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

            # 3) diff-match-patch로 매핑
            # TTS 오버라이드가 있으면: WhisperX → TTS 텍스트 매핑 → 타임스탬프 추출 → display 텍스트에 이식
            if display_text and whisper_words:
                if match_text != display_text:
                    # TTS 텍스트로 정확한 타임스탬프 추출
                    tts_words = map_whisper_to_display(whisper_words, match_text, duration)
                    # display 텍스트 단어에 타임스탬프 이식 (diff-match-patch로 TTS→display 매핑)
                    words = map_whisper_to_display(tts_words, display_text, duration)
                else:
                    words = map_whisper_to_display(whisper_words, display_text, duration)
            else:
                words = whisper_words

            results[key] = words
            d_count = len(display_text.split()) if display_text else '?'
            preview = ' '.join(w['word'] for w in words[:8])
            if len(words) > 8: preview += '...'
            print(f'[{key}] {len(whisper_words)}w→{len(words)}w (원문{d_count}): {preview}')

        except Exception as e:
            print(f'[{key}] 건너뜀 — {e}')

    out_path = os.path.join(voice_dir, 'whisper-debug.json')
    # --only 사용 시 기존 데이터 병합 (덮어쓰기 방지)
    existing_targets = {}
    if os.path.exists(out_path):
        try:
            with open(out_path, 'r', encoding='utf-8') as f:
                existing = json.load(f)
            existing_targets = existing.get('targets', {})
        except Exception:
            pass
    # 잔존 키 정리: 범위에 해당하는 기존 키 중 유효하지 않은 것만 제거
    if args.shorts:
        cleaned = {k: v for k, v in existing_targets.items() if not k.startswith('S') or k in valid_keys}
    elif args.long:
        cleaned = {k: v for k, v in existing_targets.items() if k.startswith('S') or k in valid_keys}
    else:
        cleaned = {k: v for k, v in existing_targets.items() if k in valid_keys}
    merged = {**cleaned, **results}
    out_data = {'episode': args.episode, 'model': args.model, 'engine': 'whisperx+diff', 'targets': merged}
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(out_data, f, indent=2, ensure_ascii=False)
    print(f'\n-> {out_path}')

if __name__ == '__main__':
    main()
