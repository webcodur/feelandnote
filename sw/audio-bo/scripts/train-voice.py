import argparse
import json
import os
import re
import shutil
import subprocess
import wave
from pathlib import Path


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument('--job', required=True)
    parser.add_argument('--tool-root', required=True)
    return parser.parse_args()

def update_job(job_path, progress, message):
    current = json.loads(job_path.read_text(encoding='utf-8'))
    current.update({'stage': 'training', 'progress': progress, 'message': message})
    job_path.write_text(json.dumps(current, ensure_ascii=False, indent=2), encoding='utf-8')

def split_training_audio(job, root, experiment, speaker, ffmpeg):
    source = Path(job['files']['source'])
    wav_dir = root / 'training' / 'wavs'
    if wav_dir.exists():
        shutil.rmtree(wav_dir)
    wav_dir.mkdir(parents=True)
    chosen = [
        item for item in job.get('segments', [])
        if item.get('enabled', True)
        and item.get('speaker', 'A') == job.get('trainingSpeaker', 'A')
        and item.get('text', '').strip()
        and 3 <= float(item['end']) - float(item['start']) <= 10
    ]
    if chosen:
        rows = []
        for index, item in enumerate(chosen, 1):
            target = wav_dir / f'{experiment}-{index:02}.wav'
            duration = float(item['end']) - float(item['start'])
            subprocess.run(
                [str(ffmpeg), '-y', '-ss', str(item['start']), '-i', str(source), '-t', str(duration), '-ac', '1', '-ar', '32000', str(target)],
                check=True, capture_output=True,
            )
            rows.append(f"{target}|{speaker}|ko|{item['text'].strip()}")
        if len(rows) < 3:
            raise RuntimeError('선택한 화자의 3~10초 학습 구간이 3개 이상 필요합니다.')
        return [item['text'].strip() for item in chosen], wav_dir, rows
    sentences = [
        part.strip()
        for part in re.split(r'(?<=[.!?。！？])\s+|\n+', job['transcript'])
        if part.strip()
    ]
    with wave.open(str(source), 'rb') as audio:
        duration = audio.getnframes() / audio.getframerate()
    weights = [max(len(text), 10) for text in sentences]
    scale = duration / sum(weights)
    cursor = 0.0
    rows = []
    for index, (text, weight) in enumerate(zip(sentences, weights), 1):
        length = min(max(weight * scale, 3.0), 9.5)
        if cursor + length > duration:
            break
        target = wav_dir / f'{experiment}-{index:02}.wav'
        subprocess.run(
            [str(ffmpeg), '-y', '-ss', str(cursor), '-i', str(source), '-t', str(length), '-ac', '1', '-ar', '32000', str(target)],
            check=True,
            capture_output=True,
        )
        rows.append(f'{target}|{speaker}|ko|{text}')
        cursor += length
    if len(rows) < 3:
        raise RuntimeError('학습 가능한 완결 문장이 3개 이상 필요합니다.')
    return sentences, wav_dir, rows

def prepare_dataset(tool, runtime, env, log_dir, update):
    prep = tool / 'GPT_SoVITS/prepare_datasets'
    def run(script, *extra):
        subprocess.run([str(runtime), '-s', str(script), *extra], cwd=tool, env=env, check=True)
    run(prep / '1-get-text.py')
    (log_dir / '2-name2text-0.txt').replace(log_dir / '2-name2text.txt')
    update(70, '학습 대본을 발음 정보로 바꾸는 중')
    run(prep / '2-get-hubert-wav32k.py')
    update(72, '선택한 음성의 특징을 계산하는 중')
    run(prep / '2-get-sv.py')
    run(prep / '3-get-semantic.py')
    semantic = (log_dir / '6-name2semantic-0.tsv').read_text(encoding='utf-8')
    (log_dir / '6-name2semantic.tsv').write_text('item_name\tsemantic_audio\n' + semantic, encoding='utf-8')
    return run

