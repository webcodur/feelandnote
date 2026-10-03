"""Resource admission for local Whisper jobs; no extra monitoring dependency."""
from __future__ import annotations

from contextlib import contextmanager
import ctypes
from dataclasses import asdict, dataclass
import gc
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import time

GIB = 1024 ** 3
RAM_MODEL_GIB = 3
RAM_RESERVE_GIB = 3
RAM_RESERVE_FRACTION = 0.15
GPU_FREE_MIB = 3072
GPU_MAX_PERCENT = 70
CPU_MAX_PERCENT = 70
CPU_THREADS_MAX = 4
WAIT_SECONDS = 60
POLL_SECONDS = 2
LOCK_PATH = Path(tempfile.gettempdir()) / "feelandnote-whisper.lock"


class ResourceBusy(RuntimeError):
    """Defer this job without marking its audio defective."""


@dataclass(frozen=True)
class Resources:
    cpu_count: int
    cpu_percent: float
    ram_available_gib: float
    ram_total_gib: float
    gpus: tuple[tuple[int, int, int], ...] = ()  # index, free MiB, utilization %


@dataclass(frozen=True)
class Plan:
    device: str
    device_index: int
    cpu_threads: int


def snapshot() -> Resources:
    if os.name == "nt":
        from ctypes import wintypes

        class MemoryStatus(ctypes.Structure):
            _fields_ = [("length", wintypes.DWORD), ("load", wintypes.DWORD),
                        *[(name, ctypes.c_ulonglong) for name in
                          ("total", "available", "page_total", "page_available",
                           "virtual_total", "virtual_available", "extended")]]

        kernel = ctypes.windll.kernel32
        memory = MemoryStatus()
        memory.length = ctypes.sizeof(memory)
        if not kernel.GlobalMemoryStatusEx(ctypes.byref(memory)):
            raise ResourceBusy("Cannot measure available RAM; Whisper was not started")

        def cpu_times():
            values = [wintypes.FILETIME() for _ in range(3)]
            if not kernel.GetSystemTimes(*(ctypes.byref(value) for value in values)):
                raise ResourceBusy("Cannot measure CPU load; Whisper was not started")
            return [value.dwLowDateTime + (value.dwHighDateTime << 32) for value in values]

        before = cpu_times()
        time.sleep(0.25)
        after = cpu_times()
        idle, kernel_time, user = [end - start for start, end in zip(before, after)]
        cpu = 100 * (1 - idle / max(1, kernel_time + user))
        available, total = memory.available / GIB, memory.total / GIB
    else:
        try:
            memory = dict(line.split(":", 1) for line in Path("/proc/meminfo").read_text().splitlines())
            available = int(memory["MemAvailable"].split()[0]) * 1024 / GIB
            total = int(memory["MemTotal"].split()[0]) * 1024 / GIB

            def cpu_times():
                return [int(value) for value in Path("/proc/stat").read_text().splitlines()[0].split()[1:9]]

            before = cpu_times()
            time.sleep(0.25)
            delta = [end - start for start, end in zip(before, cpu_times())]
            cpu = 100 * (1 - (delta[3] + delta[4]) / max(1, sum(delta)))
        except (OSError, KeyError, ValueError) as error:
            raise ResourceBusy("Cannot measure CPU/RAM; Whisper was not started") from error
    gpus = []
    try:
        result = subprocess.run(
            ["nvidia-smi", "--query-gpu=index,memory.free,utilization.gpu", "--format=csv,noheader,nounits"],
            capture_output=True, text=True, timeout=3,
            creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
        )
        if result.returncode == 0:
            for line in result.stdout.splitlines():
                try:
                    gpus.append(tuple(int(value.strip()) for value in line.split(",")))
                except ValueError:
                    continue
    except (OSError, subprocess.TimeoutExpired):
        pass
    return Resources(os.cpu_count() or 1, max(0, min(100, cpu)), available, total, tuple(gpus))


def choose_plan(resources: Resources, device: str = "auto") -> Plan:
    reserve = max(RAM_RESERVE_GIB, resources.ram_total_gib * RAM_RESERVE_FRACTION)
    if resources.ram_available_gib < reserve + RAM_MODEL_GIB:
        raise ResourceBusy(f"RAM headroom too low ({resources.ram_available_gib:.1f} GiB available)")
    threads = max(1, min(CPU_THREADS_MAX, int(resources.cpu_count * (1 - resources.cpu_percent / 100) / 4)))
    if device in ("auto", "cuda"):
        eligible = [gpu for gpu in resources.gpus
                    if len(gpu) == 3 and gpu[1] >= GPU_FREE_MIB and gpu[2] <= GPU_MAX_PERCENT]
        if eligible and resources.cpu_percent <= CPU_MAX_PERCENT:
            gpu = max(eligible, key=lambda value: value[1])
            return Plan("cuda", gpu[0], threads)
        if device == "cuda":
            raise ResourceBusy("Requested GPU has insufficient headroom; Whisper was deferred")
    if resources.cpu_percent > CPU_MAX_PERCENT:
        raise ResourceBusy(f"CPU is busy ({resources.cpu_percent:.0f}%)")
    return Plan("cpu", 0, threads)


