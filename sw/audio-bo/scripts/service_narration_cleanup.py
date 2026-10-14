"""CPU-only service narration repair using source-bound sentence timings.

JSON-lines worker for scripts/voice/narration-cleanup-batch.mjs. No TTS or ASR.
Original samples outside breath spans and quiet pause cores remain unchanged.
"""
import json
import os
import sys
import time
from pathlib import Path

os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")
from voice_cleanup import (decode, breath_spans, fill_breaths,
    retime_timestamp, NARRATION_POLICY, encode_narration, boundary_pause_edits)

if os.name == "nt":
    import ctypes
    kernel = ctypes.windll.kernel32
    kernel.GetCurrentProcess.restype = ctypes.c_void_p
    kernel.SetPriorityClass.argtypes = (ctypes.c_void_p, ctypes.c_ulong)
    if not kernel.SetPriorityClass(kernel.GetCurrentProcess(), 0x4000):
        raise ctypes.WinError()


def process(request):
    source, rate = decode(request["audio"])
    timing = request["timing"]
    if abs(source.size / rate - timing["duration"]) > .15:
        raise ValueError("TIMING_DURATION_MISMATCH")
    previous = 0
    for segment in timing["segments"]:
        if not (previous <= segment["start"] < segment["end"] <= source.size / rate + .05):
            raise ValueError("INVALID_SENTENCE_TIMES")
        previous = segment["end"]
    if request.get("verify_only"):
        edits, pauses, unresolved = boundary_pause_edits(source, rate, request["boundaries"])
        if edits or unresolved:
            raise ValueError("FINAL_SOURCE_BOUNDARY_SPACING_UNRESOLVED")
        return {"ok": True, "pauses": pauses}
    spans = breath_spans(source, rate)
    filled = fill_breaths(source, rate, spans)
    final = encode_narration(filled, rate, request["boundaries"], request["output"])
    edits, final_pauses = final["edits"], final["pauses"]
    target = Path(final["output"])
    result = {**timing, "duration": round(final["duration"], 6),
        "segments": [{**segment, "start": round(retime_timestamp(segment["start"], rate, edits), 6),
                      "end": round(retime_timestamp(segment["end"], rate, edits), 6)}
                     for segment in timing["segments"]]}
    return {"ok": True, "output": str(target), "rate": rate, "timing": result, "breaths": len(spans),
        "breathSpans": spans, "edits": edits, "pauses": final_pauses,
        "policy": NARRATION_POLICY, "before": source.size / rate, "after": final["duration"],
        "verification": "preserved-pcm-and-encoded-spacing"}


if __name__ == "__main__":
    for stream in (sys.stdin, sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8")
    for line in sys.stdin:
        started = time.monotonic()
        try:
            request = json.loads(line)
            result = process(request)
        except Exception as error:
            result = {"ok": False, "error": str(error)}
        result["seconds"] = round(time.monotonic() - started, 3)
        print(json.dumps(result, ensure_ascii=False), flush=True)
