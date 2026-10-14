"""Remove inhale breaths and tidy head, mid and tail silences in synthesized speech.

This is the only implementation. Every TTS path (reading and dialogue batches, web-bo previews,
Remotion CLI synthesis, audio-bo synthesis) cleans its output where the audio first appears.
Node callers go through packages/shared/src/bo/voice-cleanup.ts; Python callers import clean_file.
Rules and listening evidence: docs/project/production/prod-04-voice-cleanup.md.

Speech is excluded first; quiet phonation is additionally protected by periodicity checks.
Breaths are 1/100 the amplitude of speech; a detector that searches "audible events" with a
0.010 floor misses them and grabs speech instead (26.09.13: match 0.9882 -> 0.9622, 85 -> 83 words).

Breath spans are filled with the file's own room tone, never digital zero. Zeroed spans made
Whisper invent YouTube outros ("다음 영상에서 만나요", "We'll be right back") and 26 of 964
published narrations failed QC (26.09.13). The source floor sits around 13-30 int16 RMS.

The source sample rate is kept: reading WAVs are 24 kHz, dialogue MP3s are 44.1 kHz. Resampling
dialogue to 24 kHz halved its bandwidth in an earlier test. Windows are in seconds and thresholds
are amplitudes, so the analysis does not depend on the rate.

usage: py -3 voice_cleanup.py --profile reading|dialogue IN OUT [IN OUT ...]
Prints one JSON summary per file. IN and OUT may be the same path.
"""
import argparse
import json
import os
import re
import subprocess
from pathlib import Path

import numpy as np

NARRATION_POLICY_PATH = Path(__file__).resolve().parents[3] / "packages/shared/src/bo/voice-utils/narration-cleanup-policy.json"
NARRATION_POLICY = json.loads(NARRATION_POLICY_PATH.read_text(encoding="utf-8"))
SENTENCE_GAP_SECONDS = NARRATION_POLICY["sentenceGapSeconds"]
PARAGRAPH_GAP_SECONDS = NARRATION_POLICY["paragraphGapSeconds"]
PAUSE_TOLERANCE_SECONDS = 0.035

WINDOW, HOP = 0.025, 0.010
MP3_BITRATE = "128k"  # matches MP3_SETTINGS in sw/web-bo/scripts/celeb/reading-voice.mjs and the dialogue runs

# Breath removal — replace non-speech energy between speech regions with room tone
SPEECH_RMS = 0.030        # at or above: speech
SPEECH_GUARD = 0.040      # protected seconds on each side of speech
BREATH_FLOOR_RMS = 0.0012 # at or below: the file's own noise floor
BREATH_MIN, BREATH_MAX = 0.06, 0.80
# A span louder than this is the decaying end of a word, not an inhale. Filling those clipped word
# endings: 54% of dialogue fills and 28% of reading fills had speech right before them (26.09.13).
# Verified inhales measured 0.0015-0.0057; a louder real breath left in place beats a clipped word.
BREATH_PEAK_MAX = 0.010
# Short quiet breaths can adjoin a louder word onset, which made the whole
# connected span fail the peak cap. Split there, retain extra speech margins,
# and reject periodic low-volume phonation rather than erasing a word's decay.
BREATH_SPLIT_GUARD = 0.080
BREATH_PERIODICITY_MAX = 0.60
FADE = 0.008
FALLBACK_TONE_RMS = 0.0005  # when a file has too little quiet audio to sample

# Trimming — never touches frames at or above VOICE_RMS plus TRIM_GUARD
VOICE_RMS = 0.005
TRIM_GUARD = 0.040
HEAD_KEEP, TAIL_KEEP = 0.08, 0.25

# Pause ceiling -> target, set by listening (reading: between sentences, dialogue: at commas)
PROFILES = {"reading": (float("inf"), SENTENCE_GAP_SECONDS), "dialogue": (1.10, 0.95)}


def sample_rate_of(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "a:0", "-show_entries", "stream=sample_rate",
                          "-of", "csv=p=0", path], capture_output=True, text=True, check=True).stdout.strip()
    return int(out)


