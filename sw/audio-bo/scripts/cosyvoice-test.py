from __future__ import annotations

import argparse
import json
import os
import time
from datetime import datetime, timezone
from pathlib import Path

import soundfile as sf
import torch


TARGET_TEXT = (
    "불가능이란 없다. 우린 우리 자신을 믿어야 합니다.\n"
    "끝까지 포기하지 않으면 기회는 반드시 옵니다.\n"
    "그렇게 최선을 다한 사람만이 자신이 만든 결과를 받아들일 수 있습니다."
)

REFERENCE_TEXT = (
    "해야 되는 부분이 가장 크다고 생각이 들기 때문에 "
    "이 혁신위가 지속적으로 존재를 하면서."
)

DELIVERIES = {
    "cosyvoice-basic": None,
    "cosyvoice-firm": (
        "You are a helpful assistant. Speak in Korean with a firm, confident, "
        "professional narrator delivery. Keep steady energy, use clear emphasis, "
        "and do not let sentence endings sag.<|endofprompt|>"
    ),
    "cosyvoice-hopeful": (
        "You are a helpful assistant. Speak in Korean with warm, uplifting "
        "determination, like an experienced voice actor encouraging an audience. "
        "Use clear emphasis and rising energy.<|endofprompt|>"
    ),
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--cosyvoice-root", type=Path, required=True)
    parser.add_argument("--model", type=Path, required=True)
    parser.add_argument("--reference", type=Path, required=True)
    parser.add_argument("--clean-source", type=Path, required=True)
    parser.add_argument("--clean-reference", type=Path, required=True)
    parser.add_argument("--output-root", type=Path, required=True)
    return parser.parse_args()


def create_clean_reference(source: Path, destination: Path, duration: float) -> None:
    audio, sample_rate = sf.read(source, always_2d=True)
    audio = audio[: round(duration * sample_rate)].mean(axis=1)
    destination.parent.mkdir(parents=True, exist_ok=True)
    sf.write(destination, audio, sample_rate, subtype="PCM_16")


def concatenate(parts: list[torch.Tensor], sample_rate: int) -> torch.Tensor:
    silence = torch.zeros((1, round(sample_rate * 0.18)), dtype=parts[0].dtype)
    combined: list[torch.Tensor] = []
    for index, part in enumerate(parts):
        if index:
            combined.append(silence)
        combined.append(part.detach().cpu())
    return torch.cat(combined, dim=1)


def generate(model, text: str, reference: Path, instruction: str | None) -> torch.Tensor:
    if instruction is None:
        prompt = f"You are a helpful assistant.<|endofprompt|>{REFERENCE_TEXT}"
        iterator = model.inference_zero_shot(
            text,
            prompt,
            str(reference),
            stream=False,
        )
    else:
        iterator = model.inference_instruct2(
            text,
            instruction,
            str(reference),
            stream=False,
        )
    parts = [item["tts_speech"] for item in iterator]
    if not parts:
        raise RuntimeError("Fun-CosyVoice가 음성을 만들지 못했습니다.")
    return concatenate(parts, model.sample_rate)


def write_run(
    model,
    output_root: Path,
    reference: Path,
    reference_label: str,
    run_id: str,
) -> dict[str, object]:
    run_dir = output_root / "runs" / run_id
    run_dir.mkdir(parents=True, exist_ok=True)
    files: list[dict[str, object]] = []
    for name, instruction in DELIVERIES.items():
        started = time.perf_counter()
        audio = generate(model, TARGET_TEXT, reference, instruction)
        path = run_dir / f"{name}.wav"
        sf.write(path, audio.squeeze(0).numpy(), model.sample_rate, subtype="PCM_16")
        files.append(
            {
                "name": path.name,
                "durationSeconds": round(audio.shape[1] / model.sample_rate, 3),
                "generationSeconds": round(time.perf_counter() - started, 3),
                "instruction": instruction,
            }
        )
    metadata = {
        "engine": "Fun-CosyVoice3-0.5B-2512",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "text": f"[Fun-CosyVoice 3 · {reference_label}] {TARGET_TEXT}",
        "targetText": TARGET_TEXT,
        "reference": str(reference),
        "referenceLabel": reference_label,
        "referenceText": REFERENCE_TEXT,
        "files": files,
    }
    (run_dir / "run.json").write_text(
        json.dumps(metadata, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return metadata


def main() -> None:
    args = parse_args()
    os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")

    import sys

    sys.path.insert(0, str(args.cosyvoice_root))
    sys.path.insert(0, str(args.cosyvoice_root / "third_party" / "Matcha-TTS"))
    from cosyvoice.cli.cosyvoice import AutoModel

    original_info = sf.info(args.reference)
    create_clean_reference(args.clean_source, args.clean_reference, original_info.duration)

    model = AutoModel(model_dir=str(args.model), fp16=True)
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    results = [
        write_run(
            model,
            args.output_root,
            args.reference,
            "원본 참고 음성",
            f"{stamp}-cosyvoice-original",
        ),
        write_run(
            model,
            args.output_root,
            args.clean_reference,
            "잡음 감소 참고 음성",
            f"{stamp}-cosyvoice-cleaned",
        ),
    ]
    print(json.dumps(results, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
