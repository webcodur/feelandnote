# -*- coding: utf-8 -*-
"""
파일명: sw/web/scripts/myth-models/extra.py
기능: 다음 지역용 여분 모형 — 룬석·북유럽 긴 집·오벨리스크·도리이
책임: 지금 게임(models.ts MODEL_NAMES)은 이 이름들을 읽지 않는다. 목록(manifest.json)에는 올려 두어 다음 지역이 가져다 쓸 수 있게 한다.
      규격은 그리스 모형과 같다(원점 바닥 가운데, 1단위 = 1m, 앞면 -y).
"""
import math
import random

from common import T, box, chisel, ico, jitter, lathe, linspace, loft, slab, tapered_box, tube, xform


def _stone_rings(levels, half_w, half_t):
    rings = []
    for z, ws, ts in levels:
        w, t = half_w * ws, half_t * ts
        rings.append([(-w, -t * 0.55, z), (-w * 0.78, -t, z), (w * 0.78, -t, z), (w, -t * 0.55, z),
                      (w, t * 0.55, z), (w * 0.78, t, z), (-w * 0.78, t, z), (-w, t * 0.55, z)])
    return rings


def runestone(b, G):
    """위가 둥근 선돌(높이 약 2.75m). 앞면에 붉게 칠한 뱀 띠와 십자를 새겼다"""
    rng = random.Random(61)
    levels = [(0.0, 1.0, 1.0), (0.7, 1.06, 0.98), (1.5, 1.0, 0.95), (2.1, 0.88, 0.9), (2.45, 0.68, 0.86), (2.66, 0.4, 0.82), (2.75, 0.12, 0.78)]
    half_w, half_t = 0.55, 0.21
    rings = _stone_rings(levels, half_w, half_t)
    # 자연석처럼 한쪽 어깨가 처지고 위가 조금 기운다
    rings = [[(x + 0.05 * z / 2.75, y, z - (0.12 * max(0.0, x) * z / 2.75)) for x, y, z in ring] for ring in rings]
    b.add(jitter(loft(rings, cap_end=True), 0.055, rng, axes=(1.0, 0.0, 0.6)), "runestone")

    def front_y(z):
        for (z0, _, t0), (z1, _, t1) in zip(levels, levels[1:]):
            if z0 <= z <= z1:
                return -half_t * (t0 + (t1 - t0) * (z - z0) / (z1 - z0)) - 0.012
        return -half_t

    band = [(-0.34, 0.32), (-0.41, 1.1), (-0.37, 1.8), (-0.22, 2.18), (0.0, 2.3), (0.2, 2.15), (0.33, 1.8), (0.38, 1.1), (0.31, 0.5), (0.18, 0.33), (0.03, 0.42)]
    band = [(x + 0.05 * z / 2.75, z) for x, z in band]
    b.add(tube([(x, front_y(z), z) for x, z in band], 0.05, n=4, aspect=0.35, up=(0, 1, 0), cap_start=True, cap_end=True), "rune_paint")
    # 띠 안쪽에 세로로 새긴 룬 다섯 자(곧은 획 + 비스듬한 가지)
    # (기울기 rad, 획 가운데 높이) — 곧은 획 오른쪽/왼쪽으로 뻗는 가지
    glyphs = [[(0.7, 0.06), (0.7, -0.03)], [(0.7, 0.05), (-0.7, -0.04)], [(0.8, 0.07), (-0.8, 0.07)], [(-0.7, 0.05)], [(0.7, 0.0)]]
    for i, strokes in enumerate(glyphs):
        z = 1.85 - i * 0.3
        x = 0.05 * z / 2.75
        y = front_y(z) - 0.004
        b.add(box(0.04, 0.02, 0.24), "rune_paint", T((x, y, z)))
        for lean, dz in strokes:
            side = 1 if lean > 0 else -1
            b.add(box(0.035, 0.02, 0.13), "rune_paint", T((x + side * 0.045, y, z + dz), (0, -side * 0.7, 0)))
    for (x, y, s) in ((0.6, -0.3, 0.28), (-0.62, -0.18, 0.22), (0.35, 0.4, 0.2)):
        b.add(chisel(xform(jitter(ico(1, 1.0), 0.15, rng), T((x, y, 0.0), (0, 0, rng.uniform(0, 3)), (s, s * 0.8, s * 0.6))), [((0, 0, -1), 0.0)]), "rock_dark")
    return {"origin": "center"}


