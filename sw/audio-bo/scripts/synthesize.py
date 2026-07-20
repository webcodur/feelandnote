import argparse
import json
import os
import re
import shutil
import subprocess
import time
import urllib.error
import urllib.request
import wave
from datetime import datetime, timezone
from pathlib import Path

from faster_whisper import WhisperModel
from voice_direction import build_direction_settings


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument('--job', required=True)
    parser.add_argument('--tool-root', required=True)
    return parser.parse_args()


def write_config(path: Path, gpt: Path, sovits: Path):
    path.write_text(f'''custom:
  bert_base_path: GPT_SoVITS/pretrained_models/chinese-roberta-wwm-ext-large
  cnhuhbert_base_path: GPT_SoVITS/pretrained_models/chinese-hubert-base
  device: cpu
  is_half: false
  version: v2Pro
  t2s_weights_path: {gpt}
  vits_weights_path: {sovits}
''', encoding='utf-8')


def synthesize(tool: Path, payload: dict, target: Path, port: int, config: Path, log: Path):
    with log.open('wb') as stream:
        process = subprocess.Popen(
            [str(tool / 'runtime/python.exe'), 'api_v2.py', '-a', '127.0.0.1', '-p', str(port), '-c', str(config)],
            cwd=tool, stdout=stream, stderr=subprocess.STDOUT,
            creationflags=subprocess.CREATE_NO_WINDOW,
        )
        try:
            ready = False
            for _ in range(180):
                try:
                    urllib.request.urlopen(f'http://127.0.0.1:{port}/docs', timeout=2)
                    ready = True
                    break
                except (urllib.error.URLError, TimeoutError):
                    if process.poll() is not None:
                        break
                    time.sleep(1)
            if not ready:
                raise RuntimeError(f'음성 엔진을 시작하지 못했습니다. 기록: {log}')
            request = urllib.request.Request(
                f'http://127.0.0.1:{port}/tts', data=json.dumps(payload).encode('utf-8'),
                headers={'Content-Type': 'application/json'}, method='POST',
            )
            target.write_bytes(urllib.request.urlopen(request, timeout=600).read())
        finally:
            try:
                urllib.request.urlopen(f'http://127.0.0.1:{port}/control?command=exit', timeout=2)
            except Exception:
                pass
            process.kill()
            process.wait(timeout=10)


def duration(path: Path):
    try:
        with wave.open(str(path), 'rb') as audio:
            return audio.getnframes() / audio.getframerate()
    except (wave.Error, EOFError, ZeroDivisionError):
        return 0.0


def checkpoint_candidates(current: Path):
    prefix = re.sub(r'-e\d+$', '', current.stem)
    found = sorted(
        current.parent.glob(f'{prefix}-e*.ckpt'),
        key=lambda path: int(re.search(r'-e(\d+)$', path.stem).group(1)),
        reverse=True,
    )
    return [current, *(path for path in found if path != current)]


def save_job(job_path: Path, job: dict):
    job_path.write_text(json.dumps(job, ensure_ascii=False, indent=2), encoding='utf-8')


def same_words(expected: str, actual: str):
    normalize = lambda value: re.sub(r'[^\w]', '', value, flags=re.UNICODE).lower()
    return normalize(expected) == normalize(actual)


