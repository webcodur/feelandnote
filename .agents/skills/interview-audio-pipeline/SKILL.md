---
name: interview-audio-pipeline
description: Extract user-authorized YouTube or local interview audio, reduce changing background noise, transcribe and compare original/cleaned speech, train a GPT-SoVITS speaker model, synthesize and polish Korean speech, or operate and maintain the local audio-bo web workspace. Use for "유튜브 음원 추출", "공항 인터뷰 잡음 제거", "받아쓰기", "자막", "화자 학습", "음성합성", "VOICE FORGE", or an end-to-end video-to-voice workflow.
---

# Interview Audio Pipeline

Process interview media locally from extraction through voice-synthesis preparation. Keep all large audio, models, caches, and outputs under `D:\audios\interview-cleaner`; do not place generated media or models in the repository.

## Safety and scope

- Confirm or rely on the user's statement that they own the media or have permission to download and transform it.
- Never overwrite source audio. Store each derivative separately.
- Treat speech overlapping with another speaker or announcement as only partially recoverable.
- Prefer intelligibility and natural speech over total noise removal.
- Report the exact time range, model, attenuation setting, and output paths.

## Workflow

### 1. Inspect the existing environment

Read [references/local-environment.md](references/local-environment.md) before installing or running tools. For web workspace maintenance, also read [references/web-workspace.md](references/web-workspace.md). When comparing TTS engines, read [references/model-options.md](references/model-options.md).

- Reuse the existing D-drive virtual environment and downloaded models.
- Check existing files before downloading a URL or model again.
- Keep `input`, `output`, `subtitles`, `models`, and `cache` separate.

### 2. Extract the smallest useful test range

- Ask for or infer the interview time range from the URL timestamp.
- Start with 30 seconds unless the user requests a different range.
- Extract losslessly to WAV for processing; keep the source URL ID and start time in the filename.
- Use `yt-dlp --download-sections` and preserve the original sample rate unless a downstream tool requires conversion.

### 3. Reduce changing background noise

- Use DeepFilterNet3 for changing environmental noise such as crowds, HVAC, luggage, and room ambience.
- Start with an attenuation limit around 18 dB. Increase only after listening or comparing recognition.
- Do not assume the cleaned file is better for transcription. Denoising can merge phrases, remove consonants, or change subtitle timing.
- Keep both original and cleaned WAV files.

### 4. Obtain and create subtitles

Run both paths when practical:

1. Download `ko-orig` YouTube automatic captions when available.
2. Transcribe both original and cleaned audio with local faster-whisper.

Use `large-v3-turbo`, Korean language hint, CPU `int8`, beam size 5, VAD, and `condition_on_previous_text=False` as the current baseline. Produce both SRT and plain UTF-8 text.

### 5. Compare recognition

- Compare proper nouns, organization names, endings, omitted phrases, and subtitle breaks.
- Prefer the source with better words and readable timing, not the source with less audible noise.
- Use YouTube captions as a third opinion, not ground truth.
- Correct only contextually certain errors automatically. Flag uncertain names or speech covered by announcements.
- In the validated airport-interview sample, original-audio Whisper preserved subtitle cadence better than cleaned-audio Whisper; both misheard `혁신위` as `혁신이`.

### 6. Prepare GPT-SoVITS synthesis

- Treat GPT-SoVITS as voice cloning/synthesis, not transcription.
- Inspect the existing `D:\GPT-SoVITS` installation before adding anything.
- Select a 5–10 second reference clip with one speaker, stable volume, no overlapping speech, and minimal announcement noise.
- Prefer a lightly cleaned clip only if consonants and speaker identity remain intact.
- Prepare the exact reference transcript and a separate synthesis sentence.
- Use `api_v2.py` for Korean synthesis; the bundled CLI does not expose Korean in its argument choices.
- Verify generated speech with local Whisper and report that this is an intelligibility check, not a substitute for listening quality.

### 7. Use the local web workspace

- Prefer `pnpm dev:audio-bo` when the user wants the entire workflow through a browser.
- Download the authorized source video locally, then let the user select timestamped speech regions from synchronized playback instead of requiring typed start/end seconds.
- Keep alternating speakers as separate A/B segments and exclude overlapping speech from training.
- Execute stages independently so a failed stage can be retried without repeating completed work.
- Save corrected training text before training. Store the desired speech separately before synthesis; never overwrite the training transcript.
- Treat `job.json` as the job state source and generated media as replaceable outputs.
- Preserve the UTF-8 BOM on `audio-worker.ps1`; write generated GPT-SoVITS JSON, YAML, list, and TSV files as UTF-8 without BOM.

## Quality gate

- Verify all generated media and models are on D:.
- Verify original and cleaned audio both remain available.
- Keep SRT timestamps local to the extracted clip unless full-video timestamps are requested.
- Verify plain text is UTF-8 and readable in Korean.
- Report the chosen transcription source and uncertain words.
- Verify the synthesis reference contains only the intended speaker.
- Compile Python helpers, type-check and build the web app after code changes.
- Search user-facing and error text for mojibake before declaring completion.
