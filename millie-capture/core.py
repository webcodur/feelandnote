"""밀리의 서재 캡쳐 핵심 로직. CLI(capture.py/bind.py)와 웹(app.py)이 공유한다.

세 가지 책임:
  - capture_loop: 화면을 찍고 next_key로 페이지를 넘기는 루프 (중단 가능)
  - bind_pdf: 캡쳐 폴더의 이미지들을 PDF로 묶기
  - 모니터·좌표 측정 헬퍼
"""

from __future__ import annotations

import json
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

import mss
import mss.tools
import pyautogui
import pydirectinput
import pygetwindow as gw
from PIL import Image

pyautogui.PAUSE = 0.05
pyautogui.FAILSAFE = True  # 마우스를 화면 좌상단(0,0)으로 옮기면 즉시 중단
pydirectinput.PAUSE = 0.05
pydirectinput.FAILSAFE = True

ROOT = Path(__file__).parent
DEFAULT_CONFIG = ROOT / "config.json"


# ─────────────────────────────────────────── 설정

def load_config(path: Path | str = DEFAULT_CONFIG) -> dict:
    return json.loads(Path(path).read_text(encoding="utf-8"))


def save_config(cfg: dict, path: Path | str = DEFAULT_CONFIG) -> None:
    Path(path).write_text(
        json.dumps(cfg, ensure_ascii=False, indent=2), encoding="utf-8"
    )


# ─────────────────────────────────────────── 모니터 · 좌표

def list_monitors() -> list[dict]:
    """사용 가능한 모니터 목록. monitors[0]=전체합산, [1]=주, [2]=보조..."""
    with mss.mss() as sct:
        out = []
        for idx, m in enumerate(sct.monitors):
            label = "전체 합산" if idx == 0 else f"{idx}번 모니터"
            out.append({
                "index": idx,
                "label": label,
                "left": m["left"],
                "top": m["top"],
                "width": m["width"],
                "height": m["height"],
            })
        return out


def mouse_position() -> tuple[int, int]:
    return tuple(pyautogui.position())  # type: ignore[return-value]


def region_from_points(p1: tuple[int, int], p2: tuple[int, int]) -> list[int]:
    x1, y1 = p1
    x2, y2 = p2
    return [min(x1, x2), min(y1, y2), abs(x2 - x1), abs(y2 - y1)]


# ─────────────────────────────────────────── 창 활성화

def find_windows(title: str) -> list[str]:
    """제목에 title을 포함하는 창 제목 목록."""
    return [t for t in gw.getAllTitles() if t.strip() and title in t]


def focus_window(title: str, hard: bool = False) -> tuple[bool, str]:
    """title을 포함하는 창을 맨 앞으로 띄운다. (성공여부, 오류메시지).

    키 입력(pyautogui.press)은 활성화된 창에만 들어가므로, 페이지 넘김 직전에 호출한다.
    hard=True면 최소화→복원으로 강제 활성화(윈도우 포그라운드 제약 우회, 깜빡임 있음).
    """
    wins = [w for w in gw.getAllWindows() if w.title.strip() and title in w.title]
    if not wins:
        return False, f"'{title}' 창 없음"
    w = wins[0]
    try:
        if w.isMinimized:
            w.restore()
        w.activate()
        return True, ""
    except Exception:  # noqa: BLE001 — 윈도우 activate는 자주 실패한다
        if not hard:
            return False, "activate 실패"
        try:
            w.minimize()
            time.sleep(0.12)
            w.restore()
            time.sleep(0.12)
            return True, ""
        except Exception as e:  # noqa: BLE001
            return False, str(e)


# ─────────────────────────────────────────── 페이지 넘김

def _target_box(cfg: dict) -> tuple[int, int, int, int]:
    """페이지 넘김 기준 사각형(left, top, width, height). 밀리 창 > 캡쳐 영역 > 모니터 순."""
    title = cfg.get("window_title", "밀리의 서재")
    wins = [w for w in gw.getAllWindows() if w.title.strip() and title in w.title]
    if wins:
        w = wins[0]
        return w.left, w.top, w.width, w.height
    region = cfg.get("capture_region")
    if region:
        return region[0], region[1], region[2], region[3]
    mons = list_monitors()
    idx = cfg.get("monitor", 1)
    m = mons[idx] if idx < len(mons) else mons[1]
    return m["left"], m["top"], m["width"], m["height"]


