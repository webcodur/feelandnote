"""Whisper-check one generated 22-file celeb dialogue voice run."""

from __future__ import annotations

import argparse
import json
import re
from difflib import SequenceMatcher
from pathlib import Path

from faster_whisper import WhisperModel


EVENT_TAGS = ("[laughs]", "[sighs]", "[breathes]", "[exhales]")
TAG_WORDS = re.compile(
    r"laughs|sighs|breathes|exhales|shouts|snarling|intense|deliberate|"
    r"mockingly|strained|rushed|excited|happily|cheerfully|sorrowful|"
    r"frustrated|mischievously|angry",
    re.IGNORECASE,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Whisper-QC a generated celeb dialogue voice run")
    parser.add_argument("--run", type=Path, required=True)
    parser.add_argument("--model", default="large-v3-turbo")
    parser.add_argument(
        "--whisper-models",
        type=Path,
        default=Path(r"D:\audios\interview-cleaner\models\whisper"),
    )
    parser.add_argument("--min-match", type=float, default=0.80)
    parser.add_argument("--fail-on-flag", action="store_true")
    return parser.parse_args()


def normalize(value: str) -> str:
    return re.sub(r"[^0-9A-Za-z\uac00-\ud7a3]", "", value).casefold()


def unmatched_tail(expected: str, transcript: str) -> int:
    expected_norm = normalize(expected)
    transcript_norm = normalize(transcript)
    if not transcript_norm or transcript_norm in expected_norm:
        return 0
    blocks = [
        block
        for block in SequenceMatcher(None, expected_norm, transcript_norm).get_matching_blocks()
        if block.size
    ]
    if not blocks:
        return len(transcript_norm)
    last = max(blocks, key=lambda block: block.b + block.size)
    return max(0, len(transcript_norm) - (last.b + last.size))


def main() -> None:
    args = parse_args()
    manifest = json.loads((args.run / "manifest.json").read_text(encoding="utf-8-sig"))
    samples = manifest.get("samples")
    if manifest.get("status") != "generated" or not isinstance(samples, list) or len(samples) != 22:
        raise RuntimeError("Run manifest must contain 22 generated samples")

    model = WhisperModel(
        args.model,
        device="cpu",
        compute_type="int8",
        download_root=str(args.whisper_models),
        local_files_only=True,
    )
    results: list[dict[str, object]] = []
    for index, sample in enumerate(samples, start=1):
        print(f"qc {index:02d}/22 {sample['slot']}", flush=True)
        segments, _ = model.transcribe(
            str(args.run / sample["file"]),
            language=str(manifest["locale"]),
            beam_size=5,
            vad_filter=True,
            condition_on_previous_text=False,
        )
        transcript = " ".join(segment.text.strip() for segment in segments if segment.text.strip())
        expected = str(sample["text"])
        tts_text = str(sample.get("ttsText") or expected)
        match = SequenceMatcher(None, normalize(expected), normalize(transcript)).ratio()
        tail = unmatched_tail(expected, transcript)
        transcript_without_event_words = re.sub(r"(?:하하+|호호+|웃음)", "", transcript)
        effective_tail = unmatched_tail(expected, transcript_without_event_words)
        flags: list[str] = []
        if match < args.min_match:
            flags.append("low-match")
        if effective_tail > 4:
            flags.append("unmatched-tail")
        if TAG_WORDS.search(transcript):
            flags.append("tag-spoken")
        results.append(
            {
                "slot": sample["slot"],
                "ttsText": tts_text,
                "expected": expected,
                "transcript": transcript,
                "match": round(match, 3),
                "unmatchedTail": tail,
                "effectiveTail": effective_tail,
                "eventExpected": any(tag in tts_text for tag in EVENT_TAGS),
                "flags": flags,
            }
        )

    flagged = [result for result in results if result["flags"]]
    report = {
        "runDirectory": str(args.run),
        "checked": len(results),
        "flagged": len(flagged),
        "results": results,
    }
    (args.run / "whisper-qc.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(json.dumps({"checked": len(results), "flagged": len(flagged), "flags": flagged}, ensure_ascii=False, indent=2))
    if flagged and args.fail_on_flag:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