def write_configs(tool, root, log_dir, experiment, batch_size):
    s2 = json.loads((tool / 'GPT_SoVITS/configs/s2v2Pro.json').read_text(encoding='utf-8'))
    s2['train'].update({
        'epochs': 8, 'batch_size': batch_size, 'gpu_numbers': '0',
        'pretrained_s2G': 'GPT_SoVITS/pretrained_models/v2Pro/s2Gv2Pro.pth',
        'pretrained_s2D': 'GPT_SoVITS/pretrained_models/v2Pro/s2Dv2Pro.pth',
        'save_every_epoch': 4, 'if_save_latest': True,
        'if_save_every_weights': True, 'lora_rank': '32',
    })
    s2['data'].update({'exp_dir': f'logs/{experiment}', 'version': 'v2Pro'})
    s2['model']['version'] = 'v2Pro'
    s2.update({
        's2_ckpt_dir': f'logs/{experiment}', 'save_weight_dir': 'SoVITS_weights_v2Pro',
        'name': experiment, 'version': 'v2Pro',
    })
    config_dir = root / 'training' / 'config'
    config_dir.mkdir(parents=True, exist_ok=True)
    s2_path = config_dir / 's2.json'
    s2_path.write_text(json.dumps(s2), encoding='utf-8')
    s1_path = config_dir / 's1.yaml'
    s1_path.write_text(f'''data:
  max_eval_sample: 8
  max_sec: 54
  num_workers: 4
  pad_val: 1024
inference:
  top_k: 15
model:
  EOS: 1024
  dropout: 0
  embedding_dim: 512
  head: 16
  hidden_dim: 512
  linear_units: 2048
  n_layer: 24
  phoneme_vocab_size: 732
  random_bert: 0
  vocab_size: 1025
optimizer:
  decay_steps: 40000
  lr: 0.01
  lr_end: 0.0001
  lr_init: 0.00001
  warmup_steps: 2000
output_dir: logs/{experiment}/logs_s1_v2Pro
pretrained_s1: GPT_SoVITS/pretrained_models/s1v3.ckpt
train:
  batch_size: {batch_size}
  epochs: 10
  exp_name: {experiment}
  gradient_clip: 1.0
  half_weights_save_dir: GPT_weights_v2Pro
  if_dpo: false
  if_save_every_weights: true
  if_save_latest: true
  precision: 16-mixed
  save_every_n_epoch: 5
  seed: 1234
train_phoneme_path: logs/{experiment}/2-name2text.txt
train_semantic_path: logs/{experiment}/6-name2semantic.tsv
''', encoding='utf-8')
    (log_dir / 'logs_s2_v2Pro').mkdir(exist_ok=True)
    (log_dir / 'logs_s1_v2Pro').mkdir(exist_ok=True)
    return s2_path, s1_path

def main():
    args = parse_args()
    job_path, tool = Path(args.job), Path(args.tool_root)
    job = json.loads(job_path.read_text(encoding='utf-8'))
    root = job_path.parent
    speaker = re.sub(r'[^a-z0-9-]', '-', job['speaker'].lower())
    experiment = f"{speaker}-{job['id'][-8:]}"
    log_dir = tool / 'logs' / experiment
    if log_dir.exists():
        shutil.rmtree(log_dir)
    log_dir.mkdir(parents=True)
    runtime = tool / 'runtime/python.exe'
    sentences, wav_dir, rows = split_training_audio(job, root, experiment, speaker, tool / 'runtime/ffmpeg.exe')
    update = lambda progress, message: update_job(job_path, progress, message)
    update(68, f'학습용 발언 {len(rows)}개를 준비했습니다')
    list_path = root / 'training' / f'{experiment}.list'
    list_path.write_text('\n'.join(rows), encoding='utf-8')
    env = os.environ.copy()
    env.update({
        'inp_text': str(list_path), 'inp_wav_dir': str(wav_dir), 'exp_name': experiment,
        'opt_dir': str(log_dir), 'i_part': '0', 'all_parts': '1', '_CUDA_VISIBLE_DEVICES': '0',
        'is_half': 'True',
        'bert_pretrained_dir': str(tool / 'GPT_SoVITS/pretrained_models/chinese-roberta-wwm-ext-large'),
        'cnhubert_base_dir': str(tool / 'GPT_SoVITS/pretrained_models/chinese-hubert-base'),
        'sv_path': str(tool / 'GPT_SoVITS/pretrained_models/sv/pretrained_eres2netv2w24s4ep4.ckpt'),
        'pretrained_s2G': str(tool / 'GPT_SoVITS/pretrained_models/v2Pro/s2Gv2Pro.pth'),
        's2config_path': str(tool / 'GPT_SoVITS/configs/s2v2Pro.json'),
    })
    run = prepare_dataset(tool, runtime, env, log_dir, update)
    s2_path, s1_path = write_configs(tool, root, log_dir, experiment, min(len(rows), 6))
    update(75, '목소리의 음색 특징을 학습하는 중 · 1/2')
    run(tool / 'GPT_SoVITS/s2_train.py', '--config', str(s2_path))
    update(80, '말투와 문장 흐름을 학습하는 중 · 2/2')
    run(tool / 'GPT_SoVITS/s1_train.py', '--config_file', str(s1_path))
    gpt = max((tool / 'GPT_weights_v2Pro').glob(f'{experiment}-e*.ckpt'), key=lambda item: item.stat().st_mtime)
    sovits = max((tool / 'SoVITS_weights_v2Pro').glob(f'{experiment}_e*.pth'), key=lambda item: item.stat().st_mtime)
    current = json.loads(job_path.read_text(encoding='utf-8'))
    current['trainingTranscript'] = current['transcript']
    current['model'] = {
        'gpt': str(gpt), 'sovits': str(sovits),
        'reference': str(wav_dir / f'{experiment}-01.wav'), 'referenceText': sentences[0],
    }
    job_path.write_text(json.dumps(current, ensure_ascii=False, indent=2), encoding='utf-8')

if __name__ == '__main__':
    main()
