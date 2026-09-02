"""Generate the 22 production dialogue MP3s without padding or trimming."""

from __future__ import annotations

import argparse
import json
import subprocess
from datetime import datetime
from pathlib import Path

from celeb_dialogue_voice_common import (
    apply_tts_overrides,
    load_celeb_dialogues,
    read_env,
    resolve_api_key,
    resolve_voice_id,
    synthesize,
    write_manifest,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate all 22 celeb dialogue slots directly. No safety tail and no trimming."
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
        help="Continue a failed run and generate only slots missing from its manifest.",
    )
    parser.add_argument(
        "--tts-overrides",
        type=Path,
        help="JSON with synthesis-only text by slot. DB display text remains unchanged.",
    )
    parser.add_argument("--model", default="eleven_v3")
    parser.add_argument("--stability", type=float, default=0.5)
    parser.add_argument("--similarity", type=float, default=0.75)
    parser.add_argument("--style", type=float, default=0.3)
    parser.add_argument(
        "--speed",
        type=float,
        help="ElevenLabs synthesis speed (default: 1.0; independent of web playback voice_speed)",
    )
    parser.add_argument("--ffprobe", default="ffprobe")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Validate the DB source, voice ID and 22 slots without calling ElevenLabs.",
    )
    return parser.parse_args()


def probe_mp3(ffprobe: str, path: Path) -> dict[str, object]:
    result = subprocess.run(
        [
            ffprobe,
            "-v",
            "error",
            "-show_entries",
            "format=duration:stream=codec_name,sample_rate,channels",
            "-of",
            "json",
            str(path),
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    payload = json.loads(result.stdout)
    streams = payload.get("streams") or []
    stream = streams[0] if streams else {}
    duration = float((payload.get("format") or {}).get("duration") or 0)
    if stream.get("codec_name") != "mp3" or duration <= 0:
        raise RuntimeError(f"Invalid MP3 output: {path}")
    return {
        "durationSeconds": round(duration, 3),
        "codec": stream.get("codec_name"),
        "sampleRate": int(stream.get("sample_rate") or 0),
        "channels": int(stream.get("channels") or 0),
    }


def main() -> None:
    args = parse_args()
    audio_env = read_env(args.audio_env)
    web_env = read_env(args.web_env)
    celeb, jobs = load_celeb_dialogues(args.slug, args.locale, web_env)
    jobs, tts_override_count = apply_tts_overrides(
        jobs,
        args.tts_overrides,
        args.slug,
        args.locale,
    )
    voice_id = resolve_voice_id(celeb, args.locale, args.voice_id)
    speed = float(args.speed if args.speed is not None else 1.0)

    preflight = {
        "mode": "basic",
        "slug": args.slug,
        "locale": args.locale,
        "celebId": celeb["id"],
        "nickname": celeb.get("nickname"),
        "voiceId": voice_id,
        "account": args.account,
        "jobCount": len(jobs),
        "ttsOverrides": {
            "source": str(args.tts_overrides.resolve()) if args.tts_overrides else None,
            "appliedCount": tts_override_count,
        },
        "settings": {
            "model": args.model,
            "stability": args.stability,
            "similarityBoost": args.similarity,
            "style": args.style,
            "speed": speed,
        },
    }
    if args.dry_run:
        resolve_api_key(audio_env, args.account)
        print(json.dumps({**preflight, "status": "ready"}, ensure_ascii=False, indent=2))
        return

    api_key = resolve_api_key(audio_env, args.account)
    if args.resume_run:
        run_dir = args.resume_run.resolve()
        manifest_path = run_dir / "manifest.json"
        if not manifest_path.is_file():
            raise RuntimeError(f"Resume manifest not found: {manifest_path}")
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        if manifest.get("mode") != "basic":
            raise RuntimeError("Only basic-mode runs can be resumed.")
        if (manifest.get("celeb") or {}).get("slug") != args.slug:
            raise RuntimeError("Resume run slug does not match --slug.")
        if manifest.get("locale") != args.locale:
            raise RuntimeError("Resume run locale does not match --locale.")
        if manifest.get("voiceId") != voice_id:
            raise RuntimeError("Resume run voice ID does not match the requested voice ID.")
        if manifest.get("settings") != preflight["settings"]:
            raise RuntimeError("Resume run synthesis settings do not match this request.")

        all_jobs = {str(job["slot"]): job for job in jobs}
        samples = list(manifest.get("samples") or [])
        existing_slots: set[str] = set()
        for sample in samples:
            slot = str(sample.get("slot"))
            if slot in existing_slots or slot not in all_jobs:
                raise RuntimeError(f"Invalid or duplicate resume sample slot: {slot}")
            expected = all_jobs[slot]
            if sample.get("text") != expected.get("text") or sample.get("ttsText") != expected.get("ttsText"):
                raise RuntimeError(f"Resume sample text no longer matches DB/overrides: {slot}")
            if not (run_dir / str(sample.get("file"))).is_file():
                raise RuntimeError(f"Resume sample file is missing: {slot}")
            existing_slots.add(slot)
        jobs = [job for job in jobs if str(job["slot"]) not in existing_slots]
        run_id = str(manifest.get("runId") or run_dir.name)
        manifest["status"] = "generating"
        manifest.pop("error", None)
    else:
        configured_root = audio_env.get("CELEB_DIALOGUE_VOICE_ROOT")
        output_root = args.output_root or Path(
            configured_root or r"D:\audios\interview-cleaner\celeb-dialogue-voices"
        )
        run_id = datetime.now().strftime("%Y%m%d-%H%M%S")
        run_dir = output_root / args.slug / args.locale / run_id
        run_dir.mkdir(parents=True, exist_ok=False)
        samples = []
        manifest = {
            "schemaVersion": 1,
            "mode": "basic",
            "runId": run_id,
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
            "ttsOverrides": preflight["ttsOverrides"],
            "samples": [],
        }
    write_manifest(run_dir, manifest)

    initial_sample_count = len(samples)
    if not jobs:
        if initial_sample_count != 22:
            raise RuntimeError(f"Resume run has no missing jobs but only {initial_sample_count} samples.")
        manifest["status"] = "generated"
        write_manifest(run_dir, manifest)
        print(json.dumps({"runDirectory": str(run_dir), "mode": "basic", "generatedCount": 22, "resumedGeneratedCount": 0}, ensure_ascii=False, indent=2))
        return

    try:
        for index, job in enumerate(jobs, start=1):
            slot = str(job["slot"])
            destination = run_dir / str(job["fileName"])
            print(f"generate {index:02d}/{len(jobs):02d} {slot}", flush=True)
            api_meta = synthesize(
                api_key,
                voice_id,
                str(job.get("ttsText") or job["text"]),
                destination,
                args.model,
                args.stability,
                args.similarity,
                args.style,
                speed,
            )
            sample = {
                **job,
                "file": destination.name,
                **api_meta,
                **probe_mp3(args.ffprobe, destination),
                "status": "generated",
            }
            samples.append(sample)
            manifest["samples"] = samples
            write_manifest(run_dir, manifest)
    except Exception as error:
        manifest["status"] = "failed"
        manifest["error"] = str(error)
        write_manifest(run_dir, manifest)
        raise

    if len(samples) != 22:
        raise RuntimeError(f"Completed run must contain 22 samples, found {len(samples)}.")
    manifest["status"] = "generated"
    write_manifest(run_dir, manifest)
    print(
        json.dumps(
            {
                "runDirectory": str(run_dir),
                "mode": "basic",
                "generatedCount": len(samples),
                "resumedGeneratedCount": len(samples) - initial_sample_count,
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
