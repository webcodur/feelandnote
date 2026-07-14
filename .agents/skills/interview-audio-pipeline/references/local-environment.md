# Local environment

## Validated layout

```text
D:\audios\interview-cleaner\
  .venv\
  cache\
  input\
  models\
    DeepFilterNet3\
    whisper\models--mobiuslabsgmbh--faster-whisper-large-v3-turbo\
  output\
  subtitles\youtube\
  subtitles\whisper\
```

Existing synthesis installation: `D:\GPT-SoVITS\GPT-SoVITS-v2pro-20250604`.

## Validated components

- Python 3.11 virtual environment at `D:\audios\interview-cleaner\.venv`
- DeepFilterNet 0.5.6 with DeepFilterNet3
- PyTorch and torchaudio 2.1.2 CPU; newer torchaudio removed the backend API required by this DeepFilterNet release
- soundfile 0.14.0, faster-whisper 1.2.1, and large-v3-turbo on D:
- yt-dlp on PATH; its configured FFmpeg can extract WAV even when `ffmpeg` is not directly on PATH

## Execution details

- Pass the D-drive DeepFilterNet model directory explicitly with `--model-base-dir`; cache variables alone did not prevent the Windows user cache from being used initially.
- Set `UV_CACHE_DIR`, `HF_HOME`, `HUGGINGFACE_HUB_CACHE`, and Whisper `download_root` to D-drive paths.
- DeepFilterNet3 processed the 30-second stereo test WAV on CPU in about 2.5 seconds.
- The first large-v3-turbo download plus two 30-second CPU transcriptions took about 3 minutes; later runs reuse the model.

## Test artifacts

Video `7VbYr1mJkcQ`, range `00:04:53–00:05:23`:

```text
D:\audios\interview-cleaner\input\youtube-7VbYr1mJkcQ-293s.wav
D:\audios\interview-cleaner\output\youtube-7VbYr1mJkcQ-293s_DeepFilterNet3.wav
D:\audios\interview-cleaner\subtitles\youtube\7VbYr1mJkcQ.ko-orig.srt
D:\audios\interview-cleaner\subtitles\whisper\original.srt
D:\audios\interview-cleaner\subtitles\whisper\original.txt
D:\audios\interview-cleaner\subtitles\whisper\cleaned.srt
D:\audios\interview-cleaner\subtitles\whisper\cleaned.txt
```

## Known limitations

- DeepFilterNet suppresses noise but does not isolate a target speaker from overlapping voices.
- YouTube may provide only automatic captions.
- Denoising can improve listening while worsening word boundaries or subtitle cadence.
- GPT-SoVITS reference audio must be between 3 and 10 seconds; a 10.24-second clip is rejected.

## Validated GPT-SoVITS synthesis

Validated on 2026-07-11 with the target text `안녕하세요 반갑습니다.` and a 5.46-second Korean reference clip.

- Base v2Pro: `s1v3.ckpt` + `v2Pro/s2Gv2Pro.pth`
- Fine-tuned `cha`: `GPT_weights_v2Pro/cha-e10.ckpt` + `SoVITS_weights_v2Pro/cha_e8_s136.pth`
- Use `api_v2.py` with `text_lang=ko` and `prompt_lang=ko`; the bundled CLI does not expose Korean in its argument choices.
- Base output: 2.22 seconds; Whisper verification: `안녕하세요. 반갑습니다.`
- Fine-tuned output: 1.98 seconds; Whisper verification: `안녕하세요 반갑습니다`

Artifacts:

```text
D:\audios\interview-cleaner\synthesis-test\reference\cha-reference.wav
D:\audios\interview-cleaner\synthesis-test\output\base\hello-base.wav
D:\audios\interview-cleaner\synthesis-test\output\finetuned\hello-finetuned.wav
```

### YouTube speaker fine-tuning (`park`)

Validated on 2026-07-11 using video `7VbYr1mJkcQ`, extracted range `00:04:53–00:05:25.99`.

- Train from the original audio, not the denoised derivative.
- Use four complete 6.72–7.58 second clips totaling 28.26 seconds; omit the final incomplete phrase.
- Correct contextually certain ASR errors such as `혁신이가` → `혁신위가` before training.
- v2Pro SoVITS: 8 epochs, batch size 4, output `park_e8_s200.pth`.
- v2Pro GPT: 10 epochs, batch size 4, output `park-e10.ckpt`.
- Use a 7.2-second in-training reference clip and its exact transcript for inference.
- Base output with the same `park` reference: 2.50 seconds; Whisper: `안녕하세요. 반갑습니다.`
- Fine-tuned `park` output: 1.98 seconds; Whisper: `안녕하세요. 반갑습니다.`

```text
D:\audios\interview-cleaner\park-training\park.list
D:\audios\interview-cleaner\park-training\output\base\hello-base-park-reference.wav
D:\audios\interview-cleaner\park-training\output\park\hello-park-finetuned.wav
D:\GPT-SoVITS\GPT-SoVITS-v2pro-20250604\GPT_weights_v2Pro\park-e10.ckpt
D:\GPT-SoVITS\GPT-SoVITS-v2pro-20250604\SoVITS_weights_v2Pro\park_e8_s200.pth
```

Command-line training requires pre-creating `logs/<name>/logs_s2_v2Pro` and `logs/<name>/logs_s1_v2Pro`; the Web UI normally creates these directories. Write generated JSON/YAML/TSV without a UTF-8 BOM because the training JSON reader rejects BOM-prefixed files.

## Local web workspace

The validated end-to-end workflow is available at `sw/audio-bo`.

```bash
pnpm dev:audio-bo
```

- Local URL: `http://localhost:3005`
- Job storage: `D:\audios\interview-cleaner\projects\<job-id>`
- Stages: extract → clean → transcribe → edit script → train → synthesize
- Outputs: base, fine-tuned, and polished WAV files plus Whisper verification text
- The Windows PowerShell worker must retain a UTF-8 BOM because Windows PowerShell 5.1 otherwise misparses Korean strings.
