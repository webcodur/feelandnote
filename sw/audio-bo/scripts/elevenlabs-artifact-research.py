import argparse
import difflib
import html
import json
import os
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
from faster_whisper.vad import VadOptions, get_speech_timestamps


KOREAN_TEXT = (
    "지금부터 합성 음성의 정확도를 확인합니다. 오늘 오전 열한 시, 연구실에서는 같은 문장을 "
    "세 번 생성하고 발음, 쉼, 문장 끝을 차례로 비교했습니다. 첫 번째 기록은 또렷했고, 두 번째 "
    "기록은 조금 느렸으며, 세 번째 기록에는 원문에 없는 소리가 붙는지 확인해야 합니다. 특히 문장 "
    "사이의 짧은 침묵과 마지막 마침표 뒤를 주의 깊게 들어 주세요. 이 문장이 끝난 다음에는 다른 "
    "말이나 웅얼거림이 이어지면 안 됩니다."
)

ENGLISH_TEXT = (
    "This is a controlled test of speech synthesis accuracy. At eleven o'clock this morning, the lab generated "
    "the same passage several times and compared pronunciation, pauses, and the end of each sentence. The first "
    "recording was clear, the second was slightly slower, and the third must be checked for sounds that were not "
    "present in the script. Listen carefully after the final period. No extra word, murmur, or unfinished phrase "
    "should continue after this sentence ends."
)

TAIL_KOREAN_TEXT = "마지막 불빛이 사라질 때까지, 나는 이 자리를 지키겠다."
TAIL_ENGLISH_TEXT = "I will remain here until the final light disappears."

