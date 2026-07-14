# Model options

Read this reference when choosing an engine for the audio workspace.

## GPT-SoVITS v2Pro

- Current validated engine for Korean voice cloning in this workspace.
- Supports Korean inference and short-reference fine-tuning.
- Keep as the default until another engine passes the same Korean script, speaker-similarity, omission, speed, and hardware tests.

## Dia

- A 1.6B text-to-dialogue model focused on realistic English two-speaker dialogue.
- Supports 5–10 second audio prompting, emotion/tone conditioning, and non-verbal sounds.
- The official repository states that generation is English-only and GPU-tested, with about 4.4 GB VRAM for half precision.
- Treat as a future English dialogue mode, not a Korean replacement for GPT-SoVITS.

Official source: https://github.com/nari-labs/dia

## Spark-TTS

- A 0.5B LLM-based TTS model with zero-shot voice cloning and controllable gender, pitch, and speaking rate.
- The official repository supports Chinese and English, including cross-lingual/code-switching between those languages.
- Training code is not released; the published workflow is inference with reference audio or virtual-speaker controls.
- Treat as a future Chinese/English zero-shot comparison engine, not a validated Korean engine.

Official source: https://github.com/SparkAudio/Spark-TTS

## Adoption gate

Do not install an alternative solely from demo quality. First confirm supported language, Windows support, CPU/GPU requirements, model license, reference-audio constraints, and whether inference or fine-tuning is actually available. Add it to audio-bo only after producing the same Korean evaluation sentence and comparing it against the current trained and polished outputs.