def main():
    args = parse_args()
    job_path, tool = Path(args.job), Path(args.tool_root)
    job = json.loads(job_path.read_text(encoding='utf-8'))
    model = job.get('model')
    if not model:
        raise RuntimeError('먼저 화자 모델을 학습하세요.')
    output_root = job_path.parent / 'output'
    run_id = datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S-%f')[:-3]
    output = output_root / 'runs' / run_id
    config = job_path.parent / 'training' / 'config'
    diagnostics = job_path.parent / 'diagnostics' / 'synthesis'
    output.mkdir(parents=True, exist_ok=True)
    config.mkdir(parents=True, exist_ok=True)
    diagnostics.mkdir(parents=True, exist_ok=True)
    speech_text = job.get('synthesisText') or job['transcript']
    direction = build_direction_settings(job.get('voiceDirections', []))
    payload = {
        'text': speech_text, 'text_lang': 'ko', 'ref_audio_path': model['reference'],
        'prompt_lang': 'ko', 'prompt_text': model['referenceText'], 'text_split_method': 'cut1',
        'batch_size': 1, 'media_type': 'wav', 'streaming_mode': False, 'seed': 1234,
        'speed_factor': direction['speed_factor'], 'fragment_interval': direction['fragment_interval'],
    }
    cleaner = Path(os.environ.get('INTERVIEW_CLEANER_ROOT', 'D:/audios/interview-cleaner'))
    whisper = WhisperModel(
        'large-v3-turbo', device='cpu', compute_type='int8',
        download_root=str(cleaner / 'models/whisper'), local_files_only=True,
    )

    def verify(path: Path):
        segments, _ = whisper.transcribe(
            str(path), language='ko', beam_size=5, vad_filter=True,
            condition_on_previous_text=False,
        )
        return ' '.join(segment.text.strip() for segment in segments)

    base_config = config / 'infer-base.yaml'
    write_config(
        base_config, tool / 'GPT_SoVITS/pretrained_models/s1v3.ckpt',
        tool / 'GPT_SoVITS/pretrained_models/v2Pro/s2Gv2Pro.pth',
    )
    base = output / 'base.wav'
    synthesize(tool, payload, base, 9911, base_config, diagnostics / 'base.log')
    base_text = verify(base)
    if not base_text:
        raise RuntimeError('기본 비교 음성에서 정상적인 말소리를 확인하지 못했습니다.')

    attempts = []
    trained = output / 'trained.wav'
    selected_gpt = None
    trained_text = ''
    for index, gpt in enumerate(checkpoint_candidates(Path(model['gpt']))):
        candidate_config = config / f'infer-{gpt.stem}.yaml'
        candidate = diagnostics / f'{gpt.stem}.wav'
        write_config(candidate_config, gpt, Path(model['sovits']))
        synthesize(tool, payload, candidate, 9920 + index, candidate_config, diagnostics / f'{gpt.stem}.log')
        candidate_text = verify(candidate)
        attempts.append({'checkpoint': str(gpt), 'duration': duration(candidate), 'verification': candidate_text})
        if same_words(speech_text, candidate_text) and duration(candidate) >= 1:
            shutil.copy2(candidate, trained)
            selected_gpt, trained_text = gpt, candidate_text
            break
    report = {'direction': direction, 'attempts': attempts}
    (diagnostics / 'attempts.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    if selected_gpt is None:
        raise RuntimeError('학습 모델이 정상적인 문장을 만들지 못했습니다. 학습 자료를 확인한 뒤 다시 학습하세요.')

    polished = output / 'polished.wav'
    subprocess.run([
        str(tool / 'runtime/ffmpeg.exe'), '-y', '-i', str(trained), '-af',
        direction['filter'],
        '-ac', '1', '-ar', '32000', '-c:a', 'pcm_s16le', str(polished),
    ], check=True, capture_output=True)
    polished_text = verify(polished)
    if not same_words(speech_text, polished_text):
        raise RuntimeError('듣기 보정 후 입력 문장과 다른 발음이 감지됐습니다.')
    job = json.loads(job_path.read_text(encoding='utf-8'))
    job['model']['gpt'] = str(selected_gpt)
    job['files'].update({'baseVoice': str(base), 'trainedVoice': str(trained), 'polishedVoice': str(polished)})
    job['verification'] = {'baseVoice': base_text, 'trainedVoice': trained_text, 'polishedVoice': polished_text}
    run = {
        'id': run_id, 'generatedAt': datetime.now(timezone.utc).isoformat(),
        'text': speech_text, 'voiceDirections': direction['directions'],
        'verification': job['verification'], 'checkpoint': str(selected_gpt),
    }
    (output / 'run.json').write_text(json.dumps(run, ensure_ascii=False, indent=2), encoding='utf-8')
    save_job(job_path, job)


if __name__ == '__main__':
    main()
