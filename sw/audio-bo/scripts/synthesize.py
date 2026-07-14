import argparse
import json
import subprocess
import time
import urllib.error
import urllib.request
import os
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--job', required=True)
parser.add_argument('--tool-root', required=True)
args = parser.parse_args()
job_path, tool = Path(args.job), Path(args.tool_root)
job = json.loads(job_path.read_text(encoding='utf-8'))
model = job.get('model')
if not model: raise RuntimeError('먼저 화자 모델을 학습하세요.')
output = job_path.parent / 'output'; output.mkdir(exist_ok=True)
config = job_path.parent / 'training' / 'config'; config.mkdir(parents=True, exist_ok=True)

base_yaml = config / 'infer-base.yaml'
trained_yaml = config / 'infer-trained.yaml'
common = "custom:\n  bert_base_path: GPT_SoVITS/pretrained_models/chinese-roberta-wwm-ext-large\n  cnhuhbert_base_path: GPT_SoVITS/pretrained_models/chinese-hubert-base\n  device: cpu\n  is_half: false\n  version: v2Pro\n"
base_yaml.write_text(common + "  t2s_weights_path: GPT_SoVITS/pretrained_models/s1v3.ckpt\n  vits_weights_path: GPT_SoVITS/pretrained_models/v2Pro/s2Gv2Pro.pth\n", encoding='utf-8')
trained_yaml.write_text(common + f"  t2s_weights_path: {model['gpt']}\n  vits_weights_path: {model['sovits']}\n", encoding='utf-8')

speech_text = job.get('synthesisText') or job['transcript']
payload = {'text': speech_text, 'text_lang': 'ko', 'ref_audio_path': model['reference'], 'prompt_lang': 'ko', 'prompt_text': model['referenceText'], 'text_split_method': 'cut1', 'batch_size': 1, 'media_type': 'wav', 'streaming_mode': False, 'seed': 1234}

def synthesize(name: str, port: int, yaml: Path) -> Path:
    target = output / f'{name}.wav'
    process = subprocess.Popen([str(tool / 'runtime/python.exe'), 'api_v2.py', '-a', '127.0.0.1', '-p', str(port), '-c', str(yaml)], cwd=tool, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, creationflags=subprocess.CREATE_NO_WINDOW)
    try:
        for _ in range(180):
            try:
                urllib.request.urlopen(f'http://127.0.0.1:{port}/docs', timeout=2); break
            except (urllib.error.URLError, TimeoutError): time.sleep(1)
        request = urllib.request.Request(f'http://127.0.0.1:{port}/tts', data=json.dumps(payload).encode('utf-8'), headers={'Content-Type': 'application/json'}, method='POST')
        target.write_bytes(urllib.request.urlopen(request, timeout=600).read())
    finally:
        try: urllib.request.urlopen(f'http://127.0.0.1:{port}/control?command=exit', timeout=2)
        except Exception: pass
        process.kill()
    return target

base = synthesize('base', 9911, base_yaml)
trained = synthesize('trained', 9912, trained_yaml)
polished = output / 'polished.wav'
subprocess.run([str(tool / 'runtime/ffmpeg.exe'), '-y', '-i', str(trained), '-af', 'atempo=0.93,highpass=f=70,lowpass=f=14500,acompressor=threshold=-20dB:ratio=2.2:attack=20:release=180:makeup=1.5,loudnorm=I=-17:TP=-1.5:LRA=6', str(polished)], check=True, capture_output=True)
job['files'].update({'baseVoice': str(base), 'trainedVoice': str(trained), 'polishedVoice': str(polished)})
from faster_whisper import WhisperModel
cleaner = Path(os.environ.get('INTERVIEW_CLEANER_ROOT', 'D:/audios/interview-cleaner'))
whisper = WhisperModel('large-v3-turbo', device='cpu', compute_type='int8', download_root=str(cleaner / 'models/whisper'), local_files_only=True)
def verify(file: Path) -> str:
    segments, _ = whisper.transcribe(str(file), language='ko', beam_size=5, vad_filter=True, condition_on_previous_text=False)
    return ' '.join(segment.text.strip() for segment in segments)
job['verification'] = {'baseVoice': verify(base), 'trainedVoice': verify(trained), 'polishedVoice': verify(polished)}
job_path.write_text(json.dumps(job, ensure_ascii=False, indent=2), encoding='utf-8')
