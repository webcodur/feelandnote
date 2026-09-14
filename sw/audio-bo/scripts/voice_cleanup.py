"""Remove inhale breaths and tidy head, mid and tail silences in synthesized speech.

This is the only implementation. Every TTS path (reading and dialogue batches, web-bo previews,
Remotion CLI synthesis, audio-bo synthesis) cleans its output where the audio first appears.
Node callers go through packages/shared/src/bo/voice-cleanup.ts; Python callers import clean_file.
Rules and listening evidence: docs/project/production/voice-cleanup.md.

Speech is excluded first and only the quiet remainder is touched, so dialogue cannot be cut.
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
import subprocess
from pathlib import Path

import numpy as np

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
FADE = 0.008
FALLBACK_TONE_RMS = 0.0005  # when a file has too little quiet audio to sample

# Trimming — never touches frames at or above VOICE_RMS plus TRIM_GUARD
VOICE_RMS = 0.005
TRIM_GUARD = 0.040
HEAD_KEEP, TAIL_KEEP = 0.08, 0.25

# Pause ceiling -> target, set by listening (reading: between sentences, dialogue: at commas)
PROFILES = {"reading": (1.20, 1.05), "dialogue": (1.10, 0.95)}


def sample_rate_of(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "a:0", "-show_entries", "stream=sample_rate",
                          "-of", "csv=p=0", path], capture_output=True, text=True, check=True).stdout.strip()
    return int(out)


def decode(path):
    rate = sample_rate_of(path)
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-f", "s16le", "-ac", "1", "-ar", str(rate), "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0, rate


def encode(samples, rate, path):
    codec = ["-c:a", "pcm_s16le"] if path.lower().endswith(".wav") else ["-codec:a", "libmp3lame", "-b:a", MP3_BITRATE]
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "s16le", "-ac", "1", "-ar", str(rate),
                    "-i", "-", *codec, "-ar", str(rate), path],
                   input=(np.clip(samples, -1, 1) * 32767).astype(np.int16).tobytes(), check=True)


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
    return spans


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


def clean_file(source, target, profile):
    """Clean one file into target and return its summary; target may equal source."""
    pause_max, pause_target = PROFILES[profile]
    samples, rate = decode(str(source))
    spans = breath_spans(samples, rate)
    cleaned = trim(fill_breaths(samples, rate, spans), rate, pause_max, pause_target)
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
