"""캡쳐 영역 좌표 측정 도우미 (CLI). 웹 UI에서도 '본문 영역 지정'으로 가능.

사용법:
  1) 밀리 창을 띄우고 책 본문이 보이게 둠
  2) python region_picker.py
  3) 본문 좌상단으로 마우스 → Enter, 우하단으로 마우스 → Enter
  4) 출력된 [x, y, w, h]를 config.json의 capture_region에 입력
"""

from __future__ import annotations

from core import mouse_position, region_from_points


def get_point(label: str) -> tuple[int, int]:
    input(f"{label} 위치로 마우스 옮긴 뒤 Enter > ")
    x, y = mouse_position()
    print(f"  → ({x}, {y})")
    return x, y


def main() -> None:
    print("[INFO] 캡쳐 영역 측정 시작.")
    p1 = get_point("좌상단")
    p2 = get_point("우하단")
    region = region_from_points(p1, p2)
    print()
    print("capture_region (config.json에 그대로 붙여넣기):")
    print(f'  "capture_region": {region},')


if __name__ == "__main__":
    main()
