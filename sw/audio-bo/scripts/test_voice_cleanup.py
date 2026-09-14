import os
import tempfile
import unittest
from pathlib import Path

import numpy as np

import voice_cleanup as vc

RATE = 24000


def room(seconds, rms=0.0004, seed=1):
    return np.random.default_rng(seed).normal(0, rms, int(seconds * RATE)).astype(np.float32)


def place(signal, start, part):
    a = int(start * RATE)
    signal[a:a + part.size] += part


def tone(seconds, amplitude=0.3):
    t = np.arange(int(seconds * RATE)) / RATE
    return (amplitude * np.sin(2 * np.pi * 200 * t)).astype(np.float32)


class VoiceCleanupTest(unittest.TestCase):
    def test_fills_inhale_between_words_without_touching_speech(self):
        signal = room(3.0)
        place(signal, 0.5, tone(0.5))
        place(signal, 1.6, tone(0.5))
        place(signal, 1.2, np.random.default_rng(2).normal(0, 0.004, int(0.25 * RATE)).astype(np.float32))
        spans = vc.breath_spans(signal, RATE)
        self.assertEqual(len(spans), 1)
        self.assertLess(abs(spans[0][0] - 1.2), 0.08)
        filled = vc.fill_breaths(signal, RATE, spans)
        speech = slice(int(0.55 * RATE), int(0.95 * RATE))
        np.testing.assert_array_equal(filled[speech], signal[speech])
        breath = slice(int(1.25 * RATE), int(1.4 * RATE))
        self.assertLess(np.sqrt((filled[breath] ** 2).mean()), vc.BREATH_FLOOR_RMS)

    def test_keeps_a_decaying_word_ending(self):
        signal = room(2.0)
        place(signal, 0.5, tone(0.5))
        t = np.arange(int(0.4 * RATE)) / RATE
        place(signal, 1.0, (0.04 * np.exp(-t / 0.12) * np.sin(2 * np.pi * 200 * t)).astype(np.float32))
        self.assertEqual(vc.breath_spans(signal, RATE), [])

    def test_shortens_long_pause_and_edges_but_keeps_every_voiced_sample(self):
        signal = room(6.0)
        place(signal, 1.0, tone(0.5))
        place(signal, 4.0, tone(0.5))
        trimmed = vc.trim(signal, RATE, *vc.PROFILES["reading"])
        self.assertEqual(int((np.abs(trimmed) > 0.2).sum()), int((np.abs(signal) > 0.2).sum()))
        self.assertLess(trimmed.size / RATE, 2.8)
        self.assertGreater(trimmed.size / RATE, 2.2)

    def test_clean_file_rewrites_in_place_and_reports_length(self):
        signal = room(4.0)
        place(signal, 1.0, tone(0.5))
        place(signal, 3.0, tone(0.5))
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "voice.wav"
            vc.encode(signal, RATE, str(path))
            summary = vc.clean_file(path, path, "dialogue")
            self.assertLess(summary["seconds"], summary["before"])
            self.assertEqual(summary["rate"], RATE)
            self.assertEqual(os.listdir(directory), ["voice.wav"])
            decoded, rate = vc.decode(str(path))
            self.assertAlmostEqual(decoded.size / rate, summary["seconds"], delta=0.01)


if __name__ == "__main__":
    unittest.main()
