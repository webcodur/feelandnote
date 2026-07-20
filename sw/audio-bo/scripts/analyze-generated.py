from __future__ import annotations

import argparse
import json
import math
import re
from difflib import SequenceMatcher
from pathlib import Path

import librosa
import numpy as np
from faster_whisper import WhisperModel


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--runs", type=Path, required=True)
    parser.add_argument("--whisper-models", type=Path, required=True)
    return parser.parse_args()


def normalize(text: str) -> str:
    return re.sub(r"[^가-힣0-9]", "", text)


def pitch_metrics(path: Path) -> dict[str, float | None]:
    audio, sample_rate = librosa.load(path, sr=16000, mono=True)
    f0, voiced, _ = librosa.pyin(
        audio,
        fmin=librosa.note_to_hz("C2"),
        fmax=librosa.note_to_hz("C5"),
        sr=sample_rate,
    )
    valid = f0[np.isfinite(f0) & voiced]
    ending_change = None
    if valid.size >= 12:
        earlier = float(np.median(valid[-12:-4]))
        ending = float(np.median(valid[-4:]))
        if earlier > 0 and ending > 0:
            ending_change = round(12 * math.log2(ending / earlier), 2)
    rms = float(np.sqrt(np.mean(np.square(audio)))) if audio.size else 0.0
    return {
        "medianPitchHz": round(float(np.median(valid)), 2) if valid.size else None,
        "endingPitchChangeSemitones": ending_change,
        "rmsDbfs": round(20 * math.log10(max(rms, 1e-9)), 2),
    }


def main() -> None:
    args = parse_args()
    model = WhisperModel(
        "large-v3-turbo",
        device="cpu",
        compute_type="int8",
        download_root=str(args.whisper_models),
        local_files_only=True,
    )
    summaries: list[dict[str, object]] = []
    for run_dir in sorted(args.runs.glob("*cosyvoice*")):
        metadata_path = run_dir / "run.json"
        if not metadata_path.exists():
            continue
        metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
        target = str(metadata.get("targetText", ""))
        for item in metadata.get("files", []):
            path = run_dir / item["name"]
            segments, _ = model.transcribe(
                str(path),
                language="ko",
                beam_size=5,
                vad_filter=True,
                condition_on_previous_text=False,
            )
            recognized = " ".join(segment.text.strip() for segment in segments if segment.text.strip())
            item["verification"] = recognized
            item["textMatchPercent"] = round(
                SequenceMatcher(None, normalize(target), normalize(recognized)).ratio() * 100,
                1,
            )
            item.update(pitch_metrics(path))
        metadata_path.write_text(
            json.dumps(metadata, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        summaries.append(
            {
                "run": run_dir.name,
                "referenceLabel": metadata.get("referenceLabel"),
                "files": metadata.get("files", []),
            }
        )
    print(json.dumps(summaries, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
