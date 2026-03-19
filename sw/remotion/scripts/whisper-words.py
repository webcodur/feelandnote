"""
whisper-words.py — Whisper word-level timestamp 추출

규칙 단일원천: docs/project/remotion/voice-timing-for-agent.md

Usage:
  python scripts/whisper-words.py --episode jensen-huang-en
  python scripts/whisper-words.py --episode jensen-huang-en --model base
  python scripts/whisper-words.py --episode jensen-huang-en --only B2-philosophy
"""
import argparse, json, os, sys, glob

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--episode', required=True)
    parser.add_argument('--model', default='base', help='whisper model (tiny/base/small/medium/large)')
    parser.add_argument('--only', default=None, help='comma-separated file filter')
    args = parser.parse_args()

    script_dir = os.path.dirname(os.path.abspath(__file__))
    voice_dir = os.path.join(script_dir, '..', 'public', 'voice', args.episode)

    # voice-select.json으로 엔진 디렉토리 결정
    vs_path = os.path.join(voice_dir, 'voice-select.json')
    engine_dir = voice_dir
    if os.path.exists(vs_path):
        with open(vs_path) as f:
            vs = json.load(f)
        engine_dir = os.path.join(voice_dir, vs.get('default', 'gemini'))

    wav_files = sorted(glob.glob(os.path.join(engine_dir, '*.wav')))
    if not wav_files:
        print(f'WAV 파일 없음: {engine_dir}')
        sys.exit(1)

    # --only 필터
    if args.only:
        filters = args.only.split(',')
        wav_files = [f for f in wav_files if any(flt in os.path.basename(f) for flt in filters)]

    print(f'에피소드: {args.episode}')
    print(f'모델: {args.model}')
    print(f'{len(wav_files)}개 WAV 분석\n')

    # 모델 로드 (한 번만)
    import whisper
    model = whisper.load_model(args.model)

    results = {}
    for wav_path in wav_files:
        fname = os.path.basename(wav_path)
        key = fname.replace('.wav', '')

        try:
            # locale 판단: 에피소드 JSON에서 읽기
            ep_path = os.path.join(script_dir, '..', 'episodes', 'book-recommend', f'{args.episode}.json')
            with open(ep_path) as f:
                ep = json.load(f)
            lang = 'en' if ep.get('locale') == 'en' else None

            result = model.transcribe(
                wav_path,
                word_timestamps=True,
                language=lang,
            )

            words = []
            for seg in result['segments']:
                for w in seg.get('words', []):
                    words.append({
                        'word': w['word'].strip(),
                        'start': round(w['start'], 3),
                        'end': round(w['end'], 3),
                    })

            results[key] = words
            preview = ' '.join(w['word'] for w in words[:8])
            if len(words) > 8:
                preview += '...'
            print(f'[{key}] {len(words)} words: {preview}')

        except Exception as e:
            print(f'[{key}] 건너뜀 — {e}')

    # 저장
    out_path = os.path.join(voice_dir, 'whisper-debug.json')
    out_data = {
        'episode': args.episode,
        'model': args.model,
        'targets': results,
    }
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(out_data, f, indent=2, ensure_ascii=False)
    print(f'\n-> {out_path}')

if __name__ == '__main__':
    main()
