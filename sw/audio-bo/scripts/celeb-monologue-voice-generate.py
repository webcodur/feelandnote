"""Generate one celeb virtual-monologue narration: sentence-bundle synthesis, stitch, QC.

virtual_monologue is long, so its sentences are bundled into synthesis units —
a unit closes once it holds a reasonable number of sentences at a paragraph end,
and a very long paragraph may split mid-way. Units are NOT 1:1 with paragraphs.
Each unit is its own synthesis request and file (p01.mp3 ...). Units are
stitched into vmonologue.mp3 with room-tone gaps — paragraph seams get the long
gap, mid-paragraph seams the short one — then the stitched file runs through
celeb-reading-voice-qc.py. Repairs that fall inside the inserted gaps are
expected and accepted; every other failure holds.

Engine follows the celeb's voice_id_<locale>: a plain value is an ElevenLabs voice
ID, and a `gemini:<voiceName>` value (e.g. gemini:Orus) synthesizes with the free
Gemini TTS model instead — same stitch/QC/publish path either way.
"""
from __future__ import annotations

import argparse
import base64
import hashlib
import json
import re
import shutil
import subprocess
import sys
import time
import urllib.parse
import urllib.request
from datetime import datetime
from pathlib import Path

import numpy as np

from celeb_dialogue_voice_common import (
    read_env,
    request_json,
    resolve_api_key,
    resolve_voice_id,
    synthesize,
    write_manifest,
)
from voice_cleanup import (
    HOP,
    TRIM_GUARD,
    VOICE_RMS,
    WINDOW,
    clean_file,
    decode,
    encode,
    envelope,
    normalize_loudness,
    room_tone,
)

QC_SCRIPT = Path(__file__).parent / "celeb-reading-voice-qc.py"
QC_PYTHON = Path(r"D:\audios\interview-cleaner\.venv\Scripts\python.exe")
OUTPUT_FILE = "vmonologue.mp3"
SOURCE_FILE = "source.txt"
QC_RESULT_FILE = "qc.json"
# QC는 문단 경계를 문장 경계와 같은 기준(1.2/1.05초)으로 본다. 우리가 넣은 문단 쉼은
# 그 기준보다 길어 수리 후보로 잡히므로, 수리·긴 쉼이 전부 삽입한 문단 쉼 안에 있으면
# 통과로 읽는다. 이 밖의 플래그는 전부 보류다.
PARAGRAPH_GAP_FLAGS = {
    "pause-repair-required",
    "uncertain-sentence-boundary",
    "uncertain-source-boundary",
    "long-mid-sentence-pause",
}
GAP_MATCH_MARGIN = 0.35

# celebs.voice_id_* 값이 "gemini:<보이스명>"이면 ElevenLabs가 아니라 무료 Gemini TTS로 합성한다.
# 인물 고유 보이스가 없어 서재탐방 시절 Gemini 내레이터 보이스로 말한 인물(예: 알렉스 카프=Orus)용이다.
GEMINI_PREFIX = "gemini:"
GEMINI_MODEL = "gemini-2.5-flash-preview-tts"  # packages/shared voice-policy MODEL_GEMINI_25
GEMINI_RATE = 24000


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Per-paragraph ElevenLabs monologue synthesis, stitch to vmonologue.mp3, QC."
    )
    parser.add_argument("--slug", required=True)
    parser.add_argument("--locale", choices=("ko", "en"), required=True)
    parser.add_argument("--voice-id", help="Override the locale voice ID without changing the DB")
    parser.add_argument("--account", choices=("default", "feelandnote"), default="default")
    parser.add_argument("--audio-env", type=Path, default=Path(__file__).parents[1] / ".env")
    parser.add_argument("--web-env", type=Path, default=Path(__file__).parents[2] / "web-bo" / ".env")
    parser.add_argument("--output-root", type=Path)
    parser.add_argument(
        "--resume-run",
        type=Path,
        help="Continue a run: fill missing paragraphs, then re-stitch and re-QC.",
    )
    parser.add_argument(
        "--reuse-from",
        type=Path,
        help="Start a new run reusing generated files from an older run whose unit text is identical.",
    )
    parser.add_argument(
        "--tts-overrides",
        type=Path,
        help='JSON {"slug","locale","paragraphs":{"3":"tagged text"}} — synthesis-only text.',
    )
    parser.add_argument("--model", default="eleven_v3")
    parser.add_argument("--gemini-model", default=GEMINI_MODEL,
                        help="Gemini TTS model when voice_id is a gemini:<name> value")
    parser.add_argument("--stability", type=float, default=0.5)
    parser.add_argument("--similarity", type=float, default=0.75)
    parser.add_argument("--style", type=float, default=0.3)
    parser.add_argument("--speed", type=float)
    parser.add_argument(
        "--paragraph-gap",
        type=float,
        default=1.0,
        help="Total perceived silence at a paragraph-boundary unit seam in seconds — the kept "
             "edge silence of each unit file counts toward it (target: 1.2)",
    )
    parser.add_argument(
        "--sentence-gap",
        type=float,
        default=0.45,
        help="Total perceived silence at a mid-paragraph unit seam in seconds",
    )
    parser.add_argument("--qc-python", type=Path, default=QC_PYTHON)
    parser.add_argument("--device", default="cuda", choices=("cpu", "cuda", "auto"))
    parser.add_argument("--ffprobe", default="ffprobe")
    parser.add_argument("--skip-qc", action="store_true", help="Stop after stitching (manifest stays 'generated').")
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


