"""Shared contracts for the celeb dialogue ElevenLabs scripts."""

from __future__ import annotations

import json
import re
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path


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


def read_env(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values
    for raw_line in path.read_text(encoding="utf-8-sig").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def request_json(url: str, headers: dict[str, str]) -> object:
    request = urllib.request.Request(
        url,
        headers={**headers, "User-Agent": "feelandnote-celeb-dialogue-voice/1.0"},
    )
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")[:600]
        raise RuntimeError(f"HTTP {error.code}: {detail}") from error


def load_celeb_dialogues(
    slug: str,
    locale: str,
    env: dict[str, str],
) -> tuple[dict[str, object], list[dict[str, object]]]:
    if locale not in {"ko", "en"}:
        raise ValueError(f"Unsupported locale: {locale}")

    base_url = env.get("NEXT_PUBLIC_DB_API_URL", "").rstrip("/")
    service_key = env.get("DB_SECRET_KEY", "")
    if not base_url or not service_key:
        raise RuntimeError("NEXT_PUBLIC_DB_API_URL or DB_SECRET_KEY is missing")

    headers = {"apikey": service_key, "Authorization": f"Bearer {service_key}"}
    query_slug = urllib.parse.quote(slug, safe="")
    celeb_url = (
        f"{base_url}/rest/v1/celebs?slug=eq.{query_slug}"
        "&select=id,slug,nickname,voice_id_ko,voice_id_en,voice_speed,speech_tone"
    )
    celeb_rows = request_json(celeb_url, headers)
    if not isinstance(celeb_rows, list) or len(celeb_rows) != 1:
        count = len(celeb_rows) if isinstance(celeb_rows, list) else "invalid"
        raise RuntimeError(f"Expected one celeb for slug={slug}, got {count}")
    celeb = celeb_rows[0]
    if not isinstance(celeb, dict):
        raise RuntimeError("Invalid celeb response")

    celeb_id = urllib.parse.quote(str(celeb["id"]), safe="")
    dialogue_url = (
        f"{base_url}/rest/v1/celeb_dialogues?celeb_id=eq.{celeb_id}"
        "&select=lines,lines_en"
    )
    dialogue_rows = request_json(dialogue_url, headers)
    if not isinstance(dialogue_rows, list) or len(dialogue_rows) != 1:
        count = len(dialogue_rows) if isinstance(dialogue_rows, list) else "invalid"
        raise RuntimeError(f"Expected one celeb_dialogues row, got {count}")

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
                raise RuntimeError(f"{lines_key}.{dialogue_type} must contain exactly three lines")
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


def resolve_voice_id(celeb: dict[str, object], locale: str, override: str | None) -> str:
    voice_id = (override or str(celeb.get(f"voice_id_{locale}") or "")).strip()
    if not voice_id:
        raise RuntimeError(
            f"{celeb.get('slug')} has no voice_id_{locale}; save one or pass --voice-id explicitly"
        )
    return voice_id


def resolve_api_key(env: dict[str, str], account: str) -> str:
    env_key = "ELEVENLABS_API_KEY" if account == "default" else "ELEVENLABS_API_KEY_FEELANDNOTE"
    api_key = env.get(env_key, "")
    if not api_key.startswith("sk_"):
        raise RuntimeError(f"{env_key} is missing from the audio-bo env")
    return api_key


def spoken_text(value: str) -> str:
    return re.sub(r"^(?:\s*\[[^\]]+\]\s*)+", "", value).strip()


def comparable_spoken_text(value: str) -> str:
    """Return only spoken letters/numbers so TTS-only tags and punctuation can differ safely."""
    without_tags = re.sub(r"\[[^\]]+\]", "", value)
    return re.sub(r"[^\w]+", "", without_tags, flags=re.UNICODE).casefold()


def apply_tts_overrides(
    jobs: list[dict[str, object]],
    override_path: Path | None,
    slug: str,
    locale: str,
) -> tuple[list[dict[str, object]], int]:
    """Attach synthesis-only text while keeping the DB dialogue as the display/source text."""
    if override_path is None:
        return jobs, 0

    payload = json.loads(override_path.read_text(encoding="utf-8-sig"))
    if not isinstance(payload, dict):
        raise RuntimeError("TTS overrides must be a JSON object")
    if payload.get("slug") != slug or payload.get("locale") != locale:
        raise RuntimeError(
            f"TTS override identity mismatch: expected {slug}/{locale}, "
            f"got {payload.get('slug')}/{payload.get('locale')}"
        )
    slots = payload.get("slots")
    if not isinstance(slots, dict) or not slots:
        raise RuntimeError("TTS overrides must contain a non-empty slots object")

    known_slots = {str(job["slot"]) for job in jobs}
    unknown_slots = sorted(set(slots) - known_slots)
    if unknown_slots:
        raise RuntimeError(f"Unknown TTS override slots: {', '.join(unknown_slots)}")

    applied = 0
    for job in jobs:
        slot = str(job["slot"])
        if slot not in slots:
            continue
        tts_text = slots[slot]
        if not isinstance(tts_text, str) or not tts_text.strip():
            raise RuntimeError(f"TTS override is empty: {slot}")
        source_text = str(job["text"])
        if comparable_spoken_text(tts_text) != comparable_spoken_text(source_text):
            raise RuntimeError(
                f"TTS override changes spoken words for {slot}; only tags, spacing and punctuation may differ"
            )
        job["ttsText"] = tts_text.strip()
        applied += 1

    return jobs, applied


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
            if len(audio) < 1024:
                raise RuntimeError(f"ElevenLabs returned an unexpectedly small audio file ({len(audio)} bytes)")
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


def write_manifest(run_dir: Path, manifest: dict[str, object]) -> None:
    (run_dir / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