def decode(path):
    rate = sample_rate_of(path)
    raw = subprocess.run(["ffmpeg", "-v", "error", "-threads", "1", "-i", path, "-f", "s16le", "-ac", "1", "-ar", str(rate), "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0, rate


def encode(samples, rate, path):
    codec = ["-c:a", "pcm_s16le"] if path.lower().endswith(".wav") else ["-codec:a", "libmp3lame", "-b:a", MP3_BITRATE]
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "s16le", "-ac", "1", "-ar", str(rate),
                    "-i", "-", *codec, "-threads", "1", "-ar", str(rate), path],
                   input=(np.clip(samples, -1, 1) * 32767).astype(np.int16).tobytes(), check=True)


# 발행 음원의 청감 볼륨을 인물마다 통일한다 — 팟캐스트/내레이션 웹 표준 -16 LUFS, 천장 -1.5 dBTP.
TARGET_LUFS_I = -16.0
TARGET_TRUE_PEAK = -1.5


def measure_loudness(path):
    """ffmpeg loudnorm 측정 패스 — {"i": integrated LUFS, "tp": true peak dBTP}."""
    proc = subprocess.run(
        ["ffmpeg", "-hide_banner", "-nostats", "-i", str(path),
         "-af", "loudnorm=print_format=json", "-f", "null", "-"],
        capture_output=True, text=True)
    match = re.search(r'\{[^{}]*"input_i"[^{}]*\}', proc.stderr, re.S)
    if not match:
        raise RuntimeError(f"loudnorm measure failed for {path}: {proc.stderr[-400:]}")
    stats = json.loads(match.group(0))
    return {"i": float(stats["input_i"]), "tp": float(stats["input_tp"])}


def normalize_loudness(path, target_i=TARGET_LUFS_I, true_peak=TARGET_TRUE_PEAK):
    """선형 게인으로 통합 라우드니스를 target_i로 맞춘다. 피크가 천장을 넘을 때만 리미터가 누른다."""
    measured = measure_loudness(path)
    gain_db = target_i - measured["i"]
    ceiling = 10 ** (true_peak / 20)
    tmp = Path(str(path) + ".norm.mp3")
    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", "-i", str(path),
         "-af", f"volume={gain_db:.2f}dB,alimiter=limit={ceiling:.6f}:level=false",
         "-codec:a", "libmp3lame", "-b:a", MP3_BITRATE, str(tmp)],
        check=True)
    tmp.replace(path)
    return {"inputI": measured["i"], "inputTp": measured["tp"], "gainDb": round(gain_db, 2)}