LISTENING_KOREAN_TEXTS = [
    "오늘 저녁 연구실의 불을 끄기 전에 마지막 기록을 천천히 읽어 보겠습니다. 문장이 완전히 끝난 뒤에는 아무 말도 덧붙이지 말고 조용히 멈춰 주세요.",
    "창밖의 빗소리가 잦아들면 복도 끝에 남은 발자국도 곧 사라질 것입니다. 우리는 그 순간까지 같은 자리에서 소리의 변화를 지켜보겠습니다.",
    "오래된 서랍 안에는 이름이 지워진 편지와 작은 열쇠 하나가 남아 있었습니다. 나는 내용을 확인한 뒤 모든 물건을 원래 자리에 남겨 두겠습니다.",
    "기차가 마지막 역을 떠난 뒤 플랫폼에는 희미한 안내 방송만 남았습니다. 다음 신호가 들릴 때까지 서두르지 말고 여기에서 잠시 기다려 주세요.",
    "누군가 문을 두드리는 소리가 들렸지만 복도에는 아무도 보이지 않았습니다. 잠시 숨을 고른 다음 처음부터 차분한 목소리로 다시 시작하겠습니다.",
    "우리는 같은 문장을 여러 번 녹음하고 끝부분에 낯선 소리가 붙는지 비교하고 있습니다. 아주 작은 웅얼거림이라도 발견하면 정확한 위치를 기록하겠습니다.",
    "새벽이 오기 전까지 해야 할 일은 많지만 중요한 순서는 이미 정해져 있습니다. 마지막 확인이 끝날 때까지 오늘의 약속을 절대로 잊지 않겠습니다.",
    "바람이 세게 불어도 등대의 불빛은 일정한 간격으로 어두운 바다를 비춥니다. 멀리 있는 배는 그 신호를 보고 안전한 방향을 확인할 수 있습니다.",
    "회의가 끝난 뒤 사람들은 하나둘 자리를 떠났고 테이블 위에는 빈 잔만 남았습니다. 정리가 모두 끝날 때까지 녹음 장치는 멈추지 않습니다.",
    "이제 준비한 이야기는 여기까지이며 더 이어질 내용은 없습니다. 마지막 문장이 끝나면 충분한 침묵을 남긴 채 오늘의 녹음을 끝내도록 하겠습니다.",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate and inspect ElevenLabs TTS artifact samples.")
    parser.add_argument("--env", type=Path, default=Path(__file__).parents[1] / ".env")
    parser.add_argument("--voice-id")
    parser.add_argument("--account", choices=("default", "feelandnote"))
    parser.add_argument("--ko-runs", type=int, default=3)
    parser.add_argument("--en-runs", type=int, default=2)
    parser.add_argument("--stability", type=float, default=0.5)
    parser.add_argument("--similarity", type=float, default=0.75)
    parser.add_argument("--style", type=float, default=0.0)
    parser.add_argument("--model", default="eleven_v3")
    parser.add_argument(
        "--tail-test",
        action="store_true",
        help="Repeat short prompts and inspect only audio appended after the final expected word.",
    )
    parser.add_argument(
        "--listening-test",
        action="store_true",
        help="Generate ten roughly ten-second Korean clips for manual listening before analysis.",
    )
    parser.add_argument("--reanalyze-run", type=Path)
    parser.add_argument(
        "--output-root",
        type=Path,
        default=None,
    )
    parser.add_argument(
        "--whisper-root",
        type=Path,
        default=Path(r"D:\audios\interview-cleaner\models\whisper"),
    )
    parser.add_argument("--ffmpeg", default="ffmpeg")
    return parser.parse_args()


def read_env(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def normalize_text(value: str) -> str:
    normalized = value.lower()
    normalized = re.sub(r"\beleven\b", "11", normalized)
    normalized = normalized.replace("열한", "11")
    return re.sub(r"[^0-9a-z가-힣]+", "", normalized)


def text_match_percent(expected: str, recognized: str) -> float:
    return round(
        difflib.SequenceMatcher(
            None,
            normalize_text(expected),
            normalize_text(recognized),
            autojunk=False,
        ).ratio() * 100,
        2,
    )


def synthesize(
    api_key: str,
    voice_id: str,
    text: str,
    destination: Path,
    stability: float,
    similarity: float,
    style: float,
    model_id: str,
) -> dict[str, str | int | None]:
    query = urllib.parse.urlencode({"output_format": "mp3_44100_128"})
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{urllib.parse.quote(voice_id)}?{query}"
    body = json.dumps(
        {
            "text": text,
            "model_id": model_id,
            "voice_settings": {
                "stability": stability,
                "similarity_boost": similarity,
                "style": style,
                "use_speaker_boost": True,
            },
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
            }
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")[:600]
        raise RuntimeError(f"ElevenLabs HTTP {error.code}: {detail}") from error


def convert_to_wav(ffmpeg: str, source: Path, destination: Path) -> None:
    subprocess.run(
        [ffmpeg, "-hide_banner", "-loglevel", "error", "-y", "-i", str(source), "-ac", "1", "-ar", "16000", str(destination)],
        check=True,
        capture_output=True,
    )


def wav_duration(wav_path: Path) -> float:
    with wave.open(str(wav_path), "rb") as wav_file:
        return round(wav_file.getnframes() / wav_file.getframerate(), 3)


def write_listening_page(run_dir: Path, samples: list[dict[str, object]]) -> None:
    cards = []
    for sample in samples:
        number = int(sample["index"])
        text_value = html.escape(str(sample["expectedText"]))
        mp3_name = html.escape(str(sample["mp3"]), quote=True)
        duration = float(sample["durationSeconds"])
        cards.append(
            f'''<article><header><b>{number:02d}</b><span>{duration:.2f}초</span></header>
<audio controls preload="metadata" src="{mp3_name}"></audio><p>{text_value}</p></article>'''
        )
    page = f'''<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ElevenLabs 후행 이상음 청취 샘플</title><style>
*{{box-sizing:border-box}}body{{margin:0;background:#f4f3ef;color:#171717;font-family:"Segoe UI","Malgun Gothic",sans-serif}}main{{width:min(920px,calc(100% - 32px));margin:36px auto 72px}}h1{{font-size:24px;margin:0 0 8px}}.lead{{color:#686868;margin:0 0 24px}}section{{display:grid;gap:12px}}article{{background:#fff;border:1px solid #dddcd7;border-radius:12px;padding:16px}}header{{display:flex;justify-content:space-between;margin-bottom:10px}}header b{{font-size:18px}}header span{{color:#777;font-variant-numeric:tabular-nums}}audio{{width:100%;height:38px}}p{{margin:12px 0 0;line-height:1.65;color:#444;font-size:14px}}
</style></head><body><main><h1>후행 이상음 청취 샘플 10개</h1><p class="lead">정상 문장이 끝난 뒤 웅얼거림·낯선 말·이상음이 붙는지 듣고 번호와 위치를 알려 주세요.</p><section>{''.join(cards)}</section></main></body></html>'''
    (run_dir / "listen.html").write_text(page, encoding="utf-8")


def transcribe(model: WhisperModel, audio_path: Path, language: str) -> dict[str, object]:
    segment_iter, info = model.transcribe(
        str(audio_path),
        language=language,
        beam_size=5,
        vad_filter=True,
        condition_on_previous_text=False,
        word_timestamps=True,
    )
    segments: list[dict[str, object]] = []
    for segment in segment_iter:
        words = [
            {
                "start": round(float(word.start), 3),
                "end": round(float(word.end), 3),
                "word": word.word,
                "probability": round(float(word.probability), 5),
            }
            for word in (segment.words or [])
            if word.start is not None and word.end is not None
        ]
        segments.append(
            {
                "start": round(float(segment.start), 3),
                "end": round(float(segment.end), 3),
                "text": segment.text.strip(),
                "avg_logprob": round(float(segment.avg_logprob), 5),
                "no_speech_prob": round(float(segment.no_speech_prob), 5),
                "compression_ratio": round(float(segment.compression_ratio), 5),
                "words": words,
            }
        )
    recognized = " ".join(str(segment["text"]) for segment in segments if segment["text"]).strip()
    return {
        "language": language,
        "duration": round(float(info.duration), 3),
        "durationAfterVad": round(float(info.duration_after_vad), 3),
        "text": recognized,
        "segments": segments,
    }


def classify_words(expected: str, transcription: dict[str, object]) -> list[dict[str, object]]:
    expected_normalized = normalize_text(expected)
    cursor = 0
    classified: list[dict[str, object]] = []
    for segment in transcription["segments"]:
        for word in segment.get("words", []):
            token = normalize_text(str(word["word"]))
            index = expected_normalized.find(token, cursor) if token else -1
            matched = index >= 0
            if matched:
                cursor = index + len(token)
            classified.append({**word, "matched": matched})
    return classified


def load_wav_mono(wav_path: Path) -> tuple[np.ndarray, int]:
    with wave.open(str(wav_path), "rb") as wav_file:
        sample_rate = wav_file.getframerate()
        channels = wav_file.getnchannels()
        sample_width = wav_file.getsampwidth()
        if sample_width != 2:
            raise RuntimeError(f"Expected 16-bit WAV, got {sample_width * 8}-bit")
        samples = np.frombuffer(wav_file.readframes(wav_file.getnframes()), dtype="<i2").astype(np.float32)
        if channels > 1:
            samples = samples.reshape(-1, channels).mean(axis=1)
    return samples / 32768.0, sample_rate


def inspect_trailing_audio(
    wav_path: Path,
    words: list[dict[str, object]],
) -> dict[str, object]:
    """Measure only speech-like audio after the final expected word."""
    samples, sample_rate = load_wav_mono(wav_path)
    duration = len(samples) / sample_rate
    matched_words = [word for word in words if bool(word["matched"])]
    if not matched_words:
        return {
            "candidate": False,
            "reason": "no-matched-expected-word",
            "lastExpectedWordEnd": None,
            "tailRegionStart": None,
            "tailVadMilliseconds": 0,
            "tailActiveRmsMilliseconds": 0,
            "trailingUnmatchedWords": [],
            "vadIntervals": [],
        }

    last_expected_end = float(matched_words[-1]["end"])
    guard_seconds = 0.18
    tail_start = min(duration, last_expected_end + guard_seconds)
    vad_samples = get_speech_timestamps(
        samples,
        VadOptions(
            threshold=0.45,
            min_speech_duration_ms=80,
            min_silence_duration_ms=100,
            speech_pad_ms=0,
        ),
        sampling_rate=sample_rate,
    )
    vad_intervals = [
        {
            "start": round(float(item["start"]) / sample_rate, 3),
            "end": round(float(item["end"]) / sample_rate, 3),
        }
        for item in vad_samples
    ]
    tail_vad_seconds = sum(
        max(0.0, float(interval["end"]) - max(tail_start, float(interval["start"])))
        for interval in vad_intervals
    )

    frame_samples = max(1, round(sample_rate * 0.02))
    tail_samples = samples[round(tail_start * sample_rate):]
    active_frames = 0
    for offset in range(0, len(tail_samples), frame_samples):
        frame = tail_samples[offset:offset + frame_samples]
        if len(frame) and float(np.sqrt(np.mean(np.square(frame)))) > 0.006:
            active_frames += 1
    active_rms_ms = active_frames * 20

    trailing_unmatched = [
        {
            "start": word["start"],
            "end": word["end"],
            "word": word["word"],
            "probability": word["probability"],
        }
        for word in words
        if not bool(word["matched"]) and float(word["start"]) >= last_expected_end - 0.05
    ]
    unmatched_tail = any(float(word["end"]) >= tail_start for word in trailing_unmatched)
    separated_tail = any(
        float(interval["start"]) >= tail_start
        and float(interval["end"]) - float(interval["start"]) >= 0.18
        for interval in vad_intervals
    )
    reasons: list[str] = []
    if unmatched_tail:
        reasons.append("whisper-unmatched-after-final-word")
    if separated_tail:
        reasons.append("vad-new-speech-event-after-final-word")

    return {
        "candidate": bool(reasons),
        "reason": ",".join(reasons) if reasons else "none",
        "lastExpectedWordEnd": round(last_expected_end, 3),
        "tailRegionStart": round(tail_start, 3),
        "tailVadMilliseconds": round(tail_vad_seconds * 1000),
        "tailActiveRmsMilliseconds": active_rms_ms,
        "trailingUnmatchedWords": trailing_unmatched,
        "vadIntervals": vad_intervals,
    }


def waveform_svg(wav_path: Path, words: list[dict[str, object]], destination: Path, title: str) -> None:
    with wave.open(str(wav_path), "rb") as wav_file:
        sample_rate = wav_file.getframerate()
        frames = wav_file.getnframes()
        channels = wav_file.getnchannels()
        sample_width = wav_file.getsampwidth()
        if sample_width != 2:
            raise RuntimeError(f"Expected 16-bit WAV, got {sample_width * 8}-bit")
        samples = np.frombuffer(wav_file.readframes(frames), dtype="<i2").astype(np.float32)
        if channels > 1:
            samples = samples.reshape(-1, channels).mean(axis=1)
        samples /= 32768.0

    width, height = 1600, 360
    left, right, top, wave_bottom = 40, 20, 56, 270
    plot_width = width - left - right
    center = (top + wave_bottom) / 2
    amplitude = (wave_bottom - top) * 0.45
    duration = len(samples) / sample_rate
    columns = min(plot_width, max(1, len(samples)))
    boundaries = np.linspace(0, len(samples), columns + 1, dtype=np.int64)
    lines: list[str] = []
    for column in range(columns):
        chunk = samples[boundaries[column]:boundaries[column + 1]]
        if not len(chunk):
            continue
        low = center - float(np.max(chunk)) * amplitude
        high = center - float(np.min(chunk)) * amplitude
        x = left + column
        lines.append(f'<line x1="{x}" y1="{low:.2f}" x2="{x}" y2="{high:.2f}"/>')

    word_boxes: list[str] = []
    for word in words:
        x = left + (float(word["start"]) / duration) * plot_width
        box_width = max(2.0, ((float(word["end"]) - float(word["start"])) / duration) * plot_width)
        matched = bool(word["matched"])
        fill = "#dceee7" if matched else "#f6d1b4"
        stroke = "#86bca8" if matched else "#d36e3e"
        label = html.escape(str(word["word"]).strip())
        word_boxes.append(
            f'<rect x="{x:.2f}" y="291" width="{box_width:.2f}" height="30" fill="{fill}" stroke="{stroke}"/>'
            f'<text x="{x + 4:.2f}" y="311" font-size="11" fill="#333">{label}</text>'
        )

    ticks: list[str] = []
    for index in range(6):
        time = duration * index / 5
        x = left + plot_width * index / 5
        ticks.append(f'<line x1="{x:.2f}" y1="{top}" x2="{x:.2f}" y2="{wave_bottom}" stroke="#ececea"/>')
        ticks.append(f'<text x="{x:.2f}" y="345" text-anchor="middle" font-size="11" fill="#777">{time:.2f}s</text>')

    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">
<rect width="100%" height="100%" fill="#fcfcfb"/>
<text x="40" y="30" font-family="Segoe UI, sans-serif" font-size="17" font-weight="600" fill="#171717">{html.escape(title)}</text>
<g>{''.join(ticks)}</g>
<line x1="{left}" y1="{center:.2f}" x2="{width-right}" y2="{center:.2f}" stroke="#d8d8d8"/>
<g stroke="#303030" stroke-width="1">{''.join(lines)}</g>
<rect x="{left}" y="291" width="{plot_width}" height="30" fill="#f3f3f1"/>
<g font-family="Segoe UI, Malgun Gothic, sans-serif">{''.join(word_boxes)}</g>
</svg>'''
    destination.write_text(svg, encoding="utf-8")


def reanalyze_existing(run_dir: Path) -> dict[str, object]:
    manifest_path = run_dir / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    for sample in manifest["samples"]:
        transcription_path = run_dir / sample["whisperJson"]
        transcription = json.loads(transcription_path.read_text(encoding="utf-8"))
        words = classify_words(sample["expectedText"], transcription)
        transcription["words"] = words
        transcription_path.write_text(json.dumps(transcription, ensure_ascii=False, indent=2), encoding="utf-8")
        waveform_svg(
            run_dir / sample["wav"],
            words,
            run_dir / sample["waveformSvg"],
            f'{sample["language"]}-{int(sample["index"]):02d}',
        )
        sample["recognizedText"] = transcription["text"]
        sample["matchPercent"] = text_match_percent(sample["expectedText"], transcription["text"])
        sample["unmatchedWordCount"] = sum(1 for word in words if not word["matched"])
        sample["trailingArtifact"] = inspect_trailing_audio(run_dir / sample["wav"], words)
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    return manifest


def main() -> None:
    args = parse_args()
    if args.reanalyze_run:
        manifest = reanalyze_existing(args.reanalyze_run)
        print(json.dumps({
            "runDirectory": str(args.reanalyze_run),
            "samples": [
                {
                    "name": f'{sample["language"]}-{int(sample["index"]):02d}',
                    "matchPercent": sample["matchPercent"],
                    "unmatchedWordCount": sample["unmatchedWordCount"],
                }
                for sample in manifest["samples"]
            ],
        }, ensure_ascii=False, indent=2))
        return

    env = read_env(args.env)
    account = args.account or env.get("ELEVENLABS_ARTIFACT_ACCOUNT", "default")
    if account not in {"default", "feelandnote"}:
        raise SystemExit(f"Unsupported ELEVENLABS_ARTIFACT_ACCOUNT: {account}")
    output_root = args.output_root or Path(
        env.get(
            "ELEVENLABS_ARTIFACT_ROOT",
            r"D:\audios\interview-cleaner\elevenlabs-artifact-research",
        )
    )
    key_name = "ELEVENLABS_API_KEY_FEELANDNOTE" if account == "feelandnote" else "ELEVENLABS_API_KEY"
    api_key = env.get(key_name, "")
    voice_id = args.voice_id or env.get("ELEVENLABS_ARTIFACT_VOICE_ID", "")
    if not api_key.startswith("sk_"):
        raise SystemExit(f"{key_name} is missing or is not an sk_ secret key")
    if not voice_id:
        raise SystemExit("Pass --voice-id or set ELEVENLABS_ARTIFACT_VOICE_ID in the env file")

    run_id = datetime.now().strftime("%Y%m%d-%H%M%S")
    run_dir = output_root / run_id
    run_dir.mkdir(parents=True, exist_ok=False)
    korean_text = TAIL_KOREAN_TEXT if args.tail_test else KOREAN_TEXT
    english_text = TAIL_ENGLISH_TEXT if args.tail_test else ENGLISH_TEXT
    if args.listening_test:
        (run_dir / "prompts.ko.json").write_text(
            json.dumps(LISTENING_KOREAN_TEXTS, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
    else:
        (run_dir / "prompt.ko.txt").write_text(korean_text, encoding="utf-8")
        (run_dir / "prompt.en.txt").write_text(english_text, encoding="utf-8")

    settings = {
        "model": args.model,
        "experiment": (
            "manual-listening-ten-second-clips"
            if args.listening_test
            else "trailing-artifact" if args.tail_test else "general-accuracy"
        ),
        "voiceId": voice_id,
        "account": account,
        "stability": args.stability,
        "similarityBoost": args.similarity,
        "style": args.style,
        "outputFormat": "mp3_44100_128",
    }
    jobs = (
        [
            dict(language="ko", index=index, text=text_value)
            for index, text_value in enumerate(LISTENING_KOREAN_TEXTS, start=1)
        ]
        if args.listening_test
        else [
            *(dict(language="ko", index=index, text=korean_text) for index in range(1, args.ko_runs + 1)),
            *(dict(language="en", index=index, text=english_text) for index in range(1, args.en_runs + 1)),
        ]
    )

    samples: list[dict[str, object]] = []
    for job in jobs:
        stem = f'{job["language"]}-{job["index"]:02d}'
        mp3_path = run_dir / f"{stem}.mp3"
        wav_path = run_dir / f"{stem}.wav"
        print(f"generate {stem}", flush=True)
        api_meta = synthesize(
            api_key,
            voice_id,
            str(job["text"]),
            mp3_path,
            args.stability,
            args.similarity,
            args.style,
            args.model,
        )
        convert_to_wav(args.ffmpeg, mp3_path, wav_path)
        samples.append(
            {
                "language": job["language"],
                "index": job["index"],
                "expectedText": job["text"],
                "mp3": mp3_path.name,
                "wav": wav_path.name,
                **api_meta,
            }
        )

    if args.listening_test:
        for sample in samples:
            sample["durationSeconds"] = wav_duration(run_dir / str(sample["wav"]))
        summary = {
            "runId": run_id,
            "createdAt": datetime.now().astimezone().isoformat(),
            "settings": settings,
            "samples": samples,
        }
        (run_dir / "manifest.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
        write_listening_page(run_dir, samples)
        print(json.dumps({
            "runDirectory": str(run_dir),
            "listeningPage": str(run_dir / "listen.html"),
            "samples": [
                {
                    "name": f'{sample["language"]}-{int(sample["index"]):02d}',
                    "durationSeconds": sample["durationSeconds"],
                }
                for sample in samples
            ],
        }, ensure_ascii=False, indent=2))
        return

    print("load local Whisper large-v3-turbo", flush=True)
    model = WhisperModel(
        "large-v3-turbo",
        device="cpu",
        compute_type="int8",
        download_root=str(args.whisper_root),
        local_files_only=True,
    )

    for sample in samples:
        stem = f'{sample["language"]}-{sample["index"]:02d}'
        print(f"transcribe {stem}", flush=True)
        transcription = transcribe(model, run_dir / str(sample["wav"]), str(sample["language"]))
        words = classify_words(str(sample["expectedText"]), transcription)
        transcription["expectedText"] = sample["expectedText"]
        transcription["words"] = words
        transcription_path = run_dir / f"{stem}.whisper.json"
        transcription_path.write_text(json.dumps(transcription, ensure_ascii=False, indent=2), encoding="utf-8")
        waveform_path = run_dir / f"{stem}.waveform.svg"
        waveform_svg(run_dir / str(sample["wav"]), words, waveform_path, stem)

        sample["recognizedText"] = transcription["text"]
        sample["matchPercent"] = text_match_percent(str(sample["expectedText"]), str(transcription["text"]))
        sample["durationSeconds"] = transcription["duration"]
        sample["unmatchedWordCount"] = sum(1 for word in words if not word["matched"])
        sample["trailingArtifact"] = inspect_trailing_audio(run_dir / str(sample["wav"]), words)
        sample["whisperJson"] = transcription_path.name
        sample["waveformSvg"] = waveform_path.name

    summary = {
        "runId": run_id,
        "createdAt": datetime.now().astimezone().isoformat(),
        "settings": settings,
        "samples": samples,
    }
    (run_dir / "manifest.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({
        "runDirectory": str(run_dir),
        "samples": [
            {
                "name": f'{sample["language"]}-{sample["index"]:02d}',
                "matchPercent": sample["matchPercent"],
                "unmatchedWordCount": sample["unmatchedWordCount"],
                "durationSeconds": sample["durationSeconds"],
                "trailingArtifact": sample["trailingArtifact"],
            }
            for sample in samples
        ],
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
