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
    def test_quiet_breath_adjoining_word_onset_is_not_rejected_with_the_word(self):
        signal = room(2.5)
        place(signal, .5, tone(.4))
        place(signal, 1., np.random.default_rng(20).normal(0, .002, int(.28 * RATE)).astype(np.float32))
        place(signal, 1.28, tone(.5, .025))
        place(signal, 1.78, tone(.4))
        filled = vc.fill_breaths(signal, RATE, vc.breath_spans(signal, RATE))
        core = slice(int(1.05 * RATE), int(1.16 * RATE))
        self.assertLess(np.sqrt(np.mean(filled[core] ** 2)), vc.BREATH_FLOOR_RMS)
        np.testing.assert_array_equal(filled[int(1.32 * RATE):int(1.75 * RATE)],
                                      signal[int(1.32 * RATE):int(1.75 * RATE)])

    def test_final_mp3_gap_verification_at_both_service_rates(self):
        for rate in (24000, 44100):
            signal = np.random.default_rng(10).normal(0, .0004, int(3.2 * rate)).astype(np.float32)
            for start in (.2, 2.5):
                t = np.arange(int(.4 * rate)) / rate
                signal[int(start * rate):int(start * rate) + t.size] += .25 * np.sin(2 * np.pi * 200 * t)
            boundary = {"start": .6, "end": 2.5, "kind": "paragraph"}
            with tempfile.TemporaryDirectory() as directory:
                result = vc.encode_narration(signal, rate, [boundary], Path(directory)/"fixed.mp3")
                decoded, out_rate = vc.decode(result["output"])
                self.assertEqual(out_rate, rate)
                self.assertAlmostEqual(result["duration"], decoded.size / rate, places=5)
                measured = result["pauses"][0]
                self.assertAlmostEqual(measured["end"]-measured["start"], vc.PARAGRAPH_GAP_SECONDS, delta=.035)

    def test_normalizes_short_sentence_and_long_paragraph_without_changing_speech(self):
        signal = room(5)
        place(signal, 0.2, tone(0.5))
        place(signal, 1.0, tone(0.5))
        place(signal, 4.2, tone(0.5))
        edits, pauses, unresolved = vc.boundary_pause_edits(signal, RATE, [
            {"start": 0.7, "end": 1.0, "kind": "sentence"},
            {"start": 1.5, "end": 4.2, "kind": "paragraph"}])
        self.assertEqual(unresolved, [])
        self.assertEqual([e["targetGap"] for e in edits], [0.9, 1.6])
        fixed = vc.apply_pause_edits(signal, RATE, edits)
        for start in (0.25, 1.05, 4.25):
            mapped = vc.retime_timestamp(start, RATE, edits)
            a, b = round(start * RATE), round(mapped * RATE)
            np.testing.assert_array_equal(signal[a:a+6000], fixed[b:b+6000])
        again, _, unresolved = vc.boundary_pause_edits(fixed, RATE, [
            {"start": vc.retime_timestamp(b["start"], RATE, edits),
             "end": vc.retime_timestamp(b["end"], RATE, edits), "kind": b["kind"]}
            for b in [{"start": .7, "end": 1., "kind": "sentence"},
                      {"start": 1.5, "end": 4.2, "kind": "paragraph"}]])
        self.assertEqual((again, unresolved), ([], []))

    def test_never_infers_paragraph_from_long_gap(self):
        signal = room(5)
        place(signal, .2, tone(.5))
        place(signal, 4.2, tone(.5))
        edits, _, _ = vc.boundary_pause_edits(signal, RATE, [{"start": .7, "end": 4.2, "kind": "sentence"}])
        self.assertEqual(edits[0]["targetGap"], vc.SENTENCE_GAP_SECONDS)

    def test_continuous_speech_is_held_instead_of_cut(self):
        edits, _, unresolved = vc.boundary_pause_edits(tone(3), RATE,
            [{"start": 1., "end": 1.01, "kind": "sentence"}])
        self.assertEqual(edits, [])
        self.assertEqual(len(unresolved), 1)

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
        trimmed = vc.trim(signal, RATE, *vc.PROFILES["dialogue"])
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
