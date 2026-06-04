"""밀리의 서재 캡쳐 — 브라우저 조작 화면(로컬 서버).

실행:
  pip install -r requirements.txt
  python app.py
  → 브라우저에서 http://127.0.0.1:5000 자동 오픈

캡쳐·페이지 넘김 같은 화면 조작은 이 서버(파이썬)가 직접 한다.
브라우저 화면은 설정·시작·중단·미리보기만 담당한다.
"""

from __future__ import annotations

import threading
import time
import webbrowser
from pathlib import Path

from flask import Flask, jsonify, request, send_file, send_from_directory

import core

app = Flask(__name__, static_folder=None)
ROOT = Path(__file__).parent
WEB = ROOT / "web"

# 캡쳐는 한 번에 하나만. 전역 진행 상태를 폴링으로 노출한다.
progress = core.CaptureProgress()
_worker: threading.Thread | None = None


# ─────────────────────────────────────────── 화면

@app.get("/")
def index():
    return send_file(WEB / "index.html")


# ─────────────────────────────────────────── 설정

@app.get("/api/config")
def get_config():
    try:
        cfg = core.load_config()
    except FileNotFoundError:
        # config.json 없으면 example로 초기값
        cfg = core.load_config(ROOT / "config.example.json")
    return jsonify(cfg)


@app.post("/api/config")
def post_config():
    cfg = request.get_json(force=True)
    cfg.pop("_comment", None)
    core.save_config(cfg)
    return jsonify({"ok": True})


@app.get("/api/monitors")
def get_monitors():
    return jsonify(core.list_monitors())


# ─────────────────────────────────────────── 영역 좌표 측정

@app.post("/api/region/point")
def region_point():
    """delay초 뒤 마우스 위치를 읽어 반환. 브라우저는 OS 마우스를 못 읽으므로 서버가 측정한다."""
    delay = float(request.args.get("delay", 3))
    time.sleep(delay)
    x, y = core.mouse_position()
    return jsonify({"x": x, "y": y})


# ─────────────────────────────────────────── 캡쳐 제어

@app.post("/api/capture/start")
def capture_start():
    global _worker
    if progress.running:
        return jsonify({"ok": False, "error": "이미 캡쳐 중"}), 409

    body = request.get_json(force=True) or {}
    cfg = core.load_config()
    start = int(body.get("start", 1))
    end = int(body.get("end") or cfg.get("pages", 1))
    countdown = int(body.get("countdown", cfg.get("countdown_seconds", 5)))

    progress.reset()
    progress.running = True  # 카운트다운 중에도 '실행 중'으로 표기
    progress.session = cfg.get("session_name", "session")
    progress.start = start
    progress.end = end
    progress.message = f"{countdown}초 후 시작. 밀리 창을 띄우고 첫 페이지를 펴 두세요."

    def run() -> None:
        for i in range(countdown, 0, -1):
            if progress.stop_requested:
                progress.running = False
                progress.message = "시작 전 취소됨"
                return
            progress.message = f"{i}초 후 시작…"
            time.sleep(1)
        try:
            core.capture_loop(cfg, start, end, progress)
        except Exception:  # noqa: BLE001 — progress.error에 이미 기록됨
            pass

    _worker = threading.Thread(target=run, daemon=True)
    _worker.start()
    return jsonify({"ok": True})


@app.post("/api/capture/stop")
def capture_stop():
    progress.stop_requested = True
    return jsonify({"ok": True})


@app.post("/api/test-key")
def test_key():
    """밀리 창을 포커스한 뒤 페이지 넘김 키를 한 번만 보낸다. 어느 방식이 먹히는지 확인용."""
    cfg = core.load_config()
    method = request.args.get("method", cfg.get("key_method", "click"))
    delay = float(request.args.get("delay", 3))
    title = cfg.get("window_title", "밀리의 서재")

    focused, err = (True, "")
    if cfg.get("auto_focus", True):
        focused, err = core.focus_window(title, hard=True)
    time.sleep(delay)
    if cfg.get("auto_focus", True):
        core.focus_window(title)
        time.sleep(0.15)
    cfg["key_method"] = method  # 쿼리로 지정한 방식으로 한 번 시도
    core.advance_page(cfg)
    return jsonify({"ok": True, "focused": focused, "focus_error": err,
                    "method": method, "key": cfg.get("next_key", "right")})


@app.get("/api/capture/status")
def capture_status():
    pct = 0
    total = max(1, progress.end - progress.start + 1)
    done = max(0, progress.current - progress.start + (1 if progress.current else 0))
    if progress.end:
        pct = round(min(100, done / total * 100))
    return jsonify({
        "running": progress.running,
        "finished": progress.finished,
        "current": progress.current,
        "start": progress.start,
        "end": progress.end,
        "percent": pct,
        "session": progress.session,
        "latest_file": progress.latest_file,
        "message": progress.message,
        "error": progress.error,
    })


# ─────────────────────────────────────────── 미리보기 · PDF

@app.get("/api/preview/<session>/<path:filename>")
def preview(session: str, filename: str):
    cfg = core.load_config()
    out_dir = Path(cfg.get("output_dir", "./captures")) / session
    return send_from_directory(out_dir.resolve(), filename)


@app.post("/api/bind")
def bind():
    cfg = core.load_config()
    session = cfg.get("session_name", "session")
    folder = Path(cfg.get("output_dir", "./captures")) / session
    pdf_path = folder.parent / cfg.get("pdf_filename", f"{session}.pdf")
    try:
        count, size = core.bind_pdf(folder, pdf_path)
    except (FileNotFoundError, ValueError) as e:
        return jsonify({"ok": False, "error": str(e)}), 400
    return jsonify({"ok": True, "pdf": str(pdf_path), "count": count, "size": size})


def open_browser() -> None:
    time.sleep(1.0)
    webbrowser.open("http://127.0.0.1:5000")


if __name__ == "__main__":
    threading.Thread(target=open_browser, daemon=True).start()
    print("[INFO] http://127.0.0.1:5000 에서 조작 화면을 엽니다.")
    app.run(host="127.0.0.1", port=5000, debug=False)