def probe_mp3(ffprobe: str, path: Path) -> dict[str, object]:
    result = subprocess.run(
        [ffprobe, "-v", "error", "-show_entries", "format=duration:stream=codec_name,sample_rate,channels",
         "-of", "json", str(path)],
        check=True, capture_output=True, text=True, encoding="utf-8", errors="replace",
    )
    payload = json.loads(result.stdout)
    stream = (payload.get("streams") or [{}])[0]
    duration = float((payload.get("format") or {}).get("duration") or 0)
    if stream.get("codec_name") != "mp3" or duration <= 0:
        raise RuntimeError(f"Invalid MP3 output: {path}")
    return {
        "durationSeconds": round(duration, 3),
        "codec": stream.get("codec_name"),
        "sampleRate": int(stream.get("sample_rate") or 0),
        "channels": int(stream.get("channels") or 0),
    }


def load_celeb_monologue(slug: str, locale: str, env: dict[str, str]) -> tuple[dict, str]:
    base_url = env.get("NEXT_PUBLIC_DB_API_URL", "").rstrip("/")
    service_key = env.get("DB_SECRET_KEY", "")
    if not base_url or not service_key:
        raise RuntimeError("NEXT_PUBLIC_DB_API_URL or DB_SECRET_KEY is missing")
    headers = {"apikey": service_key, "Authorization": f"Bearer {service_key}"}
    query_slug = urllib.parse.quote(slug, safe="")
    url = (
        f"{base_url}/rest/v1/celebs?slug=eq.{query_slug}"
        "&select=id,slug,nickname,speech_tone,voice_id_ko,voice_id_en,"
        "virtual_monologue,virtual_monologue_en,virtual_monologue_locked_at"
    )
    rows = request_json(url, headers)
    if not isinstance(rows, list) or len(rows) != 1:
        raise RuntimeError(f"Expected one celeb for slug={slug}")
    celeb = rows[0]
    text = (celeb.get("virtual_monologue" if locale == "ko" else "virtual_monologue_en") or "").strip()
    if not text:
        raise RuntimeError(f"celebs.virtual_monologue{'' if locale == 'ko' else '_en'} is empty for {slug}")
    return celeb, text


def split_paragraphs(text: str) -> list[str]:
    parts = [part.strip() for part in re.split(r"\n\s*\n", text.strip())]
    return [part for part in parts if part]


SENTENCE_END = re.compile(r'[.!?…]+(?=["\'”’」』〉》\)\]]*\s|["\'”’」』〉》\)\]]*$)')


def count_sentences(text: str) -> int:
    return max(1, len(SENTENCE_END.findall(text)))


SENTENCE_CLOSERS = '"\'”’」』〉》)]'


def split_sentences(paragraph: str) -> list[str]:
    """문장 끝 부호 위치로 자른다 — 종결 뒤 닫는 따옴표·괄호는 그 문장에 붙인다."""
    ends = []
    for match in SENTENCE_END.finditer(paragraph):
        end = match.end()
        while end < len(paragraph) and paragraph[end] in SENTENCE_CLOSERS:
            end += 1
        ends.append(end)
    pieces, cursor = [], 0
    for end in ends:
        piece = paragraph[cursor:end].strip()
        if piece:
            pieces.append(piece)
        cursor = end
    tail = paragraph[cursor:].strip()
    if tail:
        pieces.append(tail)
    return pieces or [paragraph.strip()]


