# -*- coding: utf-8 -*-
"""
파일명: sw/web/scripts/myth-models/bake.py
기능: 신화 세계 3D 모형(glb)을 한 번에 다시 굽는 진입점
책임: 모형 함수를 차례로 불러 glb를 굽고, 크기·삼각형 수·용량을 재어 manifest.json을 쓰고, 미리보기를 렌더한다.

사용법(저장소 루트에서, 블렌더 5.2):
  전부 굽기            ~/Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup --python sw/web/scripts/myth-models/bake.py
  몇 개만              ... bake.py -- trireme olive-tree
  미리보기 없이         ... bake.py -- --no-preview
  검사·모아 보기        node sw/web/scripts/myth-models/verify.mjs

결과:
  sw/web/public/models/myth/<이름>.glb  — Draco 없음, 원점 바닥 가운데, 1단위 = 1m, Y 위, 각진 면, 재질은 베이스 색·거칠기만
  sw/web/public/models/myth/manifest.json — [{ name, file, bytes, triangles, size:[x, 높이, z], tags }]
      게임(world/models.ts)은 MODEL_NAMES에 든 이름만 읽는다. 다른 이름(룬석 등)은 목록에만 있다.
  /tmp/myth-assets/preview-<이름>.png — 800×600, 3/4 각도, 어두운 배경, 옆에 1.75m 사람 인형
  /tmp/myth-assets/raw-<이름>.glb — 정수로 줄이기 전 블렌더 원본(검사용 임시 파일)

규칙: 모형은 200KB를 넘기면 실패로 친다. 게임 치수(신전 바닥, 기둥 반지름, 받침 높이, 불꽃 높이)는
      structures.ts·props.ts에서 읽는다. 색은 common.PALETTE 하나에서 고른다.
"""
import json
import os
import sys
import time

sys.dont_write_bytecode = True
HERE = os.path.dirname(os.path.abspath(__file__))
if HERE not in sys.path:
    sys.path.insert(0, HERE)

import common  # noqa: E402
import extra  # noqa: E402
import greek  # noqa: E402
import nature  # noqa: E402

OUT_DIR = os.path.normpath(os.path.join(HERE, "..", "..", "public", "models", "myth"))
TMP_DIR = "/tmp/myth-assets"
LIMIT = 200 * 1024

# 이름, 함수, 꼬리표, 미리보기 각도(방위, 높이)
MODELS = [
    ("greek-temple", greek.temple, ["greek", "olympus", "building"], (35, 24)),
    ("greek-column", greek.column, ["greek", "olympus", "architecture"], (35, 14)),
    ("broken-column", greek.broken_column, ["greek", "olympus", "ruin"], (35, 18)),
    ("statue-pedestal", greek.pedestal, ["greek", "olympus", "prop"], (35, 22)),
    ("olive-tree", nature.olive, ["greek", "olympus", "flora", "tree"], (35, 14)),
    ("cypress", nature.cypress, ["greek", "olympus", "flora", "tree"], (35, 12)),
    ("rock-a", nature.rock_a, ["nature", "rock"], (35, 22)),
    ("rock-b", nature.rock_b, ["nature", "rock"], (35, 16)),
    ("trireme", greek.trireme, ["greek", "olympus", "ship"], (40, 22)),
    ("brazier", greek.brazier, ["greek", "olympus", "prop", "fire"], (35, 22)),
    ("runestone", extra.runestone, ["norse", "asgard", "prop"], (30, 14)),
    ("longhouse", extra.longhouse, ["norse", "asgard", "building"], (35, 22)),
    ("obelisk", extra.obelisk, ["egypt", "monument"], (35, 12)),
    ("torii", extra.torii, ["japan", "gate"], (30, 12)),
]


def parse_args():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    names = [a for a in argv if not a.startswith("--")]
    known = {m[0] for m in MODELS}
    unknown = [n for n in names if n not in known]
    if unknown:
        raise SystemExit(f"모르는 모형 이름: {unknown} (가능: {sorted(known)})")
    return names or [m[0] for m in MODELS], "--no-preview" in argv


def bake_one(name, fn, tags, G):
    common.reset()
    b = common.Builder()
    opts = fn(b, G) or {}
    obj = b.finish(name, origin=opts.get("origin", "center"))
    size = common.gltf_size(obj)
    raw = os.path.join(TMP_DIR, f"raw-{name}.glb")
    out = os.path.join(OUT_DIR, f"{name}.glb")
    common.export_glb(obj, raw)
    nbytes, triangles = common.quantize(raw, out)
    return {"name": name, "file": f"{name}.glb", "bytes": nbytes, "triangles": triangles, "size": size, "tags": tags}


def write_manifest(entries):
    path = os.path.join(OUT_DIR, "manifest.json")
    old = []
    if os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            old = json.load(f)
    merged = {e["name"]: e for e in old if os.path.exists(os.path.join(OUT_DIR, e.get("file", "")))}
    merged.update({e["name"]: e for e in entries})
    order = [m[0] for m in MODELS]
    rows = sorted(merged.values(), key=lambda e: order.index(e["name"]) if e["name"] in order else len(order))
    with open(path, "w", encoding="utf-8") as f:
        f.write("[\n" + ",\n".join("  " + json.dumps(e, ensure_ascii=False) for e in rows) + "\n]\n")
    return path


def main():
    names, no_preview = parse_args()
    os.makedirs(OUT_DIR, exist_ok=True)
    os.makedirs(TMP_DIR, exist_ok=True)
    G = common.game_constants()
    entries, failed = [], []
    for name, fn, tags, _ in MODELS:
        if name not in names:
            continue
        started = time.time()
        entry = bake_one(name, fn, tags, G)
        over = entry["bytes"] > LIMIT
        if over:
            failed.append(name)
        entries.append(entry)
        print(f"BAKED {name:16s} {entry['bytes'] / 1024:7.1f}KB tris={entry['triangles']:6d} size={entry['size']} {time.time() - started:.1f}s{'  ✗ 200KB 넘음' if over else ''}")
    print("MANIFEST", write_manifest(entries))
    if not no_preview:
        for name, _, _, (az, el) in MODELS:
            if name not in names:
                continue
            started = time.time()
            png = common.render_preview(os.path.join(OUT_DIR, f"{name}.glb"), os.path.join(TMP_DIR, f"preview-{name}.png"), az, el)
            print(f"PREVIEW {png} {time.time() - started:.1f}s")
    if failed:
        raise SystemExit(f"200KB를 넘은 모형: {failed}")


main()