def longhouse(b, G):
    """북유럽 긴 집(약 10×27m) — 배처럼 휜 나무 벽, 가운데가 처진 초가 지붕, 박공 끝에 엇갈린 용머리 판"""
    half_len, wall_h, ridge, hw_mid = 13.0, 2.1, 6.4, 4.2

    def wall_w(y):
        return hw_mid * (1 - 0.16 * (y / half_len) ** 2)

    def ridge_z(y):
        return ridge - 0.45 * (y / half_len) ** 2

    ys = linspace(-half_len, half_len, 11)
    b.add(loft([[(-wall_w(y) - 0.12, y, 0.0), (wall_w(y) + 0.12, y, 0.0), (wall_w(y) + 0.12, y, 0.45), (-wall_w(y) - 0.12, y, 0.45)] for y in ys], True, True), "rock_dark")
    b.add(loft([[(-wall_w(y), y, 0.3), (wall_w(y), y, 0.3), (wall_w(y), y, wall_h + 0.1), (-wall_w(y), y, wall_h + 0.1)] for y in ys], True, True), "wood_dark")
    roof_ys = [-half_len - 0.7] + ys + [half_len + 0.7]
    rings = []
    for y in roof_ys:
        w, r = wall_w(max(-half_len, min(half_len, y))), ridge_z(y)
        rings.append([(-(w + 0.75), y, wall_h - 0.4), (0.0, y, r), (w + 0.75, y, wall_h - 0.4),
                      (w + 0.15, y, wall_h + 0.05), (0.0, y, r - 0.6), (-(w + 0.15), y, wall_h + 0.05)])
    b.add(loft(rings, True, True), "thatch", pick=lambda c, n, k: "thatch_dark" if n.z < 0.1 else "thatch")
    # 용마루를 덮은 뗏장 — 지붕 위로 얹힌 낮은 둔덕
    ridge_rings = []
    for y in roof_ys:
        r = ridge_z(y)
        ridge_rings.append([(-0.75, y, r - 0.78), (0.0, y, r + 0.2), (0.75, y, r - 0.78)])
    b.add(loft(ridge_rings, True, True), "turf")
    # 벽에 비스듬히 기댄 버팀 기둥
    for y in linspace(-half_len + 1.6, half_len - 1.6, 8):
        for sx in (-1, 1):
            w = wall_w(y)
            b.add(tube([(sx * (w + 0.85), y, 0.0), (sx * (w + 0.12), y, wall_h - 0.1)], 0.13, n=4, cap_end=True), "wood")
    for sgn in (-1, 1):
        y_end = sgn * half_len
        w = wall_w(y_end)
        # 박공벽 판자
        b.add(slab([(-w, wall_h), (w, wall_h), (0.0, ridge_z(y_end) - 0.62)], 0.2), "wood", T((0, y_end, 0)))
        # 엇갈린 박공 판 — 처마에서 올라 용마루 위에서 X로 만나 용머리처럼 말린다
        yb = y_end + sgn * 0.78
        top = ridge_z(y_end + sgn * 0.7)
        for side in (-1, 1):
            pts = [(side * (w + 0.78), yb, wall_h - 0.45), (side * (w + 0.78) * 0.5, yb, (wall_h - 0.45 + top) / 2 + 0.06), (0.0, yb, top + 0.08),
                   (-side * 0.55, yb, top + 0.45), (-side * 0.75, yb, top + 0.85), (-side * 0.55, yb, top + 1.05)]
            b.add(tube(pts, [0.14, 0.14, 0.14, 0.12, 0.1, 0.08], n=4, aspect=0.3, up=(0, 1, 0), cap_start=True, cap_end=True), "wood")
    # 앞 박공(-y)의 문
    yf = -half_len - 0.11
    for sx in (-1, 1):
        b.add(box(0.22, 0.2, 2.25, base=True), "wood", T((sx * 0.72, yf, 0.3)))
    b.add(box(1.7, 0.22, 0.24, base=True), "wood", T((0, yf, 2.5)))
    b.add(box(1.22, 0.06, 2.2, base=True), "bark_dark", T((0, yf - 0.02, 0.3)))
    return {"origin": "center"}


def obelisk(b, G):
    """이집트 오벨리스크(높이 약 12.4m) — 두 단 받침, 위로 좁아지는 네모 돌기둥, 금박 피라미드 꼭대기"""
    b.add(box(3.1, 3.1, 0.45, skip=("bottom",), base=True), "granite_dark")
    b.add(box(2.5, 2.5, 0.65, skip=("bottom",), base=True), "granite_dark", T((0, 0, 0.45)))
    shaft = 10.2
    b.add(tapered_box(1.6, 1.6, 1.05, 1.05, shaft, skip=("bottom", "top")), "granite", T((0, 0, 1.1)))
    tip = 1.1 + shaft
    b.add(lathe([(1.05 / math.sqrt(2), tip), (0.0, tip + 1.05)], 4, phase=math.pi / 4), "gilt")
    # 네 면의 새김 띠(얕게 도드라진 판)
    for k in range(4):
        rot = (0, 0, k * math.pi / 2)
        lean = math.atan2((1.6 - 1.05) / 2, shaft)
        panel = slab([(-0.22, 0.0), (0.22, 0.0), (0.16, 7.6), (-0.16, 7.6)], 0.03)
        b.add(panel, "granite_dark", T((0, 0, 0), rot) @ T((0, -0.8 + 0.012, 2.0), (-lean, 0, 0)))
    return {"origin": "center"}


def torii(b, G):
    """신사 문 도리이(폭 약 8.7m, 높이 약 6.3m) — 주홍 기둥 둘·누키·시마키, 끝이 들린 검은 가사기, 가운데 현판"""
    px, ph = 2.45, 5.3
    for sx in (-1, 1):
        b.add(tube([(sx * px, 0, 0.0), (sx * (px - 0.12), 0, ph)], [0.3, 0.27], n=10, cap_end=True), "vermilion")
        b.add(lathe([(0.38, 0.0), (0.38, 0.45), (0.3, 0.53)], 10), "lacquer", T((sx * px, 0, 0)))
    b.add(box(6.6, 0.24, 0.46, base=True), "vermilion", T((0, 0, 4.1)))
    b.add(box(0.3, 0.26, 0.75, base=True), "vermilion", T((0, 0, 4.56)))
    b.add(box(0.66, 0.1, 0.92, base=True), "lacquer", T((0, -0.17, 4.47)))
    b.add(box(0.54, 0.02, 0.8, base=True), "gilt", T((0, -0.225, 4.53)))
    b.add(box(7.6, 0.34, 0.34, base=True), "vermilion", T((0, 0, ph)))
    rings = []
    for x in linspace(-4.35, 4.35, 11):
        z0 = ph + 0.34 + 0.46 * (abs(x) / 4.35) ** 2.6
        rings.append([(x, -0.3, z0), (x, 0.3, z0), (x, 0.4, z0 + 0.36), (x, -0.4, z0 + 0.36)])
    b.add(loft(rings, True, True), "lacquer")
    return {"origin": "center"}