@contextmanager
def inference_lock(path: Path = LOCK_PATH):
    """OS lock releases automatically even when the owning process crashes."""
    with path.open("a+b") as handle:
        if handle.seek(0, 2) == 0:
            handle.write(b"0")
            handle.flush()
        handle.seek(0)
        try:
            if os.name == "nt":
                import msvcrt
                msvcrt.locking(handle.fileno(), msvcrt.LK_NBLCK, 1)
            else:
                import fcntl
                fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except OSError as error:
            raise ResourceBusy("Another Feel&Note Whisper job is running") from error
        try:
            yield
        finally:
            handle.seek(0)
            if os.name == "nt":
                msvcrt.locking(handle.fileno(), msvcrt.LK_UNLCK, 1)
            else:
                fcntl.flock(handle, fcntl.LOCK_UN)


_priority_lowered = False


def lower_priority():
    global _priority_lowered
    if _priority_lowered:
        return
    if os.name == "nt":
        kernel = ctypes.windll.kernel32
        kernel.GetCurrentProcess.restype = ctypes.c_void_p
        kernel.SetPriorityClass.argtypes = (ctypes.c_void_p, ctypes.c_ulong)
        kernel.SetPriorityClass(kernel.GetCurrentProcess(), 0x4000)  # BELOW_NORMAL_PRIORITY_CLASS
    else:
        try:
            os.nice(5)
        except OSError:
            pass
    _priority_lowered = True


class ResourceAwareWhisperModel:
    """Same transcribe interface; load only during a serialized, admitted job.

    Preserve the caller's model/beam/precision. Release the native model after
    consuming (or closing) the segment iterator so idle QC workers hold no VRAM.
    """

    def __init__(self, model_size_or_path, device="auto", *, alignment_guard=None, **kwargs):
        self.model_name = model_size_or_path
        self.device = device
        self.kwargs = kwargs
        self.alignment_guard = alignment_guard

    def transcribe(self, *args, **kwargs):
        deadline = time.monotonic() + WAIT_SECONDS
        while True:
            lock = inference_lock()
            try:
                lock.__enter__()
            except ResourceBusy as error:
                reason = error
            else:
                try:
                    resources = snapshot()
                    plan = choose_plan(resources, self.device)
                except ResourceBusy as error:
                    lock.__exit__(None, None, None)
                    reason = error
                except BaseException:
                    lock.__exit__(*sys.exc_info())
                    raise
                else:
                    break
            if time.monotonic() >= deadline:
                raise ResourceBusy(f"Whisper deferred after {WAIT_SECONDS}s: {reason}")
            print(f"[whisper] waiting: {reason}", file=sys.stderr, flush=True)
            time.sleep(POLL_SECONDS)
        model = None
        try:
            from faster_whisper import WhisperModel
            if self.alignment_guard:
                WhisperModel = type("GuardedWhisper", (self.alignment_guard, WhisperModel), {})
            lower_priority()
            options = {**self.kwargs, "device": plan.device, "device_index": plan.device_index,
                       "cpu_threads": plan.cpu_threads, "num_workers": 1}
            print(f"[whisper] {plan.device}:{plan.device_index}, CPU threads={plan.cpu_threads}, "
                  f"CPU={resources.cpu_percent:.0f}%, RAM free={resources.ram_available_gib:.1f} GiB",
                  file=sys.stderr, flush=True)
            model = WhisperModel(self.model_name, **options)
            segments, info = model.transcribe(*args, **kwargs)
        except BaseException:
            try:
                if model is not None:
                    model.model.unload_model()
            finally:
                lock.__exit__(*sys.exc_info())
            raise
        return ManagedSegments(segments, model, lock), info


class ManagedSegments:
    """Free native memory and the admission lock, including an unstarted iterator."""

    def __init__(self, segments, model, lock):
        self.segments, self.model, self.lock = iter(segments), model, lock
        self.closed = False

    def __iter__(self):
        return self

    def __next__(self):
        if self.closed:
            raise StopIteration
        try:
            return next(self.segments)
        except BaseException:
            self.close()
            raise

    def close(self):
        if self.closed:
            return
        self.closed = True
        try:
            try:
                if hasattr(self.segments, "close"):
                    self.segments.close()
            finally:
                self.model.model.unload_model()
        finally:
            self.segments = self.model = None
            gc.collect()
            self.lock.__exit__(None, None, None)

    def __del__(self):
        try:
            self.close()
        except Exception:
            pass


if __name__ == "__main__":
    measured = snapshot()
    try:
        print(json.dumps({"resources": asdict(measured), "plan": asdict(choose_plan(measured))}, indent=2))
    except ResourceBusy as error:
        print(json.dumps({"resources": asdict(measured), "deferred": str(error)}, indent=2))
