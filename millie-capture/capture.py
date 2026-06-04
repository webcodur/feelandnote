"""밀리의 서재 자동 캡쳐 (CLI). 웹 UI는 `python app.py` 참조.

흐름:
  1) 카운트다운 동안 밀리 창을 띄우고 첫 페이지에 둠
  2) pages 횟수만큼: 스크린샷 저장 → next_key 입력 → 대기
  3) capture_region=null이면 모니터 전체, [x,y,w,h] 지정 시 해당 영역만
"""

from __future__ import annotations

import argparse
import sys
import time

from core import CaptureProgress, capture_loop, load_config


def countdown(seconds: int) -> None:
    print(f"[INFO] {seconds}초 후 시작. 그 사이 밀리 창을 띄우고 첫 페이지를 펴 둘 것.")
    print("[INFO] 마우스를 화면 좌상단(0,0)으로 보내면 즉시 중단된다.")
    for i in range(seconds, 0, -1):
        print(f"  {i}...", end="\r", flush=True)
        time.sleep(1)
    print(" " * 20, end="\r")


def main() -> None:
    p = argparse.ArgumentParser(description="윈도우 데스크탑 앱 자동 캡쳐")
    p.add_argument("--config", default="config.json")
    p.add_argument("--start", type=int, default=1, help="시작 페이지(재개용)")
    p.add_argument("--end", type=int, default=None, help="종료 페이지(기본 config.pages)")
    args = p.parse_args()

    cfg = load_config(args.config)
    end = args.end or cfg["pages"]
    region = cfg.get("capture_region")
    monitor_idx = cfg.get("monitor", 1)

    print(f"[INFO] 세션={cfg.get('session_name')}, 페이지={args.start}~{end}")
    print(f"[INFO] next_key={cfg.get('next_key', 'right')}, "
          f"region={region or f'monitor#{monitor_idx}'}")
    countdown(cfg.get("countdown_seconds", 5))

    progress = CaptureProgress()
    try:
        capture_loop(cfg, args.start, end, progress, on_log=lambda m: print(f"  {m}"))
    except Exception as e:  # noqa: BLE001
        print(f"\n[ERROR] {e}")
        sys.exit(1)

    print(f"\n[DONE] {end - args.start + 1}장 완료")
    print("[NEXT] python bind.py    # PDF로 묶기")


if __name__ == "__main__":
    main()
