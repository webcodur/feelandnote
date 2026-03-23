"""
whisper-words.py — WhisperX 전사 + diff-match-patch 매핑

1) WhisperX로 오디오를 순수 전사 → 단어별 타임스탬프 추출
2) 전사 텍스트와 원문을 diff-match-patch로 대조
3) 매칭된 짝을 기준으로 타임스탬프를 원문 단어에 이식

Usage:
  python scripts/whisper-words.py --episode alexander-the-great
  python scripts/whisper-words.py --episode alexander-the-great --only D05b-summary
"""
import argparse, json, os, sys, glob, io, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

from diff_match_patch import diff_match_patch


def get_display_text(ep, fname):
    """WAV 파일명 → 에피소드 JSON에서 원문 텍스트 추출"""
    key = fname.replace('.wav', '')
    if key == 'A1-service-greeting': return ep.get('narrator', {}).get('serviceGreeting')
    if key == 'A2-service-intro': return ep.get('narrator', {}).get('serviceIntro')
    if key == 'B1-celeb-intro': return ep.get('narrator', {}).get('celebIntro')
    if key == 'B2-philosophy': return ep.get('host', {}).get('philosophy')
    if key == 'E1-outro': return ep.get('narrator', {}).get('outro')
    m = re.match(r'D(\d{2})([a-e])-(.+)', key)
    if m:
        idx = int(m.group(1)) - 1
        field_map = {'b': 'summary', 'c': 'context', 'd': 'directQuote', 'e': 'contextAfter'}
        field = field_map.get(m.group(2))
        if field and idx < len(ep.get('books', [])):
            return ep['books'][idx].get(field)
    m = re.match(r'S\d{2}-(.+)', key)
    if m:
        seg_id = m.group(1)
        for seg in ep.get('shorts', {}).get('segments', []):
            if seg.get('id') == seg_id:
                return seg.get('text')
    return None


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

    for op, text in diffs:
        n = len(text)
        if op == 0:  # EQUAL
            for i in range(n):
                if w_pos + i < len(w_char_to_time):
                    d_char_times[d_pos + i] = w_char_to_time[w_pos + i]
            w_pos += n
            d_pos += n
        elif op == -1:  # DELETE (whisper에만 있음)
            w_pos += n
        elif op == 1:  # INSERT (display에만 있음)
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

    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--episode', required=True)
    parser.add_argument('--model', default='base')
    parser.add_argument('--only', default=None)
    args = parser.parse_args()

    script_dir = os.path.dirname(os.path.abspath(__file__))
    voice_dir = os.path.join(script_dir, '..', 'public', 'voice', args.episode)

    ep_path = os.path.join(script_dir, '..', 'episodes', 'book-recommend', f'{args.episode}.json')
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

    if not wav_files:
        print(f'WAV 파일 없음: {default_dir}')
        sys.exit(1)

    if args.only:
        filters = args.only.split(',')
        wav_files = [f for f in wav_files if any(flt in os.path.basename(f) for flt in filters)]

    print(f'에피소드: {args.episode}')
    print(f'모델: {args.model} (whisperx + diff-match-patch)')
    print(f'{len(wav_files)}개 WAV 분석\n')

    import whisperx
    device = 'cpu'
    asr_model = whisperx.load_model(args.model, device, compute_type='int8')

    results = {}
    for wav_path in wav_files:
        fname = os.path.basename(wav_path)
        key = fname.replace('.wav', '')

        try:
            audio = whisperx.load_audio(wav_path)
            display_text = get_display_text(ep, fname)

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

            # 3) diff-match-patch로 원문에 매핑
            if display_text and whisper_words:
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
    out_data = {'episode': args.episode, 'model': args.model, 'engine': 'whisperx+diff', 'targets': results}
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(out_data, f, indent=2, ensure_ascii=False)
    print(f'\n-> {out_path}')

if __name__ == '__main__':
    main()