UNIT_MIN_SENTENCES = 3  # 이 문장 수를 채우고 문단 끝에 닿으면 유닛을 닫는다
UNIT_MAX_SENTENCES = 6  # 문단 중간이어도 끊는 상한 — 합성 입력이 무한히 길어지지 않게


def build_units(parts: list[str]) -> list[dict]:
    """Synthesis units are sentence bundles, not paragraphs: a unit closes once it
    holds UNIT_MIN_SENTENCES sentences at a paragraph end, or UNIT_MAX_SENTENCES
    anywhere — so a short paragraph folds into the next and a long one may split.
    leadSeam marks the seam before each unit — 'paragraph' gets the long stitched
    gap, 'sentence' the short one."""
    sentences: list[dict] = []
    for pi, part in enumerate(parts):
        sents = split_sentences(part)
        for si, sent in enumerate(sents):
            sentences.append({"text": sent, "para": pi + 1,
                              "paraStart": si == 0, "paraEnd": si == len(sents) - 1})
    groups: list[list[dict]] = []
    current: list[dict] = []
    for sentence in sentences:
        current.append(sentence)
        if (len(current) >= UNIT_MIN_SENTENCES and sentence["paraEnd"]) or \
                len(current) >= UNIT_MAX_SENTENCES:
            groups.append(current)
            current = []
    if current:
        if groups:
            groups[-1] += current
        else:
            groups.append(current)
    units = []
    for n, group in enumerate(groups):
        chunks: list[str] = []
        for sentence in group:
            if chunks:
                chunks.append("\n\n" if sentence["paraStart"] else " ")
            chunks.append(sentence["text"])
        units.append({
            "index": n + 1,
            "paragraphs": sorted({s["para"] for s in group}),
            "sentences": len(group),
            "text": "".join(chunks),
            "file": f"p{n + 1:02d}.mp3",
            "leadSeam": None if n == 0 else ("paragraph" if group[0]["paraStart"] else "sentence"),
        })
    return units


def comparable_spoken(value: str) -> str:
    without_tags = re.sub(r"\[[^\]]+\]", "", value)
    return re.sub(r"[^\w]+", "", without_tags, flags=re.UNICODE).casefold()


def apply_paragraph_overrides(paragraphs: list[dict], override_path: Path | None,
                              slug: str, locale: str) -> int:
    if override_path is None:
        return 0
    payload = json.loads(override_path.read_text(encoding="utf-8-sig"))
    if payload.get("slug") != slug or payload.get("locale") != locale:
        raise RuntimeError("TTS override identity mismatch")
    slots = payload.get("paragraphs")
    if not isinstance(slots, dict) or not slots:
        raise RuntimeError("TTS overrides must contain a non-empty paragraphs object")
    applied = 0
    for job in paragraphs:
        key = str(job["index"])
        if key not in slots:
            continue
        tts_text = slots[key]
        if not isinstance(tts_text, str) or not tts_text.strip():
            raise RuntimeError(f"TTS override is empty: paragraph {key}")
        if comparable_spoken(tts_text) != comparable_spoken(job["text"]):
            raise RuntimeError(
                f"TTS override changes spoken words for paragraph {key}; "
                "only tags, spacing and punctuation may differ"
            )
        job["ttsText"] = tts_text.strip()
        applied += 1
    return applied


# 스티치 경계에서 unit 파일 자체의 가장자리 무음은 이 만큼만 남긴다. 나머지는 잘라내고,
# 모자란 만큼만 룸톤을 끼워 넣어 파일별 여백 편차가 체감 쉼으로 새지 않게 한다.
STITCH_HEAD_KEEP, STITCH_TAIL_KEEP = 0.06, 0.15
MIN_INSERT_GAP = 0.05


def edge_silences(samples: np.ndarray, rate: int) -> tuple[float, float]:
    """(앞 무음, 뒤 무음) 초 — voice_cleanup.trim과 같은 발화 판정을 쓴다."""
    voiced = np.where(envelope(samples, rate) >= VOICE_RMS)[0]
    if voiced.size == 0:
        return 0.0, 0.0
    duration = samples.size / rate
    head = max(0.0, voiced[0] * HOP - TRIM_GUARD)
    tail = max(0.0, duration - (voiced[-1] * HOP + WINDOW + TRIM_GUARD))
    return head, tail