def click_next(cfg: dict) -> None:
    """밀리 창(또는 캡쳐 영역)의 오른쪽을 클릭해 다음 장으로 넘긴다.

    클릭은 키 입력과 달리 초점 확보와 페이지 넘김을 동시에 처리한다.
    클릭 후 커서를 상단으로 치워 다음 캡쳐에 커서가 찍히지 않게 한다.
    """
    left, top, width, height = _target_box(cfg)
    x = left + int(width * 0.92)
    y = top + int(height * 0.5)
    pyautogui.click(x, y)
    pyautogui.moveTo(left + width // 2, top + 6)  # 본문 밖(상단)으로 커서 이동


def advance_page(cfg: dict) -> None:
    """설정된 방식으로 다음 장으로 넘긴다. click=우측 클릭, key=일반 키, direct=scan code 키."""
    method = cfg.get("key_method", "click")
    next_key = cfg.get("next_key", "right")
    if method == "click":
        click_next(cfg)
    elif method == "key":
        pyautogui.press(next_key)
    else:  # "direct"
        pydirectinput.press(next_key)


# ─────────────────────────────────────────── 캡쳐

def _grab(sct: mss.mss, region: list[int] | None, monitor_idx: int, out_path: Path) -> None:
    if region:
        x, y, w, h = region
        monitor = {"left": x, "top": y, "width": w, "height": h}
    else:
        monitor = sct.monitors[monitor_idx]
    img = sct.grab(monitor)
    mss.tools.to_png(img.rgb, img.size, output=str(out_path))


@dataclass
class CaptureProgress:
    """캡쳐 진행 상태. 웹에서 폴링으로 읽는다."""

    running: bool = False
    stop_requested: bool = False
    current: int = 0
    start: int = 1
    end: int = 0
    session: str = ""
    latest_file: str = ""  # 방금 저장한 파일명 (미리보기용)
    message: str = ""
    error: str = ""
    started_at: float = 0.0
    finished: bool = False

    def reset(self) -> None:
        for k, v in CaptureProgress().__dict__.items():
            setattr(self, k, v)


def capture_loop(
    cfg: dict,
    start: int,
    end: int,
    progress: CaptureProgress,
    on_log: Callable[[str], None] | None = None,
) -> None:
    """캡쳐 메인 루프. progress.stop_requested가 True면 중단한다.

    호출 전 카운트다운은 호출자(CLI/웹)가 책임진다.
    """
    region = cfg.get("capture_region")
    monitor_idx = cfg.get("monitor", 1)
    before_cap = cfg.get("delay_before_capture_ms", 350) / 1000
    after_next = cfg.get("delay_after_next_ms", 800) / 1000
    session = cfg.get("session_name", "session")
    auto_focus = cfg.get("auto_focus", True)
    window_title = cfg.get("window_title", "밀리의 서재")
    out_dir = Path(cfg.get("output_dir", "./captures")) / session
    out_dir.mkdir(parents=True, exist_ok=True)

    def log(msg: str) -> None:
        progress.message = msg
        if on_log:
            on_log(msg)

    progress.running = True
    progress.finished = False
    progress.error = ""
    progress.session = session
    progress.start = start
    progress.end = end
    progress.started_at = time.time()

    # 시작 시 밀리 창을 한 번 강제로 맨 앞에 띄운다. 키 입력이 밀리로 들어가게 하기 위함.
    if auto_focus:
        ok, err = focus_window(window_title, hard=True)
        if ok:
            log(f"'{window_title}' 창을 맨 앞으로 띄움")
        else:
            log(f"경고: {err}. 캡쳐 중 밀리 창을 직접 클릭해 두세요.")
        time.sleep(0.3)

    try:
        with mss.mss() as sct:
            for page in range(start, end + 1):
                if progress.stop_requested:
                    log(f"사용자 중단 (page={page})")
                    return
                progress.current = page
                time.sleep(before_cap)
                fname = out_dir / f"{session}_{page:04d}.png"
                _grab(sct, region, monitor_idx, fname)
                progress.latest_file = fname.name
                log(f"[{page}/{end}] 저장: {fname.name}")
                if page < end:
                    if auto_focus:
                        focus_window(window_title)  # 넘김 직전 밀리 창을 맨 앞으로
                        time.sleep(0.15)
                    advance_page(cfg)
                    time.sleep(after_next)
        elapsed = time.time() - progress.started_at
        log(f"완료: {end - start + 1}장 ({elapsed:.1f}초)")
        progress.finished = True
    except Exception as e:  # noqa: BLE001 — 사용자에게 그대로 노출
        progress.error = str(e)
        log(f"오류: {e}")
        raise
    finally:
        progress.running = False
        progress.stop_requested = False


# ─────────────────────────────────────────── PDF 바인딩

def _collect_images(folder: Path) -> list[Path]:
    files = (
        list(folder.glob("*.png"))
        + list(folder.glob("*.jpg"))
        + list(folder.glob("*.jpeg"))
    )
    files.sort(key=lambda p: p.name)
    return files


def _normalize(img_path: Path) -> bytes:
    """알파 채널 제거(img2pdf는 RGBA 거부)."""
    with Image.open(img_path) as im:
        if im.mode in ("RGBA", "LA", "P"):
            rgb = im.convert("RGB")
            tmp = img_path.with_suffix(".jpg")
            rgb.save(tmp, "JPEG", quality=92)
            return tmp.read_bytes()
    return img_path.read_bytes()


def bind_pdf(folder: Path, pdf_path: Path) -> tuple[int, int]:
    """folder의 이미지들을 pdf_path로 묶는다. (장수, 바이트) 반환."""
    import img2pdf  # 무거운 의존이라 지연 임포트

    if not folder.exists():
        raise FileNotFoundError(f"폴더 없음: {folder}")
    images = _collect_images(folder)
    if not images:
        raise ValueError(f"{folder} 안에 이미지 없음")
    payloads = [_normalize(p) for p in images]
    pdf_path.write_bytes(img2pdf.convert(payloads))
    return len(images), pdf_path.stat().st_size
