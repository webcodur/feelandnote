# Transcribe John Green podcast mp3s (English) with faster-whisper large-v3-turbo.
# Input:  D:\audios\interview-cleaner\input\jg-<num>.mp3
# Output: C:\project\feelandnote\data\celeb\viewing-research\john-green\transcripts\<num>.txt
import os, sys, glob, json

os.environ.setdefault('HF_HOME', r'D:\audios\interview-cleaner\cache')
os.environ.setdefault('HUGGINGFACE_HUB_CACHE', r'D:\audios\interview-cleaner\cache')

from faster_whisper import WhisperModel

MODEL_DIR = r'D:\audios\interview-cleaner\models\whisper\models--mobiuslabsgmbh--faster-whisper-large-v3-turbo'
SNAP = glob.glob(os.path.join(MODEL_DIR, 'snapshots', '*'))[0]
OUT_DIR = r'C:\project\feelandnote\data\celeb\viewing-research\john-green\transcripts'
IN_DIR = r'D:\audios\interview-cleaner\input'

model = WhisperModel(SNAP, device='cpu', compute_type='int8')

only = sys.argv[1:] or None
for mp3 in sorted(glob.glob(os.path.join(IN_DIR, 'jg-*.mp3'))):
    num = os.path.basename(mp3)[3:-4]
    if only and num not in only:
        continue
    out = os.path.join(OUT_DIR, num + '.txt')
    print('TRANSCRIBE', num, flush=True)
    segments, info = model.transcribe(
        mp3, language='en', beam_size=5, vad_filter=True,
        condition_on_previous_text=False,
    )
    lines = []
    for s in segments:
        t = f'[{s.start/60:05.1f}]'
        lines.append(f'{t} {s.text.strip()}')
    with open(out, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))
    print('DONE', num, len(lines), 'segs', f'{info.duration/60:.1f}min', flush=True)