def stitch(run_dir: Path, paragraphs: list[dict], gap_seconds: float,
           sentence_gap_seconds: float) -> tuple[Path, list[dict]]:
    """Concatenate cleaned unit files; total silence at each boundary equals that
    seam's target — paragraph seams get gap_seconds, mid-paragraph seams get
    sentence_gap_seconds.

    Each unit keeps at most STITCH_*_KEEP of its own edge silence; the inserted room
    tone fills only the shortfall, so variable encoder padding and tail room tone no
    longer stretch the perceived pause.
    """
    decoded = []
    rate = None
    for job in paragraphs:
        samples, file_rate = decode(str(run_dir / job["file"]))
        rate = rate or file_rate
        if file_rate != rate:
            raise RuntimeError(f"Mixed sample rates across paragraphs: {job['file']}")
        head_sil, tail_sil = edge_silences(samples, rate)
        head_keep = min(head_sil, STITCH_HEAD_KEEP)
        tail_keep = min(tail_sil, STITCH_TAIL_KEEP)
        start = int(round((head_sil - head_keep) * rate))
        end = samples.size - int(round((tail_sil - tail_keep) * rate))
        decoded.append({"samples": samples[start:end],
                        "head": int(round(head_keep * rate)),
                        "tail": int(round(tail_keep * rate))})
    if not decoded or rate is None:
        raise RuntimeError("Nothing to stitch")
    pool = room_tone(np.concatenate([unit["samples"] for unit in decoded]), rate)
    rng = np.random.default_rng(0)
    fade_n = int(0.03 * rate)

    def gap(gap_n: int) -> np.ndarray:
        segment = np.resize(np.roll(pool, -int(rng.integers(0, pool.size))), gap_n)
        ramp = min(fade_n, gap_n // 2)
        if ramp > 0:
            segment[:ramp] *= np.linspace(0, 1, ramp)
            segment[-ramp:] *= np.linspace(1, 0, ramp)
        return segment

    chunks, gaps, cursor = [], [], 0
    for index, unit in enumerate(decoded):
        if index:
            previous = decoded[index - 1]
            seam = paragraphs[index].get("leadSeam") or "paragraph"
            target = sentence_gap_seconds if seam == "sentence" else gap_seconds
            kept = (previous["tail"] + unit["head"]) / rate
            insert = max(MIN_INSERT_GAP, target - kept)
            gap_n = int(round(insert * rate))
            silence_start = cursor - previous["tail"]
            chunks.append(gap(gap_n))
            cursor += gap_n
            gaps.append({"start": round(silence_start / rate, 4),
                         "end": round((cursor + unit["head"]) / rate, 4),
                         "kind": seam})
        chunks.append(unit["samples"])
        cursor += unit["samples"].size
    output = run_dir / OUTPUT_FILE
    encode(np.concatenate(chunks), rate, str(output))
    return output, gaps


def run_qc(args: argparse.Namespace, run_dir: Path) -> dict:
    qc_python = args.qc_python if args.qc_python.is_file() else Path(sys.executable)
    result_path = run_dir / QC_RESULT_FILE
    cmd = [
        str(qc_python), str(QC_SCRIPT),
        "--audio", str(run_dir / OUTPUT_FILE),
        "--text-file", str(run_dir / SOURCE_FILE),
        "--locale", args.locale,
        "--result", str(result_path),
        "--device", args.device,
    ]
    completed = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=1800)
    if completed.returncode not in (0, 2) or not result_path.is_file():
        raise RuntimeError(f"QC invocation failed ({completed.returncode}): {completed.stderr[-600:]}")
    return json.loads(result_path.read_text(encoding="utf-8"))


def interval_hits_gap(start: float, end: float, gaps: list[dict]) -> bool:
    return any(start >= gap["start"] - GAP_MATCH_MARGIN and end <= gap["end"] + GAP_MATCH_MARGIN
               for gap in gaps)


