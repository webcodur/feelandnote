import argparse
import json
import subprocess
from pathlib import Path

from faster_whisper import WhisperModel


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument('--job', required=True)
    parser.add_argument('--cleaner-root', required=True)
    parser.add_argument('--ffmpeg', required=True)
    return parser.parse_args()


def recognize(model, file_path, word_timestamps=False):
    segments, _ = model.transcribe(
        str(file_path), language='ko', beam_size=5,
        vad_filter=True, condition_on_previous_text=False,
        word_timestamps=word_timestamps,
    )
    recognized = []
    for item in segments:
        if not item.text.strip():
            continue
        result = {'start': round(item.start, 2), 'end': round(item.end, 2), 'text': item.text.strip()}
        if word_timestamps:
            item_words = item.words or []
            result['words'] = [
                {'start': word.start, 'end': word.end, 'text': word.word, 'break_after': index == len(item_words) - 1}
                for index, word in enumerate(item_words) if word.start is not None and word.end is not None
            ]
        recognized.append(result)
    return recognized


def timed_chunks(recognized):
    words = [word for item in recognized for word in item.get('words', [])]
    if not words:
        return [{key: item[key] for key in ('start', 'end', 'text')} for item in recognized]
    chunks, current = [], []
    for word in words:
        if current:
            duration = current[-1]['end'] - current[0]['start']
            too_long = word['end'] - current[0]['start'] > 9.5
            natural_break = duration >= 3 and current[-1]['break_after']
            if too_long or natural_break:
                chunks.append(current)
                current = []
        current.append(word)
    if current:
        chunks.append(current)
    if len(chunks) > 1:
        last = chunks[-1]
        previous = chunks[-2]
        if last[-1]['end'] - last[0]['start'] < 3 and last[-1]['end'] - previous[0]['start'] <= 10:
            chunks[-2:] = [previous + last]
    return [
        {'start': round(chunk[0]['start'], 2), 'end': round(chunk[-1]['end'], 2),
         'text': ''.join(word['text'] for word in chunk).strip()}
        for chunk in chunks
    ]


def transcribe_selected(model, job, root, ffmpeg):
    clips = root / 'clips'
    clips.mkdir(exist_ok=True)
    updated = []
    for index, segment in enumerate(job['segments'], 1):
        if not segment.get('enabled', True):
            updated.append(segment)
            continue
        clip = clips / f"transcribe-{index:03}.wav"
        duration = float(segment['end']) - float(segment['start'])
        subprocess.run([
            ffmpeg, '-y', '-ss', str(segment['start']), '-i', job['files']['source'],
            '-t', str(duration), '-ac', '1', '-ar', '16000', str(clip),
        ], check=True, capture_output=True)
        recognized = recognize(model, clip, word_timestamps=duration > 10)
        if duration <= 10:
            segment['text'] = ' '.join(item['text'] for item in recognized)
            updated.append(segment)
            continue
        for part, item in enumerate(timed_chunks(recognized), 1):
            updated.append({
                'id': f"{segment['id']}-asr-{part:03}",
                'start': round(float(segment['start']) + item['start'], 2),
                'end': round(float(segment['start']) + item['end'], 2),
                'text': item['text'],
                'speaker': segment.get('speaker', 'A'),
                'enabled': segment.get('enabled', True),
            })
    return updated


def main():
    args = parse_args()
    job_path = Path(args.job)
    root = job_path.parent
    job = json.loads(job_path.read_text(encoding='utf-8'))
    model = WhisperModel(
        'large-v3-turbo', device='cpu', compute_type='int8',
        download_root=str(Path(args.cleaner_root) / 'models' / 'whisper'),
        local_files_only=True,
    )
    if job.get('segments'):
        segments = transcribe_selected(model, job, root, args.ffmpeg)
    else:
        recognized = recognize(model, job['files']['source'])
        segments = [
            {'id': f'asr-{index:03}', **item, 'speaker': 'A', 'enabled': True}
            for index, item in enumerate(recognized, 1)
        ]

    job['segments'] = segments
    speaker = job.get('trainingSpeaker', 'A')
    job['transcript'] = '\n'.join(
        item['text'] for item in segments
        if item.get('enabled', True) and item.get('speaker', 'A') == speaker and item.get('text')
    )
    cleaned_path = job['files'].get('cleaned')
    cleaned = recognize(model, cleaned_path) if cleaned_path else []
    comparison = root / 'transcript-comparison.txt'
    original_text = '\n'.join(item.get('text', '') for item in segments)
    cleaned_text = '\n'.join(item['text'] for item in cleaned)
    comparison.write_text(f'[선택 구간]\n{original_text}\n\n[잡음 감소본]\n{cleaned_text}\n', encoding='utf-8')
    job_path.write_text(json.dumps(job, ensure_ascii=False, indent=2), encoding='utf-8')


if __name__ == '__main__':
    main()
