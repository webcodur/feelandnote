import argparse
import difflib
import importlib.util
import json
import re
import subprocess
import urllib.error
import urllib.parse
import urllib.request
import wave
from datetime import datetime
from pathlib import Path

import numpy as np
from faster_whisper import WhisperModel


SAFE_PHRASES = {
    "ko": "확인용 문장을 지금 시작합니다.",
    "en": "This verification sentence begins now.",
}
SLOTS = (
    ("g1", "greeting", 0),
    ("g2", "greeting", 1),
    ("g3", "greeting", 2),
    ("r1", "roll_call", 0),
    ("r2", "roll_call", 1),
    ("r3", "roll_call", 2),
    ("d1", "deploy", 0),
    ("d2", "deploy", 1),
    ("d3", "deploy", 2),
    ("bw1", "battle_win", 0),
    ("bw2", "battle_win", 1),
    ("bw3", "battle_win", 2),
    ("bd1", "battle_draw", 0),
    ("bd2", "battle_draw", 1),
    ("bd3", "battle_draw", 2),
    ("bl1", "battle_lose", 0),
    ("bl2", "battle_lose", 1),
    ("bl3", "battle_lose", 2),
    ("c1", "clash_attack", 0),
    ("c2", "clash_attack", 1),
    ("c3", "clash_attack", 2),
    ("quote", "quote", None),
)


def load_research_helpers():
    helper_path = Path(__file__).with_name("elevenlabs-artifact-research.py")
    spec = importlib.util.spec_from_file_location("elevenlabs_artifact_research", helper_path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Cannot import research helpers: {helper_path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


RESEARCH = load_research_helpers()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate all 22 celeb dialogue slots with a spoken safety tail, then cut the tail."
    )
    parser.add_argument("--slug", required=True)
    parser.add_argument("--locale", choices=("ko", "en"), required=True)
    parser.add_argument("--voice-id", help="Override the locale voice ID without changing the DB")
    parser.add_argument("--account", choices=("default", "feelandnote"), default="default")
    parser.add_argument("--audio-env", type=Path, default=Path(__file__).parents[1] / ".env")
    parser.add_argument("--web-env", type=Path, default=Path(__file__).parents[2] / "web-bo" / ".env")
    parser.add_argument("--output-root", type=Path)
    parser.add_argument("--safe-phrase")
    parser.add_argument("--model", default="eleven_v3")
    parser.add_argument("--stability", type=float, default=0.5)
    parser.add_argument("--similarity", type=float, default=0.75)
    parser.add_argument("--style", type=float, default=0.3)
    parser.add_argument(
        "--speed",
        type=float,
        help="ElevenLabs synthesis speed (default: 1.0; independent of web playback voice_speed)",
    )
    parser.add_argument(
        "--whisper-root",
        type=Path,
        default=Path(r"D:\audios\interview-cleaner\models\whisper"),
    )
    parser.add_argument("--ffmpeg", default="ffmpeg")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Validate the DB source, voice ID and 22 slots without calling ElevenLabs.",
    )
    return parser.parse_args()


def request_json(url: str, headers: dict[str, str]) -> object:
    request = urllib.request.Request(
        url,
        headers={**headers, "User-Agent": "feelandnote-audio-research/1.0"},
    )
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")[:600]
        raise RuntimeError(f"HTTP {error.code}: {detail}") from error


