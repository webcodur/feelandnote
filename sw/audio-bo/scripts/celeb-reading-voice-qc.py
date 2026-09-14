"""Conservative KO/EN reading narration QC; JSONL worker keeps Whisper in memory.

Thresholds below are provisional safeguards, not a validated perceptual-quality
classifier. ASR flags require retry or review; passing is not proof of pronunciation.
Original audio is never overwritten. Only confidently silent sentence pauses can
be shortened, and repaired audio is transcribed and checked again before passing.
"""
from __future__ import annotations

import argparse
from difflib import SequenceMatcher
import json
from pathlib import Path
import re
import subprocess
import sys
import wave

import numpy as np


MODEL_ROOT = Path(r"D:\audios\interview-cleaner\models\whisper")
SAMPLE_RATE = 24000
QC_VERSION = 4
MIN_MATCH = 0.90
MAX_EDGE_MISSING = {"ko": 3, "en": 5}
MAX_INTERNAL_MISSING = {"ko": 6, "en": 12}
# 들숨을 지우면 그 자리가 침묵으로 드러나 쉼이 길어 보인다. 사용자 청취로 정한 상한은
# 쉼표 1.1초 · 문장 사이 1.2초 · 문단 1.8초이며, 여기서는 문장 사이 기준을 쓴다.
# 0.75/0.45는 들숨이 자리를 메우던 시절의 값이라 무음 처리본을 전부 수리 대상으로 만들었다.
LONG_PAUSE_SECONDS = 1.2
TARGET_PAUSE_SECONDS = 1.05
MAX_MID_SENTENCE_PAUSE = 1.2
WORD_BOUNDARY_MARGIN = 0.10
MIN_BOUNDARY_PROBABILITY = 0.75
SILENCE_PEAK = 0.003
SILENCE_RMS = 0.001
MAX_SAMPLE_JUMP = 0.65
MIN_JUMP_ISOLATION_RATIO = 6.0
JUMP_CONTEXT_SECONDS = 0.010
JUMP_EXCLUSION_SECONDS = 0.001
CLIP_AMPLITUDE = 0.999
MAX_CLIP_RUN = 3
MAX_CLIP_FRACTION = 0.0001


def normalize(value: str) -> str:
    # Identical alphabet/case normalization to celeb-dialogue-voice-qc.py.
    return re.sub(r"[^0-9A-Za-z\uac00-\ud7a3]", "", value).casefold()


def source_alignment(expected: str, transcript: str, locale: str) -> tuple[dict, list[str], dict]:
    source, heard = normalize(expected), normalize(transcript)
    matcher = SequenceMatcher(None, source, heard, autojunk=False)
    mapping = {}
    blocks = [block for block in matcher.get_matching_blocks() if block.size]
    for block in blocks:
        for offset in range(block.size):
            mapping[block.b + offset] = block.a + offset
    missing_head = blocks[0].a if blocks else len(source)
    missing_tail = len(source) - blocks[-1].a - blocks[-1].size if blocks else len(source)
    added_head = blocks[0].b if blocks else len(heard)
    added_tail = len(heard) - blocks[-1].b - blocks[-1].size if blocks else len(heard)
    differences = [
        {"kind": kind, "sourceStart": i, "sourceEnd": j,
         "expected": source[i:j], "heard": heard[k:l]}
        for kind, i, j, k, l in matcher.get_opcodes() if kind != "equal"
    ]
    flags = []
    if not source or not heard:
        flags.append("empty-text-or-transcript")
    if matcher.ratio() < MIN_MATCH:
        flags.append("low-match")
    if missing_head > MAX_EDGE_MISSING[locale]:
        flags.append("missing-source-head")
    if missing_tail > MAX_EDGE_MISSING[locale]:
        flags.append("missing-source-tail")
    if added_head > MAX_EDGE_MISSING[locale]:
        flags.append("unexpected-spoken-head")
    if added_tail > MAX_EDGE_MISSING[locale]:
        flags.append("unexpected-spoken-tail")
    if any(len(d["expected"]) >= MAX_INTERNAL_MISSING[locale] for d in differences):
        flags.append("source-content-gap")
    if any(len(d["heard"]) >= MAX_INTERNAL_MISSING[locale] for d in differences):
        flags.append("unexpected-spoken-content")
    return {
        "match": round(matcher.ratio(), 4), "sourceCharacters": len(source),
        "transcriptCharacters": len(heard), "missingHead": missing_head,
        "missingTail": missing_tail, "addedHead": added_head, "addedTail": added_tail,
        "differences": differences,
    }, flags, mapping


