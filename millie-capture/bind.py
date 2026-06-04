"""캡쳐 폴더의 이미지를 PDF로 묶음 (CLI). 웹 UI는 `python app.py` 참조."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from core import bind_pdf, load_config


def main() -> None:
    p = argparse.ArgumentParser(description="캡쳐 → PDF 바인딩")
    p.add_argument("--config", default="config.json")
    p.add_argument("--folder", default=None, help="직접 폴더 지정(config 무시)")
    p.add_argument("--out", default=None, help="출력 PDF 경로 지정")
    args = p.parse_args()

    if args.folder:
        folder = Path(args.folder)
        pdf_path = Path(args.out) if args.out else folder.with_suffix(".pdf")
    else:
        cfg = load_config(args.config)
        session = cfg.get("session_name", "session")
        folder = Path(cfg.get("output_dir", "./captures")) / session
        pdf_path = (
            Path(args.out) if args.out
            else folder.parent / cfg.get("pdf_filename", f"{session}.pdf")
        )

    try:
        count, size = bind_pdf(folder, pdf_path)
    except (FileNotFoundError, ValueError) as e:
        sys.exit(f"[ERROR] {e}")

    print(f"[DONE] {pdf_path}  ({count}장, {size:,} bytes)")


if __name__ == "__main__":
    main()
