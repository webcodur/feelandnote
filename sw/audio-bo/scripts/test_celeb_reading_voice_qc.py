"""Regression checks for source omissions and conservative pause trimming."""
import importlib.util
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import numpy as np

spec = importlib.util.spec_from_file_location("reading_qc", Path(__file__).with_name("celeb-reading-voice-qc.py"))
qc = importlib.util.module_from_spec(spec)
spec.loader.exec_module(qc)


class ReadingQCTest(unittest.TestCase):
    def test_one_frame_alignment_never_reaches_native_library(self):
        class NativeAlignment:
            def find_alignment(self, *args, **kwargs):
                raise AssertionError("Unsafe alignment reached native library")

        class GuardedAlignment(qc.AlignmentFrameGuard, NativeAlignment):
            pass

        with self.assertRaisesRegex(ValueError, "insufficient-alignment-frames: 1"):
            GuardedAlignment().find_alignment(None, [[1, 2, 3]], None, 1)

    def test_valid_alignment_preserves_native_call(self):
        class NativeAlignment:
            def find_alignment(self, tokenizer, tokens, encoder, frames, median_filter_width=7):
                return {"frames": frames, "tokens": tokens}

        class GuardedAlignment(qc.AlignmentFrameGuard, NativeAlignment):
            pass

        self.assertEqual(GuardedAlignment().find_alignment(None, [[1, 2, 3]], None, 3000),
                         {"frames": 3000, "tokens": [[1, 2, 3]]})

    def test_missing_tail_fails_even_when_global_match_passes(self):
        text = "The historian studied ancient cities and their citizens. " * 8 + "She died in Paris."
        metrics, flags, _ = qc.source_alignment(text, text[:-18], "en")
        self.assertGreater(metrics["match"], qc.MIN_MATCH)
        self.assertIn("missing-source-tail", flags)

    def test_missing_korean_head_fails(self):
        text = "그는 서울에서 태어났다. 이후 부산에서 공부하며 여러 작품을 썼다."
        _, flags, _ = qc.source_alignment(text, text[15:], "ko")
        self.assertIn("missing-source-head", flags)

    def test_middle_omission_and_extra_speech_fail(self):
        source = "The writer returned home. She founded a school for children. Her books became famous."
        _, flags, _ = qc.source_alignment(source, "The writer returned home. Her books became famous.", "en")
        self.assertIn("source-content-gap", flags)
        _, flags, _ = qc.source_alignment(source, source + " Thank you for listening.", "en")
        self.assertIn("unexpected-spoken-tail", flags)

    def test_loanword_transliteration_is_not_a_content_error(self):
        # 3.8 TTS는 원문의 영어 단어를 영어 발음으로 읽고 Whisper는 한글로 받아쓴다 —
        # 라틴↔한글 단어 교환은 표기 차이라 내용 플래그를 달지 않는다.
        source = "그곳에서 이미지를 다루는 Vision Transformer와 사진을 짝짓는 SigLIP 논문을 냈다."
        heard = "그곳에서 이미지를 다루는 비전 트랜스포머와 사진을 짝짓는 시그릿 논문을 냈다"
        metrics, flags, _ = qc.source_alignment(source, heard, "ko")
        self.assertNotIn("source-content-gap", flags)
        self.assertNotIn("unexpected-spoken-content", flags)
        self.assertNotIn("low-match", flags)
        marked = [d for d in metrics["differences"] if d.get("transliteration")]
        self.assertTrue(marked)
        # 반대 방향 — 원문 한글 차용어를 Whisper가 라틴으로 받아쓴 경우도 같다.
        source2 = "그는 브이소스 채널을 만들었다. 이후 활동을 넓혔다."
        heard2 = "그는 vsauce 채널을 만들었다. 이후 활동을 넓혔다"
        _, flags2, _ = qc.source_alignment(source2, heard2, "ko")
        self.assertEqual(flags2, [])

    def test_real_omission_and_invented_tail_still_fail(self):
        # 실제 누락·지어낸 꼬리·혼합 문자열 대체는 차용어 완화와 무관하게 불합격이다.
        source = "그는 영국에서 태어났다. 이후 미국으로 건너가 활동했다. 말년에는 고향으로 돌아갔다."
        _, flags, _ = qc.source_alignment(source, "그는 영국에서 태어났다. 말년에는 고향으로 돌아갔다.", "ko")
        self.assertIn("source-content-gap", flags)
        _, flags, _ = qc.source_alignment(source, source + " 다음 영상에서 만나요.", "ko")
        self.assertIn("unexpected-spoken-tail", flags)
        # 원문의 한글+영어 혼합 구간(괄호 병기)을 한글로 대체하면 진짜 누락이다.
        _, flags, _ = qc.source_alignment(
            "닉쿤(Nichkhun Buck Horvejkul)은 미국에서 태어난 가수이다.", "니쿠는 미국에서 태어난 가수이다", "ko")
        self.assertIn("source-content-gap", flags)

    def test_word_spacing_and_punctuation_do_not_fail(self):
        for source, heard, locale in [("그는 고향으로 돌아갔다.", "그 는 고향으로 돌아갔다", "ko"),
                                       ("He went home.", "he went home!", "en")]:
            self.assertEqual(qc.source_alignment(source, heard, locale)[1], [])

    def pause(self, samples, text="Home. Away.", probability=0.99):
        _, _, mapping = qc.source_alignment(text, "Home. Away.", "en")
        words = [{"word": "Home.", "start": 0.1, "end": 0.5, "probability": probability},
                 {"word": " Away.", "start": 1.9, "end": 2.3, "probability": probability}]
        return qc.pause_repairs(samples, words, text, mapping, "en")

    def test_only_silent_confident_sentence_pause_is_repaired(self):
        samples = np.zeros(3 * qc.SAMPLE_RATE, dtype=np.float32)
        repairs, flags, warnings = self.pause(samples)
        self.assertEqual(flags, [])
        self.assertEqual(warnings, [])
        self.assertEqual(len(repairs), 1)
        samples[int(1.0 * qc.SAMPLE_RATE):int(1.2 * qc.SAMPLE_RATE)] = .04
        repairs, flags, warnings = self.pause(samples)
        self.assertEqual(repairs, [])
        self.assertEqual(flags, [])
        self.assertIn("non-silent-sentence-pause", warnings)
        repairs, flags, warnings = self.pause(np.zeros_like(samples), probability=.4)
        self.assertEqual(repairs, [])
        self.assertIn("uncertain-sentence-boundary", flags)
        self.assertEqual(warnings, [])

    def test_unpunctuated_pause_cannot_be_cut(self):
        repairs, _, _ = self.pause(np.zeros(2 * qc.SAMPLE_RATE), text="Home away")
        self.assertEqual(repairs, [])

    def test_sentence_pause_warning_preserves_audio_but_does_not_hide_omission(self):
        samples = .04 * np.sin(2 * np.pi * 200 * np.arange(int(2.5 * qc.SAMPLE_RATE)) / qc.SAMPLE_RATE)
        words = [{"word": "Home.", "start": 0.1, "end": 0.5, "probability": .99},
                 {"word": " Away.", "start": 1.9, "end": 2.3, "probability": .99}]
        checker = qc.NarrationQC()
        with tempfile.TemporaryDirectory() as folder:
            audio = Path(folder) / "original.wav"
            audio.write_bytes(b"unchanged")
            with patch.object(qc, "decode_audio", return_value=samples), \
                    patch.object(checker, "transcribe", return_value=("Home. Away.", words)):
                result = checker.check({"audio": str(audio), "locale": "en", "text": "Home. Away."})
                self.assertTrue(result["ok"])
                self.assertEqual(result["audio"], str(audio.resolve()))
                self.assertEqual(result["repairs"], [])
                self.assertEqual(result["warnings"], ["non-silent-sentence-pause"])
                result = checker.check({"audio": str(audio), "locale": "en",
                                        "text": "Home. Away. They returned to the city."})
                self.assertFalse(result["ok"])
                self.assertIn("missing-source-tail", result["flags"])
                self.assertEqual(result["warnings"], ["non-silent-sentence-pause"])
            self.assertEqual(audio.read_bytes(), b"unchanged")

    def test_long_mid_sentence_pause_remains_blocking(self):
        words = [{"word": "Home", "start": .1, "end": .5, "probability": .99},
                 {"word": " away", "start": 2, "end": 2.4, "probability": .99}]
        _, _, mapping = qc.source_alignment("Home away", "Home away", "en")
        repairs, flags, warnings = qc.pause_repairs(np.zeros(3 * qc.SAMPLE_RATE), words, "Home away", mapping, "en")
        self.assertEqual(repairs, [])
        self.assertIn("long-mid-sentence-pause", flags)
        self.assertEqual(warnings, [])

    def test_abbreviations_and_initials_are_not_sentence_boundaries(self):
        text = "Dr. Smith met J. R. Tolkien. They left."
        self.assertEqual(qc.punctuation_offsets(text, "en"),
                         {len(qc.normalize("Dr. Smith met J. R. Tolkien")), len(qc.normalize(text))})

    def test_clipping_and_jump_are_independent(self):
        samples = np.zeros(qc.SAMPLE_RATE, dtype=np.float32)
        samples[100:105] = 1
        _, flags = qc.acoustic_metrics(samples)
        self.assertIn("clipping", flags)
        self.assertIn("sample-jump", flags)

    def test_loud_high_frequency_audio_is_not_an_isolated_click(self):
        samples = .8 * np.sin(2 * np.pi * 8000 * np.arange(qc.SAMPLE_RATE) / qc.SAMPLE_RATE)
        metrics, flags = qc.acoustic_metrics(samples)
        self.assertGreater(metrics["maxSampleJump"], qc.MAX_SAMPLE_JUMP)
        self.assertNotIn("sample-jump", flags)

    def test_original_output_cannot_be_overwritten(self):
        with tempfile.TemporaryDirectory() as folder:
            output = Path(folder) / "existing.wav"
            output.write_bytes(b"original")
            with self.assertRaises(FileExistsError):
                qc.write_repaired(np.zeros(100), [], output)
            self.assertEqual(output.read_bytes(), b"original")


if __name__ == "__main__":
    unittest.main()