def decode_audio(path: Path) -> np.ndarray:
    decoded = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", str(path), "-f", "f32le", "-ac", "1",
         "-ar", str(SAMPLE_RATE), "pipe:1"], capture_output=True, check=True, timeout=60,
    )
    return np.frombuffer(decoded.stdout, dtype="<f4").copy()


def acoustic_metrics(samples: np.ndarray) -> tuple[dict, list[str]]:
    if samples.size == 0 or not np.isfinite(samples).all():
        return {}, ["invalid-audio"]
    clipped = np.abs(samples) >= CLIP_AMPLITUDE
    edges = np.diff(np.concatenate(([False], clipped, [False])).astype(np.int8))
    runs = np.flatnonzero(edges == -1) - np.flatnonzero(edges == 1)
    longest = int(runs.max()) if runs.size else 0
    fraction = float(clipped.mean())
    differences = np.abs(np.diff(samples))
    jump = float(np.max(differences)) if differences.size else 0.0
    # Strong fricatives naturally have large first differences. A click candidate
    # must also be isolated relative to the surrounding signal, excluding its
    # immediate one-millisecond impulse neighborhood from the comparison.
    context = int(JUMP_CONTEXT_SECONDS * SAMPLE_RATE)
    exclusion = int(JUMP_EXCLUSION_SECONDS * SAMPLE_RATE)
    isolated, isolation_ratio = [], 0.0
    for index in np.flatnonzero(differences > MAX_SAMPLE_JUMP):
        surroundings = np.concatenate((differences[max(0, index - context):max(0, index - exclusion)],
                                       differences[index + exclusion:index + context]))
        if not surroundings.size:
            continue
        baseline = max(0.015, float(np.percentile(surroundings, 95)))
        ratio = float(differences[index]) / baseline
        isolation_ratio = max(isolation_ratio, ratio)
        if ratio >= MIN_JUMP_ISOLATION_RATIO:
            isolated.append(int(index))
    rms = float(np.sqrt(np.mean(samples.astype(np.float64) ** 2)))
    flags = []
    if longest >= MAX_CLIP_RUN or fraction > MAX_CLIP_FRACTION:
        flags.append("clipping")
    if isolated:
        flags.append("sample-jump")
    if rms < SILENCE_RMS:
        flags.append("silent-audio")
    jump_index = int(np.argmax(np.abs(np.diff(samples)))) if samples.size > 1 else 0
    return {"duration": round(len(samples) / SAMPLE_RATE, 4), "rms": round(rms, 6),
            "peak": round(float(np.max(np.abs(samples))), 6),
            "clipFraction": fraction, "longestClipRun": longest,
            "maxSampleJump": round(jump, 6),
            "maxSampleJumpAt": round(jump_index / SAMPLE_RATE, 4),
            "maxJumpIsolationRatio": round(isolation_ratio, 4),
            "isolatedJumpCount": len(isolated),
            "isolatedJumpTimes": [round(index / SAMPLE_RATE, 4) for index in isolated[:20]]}, flags


def punctuation_offsets(text: str) -> set[int]:
    offsets, count = set(), 0
    for index, char in enumerate(text):
        count += len(normalize(char))
        # Periods inside numbers/abbreviations are not confidently sentence ends.
        if char in ".!?。！？\n" and (index + 1 == len(text) or text[index + 1].isspace()
                                    or text[index + 1] in '\"\u201d\u2019'):
            if char == ".":
                token = re.search(r"([A-Za-z.]+)$", text[:index])
                abbreviation = token.group(1).casefold() if token else ""
                if ((index > 0 and text[index - 1].isdigit()) or len(abbreviation) == 1
                        or "." in abbreviation or abbreviation in {
                            "dr", "mr", "mrs", "ms", "prof", "sr", "jr", "st", "rev",
                            "gen", "col", "lt", "capt", "sgt", "hon", "pres", "gov",
                            "vs", "etc", "vol", "no", "fig", "approx", "dept", "inc", "co",
                        }):
                    continue
            offsets.add(count)
    return offsets