def load_celeb(
    slug: str,
    locale: str,
    env: dict[str, str],
) -> tuple[dict[str, object], list[dict[str, object]]]:
    base_url = env.get("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
    service_key = env.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not base_url or not service_key:
        raise RuntimeError("NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing")

    headers = {"apikey": service_key, "Authorization": f"Bearer {service_key}"}
    query_slug = urllib.parse.quote(slug, safe="")
    celeb_url = (
        f"{base_url}/rest/v1/celebs?slug=eq.{query_slug}"
        "&select=id,slug,nickname,voice_id_ko,voice_id_en,voice_speed,speech_tone"
    )
    celeb_rows = request_json(celeb_url, headers)
    if not isinstance(celeb_rows, list) or len(celeb_rows) != 1:
        raise RuntimeError(f"Expected one celeb for slug={slug}, got {len(celeb_rows) if isinstance(celeb_rows, list) else 'invalid'}")
    celeb = celeb_rows[0]
    if not isinstance(celeb, dict):
        raise RuntimeError("Invalid celeb response")

    celeb_id = urllib.parse.quote(str(celeb["id"]), safe="")
    dialogue_url = f"{base_url}/rest/v1/celeb_dialogues?celeb_id=eq.{celeb_id}&select=lines,lines_en"
    dialogue_rows = request_json(dialogue_url, headers)
    if not isinstance(dialogue_rows, list) or len(dialogue_rows) != 1:
        raise RuntimeError(f"Expected one celeb_dialogues row, got {len(dialogue_rows) if isinstance(dialogue_rows, list) else 'invalid'}")
    lines_key = "lines" if locale == "ko" else "lines_en"
    lines = dialogue_rows[0].get(lines_key)
    if not isinstance(lines, dict):
        raise RuntimeError(f"celeb_dialogues.{lines_key} is missing")

    jobs: list[dict[str, object]] = []
    for file_stem, dialogue_type, array_index in SLOTS:
        value = lines.get(dialogue_type)
        if array_index is None:
            text = value
        else:
            if not isinstance(value, list) or len(value) != 3:
                raise RuntimeError(f"{dialogue_type} must contain exactly three lines")
            text = value[array_index]
        if not isinstance(text, str) or not text.strip():
            raise RuntimeError(f"Empty dialogue: {file_stem}")
        jobs.append(
            {
                "slot": file_stem,
                "fileName": f"{file_stem}.mp3",
                "dialogueType": dialogue_type,
                "variant": None if array_index is None else array_index + 1,
                "text": text.strip(),
            }
        )
    if len(jobs) != 22:
        raise RuntimeError(f"Expected 22 dialogue jobs, got {len(jobs)}")
    return celeb, jobs


def spoken_text(value: str) -> str:
    return re.sub(r"^(?:\s*\[[^\]]+\]\s*)+", "", value).strip()


def synthesize(
    api_key: str,
    voice_id: str,
    text: str,
    destination: Path,
    model: str,
    stability: float,
    similarity: float,
    style: float,
    speed: float,
) -> dict[str, object]:
    output_format = "mp3_44100_128"
    query = urllib.parse.urlencode({"output_format": output_format})
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{urllib.parse.quote(voice_id)}?{query}"
    body = json.dumps(
        {
            "text": text,
            "model_id": model,
            "voice_settings": {
                "stability": stability,
                "similarity_boost": similarity,
                "style": style,
            },
            "speed": speed,
        },
        ensure_ascii=False,
    ).encode("utf-8")
    request = urllib.request.Request(
        url,
        data=body,
        method="POST",
        headers={
            "xi-api-key": api_key,
            "Content-Type": "application/json",
            "Accept": "audio/mpeg",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=240) as response:
            audio = response.read()
            destination.write_bytes(audio)
            return {
                "bytes": len(audio),
                "requestId": response.headers.get("request-id"),
                "historyItemId": response.headers.get("history-item-id"),
                "outputFormat": output_format,
            }
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")[:600]
        raise RuntimeError(f"ElevenLabs HTTP {error.code}: {detail}") from error


def flatten_words(transcription: dict[str, object]) -> list[dict[str, object]]:
    words: list[dict[str, object]] = []
    for segment in transcription.get("segments", []):
        words.extend(segment.get("words", []))
    return words


def find_safe_phrase_start(
    transcription: dict[str, object],
    expected_text: str,
    safe_phrase: str,
) -> dict[str, object] | None:
    words = flatten_words(transcription)
    if not words:
        return None

    classified = RESEARCH.classify_words(expected_text, transcription)
    matched = [word for word in classified if bool(word["matched"])]
    last_target_end = float(matched[-1]["end"]) if matched else 0.0
    safe_tokens = [RESEARCH.normalize_text(part) for part in safe_phrase.split()]
    safe_tokens = [part for part in safe_tokens if part]
    if not safe_tokens:
        return None

    best: tuple[float, int] | None = None
    for index, word in enumerate(words):
        start = float(word["start"])
        if start < last_target_end - 0.08:
            continue
        scores: list[float] = []
        for width in range(1, min(3, len(words) - index) + 1):
            actual = "".join(RESEARCH.normalize_text(str(item["word"])) for item in words[index:index + width])
            expected = "".join(safe_tokens[:width])
            if actual and expected:
                scores.append(difflib.SequenceMatcher(None, actual, expected, autojunk=False).ratio())
        if not scores:
            continue
        score = max(scores)
        first_token_score = difflib.SequenceMatcher(
            None,
            RESEARCH.normalize_text(str(word["word"])),
            safe_tokens[0],
            autojunk=False,
        ).ratio()
        score = max(score, first_token_score)
        if best is None or score > best[0]:
            best = (score, index)

    if best is None or best[0] < 0.58:
        return None
    anchor = words[best[1]]
    return {
        "start": float(anchor["start"]),
        "end": float(anchor["end"]),
        "word": str(anchor["word"]).strip(),
        "score": round(best[0], 4),
        "lastTargetWordEnd": round(last_target_end, 3) if matched else None,
    }


def quiet_cut_point(wav_path: Path, anchor: dict[str, object]) -> dict[str, object]:
    samples, sample_rate = RESEARCH.load_wav_mono(wav_path)
    safe_start = float(anchor["start"])
    last_target_end_value = anchor.get("lastTargetWordEnd")
    last_target_end = float(last_target_end_value) if last_target_end_value is not None else max(0.0, safe_start - 0.7)

    # Whisper의 단어 시작 시각은 앞 단어와 긴 무음까지 끌어안아 실제 발성보다
    # 0.5초 이상 빨라질 수 있다. 먼저 VAD 음성 덩어리 사이에서 Whisper 앵커와
    # 맞닿은 경계를 찾고, 본문 끝과 안전 문구 시작 사이의 한가운데를 자른다.
    vad_samples = RESEARCH.get_speech_timestamps(
        samples,
        RESEARCH.VadOptions(
            threshold=0.45,
            min_speech_duration_ms=60,
            min_silence_duration_ms=100,
            speech_pad_ms=0,
        ),
        sampling_rate=sample_rate,
    )
    vad_intervals = [
        (float(item["start"]) / sample_rate, float(item["end"]) / sample_rate)
        for item in vad_samples
    ]
    gap_candidates: list[tuple[float, float, float]] = []
    for previous, following in zip(vad_intervals, vad_intervals[1:]):
        gap_start, gap_end = previous[1], following[0]
        gap_duration = gap_end - gap_start
        if gap_duration < 0.08:
            continue
        if safe_start < gap_start:
            distance = gap_start - safe_start
        elif safe_start > gap_end:
            distance = safe_start - gap_end
        else:
            distance = 0.0
        if distance <= 0.2:
            gap_candidates.append((distance, -gap_duration, (gap_start + gap_end) / 2))

    if gap_candidates:
        _, _, cut_seconds = min(gap_candidates)
        return {
            "seconds": round(cut_seconds, 3),
            "method": "vad-gap-midpoint",
            "safePhraseWordStart": round(safe_start, 3),
            "vadIntervals": [
                {"start": round(start, 3), "end": round(end, 3)}
                for start, end in vad_intervals
            ],
        }

    frame_seconds = 0.01
    frame_size = max(1, round(sample_rate * frame_seconds))
    # 초단문에서는 파일 맨 앞 무음이 가장 긴 후보가 되기 쉽다. 마지막 본문 단어
    # 근처만 보아야 시작 무음을 본문-안전문구 사이의 틈으로 오인하지 않는다.
    search_start = max(0.0, last_target_end - 0.12, safe_start - 0.65)
    search_end = max(search_start, safe_start - 0.015)
    first_frame = max(0, int(search_start / frame_seconds))
    last_frame = min(int(search_end / frame_seconds), int(np.ceil(len(samples) / frame_size)))

    rms_values: list[tuple[int, float]] = []
    for frame_index in range(first_frame, last_frame):
        frame = samples[frame_index * frame_size:(frame_index + 1) * frame_size]
        rms = float(np.sqrt(np.mean(np.square(frame)))) if len(frame) else 0.0
        rms_values.append((frame_index, rms))

    threshold = 0.006
    runs: list[tuple[int, int]] = []
    run_start: int | None = None
    previous = -2
    for frame_index, rms in rms_values:
        if rms <= threshold:
            if run_start is None or frame_index != previous + 1:
                if run_start is not None:
                    runs.append((run_start, previous + 1))
                run_start = frame_index
            previous = frame_index
        elif run_start is not None:
            runs.append((run_start, previous + 1))
            run_start = None
    if run_start is not None:
        runs.append((run_start, previous + 1))

    valid_runs = [run for run in runs if (run[1] - run[0]) * frame_seconds >= 0.03]
    if valid_runs:
        start_frame, end_frame = valid_runs[-1]
        cut_seconds = ((start_frame + end_frame) / 2) * frame_seconds
        method = "quiet-gap-midpoint"
    else:
        cut_seconds = safe_start - 0.075
        method = "safe-word-anchor-minus-75ms"

    minimum_after_target = last_target_end + 0.015
    if minimum_after_target < safe_start - 0.02:
        cut_seconds = max(cut_seconds, minimum_after_target)
    cut_seconds = min(cut_seconds, safe_start - 0.02)
    cut_seconds = max(0.05, cut_seconds)
    return {
        "seconds": round(cut_seconds, 3),
        "method": method,
        "quietThresholdRms": threshold,
    }


def trim_audio(ffmpeg: str, source: Path, mp3_destination: Path, cut_seconds: float) -> None:
    fade_duration = min(0.025, max(0.005, cut_seconds / 4))
    fade_start = max(0.0, cut_seconds - fade_duration)
    audio_filter = f"atrim=start=0:end={cut_seconds:.3f},afade=t=out:st={fade_start:.3f}:d={fade_duration:.3f}"
    subprocess.run(
        [
            ffmpeg,
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-i",
            str(source),
            "-af",
            audio_filter,
            "-ac",
            "1",
            "-ar",
            "44100",
            "-b:a",
            "128k",
            str(mp3_destination),
        ],
        check=True,
        capture_output=True,
    )


def safe_phrase_leaked(transcription: dict[str, object], safe_phrase: str) -> bool:
    recognized = RESEARCH.normalize_text(str(transcription.get("text", "")))
    safe_tokens = [RESEARCH.normalize_text(part) for part in safe_phrase.split()]
    safe_tokens = [part for part in safe_tokens if part]
    if not safe_tokens:
        return False
    # 한국어의 '확인용'처럼 고유한 첫 단어도 있지만 영어 안전 문구의 'This'는
    # 본문에 흔하다. 두 단어를 서명으로 써 정상 본문의 단일 공통어를 잔류로 오인하지 않는다.
    signature_width = min(2, len(safe_tokens))
    signature = "".join(safe_tokens[:signature_width])
    if signature and signature in recognized:
        return True
    words = flatten_words(transcription)
    for index in range(len(words) - signature_width + 1):
        actual = "".join(
            RESEARCH.normalize_text(str(word["word"]))
            for word in words[index:index + signature_width]
        )
        if actual and signature:
            ratio = difflib.SequenceMatcher(None, actual, signature, autojunk=False).ratio()
            if ratio >= 0.78:
                return True
    return False


def write_manifest(run_dir: Path, manifest: dict[str, object]) -> None:
    (run_dir / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def main() -> None:
    args = parse_args()
    audio_env = RESEARCH.read_env(args.audio_env)
    web_env = RESEARCH.read_env(args.web_env)
    env_key = "ELEVENLABS_API_KEY" if args.account == "default" else "ELEVENLABS_API_KEY_FEELANDNOTE"
    api_key = audio_env.get(env_key, "")
    if not api_key.startswith("sk_"):
        raise SystemExit(f"{env_key} is missing from the audio-bo env")

    celeb, jobs = load_celeb(args.slug, args.locale, web_env)
    voice_id = (args.voice_id or str(celeb.get(f"voice_id_{args.locale}") or "")).strip()
    if not voice_id:
        raise SystemExit(
            f"{args.slug} has no voice_id_{args.locale}; save one or pass --voice-id explicitly"
        )
    speed = float(args.speed if args.speed is not None else 1.0)
    safe_phrase = args.safe_phrase or SAFE_PHRASES[args.locale]
    if args.dry_run:
        print(
            json.dumps(
                {
                    "mode": "safe-tail",
                    "status": "ready",
                    "slug": args.slug,
                    "locale": args.locale,
                    "celebId": celeb["id"],
                    "voiceId": voice_id,
                    "account": args.account,
                    "jobCount": len(jobs),
                    "safePhrase": safe_phrase,
                    "settings": {
                        "model": args.model,
                        "stability": args.stability,
                        "similarityBoost": args.similarity,
                        "style": args.style,
                        "speed": speed,
                    },
                },
                ensure_ascii=False,
                indent=2,
            )
        )
        return

    configured_root = audio_env.get("CELEB_DIALOGUE_VOICE_ROOT")
    output_root = args.output_root or Path(
        configured_root or r"D:\audios\interview-cleaner\celeb-dialogue-voices"
    ) / "safe-tail"
    run_id = datetime.now().strftime("%Y%m%d-%H%M%S")
    run_dir = output_root / args.slug / args.locale / run_id
    raw_dir = run_dir / "raw"
    analysis_dir = run_dir / "analysis"
    raw_dir.mkdir(parents=True, exist_ok=False)
    analysis_dir.mkdir()

    manifest: dict[str, object] = {
        "schemaVersion": 1,
        "mode": "safe-tail",
        "runId": run_id,
        "createdAt": datetime.now().astimezone().isoformat(),
        "status": "generating",
        "celeb": {
            "id": celeb["id"],
            "slug": celeb["slug"],
            "nickname": celeb["nickname"],
            "speechTone": celeb.get("speech_tone"),
        },
        "locale": args.locale,
        "voiceId": voice_id,
        "safePhrase": safe_phrase,
        "settings": {
            "model": args.model,
            "stability": args.stability,
            "similarityBoost": args.similarity,
            "style": args.style,
            "speed": speed,
            "account": args.account,
            "outputFormat": "mp3_44100_128",
        },
        "samples": [],
    }

    samples: list[dict[str, object]] = []
    for index, job in enumerate(jobs, start=1):
        slot = str(job["slot"])
        raw_mp3 = raw_dir / f"{slot}.source.mp3"
        raw_wav = raw_dir / f"{slot}.source.wav"
        request_text = f'{job["text"]}\n\n{safe_phrase}'
        print(f"generate {index:02d}/22 {slot}", flush=True)
        api_meta = synthesize(
            api_key,
            voice_id,
            request_text,
            raw_mp3,
            args.model,
            args.stability,
            args.similarity,
            args.style,
            speed,
        )
        RESEARCH.convert_to_wav(args.ffmpeg, raw_mp3, raw_wav)
        sample = {
            **job,
            "expectedSpokenText": spoken_text(str(job["text"])),
            "requestText": request_text,
            "rawMp3": raw_mp3.relative_to(run_dir).as_posix(),
            "rawWav": raw_wav.relative_to(run_dir).as_posix(),
            "rawDurationSeconds": RESEARCH.wav_duration(raw_wav),
            **api_meta,
        }
        samples.append(sample)
        manifest["samples"] = samples
        write_manifest(run_dir, manifest)

    print("load local Whisper large-v3-turbo", flush=True)
    model = WhisperModel(
        "large-v3-turbo",
        device="cpu",
        compute_type="int8",
        download_root=str(args.whisper_root),
        local_files_only=True,
    )

    for index, sample in enumerate(samples, start=1):
        slot = str(sample["slot"])
        print(f"analyze and cut {index:02d}/22 {slot}", flush=True)
        raw_wav = run_dir / str(sample["rawWav"])
        raw_transcription = RESEARCH.transcribe(model, raw_wav, args.locale)
        raw_transcription_path = analysis_dir / f"{slot}.raw.whisper.json"
        raw_transcription_path.write_text(
            json.dumps(raw_transcription, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        raw_words = RESEARCH.classify_words(str(sample["expectedSpokenText"]), raw_transcription)
        RESEARCH.waveform_svg(raw_wav, raw_words, analysis_dir / f"{slot}.raw.waveform.svg", f"{slot} raw")
        sample["rawTranscript"] = raw_transcription["text"]
        sample["rawMatchPercent"] = RESEARCH.text_match_percent(
            str(sample["expectedSpokenText"]),
            str(raw_transcription["text"]).replace(safe_phrase, ""),
        )
        sample["rawWhisperJson"] = raw_transcription_path.relative_to(run_dir).as_posix()

        anchor = find_safe_phrase_start(raw_transcription, str(sample["expectedSpokenText"]), safe_phrase)
        sample["safePhraseAnchor"] = anchor
        if anchor is None:
            sample["status"] = "failed"
            sample["failureReason"] = "safe-phrase-anchor-not-found"
            write_manifest(run_dir, manifest)
            continue

        cut = quiet_cut_point(raw_wav, anchor)
        sample["cut"] = cut
        clean_mp3 = run_dir / f"{slot}.mp3"
        clean_wav = run_dir / f"{slot}.wav"
        trim_audio(args.ffmpeg, run_dir / str(sample["rawMp3"]), clean_mp3, float(cut["seconds"]))
        RESEARCH.convert_to_wav(args.ffmpeg, clean_mp3, clean_wav)
        clean_transcription = RESEARCH.transcribe(model, clean_wav, args.locale)
        clean_transcription_path = analysis_dir / f"{slot}.clean.whisper.json"
        clean_transcription_path.write_text(
            json.dumps(clean_transcription, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        clean_words = RESEARCH.classify_words(str(sample["expectedSpokenText"]), clean_transcription)
        RESEARCH.waveform_svg(clean_wav, clean_words, analysis_dir / f"{slot}.clean.waveform.svg", f"{slot} clean")
        leaked = safe_phrase_leaked(clean_transcription, safe_phrase)
        match_percent = RESEARCH.text_match_percent(
            str(sample["expectedSpokenText"]), str(clean_transcription["text"])
        )
        sample.update(
            {
                "cleanMp3": clean_mp3.relative_to(run_dir).as_posix(),
                "file": clean_mp3.name,
                "cleanWav": clean_wav.relative_to(run_dir).as_posix(),
                "cleanDurationSeconds": RESEARCH.wav_duration(clean_wav),
                "cleanTranscript": clean_transcription["text"],
                "cleanMatchPercent": match_percent,
                "safePhraseLeaked": leaked,
                "cleanWhisperJson": clean_transcription_path.relative_to(run_dir).as_posix(),
                "status": "verified" if not leaked and match_percent >= 72 else "review",
            }
        )
        write_manifest(run_dir, manifest)

    status_counts = {
        status: sum(1 for sample in samples if sample.get("status") == status)
        for status in ("verified", "review", "failed")
    }
    manifest["status"] = "generated" if status_counts["failed"] == 0 else "failed"
    write_manifest(run_dir, manifest)
    print(
        json.dumps(
            {
                "runDirectory": str(run_dir),
                "mode": "safe-tail",
                "rawCount": sum(1 for sample in samples if sample.get("rawMp3")),
                "cleanCount": sum(1 for sample in samples if sample.get("cleanMp3")),
                "statusCounts": status_counts,
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