def evaluate_qc(result: dict, gaps: list[dict]) -> tuple[bool, str]:
    """Pass, or pass only when every failure points at an inserted paragraph gap."""
    if result.get("ok"):
        return True, "passed"
    flags = set(result.get("flags") or [])
    repairs = result.get("repairs") or []
    pauses = result.get("pauses") or []
    if flags and flags <= PARAGRAPH_GAP_FLAGS:
        repairs_in_gaps = bool(repairs) and all(
            interval_hits_gap(r["start"], r["end"], gaps) for r in repairs)
        pauses_in_gaps = all(interval_hits_gap(p["start"], p["end"], gaps) for p in pauses)
        if repairs_in_gaps and pauses_in_gaps:
            return True, "passed-paragraph-gaps"
        # 쉼 수리 없이 긴 쉼 플래그만 난 경우도 전부 문단 쉼이면 통과다.
        if not repairs and pauses and pauses_in_gaps:
            return True, "passed-paragraph-gaps"
    return False, f"qc-failed: {sorted(flags) or ['no-flags']} repairs={len(repairs)} pauses={len(pauses)}"


def sha256_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def gemini_api_keys(web_env: dict[str, str]) -> list[str]:
    return [value for key, value in sorted(web_env.items())
            if re.fullmatch(r"GOOGLE_GENAI_API_KEY_FREE\d*", key) and value]