def pause_repairs(samples: np.ndarray, words: list[dict], text: str,
                  mapping: dict) -> tuple[list[dict], list[str], list[str]]:
    boundaries = punctuation_offsets(text)
    repairs, flags, warnings = [], [], []
    cursor = 0
    spans = []
    for word in words:
        size = len(normalize(word["word"]))
        spans.append((cursor, cursor + size))
        cursor += size
    for index, (left, right) in enumerate(zip(words, words[1:])):
        start, end = left["end"], right["start"]
        gap = end - start
        if gap <= LONG_PAUSE_SECONDS:
            continue
        left_pos, right_pos = spans[index][1] - 1, spans[index + 1][0]
        source_left, source_right = mapping.get(left_pos), mapping.get(right_pos)
        sentence_end = (source_left is not None and source_right == source_left + 1
                        and source_right in boundaries)
        if not sentence_end:
            if gap > MAX_MID_SENTENCE_PAUSE:
                nearby_left = next((mapping[p] for p in range(left_pos, max(-1, left_pos - 5), -1)
                                    if p in mapping), None)
                nearby_right = next((mapping[p] for p in range(right_pos, right_pos + 5)
                                     if p in mapping), None)
                near_boundary = (nearby_left is not None and nearby_right is not None
                                 and any(nearby_left < boundary <= nearby_right for boundary in boundaries))
                flags.append("uncertain-source-boundary" if near_boundary else "long-mid-sentence-pause")
            continue
        if (min(left["probability"], right["probability"]) < MIN_BOUNDARY_PROBABILITY
                or left["end"] - left["start"] < 0.04
                or right["end"] - right["start"] < 0.04):
            flags.append("uncertain-sentence-boundary")
            continue
        # Keep margins at BOTH word boundaries and remove only near-silence.
        safe_start, safe_end = start + WORD_BOUNDARY_MARGIN, end - WORD_BOUNDARY_MARGIN
        middle = samples[int(safe_start * SAMPLE_RATE):int(safe_end * SAMPLE_RATE)]
        if not middle.size:
            flags.append("uncertain-sentence-boundary")
            continue
        if (np.max(np.abs(middle)) > SILENCE_PEAK
                or np.sqrt(np.mean(middle ** 2)) > SILENCE_RMS):
            # Not safe to cut does not mean defective: preserve sentence breaths
            # and residual speech energy instead of forcing a regeneration.
            warnings.append("non-silent-sentence-pause")
            continue
        remove = gap - TARGET_PAUSE_SECONDS
        cut_start = (start + end - remove) / 2
        cut_end = cut_start + remove
        repairs.append({"start": round(cut_start, 4), "end": round(cut_end, 4),
                        "originalGap": round(gap, 4), "reason": "silent-sentence-pause"})
    return repairs, sorted(set(flags)), sorted(set(warnings))


def write_repaired(samples: np.ndarray, repairs: list[dict], output: Path) -> None:
    if output.exists():
        raise FileExistsError(f"Refusing to overwrite {output}")
    if output.suffix.lower() != ".wav":
        raise ValueError("QC output must be a new .wav file")
    chunks, cursor = [], 0
    for repair in repairs:
        start, end = int(repair["start"] * SAMPLE_RATE), int(repair["end"] * SAMPLE_RATE)
        chunks.append(samples[cursor:start])
        cursor = end
    chunks.append(samples[cursor:])
    output.parent.mkdir(parents=True, exist_ok=True)
    pcm = np.clip(np.concatenate(chunks) * 32767, -32768, 32767).astype("<i2")
    with output.open("xb") as handle:
        with wave.open(handle, "wb") as wav:
            wav.setnchannels(1)
            wav.setsampwidth(2)
            wav.setframerate(SAMPLE_RATE)
            wav.writeframes(pcm.tobytes())


class AlignmentFrameGuard:
    """Reject degenerate EOF alignment before CTranslate2 enters native code.

    The saved ms-rachel/en candidate MP3 reproducibly reaches find_alignment
    with one mel frame; local CUDA alignment then exits with 0xC0000094.
    Hold this audio for review instead of losing the persistent QC worker or
    silently dropping its unverified tail.
    """

    def find_alignment(self, tokenizer, text_tokens, encoder_output, num_frames,
                       median_filter_width=7):
        if num_frames < 2:
            raise ValueError(f"insufficient-alignment-frames: {num_frames}")
        return super().find_alignment(tokenizer, text_tokens, encoder_output,
                                      num_frames, median_filter_width)


