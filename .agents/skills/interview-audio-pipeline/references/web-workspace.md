# Web workspace

Read this reference when operating, debugging, or changing `sw/audio-bo`.

## Boundaries

- Run from the Feelandnote repository with `pnpm dev:audio-bo` on port 3005.
- Keep code and documentation in the repository.
- Keep jobs, WAV files, training data, models, and caches on D:.
- Store each job at `D:\audios\interview-cleaner\projects\<job-id>`.
- Accept only YouTube URLs and ASCII speaker identifiers (`a-z`, digits, hyphens) through the web form.

## State and retry model

`job.json` records the current stage, progress, message, transcript, media segments, file paths, model paths, and verification text. Each action reads the latest state before running and writes its own output paths afterward.

The UI separates four stages: video selection/import, region editing/transcription, speaker training, and synthesis. Show the job library only in the first stage. In later stages, replace persistent sidebars with one compact current-job status bar and give the media workspace the full content width. Keep `transcript` as the corrected training text and `synthesisText` as the independently editable target speech. Never require users to overwrite training text to synthesize a new sentence.

Represent overall completion as discrete workflow steps, such as `3/4 · speaker training complete`. Do not derive or display a percentage from the presence of artifacts or background-worker progress. Show background-worker phase messages only inside the action currently running.

Actions are intentionally independent:

1. `extract` downloads a browser-playable video up to 720p, creates `input/source.mp4`, and extracts `input/source.wav`.
2. `clean` creates a DeepFilterNet derivative while preserving the source.
3. `transcribe` transcribes user-selected regions, splits selections longer than 10 seconds into timestamped 3–10 second speech regions, or creates regions automatically when none exist.
4. `train` uses only enabled 3–10 second regions belonging to the selected speaker (`A` or `B`); exclude `overlap` regions.
5. `synthesize` creates base, trained, and polished WAV files and verifies all three with Whisper.

During synthesis, treat the newest GPT checkpoint as a candidate, not automatically as the best result. If it produces an empty or abnormally short utterance, try earlier checkpoints from the same training run and keep the first one that produces recognizable speech. Do not expose a player merely because a WAV path exists: only show outputs with non-empty speech verification. Create the listening-polished output only from a verified trained output, force mono 32 kHz PCM, and verify it again after filtering.

Before synthesis, offer visible, multi-select delivery directions such as calm, firm, energetic, urgent, relaxed, gentle, clear, and weighty. Persist the selected directions on the job. Combine their speed and pause adjustments with safe bounds, then layer compatible EQ and dynamics filters. Describe these as approximate delivery shaping, not text-understood emotion acting; opposing choices may partially cancel each other.

Keep successful synthesis runs under `output/runs/<timestamp>/` instead of overwriting the previous run. Record the sentence, delivery directions, verification text, and selected checkpoint in each run's `run.json`. Expose an in-app output library with playback, duration, file size, download, and an Explorer button for the output directory. Treat generation as a transaction: do not clear the job's current output pointers until a complete new run passes verification.

If a stage fails, inspect `worker.log`, `worker-error.log`, and `launcher.log` in the job directory. Correct the cause and rerun only that action. A new training attempt clears only its job-specific GPT-SoVITS log directory.

## Editing contract

- Use the local MP4 for visual seeking and the local WAV for transcription, cleanup, and training.
- Generate a compact waveform from the WAV and make drag-to-select the primary editing gesture. Accept either sentence-sized selections or a continuous selection around one minute; split long selections during transcription. Keep in/out buttons only as an accessible fallback.
- Default long media to a 60-second waveform window with 30/60/120-second and full-view choices. Provide previous, next, and center-on-playhead controls so 3–10 second selections remain practical.
- Auto-save segment, speaker, and transcript edits after a short debounce. Gate training and next-step navigation on three valid transcribed segments for the chosen speaker.
- Cancel pending auto-save before transcription so stale long selections cannot overwrite newly split speech regions.
- Put the actual training action at the top of the training stage and collapse the previously reviewed media editor. During training, persist phase-specific progress messages for speech preparation, pronunciation features, voice features, timbre training, and prosody training. Keep the next stage unavailable until both model files are recorded in `job.json`.
- Keep every A–B–A–B turn as an independent segment. Do not concatenate turns before training.
- Automatic transcription proposes speech boundaries but does not identify speakers. Require the user to confirm A, B, or overlap.
- Warn on segments outside 3–10 seconds and require at least three valid segments for the chosen training speaker.

## Encoding contract

- Preserve a UTF-8 BOM on `scripts/audio-worker.ps1` for Windows PowerShell 5.1 Korean parsing.
- Write Python, TypeScript, Markdown, GPT-SoVITS JSON/YAML/list/TSV, transcripts, and `job.json` as UTF-8 without BOM.
- After editing, search for replacement characters and common mojibake fragments in `sw/audio-bo` and this skill.

## Verification

Run these checks after maintenance:

```powershell
D:\audios\interview-cleaner\.venv\Scripts\python.exe -m py_compile sw/audio-bo/scripts/*.py
pnpm --filter @feelandnote/audio-bo typecheck
pnpm --filter @feelandnote/audio-bo build
```

Confirm the PowerShell BOM with `Format-Hex` and ensure its first bytes are `EF BB BF`. Open `http://localhost:3005`, confirm Korean labels render correctly, select an existing completed job, and verify all available audio players load.
