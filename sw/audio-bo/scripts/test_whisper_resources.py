"""Resource-pressure and native-model lifetime regressions without loading Whisper."""
from contextlib import contextmanager
import subprocess
import sys
import tempfile
import types
import unittest
import importlib.util
import io
import json
from pathlib import Path
from unittest.mock import patch

import whisper_resources as resources


class WhisperResourcesTest(unittest.TestCase):
    def roomy(self, **overrides):
        values = dict(cpu_count=24, cpu_percent=20, ram_available_gib=16,
                      ram_total_gib=32, gpus=((0, 10000, 5),))
        return resources.Resources(**{**values, **overrides})

    def test_roomy_gpu_and_cpu_budget(self):
        plan = resources.choose_plan(self.roomy())
        self.assertEqual(plan.device, "cuda")
        self.assertEqual(plan.cpu_threads, 4)

    def test_busy_or_missing_gpu_falls_back_to_limited_cpu(self):
        for gpus in ((), ((0, 1024, 5),), ((0, 10000, 90),)):
            plan = resources.choose_plan(self.roomy(gpus=gpus))
            self.assertEqual(plan.device, "cpu")
            self.assertLessEqual(plan.cpu_threads, 4)

    def test_busy_cpu_or_low_ram_never_admitted(self):
        for overrides in (dict(cpu_percent=95), dict(ram_available_gib=2)):
            with self.assertRaises(resources.ResourceBusy):
                resources.choose_plan(self.roomy(**overrides))

    def test_explicit_gpu_waits_instead_of_forcing_a_busy_device(self):
        with self.assertRaises(resources.ResourceBusy):
            resources.choose_plan(self.roomy(gpus=((0, 10000, 95),)), "cuda")
        self.assertEqual(resources.choose_plan(self.roomy(), "cpu").device, "cpu")

    def test_small_machine_uses_one_thread(self):
        self.assertEqual(resources.choose_plan(self.roomy(cpu_count=2)).cpu_threads, 1)

    def test_lock_serializes_processes_and_releases(self):
        with tempfile.TemporaryDirectory() as folder:
            lock_path = Path(folder) / "whisper.lock"
            code = ("import sys; from pathlib import Path; "
                    f"sys.path.insert(0, {str(Path(resources.__file__).parent)!r}); "
                    "from whisper_resources import inference_lock; "
                    f"lock=inference_lock(Path({str(lock_path)!r})); lock.__enter__(); lock.__exit__(None,None,None)")
            with resources.inference_lock(lock_path):
                child = subprocess.run([sys.executable, "-c", code], capture_output=True, text=True)
                self.assertNotEqual(child.returncode, 0)
                self.assertIn("Another Feel&Note Whisper job", child.stderr)
            child = subprocess.run([sys.executable, "-c", code], capture_output=True, text=True)
            self.assertEqual(child.returncode, 0, child.stderr)

    def run_native(self, failure=None, close_early=False, resources_override=None):
        events, native_options = [], {}

        @contextmanager
        def lock():
            events.append("lock")
            try:
                yield
            finally:
                events.append("unlock")

        class FakeWhisper:
            def __init__(self, *args, **kwargs):
                native_options.update(kwargs)
                events.append("load")
                self.model = types.SimpleNamespace(unload_model=lambda: events.append("unload"))

            def transcribe(self, *args, **kwargs):
                if failure == "setup":
                    raise ValueError("setup failed")

                def stream():
                    if failure == "inference":
                        raise ValueError("inference failed")
                    yield "segment"
                return stream(), "info"

        fake_module = types.ModuleType("faster_whisper")
        fake_module.WhisperModel = FakeWhisper
        with patch.dict(sys.modules, {"faster_whisper": fake_module}), \
                patch.object(resources, "snapshot", return_value=resources_override or self.roomy()), \
                patch.object(resources, "inference_lock", lock), \
                patch.object(resources, "lower_priority"), \
                patch.object(resources, "WAIT_SECONDS", 0):
            model = resources.ResourceAwareWhisperModel("large-v3-turbo", compute_type="int8")
            self.assertEqual(events, [])  # construction never allocates the model
            if resources_override:
                with self.assertRaises(resources.ResourceBusy):
                    model.transcribe("audio")
            elif failure:
                with self.assertRaisesRegex(ValueError, "failed"):
                    segments, _ = model.transcribe("audio")
                    list(segments)
            else:
                segments, info = model.transcribe("audio", beam_size=5)
                self.assertEqual(info, "info")
                self.assertNotIn("unlock", events)  # native generator is still pending
                if close_early:
                    segments.close()
                else:
                    self.assertEqual(list(segments), ["segment"])
                self.assertIsNone(segments.model)
        return events, native_options

    def test_normal_exhaustion_and_unstarted_close_free_model(self):
        for close_early in (False, True):
            events, options = self.run_native(close_early=close_early)
            self.assertEqual(events, ["lock", "load", "unload", "unlock"])
            self.assertEqual(options["cpu_threads"], 4)
            self.assertEqual(options["num_workers"], 1)
            self.assertEqual(options["compute_type"], "int8")

    def test_setup_and_inference_failure_release_lock_and_memory(self):
        for failure in ("setup", "inference"):
            events, _ = self.run_native(failure=failure)
            self.assertEqual(events, ["lock", "load", "unload", "unlock"])

    def test_pressure_defers_without_loading_native_model(self):
        events, options = self.run_native(resources_override=self.roomy(ram_available_gib=1))
        self.assertEqual(events, ["lock", "unlock"])
        self.assertEqual(options, {})

    def test_worker_resource_deferral_preserves_audio(self):
        spec = importlib.util.spec_from_file_location("reading_qc", Path(__file__).with_name("celeb-reading-voice-qc.py"))
        qc = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(qc)
        output = io.StringIO()
        with patch.object(sys, "argv", ["qc", "--worker"]), \
                patch.object(sys, "stdin", io.StringIO('{"id":"job"}\n')), \
                patch.object(sys, "stdout", output), \
                patch.object(qc.NarrationQC, "check", side_effect=resources.ResourceBusy("CPU busy")):
            qc.main()
        result = json.loads(output.getvalue())
        self.assertEqual(result["status"], "deferred")
        self.assertEqual(result["flags"], ["resource-busy"])
        self.assertEqual(result["id"], "job")


if __name__ == "__main__":
    unittest.main()