def synthesize_gemini(keys: list[str], voice_name: str, text: str,
                      destination: Path, model: str) -> dict[str, object]:
    """Free-key Gemini TTS → PCM s16le 24kHz mono → mp3. Rotates keys on 429/403."""
    key_index = 0
    attempts_left = 5
    while True:
        body = json.dumps({
            "contents": [{"parts": [{"text": text}]}],
            "generationConfig": {
                "responseModalities": ["AUDIO"],
                "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": voice_name}}},
            },
        }, ensure_ascii=False).encode("utf-8")
        request = urllib.request.Request(
            f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={keys[key_index]}",
            data=body, method="POST", headers={"Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(request, timeout=180) as response:
                payload = json.loads(response.read())
        except urllib.error.HTTPError as error:
            if error.code in (400, 403, 429) and key_index + 1 < len(keys):
                key_index += 1
                print(f"  gemini key {key_index + 1}로 전환 ({error.code})", flush=True)
                continue
            if error.code in (500, 502, 503, 504) and attempts_left > 0:
                attempts_left -= 1
                time.sleep(2)
                continue
            raise RuntimeError(f"Gemini TTS failed ({error.code}): {error.read()[:300]!r}")
        data = (((payload.get("candidates") or [{}])[0].get("content") or {})
                .get("parts") or [{}])[0].get("inlineData", {}).get("data")
        if not data:
            if attempts_left > 0:
                attempts_left -= 1
                time.sleep(2)
                continue
            raise RuntimeError("Gemini TTS returned no audio data")
        pcm = base64.b64decode(data)
        samples = np.frombuffer(pcm, dtype=np.int16).astype(np.float32) / 32767.0
        encode(samples, GEMINI_RATE, str(destination))
        return {"bytes": destination.stat().st_size, "engine": "gemini",
                "voiceName": voice_name, "model": model, "keyIndex": key_index + 1}


def main() -> None:
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8")
    args = parse_args()
    audio_env = read_env(args.audio_env)
    web_env = read_env(args.web_env)
    celeb, text = load_celeb_monologue(args.slug, args.locale, web_env)
    parts = split_paragraphs(text)
    paragraphs = build_units(parts)
    if not paragraphs:
        raise RuntimeError("Monologue has no paragraphs")
    overrides = apply_paragraph_overrides(paragraphs, args.tts_overrides, args.slug, args.locale)
    voice_id = resolve_voice_id(celeb, args.locale, args.voice_id)
    gemini_voice = voice_id[len(GEMINI_PREFIX):].strip() if voice_id.startswith(GEMINI_PREFIX) else ""
    speed = float(args.speed if args.speed is not None else 1.0)
    source_hash = sha256_text(text)

    preflight = {
        "mode": "monologue",
        "slug": args.slug,
        "locale": args.locale,
        "celebId": celeb["id"],
        "nickname": celeb.get("nickname"),
        "voiceId": voice_id,
        "account": args.account,
        "paragraphs": len(parts),
        "synthesisUnits": len(paragraphs),
        "characters": len(text),
        "sourceSha256": source_hash,
        "lockedAt": celeb.get("virtual_monologue_locked_at"),
        "paragraphGapSeconds": args.paragraph_gap,
        "sentenceGapSeconds": args.sentence_gap,
        "ttsOverrides": {
            "source": str(args.tts_overrides.resolve()) if args.tts_overrides else None,
            "appliedCount": overrides,
        },
        "settings": (
            {"engine": "gemini", "model": args.gemini_model, "voice": gemini_voice}
            if gemini_voice else
            {"model": args.model, "stability": args.stability,
             "similarityBoost": args.similarity, "style": args.style, "speed": speed}
        ),
    }
    if args.dry_run:
        if not gemini_voice:
            resolve_api_key(audio_env, args.account)
        else:
            gemini_api_keys(web_env) or (_ for _ in ()).throw(
                RuntimeError("No GOOGLE_GENAI_API_KEY_FREE* keys in the web-bo env"))
        print(json.dumps({**preflight, "status": "ready",
                          "preview": [{"index": p["index"], "paragraphs": p["paragraphs"],
                                       "characters": len(p["text"])}
                                      for p in paragraphs]}, ensure_ascii=False, indent=2))
        return

    api_key = "" if gemini_voice else resolve_api_key(audio_env, args.account)
    gemini_keys = gemini_api_keys(web_env) if gemini_voice else []
    if gemini_voice and not gemini_keys:
        raise RuntimeError("No GOOGLE_GENAI_API_KEY_FREE* keys in the web-bo env")
    if args.resume_run:
        run_dir = args.resume_run.resolve()
        manifest_path = run_dir / "manifest.json"
        if not manifest_path.is_file():
            raise RuntimeError(f"Resume manifest not found: {manifest_path}")
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        if manifest.get("mode") != "monologue":
            raise RuntimeError("Only monologue-mode runs can be resumed.")
        if (manifest.get("celeb") or {}).get("slug") != args.slug:
            raise RuntimeError("Resume run slug does not match.")
        if manifest.get("locale") != args.locale:
            raise RuntimeError("Resume run locale does not match.")
        if manifest.get("voiceId") != voice_id:
            raise RuntimeError("Resume run voice ID does not match.")
        if manifest.get("settings") != preflight["settings"]:
            raise RuntimeError("Resume run synthesis settings do not match.")
        if (manifest.get("source") or {}).get("sha256") != source_hash:
            raise RuntimeError("DB monologue changed since the run; start a new run directory.")
        existing = {str(s.get("index")) for s in manifest.get("samples") or []
                    if s.get("status") == "generated" and (run_dir / str(s.get("file"))).is_file()}
        for sample in manifest.get("samples") or []:
            if str(sample.get("index")) in existing:
                job = paragraphs[int(sample["index"]) - 1]
                if sample.get("text") != job.get("text"):
                    raise RuntimeError(f"Resume paragraph text mismatch: {sample['index']}")
        manifest["status"] = "generating"
        manifest["paragraphGapSeconds"] = args.paragraph_gap
        manifest["sentenceGapSeconds"] = args.sentence_gap
        manifest.pop("error", None)
    else:
        configured_root = audio_env.get("CELEB_MONOLOGUE_VOICE_ROOT")
        output_root = args.output_root or Path(
            configured_root or r"D:\audios\interview-cleaner\celeb-monologue-voices")
        run_dir = output_root / args.slug / args.locale / datetime.now().strftime("%Y%m%d-%H%M%S")
        run_dir.mkdir(parents=True, exist_ok=False)
        manifest = {
            "schemaVersion": 1,
            "mode": "monologue",
            "runId": run_dir.name,
            "createdAt": datetime.now().astimezone().isoformat(),
            "status": "generating",
            "celeb": {
                "id": celeb["id"],
                "slug": celeb["slug"],
                "nickname": celeb.get("nickname"),
                "speechTone": celeb.get("speech_tone"),
            },
            "locale": args.locale,
            "voiceId": voice_id,
            "settings": preflight["settings"],
            "source": {"sha256": source_hash, "characters": len(text),
                       "paragraphs": len(parts), "synthesisUnits": len(paragraphs)},
            "paragraphGapSeconds": args.paragraph_gap,
            "sentenceGapSeconds": args.sentence_gap,
            "ttsOverrides": preflight["ttsOverrides"],
            "samples": [],
            "gaps": [],
            "output": {"file": OUTPUT_FILE},
        }
    (run_dir / SOURCE_FILE).write_bytes((text + "\n").encode("utf-8"))
    write_manifest(run_dir, manifest)

    reuse_samples: dict[str, tuple[dict, Path]] = {}
    if args.reuse_from:
        old_dir = args.reuse_from.resolve()
        old_manifest = json.loads((old_dir / "manifest.json").read_text(encoding="utf-8"))
        for old in old_manifest.get("samples") or []:
            old_file = old_dir / str(old.get("file") or "")
            if old.get("status") == "generated" and old.get("text") and old_file.is_file():
                reuse_samples[old["text"]] = (old, old_file)

    samples_by_index = {str(s.get("index")): s for s in manifest.get("samples") or []}
    try:
        for job in paragraphs:
            key = str(job["index"])
            if key in samples_by_index and samples_by_index[key].get("status") == "generated" \
                    and (run_dir / job["file"]).is_file():
                continue
            destination = run_dir / job["file"]
            reused = reuse_samples.get(job["text"])
            if reused:
                old_sample, old_file = reused
                shutil.copyfile(old_file, destination)
                print(f"reuse paragraph {job['index']}/{len(paragraphs)} from {old_file}", flush=True)
                samples_by_index[key] = {
                    **old_sample, "index": job["index"], "paragraphs": job.get("paragraphs"),
                    "file": job["file"], "reusedFrom": str(old_file), "status": "generated",
                }
                manifest["samples"] = [samples_by_index[str(p["index"])] for p in paragraphs
                                       if str(p["index"]) in samples_by_index]
                write_manifest(run_dir, manifest)
                continue
            print(f"generate unit {job['index']}/{len(paragraphs)} "
                  f"(paragraphs {job.get('paragraphs')}, {len(job['text'])} chars)", flush=True)
            if gemini_voice:
                api_meta = synthesize_gemini(
                    gemini_keys, gemini_voice, str(job.get("ttsText") or job["text"]),
                    destination, args.gemini_model)
            else:
                api_meta = synthesize(
                    api_key, voice_id, str(job.get("ttsText") or job["text"]), destination,
                    args.model, args.stability, args.similarity, args.style, speed,
                )
            # ElevenLabs·Gemini 모두 mp3로 저장 — cleaned file is re-encoded at the source rate.
            clean_meta = clean_file(destination, destination, "reading")
            sample = {
                **job,
                **api_meta,
                **probe_mp3(args.ffprobe, destination),
                "cleanup": clean_meta,
                "status": "generated",
            }
            samples_by_index[key] = sample
            manifest["samples"] = [samples_by_index[str(p["index"])] for p in paragraphs
                                   if str(p["index"]) in samples_by_index]
            write_manifest(run_dir, manifest)

        if not all(str(p["index"]) in samples_by_index for p in paragraphs):
            raise RuntimeError("Paragraph generation did not complete")
        ordered = [samples_by_index[str(p["index"])] for p in paragraphs]
        output, gaps = stitch(run_dir, ordered, args.paragraph_gap, args.sentence_gap)
        # 보이스마다 다른 합성 볼륨을 -16 LUFS로 통일 — 피크가 천장을 넘을 때만 리미터가 누른다.
        loudness = normalize_loudness(output)
        manifest["gaps"] = gaps
        manifest["output"] = {"file": OUTPUT_FILE, "loudness": loudness,
                              **probe_mp3(args.ffprobe, output)}
        manifest["status"] = "generated"
        write_manifest(run_dir, manifest)

        if args.skip_qc:
            print(json.dumps({"runDirectory": str(run_dir), "status": "generated"},
                             ensure_ascii=False, indent=2))
            return
        print("qc stitched output", flush=True)
        result = run_qc(args, run_dir)
        passed, verdict = evaluate_qc(result, gaps)
        manifest["qc"] = {
            "ok": bool(result.get("ok")),
            "status": result.get("status"),
            "flags": result.get("flags"),
            "warnings": result.get("warnings"),
            "metrics": result.get("metrics"),
            "resultFile": QC_RESULT_FILE,
            "verdict": verdict,
        }
        manifest["status"] = "passed" if passed else "held"
        if not passed:
            manifest["error"] = verdict
        write_manifest(run_dir, manifest)
        print(json.dumps({"runDirectory": str(run_dir), "status": manifest["status"],
                          "verdict": verdict, "qcFlags": result.get("flags")},
                         ensure_ascii=False, indent=2))
        if not passed:
            raise SystemExit(2)
    except SystemExit:
        raise
    except Exception as error:
        manifest["status"] = "failed"
        manifest["error"] = str(error)
        write_manifest(run_dir, manifest)
        raise


if __name__ == "__main__":
    main()