def envelope(samples, rate):
    width, hop = int(rate * WINDOW), int(rate * HOP)
    count = max(0, (samples.size - width) // hop + 1)
    return np.array([np.sqrt((samples[i * hop:i * hop + width] ** 2).mean()) for i in range(count)])


def breath_spans(samples, rate):
    env = envelope(samples, rate)
    guard = int(SPEECH_GUARD / HOP)
    protected = np.convolve((env >= SPEECH_RMS).astype(int), np.ones(2 * guard + 1), "same") > 0
    candidate = (env > BREATH_FLOOR_RMS) & ~protected
    spans, i = [], 0
    while i < candidate.size:
        if not candidate[i]:
            i += 1
            continue
        j = i
        while j < candidate.size and candidate[j]:
            j += 1
        start, end = i * HOP, j * HOP + WINDOW
        if BREATH_MIN <= end - start <= BREATH_MAX and env[i:j].max() < BREATH_PEAK_MAX:
            spans.append((start, end))
        i = j
    split_guard = int(BREATH_SPLIT_GUARD / HOP)
    protected = np.convolve((env >= BREATH_PEAK_MAX).astype(int),
                            np.ones(2 * split_guard + 1), "same") > 0
    candidate = (env > BREATH_FLOOR_RMS) & ~protected
    i = 0
    while i < candidate.size:
        if not candidate[i]:
            i += 1
            continue
        j = i
        while j < candidate.size and candidate[j]:
            j += 1
        start, end = i * HOP, j * HOP + WINDOW
        if (BREATH_MIN <= end - start <= BREATH_MAX
                and not any(start < b and end > a for a, b in spans)
                and not periodic_phonation(samples[int(start * rate):int(end * rate)], rate)):
            spans.append((start, end))
        i = j
    return sorted(spans)


def periodic_phonation(samples, rate):
    """Protect quiet voiced endings: periodicity at plausible vocal pitch lags."""
    stride = max(1, rate // 8000)
    reduced = samples[::stride]
    effective_rate = rate / stride
    width = min(reduced.size, round(.060 * effective_rate))
    if width < 32:
        return True
    for start in (0, (reduced.size - width) // 2, reduced.size - width):
        frame = reduced[start:start + width].astype(np.float64)
        frame -= frame.mean()
        energy = np.dot(frame, frame)
        if energy <= 1e-12:
            continue
        ac = np.correlate(frame, frame, mode="full")[width - 1:]
        for lag in range(round(effective_rate / 400), min(width // 2, round(effective_rate / 80))):
            denominator = np.sqrt(np.dot(frame[:-lag], frame[:-lag]) * np.dot(frame[lag:], frame[lag:]))
            if denominator and ac[lag] / denominator >= BREATH_PERIODICITY_MAX:
                return True
    return False


def room_tone(samples, rate):
    """Concatenate the file's own below-floor, non-silent frames; fall back to faint noise."""
    env = envelope(samples, rate)
    hop = int(rate * HOP)
    frames = [samples[i * hop:(i + 1) * hop] for i, level in enumerate(env) if 0 < level < BREATH_FLOOR_RMS]
    pool = np.concatenate(frames) if frames else np.zeros(0, dtype=np.float32)
    if pool.size < int(rate * 0.2):
        pool = np.random.default_rng(0).normal(0, FALLBACK_TONE_RMS, rate).astype(np.float32)
    return pool


def fill_breaths(samples, rate, spans):
    out = samples.copy()
    if not spans:
        return out
    pool = room_tone(samples, rate)
    rng = np.random.default_rng(0)
    fade = int(rate * FADE)
    for start, end in spans:
        a, b = max(0, int(start * rate)), min(out.size, int(end * rate))
        n = b - a
        if n <= 0:
            continue
        bed = np.resize(np.roll(pool, -int(rng.integers(0, pool.size))), n)
        weight = np.ones(n, dtype=np.float32)
        ramp = min(fade, n // 2)  # an event touching the file end would overrun a fixed ramp
        if ramp > 0:
            weight[:ramp] = np.linspace(0, 1, ramp)
            weight[n - ramp:] = np.linspace(1, 0, ramp)
        out[a:b] = out[a:b] * (1 - weight) + bed * weight
    return out


def boundary_pause_edits(samples, rate, boundaries, *, tolerance=PAUSE_TOLERANCE_SECONDS):
    """Use trusted text/timestamp boundaries to edit quiet audio, never infer paragraphs.

    Each boundary has start/end hints in seconds and kind sentence/paragraph.
    Waveform silence edges, not ASR word padding, determine the perceived gap.
    Both speech edges keep TRIM_GUARD; replacement room tone includes those margins.
    """
    env = envelope(samples, rate)
    if not env.size:
        return [], [], ["empty-audio"]
    quiet = env < VOICE_RMS
    runs, i = [], 0
    while i < len(quiet):
        if not quiet[i]:
            i += 1
            continue
        j = i
        while j < len(quiet) and quiet[j]:
            j += 1
        # A voiced frame spans WINDOW, so its tail must remain intact.
        a = max(0.0, (i - 1) * HOP + WINDOW)
        b = min(samples.size / rate, j * HOP)
        if i > 0 and j < len(quiet) and b - a > 2 * TRIM_GUARD:
            runs.append((a, b))
        i = j
    edits, pauses, unresolved = [], [], []
    used = set()
    for boundary in boundaries:
        start, end, kind = boundary["start"], boundary["end"], boundary["kind"]
        if kind not in ("sentence", "paragraph") or not np.isfinite(start + end) or end < start:
            raise ValueError("Invalid narration boundary")
        pivot = (start + end) / 2
        choices = [(index, a, b) for index, (a, b) in enumerate(runs)
                   if index not in used and a <= end + 0.70 and b >= start - 0.30
                   and a <= pivot + 0.70 and b >= pivot - 0.30]
        if not choices:
            unresolved.append({**boundary, "reason": "no-safe-silence-at-boundary"})
            continue
        index, a, b = min(choices, key=lambda x: max(x[1] - pivot, pivot - x[2], 0))
        used.add(index)
        target = PARAGRAPH_GAP_SECONDS if kind == "paragraph" else SENTENCE_GAP_SECONDS
        pauses.append({"start": a, "end": b, "kind": kind, "target": target})
        if abs(b - a - target) <= tolerance:
            continue
        lo, hi = round((a + TRIM_GUARD) * rate), round((b - TRIM_GUARD) * rate)
        replace_samples = round(target * rate) - (lo - round(a * rate)) - (round(b * rate) - hi)
        if replace_samples < 0 or (edits and lo < edits[-1]["endSample"]):
            raise ValueError("Overlapping or impossible narration pause edits")
        edits.append({"startSample": lo, "endSample": hi, "replacementSamples": replace_samples,
                      "start": lo / rate, "end": hi / rate, "kind": kind,
                      "originalGap": b - a, "targetGap": target})
    return edits, pauses, unresolved


def apply_pause_edits(samples, rate, edits):
    """Preserve every sample outside the selected quiet cores; replace cores with room tone."""
    if not edits:
        return samples.copy()
    pool = room_tone(samples, rate)
    chunks, cursor = [], 0
    for edit in edits:
        a, b, n = edit["startSample"], edit["endSample"], edit["replacementSamples"]
        if a < cursor or b < a or b > samples.size:
            raise ValueError("Invalid pause edit sample range")
        chunks.append(samples[cursor:a])
        bed = np.resize(pool, n).copy()
        fade = min(int(FADE * rate), n // 2, (b - a) // 2)
        if fade:
            ramp = np.linspace(0, 1, fade)
            bed[:fade] = samples[a:a + fade] * (1 - ramp) + bed[:fade] * ramp
            bed[-fade:] = bed[-fade:] * (1 - ramp) + samples[b - fade:b] * ramp
        chunks.append(bed)
        cursor = b
    chunks.append(samples[cursor:])
    return np.concatenate(chunks)


def retime_timestamp(seconds, rate, edits):
    position = seconds * rate
    shift = 0
    for edit in edits:
        a, b, n = edit["startSample"], edit["endSample"], edit["replacementSamples"]
        if position < a:
            break
        if position < b:
            return (a + shift + (position - a) * n / (b - a)) / rate
        shift += n - (b - a)
    return (position + shift) / rate


def encode_narration(samples, rate, boundaries, target):
    """Normalize quiet boundary cores and verify the final WAV/MP3, without re-encoding speech from a lossy retry."""
    target = Path(target)
    if target.exists():
        raise FileExistsError(str(target))
    target.parent.mkdir(parents=True, exist_ok=True)
    # Keep every boundary available for encoder-edge calibration, including an
    # already-correct gap. Its core is room tone, so no speech samples change.
    edits, _, unresolved = boundary_pause_edits(samples, rate, boundaries, tolerance=-1)
    if unresolved:
        raise ValueError("UNSAFE_BOUNDARY: " + json.dumps(unresolved))
    for iteration in range(4):
        fixed = apply_pause_edits(samples, rate, edits)
        mapped = [{**b, "start": retime_timestamp(b["start"], rate, edits),
                   "end": retime_timestamp(b["end"], rate, edits)} for b in boundaries]
        # Verify each retained interval before encoding, after all calibrations.
        cursor, output_cursor = 0, 0
        for edit in edits:
            size = edit["startSample"] - cursor
            if not np.array_equal(samples[cursor:cursor + size], fixed[output_cursor:output_cursor + size]):
                raise ValueError("PRESERVED_PCM_CHANGED")
            output_cursor += size + edit["replacementSamples"]
            cursor = edit["endSample"]
        if not np.array_equal(samples[cursor:], fixed[output_cursor:]):
            raise ValueError("PRESERVED_PCM_CHANGED")
        candidate = target if not iteration else target.with_stem(target.stem + f"-encode-{iteration}")
        encode(fixed, rate, str(candidate))
        encoded, encoded_rate = decode(str(candidate))
        # LAME can retain up to a few dozen tail padding samples; they never
        # shift the measured sentence times and belong in the final duration.
        if encoded_rate != rate or not 0 <= encoded.size - fixed.size <= round(rate * .005):
            raise ValueError("ENCODED_DURATION_OR_RATE_CHANGED")
        remaining, pauses, unresolved = boundary_pause_edits(encoded, rate, mapped)
        if not remaining and not unresolved:
            return {"output": str(candidate), "duration": encoded.size / rate,
                    "edits": edits, "pauses": pauses}
        if unresolved or iteration == 3:
            raise ValueError("ENCODED_SPACING_VERIFICATION_FAILED")
        for correction in remaining:
            shift, matches = 0, []
            for edit in edits:
                start = (edit["startSample"] + shift) / rate
                end = start + edit["replacementSamples"] / rate
                if abs(start - correction["start"]) < .15 and abs(end - correction["end"]) < .15:
                    matches.append(edit)
                shift += edit["replacementSamples"] - (edit["endSample"] - edit["startSample"])
            if len(matches) != 1 or abs(correction["originalGap"] - correction["targetGap"]) > .15:
                raise ValueError("ENCODED_BOUNDARY_MOVED")
            matches[0]["replacementSamples"] -= round((correction["originalGap"] - correction["targetGap"]) * rate)


def trim(samples, rate, pause_max, pause_target):
    env = envelope(samples, rate)
    voiced = np.where(env >= VOICE_RMS)[0]
    if voiced.size == 0:
        return samples
    guard = int(TRIM_GUARD / HOP)
    cuts = []
    head = int(max(0.0, max(0, voiced[0] - guard) * HOP - HEAD_KEEP) * rate)
    if head > 0:
        cuts.append((0, head))
    tail = int((min(env.size - 1, voiced[-1] + guard) * HOP + TAIL_KEEP) * rate)
    if tail < samples.size:
        cuts.append((tail, samples.size))
    for left, right in zip(voiced, voiced[1:]):
        gap = (right - left - 1) * HOP
        if gap <= pause_max:
            continue
        a, b = (left + 1 + guard) * HOP, (right - guard) * HOP
        remove = min(b - a, gap - pause_target)
        if remove > 0.02:  # shave the middle so both edges keep their margin
            middle = (a + b) / 2
            cuts.append((int((middle - remove / 2) * rate), int((middle + remove / 2) * rate)))
    keep = np.ones(samples.size, dtype=bool)
    for a, b in cuts:
        keep[max(0, a):min(samples.size, b)] = False
    return samples[keep]


def clean_file(source, target, profile, *, breaths_only=False):
    """Clean one file into target and return its summary; target may equal source."""
    pause_max, pause_target = PROFILES[profile]
    samples, rate = decode(str(source))
    spans = breath_spans(samples, rate)
    filled = fill_breaths(samples, rate, spans)
    # Reading sentence/paragraph pauses need text-aligned boundaries after tempo adjustment.
    # Do not flatten paragraphs to a generic pause ceiling before those boundaries exist.
    cleaned = filled if breaths_only else trim(filled, rate, float("inf") if profile == "reading" else pause_max, pause_target)
    target = Path(target)
    # Encode beside the target and swap, so a failed encode never leaves a half-written original.
    staging = target.with_name(f"{target.stem}.cleaning{target.suffix}")
    encode(cleaned, rate, str(staging))
    os.replace(staging, target)
    return {"source": str(source), "target": str(target), "profile": profile, "rate": rate, "breaths": len(spans),
            "before": round(samples.size / rate, 3), "seconds": round(cleaned.size / rate, 3)}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--profile", choices=PROFILES, required=True)
    parser.add_argument("paths", nargs="+", help="IN OUT pairs")
    args = parser.parse_args()
    if len(args.paths) % 2:
        parser.error("paths must be IN OUT pairs")
    for source, target in zip(args.paths[::2], args.paths[1::2]):
        print(json.dumps(clean_file(source, target, args.profile)), flush=True)


if __name__ == "__main__":
    main()