class NarrationQC:
    def __init__(self, device: str = "cpu", model_root: Path = MODEL_ROOT):
        self.device, self.model_root, self.model = device, model_root, None

    def transcribe(self, audio: Path, locale: str) -> tuple[str, list[dict]]:
        if self.model is None:
            from faster_whisper import WhisperModel

            class LocalWhisperModel(AlignmentFrameGuard, WhisperModel):
                pass

            print("Loading local large-v3-turbo for reading QC", file=sys.stderr, flush=True)
            self.model = LocalWhisperModel("large-v3-turbo", device=self.device,
                                           compute_type="int8", download_root=str(self.model_root),
                                           local_files_only=True)
        segments, _ = self.model.transcribe(
            str(audio), language=locale, beam_size=5, vad_filter=True,
            condition_on_previous_text=False, word_timestamps=True,
        )
        words = []
        for segment in segments:
            for word in segment.words or []:
                words.append({"start": round(word.start, 4), "end": round(word.end, 4),
                              "word": word.word, "probability": round(word.probability, 4)})
        # Align precisely the same character stream as the word timestamp list.
        return "".join(word["word"] for word in words).strip(), words

    def check(self, request: dict, allow_repair: bool = True) -> dict:
        audio = Path(request["audio"]).resolve()
        text, locale = request["text"], request["locale"]
        if locale not in ("ko", "en") or not isinstance(text, str) or not text.strip():
            raise ValueError("A nonempty text and locale ko/en are required")
        if not audio.is_file():
            raise FileNotFoundError(str(audio))
        samples = decode_audio(audio)
        acoustic, flags = acoustic_metrics(samples)
        transcript, words = self.transcribe(audio, locale)
        content, content_flags, mapping = source_alignment(text, transcript, locale)
        flags += content_flags
        repairs, pause_flags, warnings = pause_repairs(samples, words, text, mapping)
        flags += pause_flags
        # VAD may hide unexpected sounds at the edges: retain them for review.
        if words:
            for label, edge in (("head", samples[:max(0, int((words[0]["start"] - 0.15) * SAMPLE_RATE))]),
                                ("tail", samples[int((words[-1]["end"] + 0.15) * SAMPLE_RATE):])):
                if edge.size > int(0.5 * SAMPLE_RATE) and np.sqrt(np.mean(edge ** 2)) > SILENCE_RMS:
                    flags.append(f"untranscribed-audio-{label}")
        result = {"id": request.get("id"), "ok": False, "status": "regenerate",
                  "qcVersion": QC_VERSION, "flags": sorted(set(flags)), "warnings": warnings, "audio": None,
                  "metrics": {**acoustic, **content}, "transcript": transcript,
                  "words": words, "repairs": repairs}
        result["pauses"] = [{"start": left["end"], "end": right["start"],
                             "before": left["word"], "after": right["word"]}
                            for left, right in zip(words, words[1:])
                            if right["start"] - left["end"] > LONG_PAUSE_SECONDS]
        if flags:
            return result
        if repairs:
            if not allow_repair or not request.get("output"):
                result["flags"] = ["pause-repair-required"]
                return result
            output = Path(request["output"]).resolve()
            write_repaired(samples, repairs, output)
            verified = self.check({**request, "audio": str(output), "output": None}, allow_repair=False)
            result["repairVerification"] = {key: verified[key] for key in ("ok", "flags", "warnings", "metrics")}
            result["warnings"] = sorted(set(warnings + verified["warnings"]))
            if not verified["ok"]:
                result["flags"] = ["repair-verification-failed", *verified["flags"]]
                return result
            result.update(ok=True, status="repaired", audio=str(output))
            return result
        result.update(ok=True, status="passed", audio=str(audio))
        return result


def main() -> None:
    for stream in (sys.stdout, sys.stderr, sys.stdin):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--worker", action="store_true")
    parser.add_argument("--audio", type=Path)
    parser.add_argument("--text-file", type=Path)
    parser.add_argument("--locale", choices=("ko", "en"))
    parser.add_argument("--output", type=Path)
    parser.add_argument("--result", type=Path)
    parser.add_argument("--device", default="cpu", choices=("cpu", "cuda", "auto"))
    parser.add_argument("--whisper-models", type=Path, default=MODEL_ROOT)
    args = parser.parse_args()
    qc = NarrationQC(args.device, args.whisper_models)
    if args.worker:
        for line in sys.stdin:
            request = {}
            try:
                request = json.loads(line)
                result = qc.check(request)
            except Exception as error:
                result = {"id": request.get("id") if isinstance(request, dict) else None,
                          "ok": False, "status": "error", "flags": ["qc-error"], "warnings": [],
                          "audio": None, "error": str(error)}
            print(json.dumps(result, ensure_ascii=False), flush=True)
        return
    if not args.audio or not args.text_file or not args.locale:
        parser.error("--audio, --text-file and --locale are required without --worker")
    result = qc.check({"audio": str(args.audio), "locale": args.locale,
                       "text": args.text_file.read_text(encoding="utf-8-sig"),
                       "output": str(args.output) if args.output else None})
    encoded = json.dumps(result, ensure_ascii=False, indent=2)
    if args.result:
        args.result.write_text(encoded + "\n", encoding="utf-8")
    print(encoded)
    if not result["ok"]:
        raise SystemExit(2)


if __name__ == "__main__":
    main()
