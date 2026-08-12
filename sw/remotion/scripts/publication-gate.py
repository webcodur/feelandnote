"""Run automated publication checks 1-10 for one BookRecommend episode.

Usage: py -3.12 sw/remotion/scripts/publication-gate.py <slug>
SSoT: docs/project/remotion/book-recommend/writer/7-translation.md
"""
import io
import sys

from publication_gate.main import run


if __name__ == '__main__':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    raise SystemExit(run(sys.argv))
