# -*- coding: utf-8 -*-
"""
파일명: sw/web/scripts/myth-models/greek.py
기능: 그리스 「올림포스 기슭」 모형 — 신전·기둥·부러진 기둥·인물 받침·화로·삼단노선
책임: 모형마다 함수 하나가 Builder에 도형을 쌓는다. 블렌더 좌표(z 위)로 짓고, 앞면은 -y(glTF +z, 게임 남쪽)를 본다.
      치수는 게임 코드에서 읽은 G(structures.ts·props.ts)를 따른다. 1단위 = 1m.
"""
import math
import random

from mathutils import Vector

from common import T, box, grid_sheet, ico, jitter, lathe, linspace, loft, slab, tube


# ------------------------------ 도리아식 기둥

def doric_column(b, at, height, radius, flutes=12, cap_sides=12, entasis=False, cover=False, mat="marble", seed=0):
    """받침 없는 도리아식 기둥 — 세로 홈 몸통·목테·주두(에키누스)·판석(아바쿠스). at은 기둥 밑 가운데"""
    x, y, z = at
    abacus_h = 0.3 * height / 6.2
    echinus_h = 0.34 * height / 6.2
    shaft_h = height - abacus_h - echinus_h
    top_r = radius * 0.8
    phase = (seed * 0.37) % (math.pi / flutes)
    prof = [(radius, 0.0), (radius * 0.965, shaft_h * 0.5), (top_r, shaft_h)] if entasis else [(radius, 0.0), (top_r, shaft_h)]
    b.add(lathe(prof, flutes * 2, phase=phase, flute=0.075), mat, T((x, y, z)))
    ech = [(top_r * 0.9, shaft_h - 0.05), (top_r * 1.04, shaft_h + 0.03), (radius * 1.1, shaft_h + echinus_h * 0.55), (radius * 1.3, shaft_h + echinus_h)]
    b.add(lathe(ech, cap_sides, phase=phase), mat, T((x, y, z)))
    side = radius * 2.64
    b.add(box(side, side, abacus_h, skip=("top",) if cover else (), base=True), mat, T((x, y, z + shaft_h + echinus_h)))
    return side


def _palmette(h, w):
    hw = w / 2
    return [(-hw * 0.35, 0), (hw * 0.35, 0), (hw * 0.3, h * 0.2), (hw, h * 0.45), (hw * 0.75, h * 0.7), (hw * 0.4, h * 0.88),
            (0, h), (-hw * 0.4, h * 0.88), (-hw * 0.75, h * 0.7), (-hw, h * 0.45), (-hw * 0.3, h * 0.2)]


# ------------------------------ 신전

def temple(b, G):
    t = G["TEMPLE"]
    W, L = t["width"], t["length"]
    step, steps, inset = t["step"], t["steps"], t["inset"]
    floor = step * steps
    col_h, radius = t["colHeight"], G["COLUMN"]["radius"]
    # 기단 세 단 — 맨 윗단(스틸로베이트)만 밝은 대리석
    for k in range(steps):
        b.add(box(W - 2 * inset * k, L - 2 * inset * k, step, skip=("bottom",), base=True),
              "marble" if k == steps - 1 else "marble_shade", T((0, 0, step * k)))
    # 둘레 기둥 — 게임 걷기 판정과 같은 자리
    ci = t["colInset"]
    xs = linspace(-W / 2 + ci, W / 2 - ci, t["colsFront"])
    ys = linspace(-L / 2 + ci, L / 2 - ci, t["colsSide"])
    spots = [(x, ys[0]) for x in xs] + [(x, ys[-1]) for x in xs] + [(xs[0], y) for y in ys[1:-1]] + [(xs[-1], y) for y in ys[1:-1]]
    abacus = radius * 2.64
    for i, (x, y) in enumerate(spots):
        doric_column(b, (x, y, floor), col_h, radius, flutes=12, cap_sides=12, cover=True, seed=i)
    top = floor + col_h
    # 들보(아키트레이브)·띠(타이니아)·띠돌(프리즈) — 속은 꽉 찬 덩어리, 밑면이 둘레 회랑 천장이다
    ax, ay = xs[-1] + abacus / 2, ys[-1] + abacus / 2
    arch_h, taenia_h, frieze_h, geison_h = 0.78, 0.07, 0.76, 0.34
    b.add(box(2 * ax, 2 * ay, arch_h, skip=("top",), base=True), "marble", T((0, 0, top)))
    b.add(box(2 * ax + 0.08, 2 * ay + 0.08, taenia_h, base=True), "marble", T((0, 0, top + arch_h)))
    fz = top + arch_h + taenia_h
    fx, fy = ax - 0.06, ay - 0.06
    b.add(box(2 * fx, 2 * fy, frieze_h, skip=("bottom", "top"), base=True), "marble_shade", T((0, 0, fz)))
    # 세 줄 홈돌(트리글리프) — 앞뒤는 모서리까지 11개(모서리 것은 두 면을 덮는다), 옆은 모서리 빼고 19개
    tw = 0.5
    front_xs = linspace(-ax + tw / 2, ax - tw / 2, 2 * t["colsFront"] - 1)
    side_ys = linspace(-ay + tw / 2, ay - tw / 2, 2 * t["colsSide"] - 1)[1:-1]
    for sgn in (-1, 1):
        for i, x in enumerate(front_xs):
            if i in (0, len(front_xs) - 1):
                b.add(box(tw, tw, frieze_h, skip=("top", "bottom"), base=True), "triglyph", T((x, sgn * (ay - tw / 2), fz)))
            else:
                inner = "back" if sgn < 0 else "front"
                b.add(box(tw, 0.1, frieze_h, skip=("top", "bottom", inner), base=True), "triglyph", T((x, sgn * (ay - 0.05), fz)))
        for y in side_ys:
            inner = "left" if sgn > 0 else "right"
            b.add(box(0.1, tw, frieze_h, skip=("top", "bottom", inner), base=True), "triglyph", T((sgn * (ax - 0.05), y, fz)))
    # 처마돌(게이슨)
    gz = fz + frieze_h
    gx, gy = ax + 0.55, ay + 0.55
    b.add(box(2 * gx, 2 * gy, geison_h, base=True), "marble", T((0, 0, gz)))
    # 박공 지붕 — 기울기 13.5°, 앞뒤 끝면이 기운 처마돌 노릇을 한다
    ez = gz + geison_h
    pitch = math.radians(13.5)
    ex = gx + 0.05
    rz = ez + ex * math.tan(pitch)
    thick = 0.32 / math.cos(pitch)
    ry = gy + 0.08

    def roof_pick(c, n, k):
        if abs(n.y) > 0.9:
            return "marble"
        if n.z < -0.5:
            return "marble_shade"
        return "roof"

    for sgn in (-1, 1):
        b.add(slab([(0.0, rz), (sgn * ex, ez), (sgn * ex, ez + thick), (0.0, rz + thick)], 2 * ry), "roof", pick=roof_pick)
    # 박공벽(팀파논) — 띠돌 면과 같은 면에 들어가 있다
    tx = gx - 0.05
    for sgn in (-1, 1):
        b.add(slab([(-tx, ez), (tx, ez), (0.0, rz - 0.01)], 0.3), "marble_shade", T((0, sgn * (fy - 0.15), 0)))
    # 용마루와 덮개 기와 줄
    b.add(box(0.34, 2 * ry, 0.14, skip=("bottom",), base=True), "roof_dark", T((0, 0, rz + thick - 0.06)))
    y = -ry + 0.55
    while y < ry - 0.5:
        for sgn in (-1, 1):
            b.add(slab([(0.0, rz + thick - 0.03), (sgn * ex, ez + thick - 0.03), (sgn * ex, ez + thick + 0.08), (0.0, rz + thick + 0.08)], 0.16),
                  "roof_dark", T((0, y, 0)))
        y += 1.4
    # 박공 꼭대기·모서리 장식(아크로테리아)
    for sgn in (-1, 1):
        yy = sgn * (ry - 0.1)
        b.add(box(0.6, 0.3, 0.2, base=True), "marble", T((0, yy, rz + thick - 0.1)))
        b.add(slab(_palmette(1.7, 1.3), 0.14), "gilt", T((0, yy, rz + thick + 0.08)))
        for sx in (-1, 1):
            x = sx * (ex - 0.45)
            base_z = ez + 0.45 * math.tan(pitch) + thick
            b.add(box(0.55, 0.3, 0.16, base=True), "marble", T((x, yy, base_z - 0.1)))
            b.add(slab(_palmette(1.0, 0.8), 0.12), "gilt", T((x, yy, base_z + 0.04)))
    # 속방(켈라) — 게임 +z(앞)는 블렌더 -y
    c = t["cella"]
    hw, wall, door = c["halfW"], c["wall"], c["door"]
    y_front, y_back = -c["front"], -c["back"]
    cella_h = top - floor
    b.add(box(2 * hw, y_back - y_front, cella_h, skip=("bottom", "top"), base=True), "marble_shade", T((0, (y_front + y_back) / 2, floor)))
    # 앞방(프로나오스) 벽 끝(안타)과 그 사이 두 기둥
    ante = 2.3
    for sx in (-1, 1):
        b.add(box(wall, ante, cella_h, skip=("bottom", "top", "back"), base=True), "marble_shade", T((sx * (hw - wall / 2), y_front - ante / 2, floor)))
        doric_column(b, (sx * 2.15, y_front - ante + 0.35, floor), col_h, radius * 0.86, flutes=12, cap_sides=12, cover=True, seed=40 + sx)
    # 청동 문짝 두 장과 문틀
    door_h = 4.6
    for sx in (-1, 1):
        b.add(box(0.32, 0.14, door_h + 0.1, skip=("bottom", "back"), base=True), "marble", T((sx * (door + 0.16), y_front - 0.07, floor)))
        b.add(box(door - 0.02, 0.06, door_h, skip=("bottom", "back"), base=True), "bronze_dark", T((sx * door / 2, y_front - 0.03, floor)))
    b.add(box(2 * door + 0.94, 0.16, 0.42, skip=("back",), base=True), "marble", T((0, y_front - 0.08, floor + door_h + 0.1)))
    return {"origin": "center"}


# ------------------------------ 홀로 선 기둥(참배길)

def column(b, G):
    radius, height = G["COLUMN"]["radius"], G["COLUMN"]["height"]
    b.add(box(1.95, 1.95, 0.22, skip=("bottom",), base=True), "marble_shade")
    b.add(box(1.7, 1.7, 0.2, skip=("bottom",), base=True), "marble_shade", T((0, 0, 0.22)))
    doric_column(b, (0, 0, 0.42), height, radius, flutes=20, cap_sides=20, entasis=True)
    return {"origin": "center"}


# ------------------------------ 부러진 기둥(폐허)

def _broken_drum(n, r0, r1, h_mid, rng, slant_dir, lo, hi):
    """세로 홈 기둥 토막. 윗면은 비스듬히 깨졌다 — 둘레 높이가 lo~hi로 들쭉날쭉하고 가운데로 모인다"""
    verts, faces = [], []
    rings = []
    for (r, z) in ((r0, 0.0), ((r0 + r1) / 2, h_mid)):
        ring = []
        for j in range(n):
            a = 2 * math.pi * j / n
            rr = r * (1 - 0.075) if j % 2 else r
            ring.append(len(verts))
            verts.append((rr * math.cos(a), rr * math.sin(a), z))
        rings.append(ring)
    top = []
    chips = [rng.uniform(0, math.tau) for _ in range(3)]
    for j in range(n):
        a = 2 * math.pi * j / n
        rr = r1 * (1 - 0.075) if j % 2 else r1
        zt = (lo + hi) / 2 + (hi - lo) / 2 * math.cos(a - slant_dir) + rng.uniform(-0.035, 0.035)
        # 떨어져 나간 이 빠진 자리 몇 곳
        for c in chips:
            gap = abs((a - c + math.pi) % math.tau - math.pi)
            if gap < 0.35:
                zt -= 0.16 * (1 - gap / 0.35)
        top.append(len(verts))
        verts.append((rr * math.cos(a), rr * math.sin(a), max(zt, h_mid + 0.08)))
    rings.append(top)
    apex = len(verts)
    verts.append((rng.uniform(-0.06, 0.06), rng.uniform(-0.06, 0.06), (lo + hi) / 2 + rng.uniform(-0.03, 0.03)))
    for a_ring, b_ring in zip(rings, rings[1:]):
        for j in range(n):
            k = (j + 1) % n
            faces.append((a_ring[j], a_ring[k], b_ring[k], b_ring[j]))
    cap_start = len(faces)
    for j in range(n):
        faces.append((top[j], top[(j + 1) % n], apex))
    return (verts, faces), cap_start


def broken_column(b, G):
    rng = random.Random(23)
    radius = G["COLUMN"]["radius"]
    b.add(jitter(box(1.9, 1.9, 0.3, skip=("bottom",), base=True), 0.06, rng, keep_floor=True), "marble_dark")
    z, r = 0.3, radius
    for hgt in (1.15, 1.02):
        rt = r - 0.028 * hgt
        b.add(lathe([(r, 0.0), (rt, hgt)], 40, phase=rng.uniform(0, 0.2), flute=0.075), "marble_worn",
              T((rng.uniform(-0.025, 0.025), rng.uniform(-0.025, 0.025), z), (rng.uniform(-0.015, 0.015), rng.uniform(-0.015, 0.015), 0)))
        z += hgt
        r = rt
    geo, cap_start = _broken_drum(40, r, r - 0.03, 0.42, rng, slant_dir=0.9, lo=0.5, hi=1.15)
    b.add(geo, "marble_worn", T((0.02, -0.01, z), (0.02, -0.018, 0.3)), pick=lambda c, n, k: "marble" if k >= cap_start else "marble_worn")
    # 발치에 떨어진 조각
    for (x, y, s, rz) in ((0.95, -0.55, 0.36, 0.4), (-0.85, -0.75, 0.26, 1.3), (-0.2, 1.05, 0.3, 2.2), (1.05, 0.6, 0.2, 0.8)):
        b.add(jitter(ico(1, 1.0), 0.18, rng), "marble_worn", T((x, y, s * 0.35), (0, 0, rz), (s, s * 0.8, s * 0.6)))
    return {"origin": "center"}


# ------------------------------ 인물 받침

def pedestal(b, G):
    top = G["PEDESTAL_TOP"]
    n, ph = 8, math.pi / 8
    b.add(lathe([(1.15, 0.0), (1.15, 0.24), (1.05, 0.24), (1.05, 0.3), (0.9, 0.36)], n, phase=ph), "marble_shade")
    b.add(lathe([(0.88, 0.34), (0.86, top - 0.24)], n, phase=ph), "marble")
    b.add(lathe([(0.86, top - 0.26), (0.97, top - 0.17), (1.0, top - 0.13), (1.0, top - 0.03), (0.0, top - 0.03)], n, phase=ph), "marble_shade")
    b.add(lathe([(0.74, top - 0.05), (0.74, top), (0.0, top)], 16), "gilt")
    return {"origin": "center"}


# ------------------------------ 세 발 청동 화로

def brazier(b, G):
    rng = random.Random(7)
    fb = G["FLAME_BASE"]
    rim = fb + 0.04
    # 그릇 — 바깥 → 입술 → 안쪽으로 이어 한 번에 돌린다
    bowl = [(0.0, fb - 0.36), (0.2, fb - 0.34), (0.4, fb - 0.25), (0.53, fb - 0.12), (0.58, fb - 0.03), (0.62, rim - 0.03), (0.62, rim),
            (0.55, rim), (0.53, fb - 0.03), (0.51, fb - 0.08)]
    b.add(lathe(bowl, 14), "bronze")
    coals = jitter(lathe([(0.515, fb - 0.09), (0.36, fb - 0.04), (0.17, fb - 0.005), (0.0, fb + 0.01)], 14, phase=0.2), 0.018, rng)
    ember = random.Random(3)
    b.add(coals, "coal", pick=lambda c, nrm, k: "ember" if ember.random() < 0.4 else "coal")
    # 다리 셋(하나는 앞) — 사자 발에서 밖으로 벌어져 그릇 밑으로 모인다
    for i in range(3):
        a = -math.pi / 2 + i * 2 * math.pi / 3
        ca, sa = math.cos(a), math.sin(a)
        path = [(0.45, 0.07), (0.42, 0.3), (0.35, 0.62), (0.3, 0.88), (0.28, fb - 0.32)]
        b.add(tube([(ca * r, sa * r, z) for r, z in path], [0.062, 0.054, 0.047, 0.045, 0.05], n=6), "bronze_dark")
        b.add(jitter(ico(1, 1.0), 0.12, rng), "bronze_dark", T((ca * 0.48, sa * 0.48, 0.05), (0, 0, a), (0.12, 0.085, 0.06)))
        b.add(ico(1, 0.055), "bronze_dark", T((ca * 0.6, sa * 0.6, rim + 0.03)))
    # 다리를 잇는 고리
    ring = [(0.405, 0.4), (0.405, 0.445), (0.375, 0.445), (0.375, 0.4), (0.405, 0.4)]
    b.add(lathe(ring, 12), "bronze_dark")
    return {"origin": "center"}


# ------------------------------ 삼단노선(트라이림)

HULL_BOW, HULL_LEN = -13.4, 26.6


def _hull(s):
    """s=0 뱃머리 ~ 1 고물. (반폭, 용골 높이, 뱃전 높이)"""
    wmax = 1.8
    if s < 0.5:
        w = wmax * max(0.0, 1 - ((0.5 - s) / 0.5) ** 2.2) ** 0.7
    else:
        w = wmax * max(0.0, 1 - ((s - 0.5) / 0.5) ** 1.9) ** 0.75
    w = max(w, 0.1)
    zk = 0.0
    if s > 0.78:
        zk = 1.7 * ((s - 0.78) / 0.22) ** 1.7
    if s < 0.04:
        zk = 0.12 * (0.04 - s) / 0.04
    zt = 2.3
    if s < 0.16:
        zt += 0.55 * ((0.16 - s) / 0.16) ** 2
    if s > 0.74:
        zt += 1.3 * ((s - 0.74) / 0.26) ** 2
    return w, zk, zt


def _hull_y(s):
    return HULL_BOW + HULL_LEN * s


def _hull_s(y):
    return min(1.0, max(0.0, (y - HULL_BOW) / HULL_LEN))


def trireme(b, G):
    # 몸통 — 뱃머리(-y)에서 고물(+y)로 단면을 잇는다. 아래는 역청 검정, 중간은 짙은 나무, 뱃전 띠는 붉은 칠, 갑판은 밝은 나무
    stations = [0, 0.015, 0.035, 0.06, 0.09, 0.13, 0.18, 0.25, 0.33, 0.42, 0.5, 0.58, 0.66, 0.73, 0.79, 0.84, 0.88, 0.915, 0.945, 0.97, 0.99, 1.0]
    rings = []
    for s in stations:
        w, zk, zt = _hull(s)
        d = zt - zk
        half = [(0.0, zk), (0.45 * w, zk + 0.13 * d), (0.8 * w, zk + 0.4 * d), (0.96 * w, zk + 0.68 * d), (0.995 * w, zk + 0.86 * d), (w, zt)]
        y = _hull_y(s)
        rings.append([(x, y, z) for x, z in half] + [(-x, y, z) for x, z in reversed(half[1:])])

    def hull_pick(c, n, k):
        w, zk, zt = _hull(_hull_s(c.y))
        d = zt - zk
        if n.z > 0.7 and c.z > zt - 0.25:
            return "wood"
        if c.z > zt - 0.36:
            return "wood_dark"
        if c.z > zk + 0.6 * d:
            return "hull_band"
        if c.z < zk + 0.45 * d:
            return "hull"
        return "wood_dark"

    b.add(loft(rings, cap_start=True, cap_end=True), "hull", pick=hull_pick)
    # 노 받이(파렉세이레시아) — 뱃전 밖으로 내민 틀, 끝으로 갈수록 몸통에 붙는다
    for sgn in (-1, 1):
        orings = []
        for s in linspace(0.16, 0.85, 9):
            w, zk, zt = _hull(s)
            reach = 0.75 * min(1.0, (s - 0.16) / 0.05, (0.85 - s) / 0.05) + 0.08
            x0, x1 = sgn * (w - 0.12), sgn * (w + reach)
            y = _hull_y(s)
            orings.append([(x0, y, zt - 0.36), (x1, y, zt - 0.36), (x1, y, zt - 0.02), (x0, y, zt - 0.02)])
        b.add(loft(orings, cap_start=True, cap_end=True), "wood")
    # 뱃전 가림막 난간과 가운데 통로(밝은 널)
    w_mid, _, zt_mid = _hull(0.5)
    for sgn in (-1, 1):
        b.add(box(0.07, 15.5, 0.32, skip=("bottom",), base=True), "wood_dark", T((sgn * (w_mid - 0.12), 0.3, zt_mid)))
    b.add(box(1.0, 21.0, 0.1, skip=("bottom",), base=True), "wood_light", T((0, -0.4, zt_mid)))
    # 청동 충각(뱃머리 물밑 들이받이) — 뾰족한 몸통과 두 겹 날개
    ram = [[(-0.26, -13.15, 0.2), (0.26, -13.15, 0.2), (0.26, -13.15, 0.95), (-0.26, -13.15, 0.95)],
           [(-0.2, -14.3, 0.32), (0.2, -14.3, 0.32), (0.2, -14.3, 0.82), (-0.2, -14.3, 0.82)],
           [(-0.1, -15.1, 0.46), (0.1, -15.1, 0.46), (0.1, -15.1, 0.68), (-0.1, -15.1, 0.68)]]
    b.add(loft(ram, cap_end=True), "bronze")
    for z in (0.44, 0.66):
        b.add(box(0.5, 1.2, 0.04, base=True), "bronze", T((0, -14.3, z)))
    b.add(box(0.62, 0.22, 0.85, base=True), "bronze_dark", T((0, -13.2, 0.15)))
    # 위 들이받이와 뱃머리 기둥
    b.add(box(0.3, 0.9, 0.3, base=True), "wood_dark", T((0, -13.55, 1.75)))
    b.add(box(0.22, 0.2, 0.22, base=True), "bronze", T((0, -14.05, 1.79)))
    b.add(tube([(0, -13.25, 2.5), (0, -13.55, 3.2), (0, -13.5, 3.75), (0, -13.2, 4.05)], [0.17, 0.14, 0.1, 0.07], n=5, cap_end=True), "wood_dark")
    # 뱃머리 눈
    for sgn in (-1, 1):
        normal = Vector((sgn * 1.0, -0.35, 0.0)).normalized()
        rot = Vector((0, 0, 1)).rotation_difference(normal).to_matrix().to_4x4()
        for radius, lift, mat in ((0.32, 0.0, "eye_white"), (0.15, 0.03, "eye_dark")):
            m = T((sgn * 0.555, -12.2, 2.0)) @ rot @ T((0, 0, lift))
            b.add(lathe([(radius, 0.0), (radius, 0.04), (0.0, 0.04)], 10), mat, m)
    # 고물 장식(아플라스톤) — 부챗살처럼 벌어져 앞으로 말린다
    curl = [(13.0, 3.0), (13.7, 4.1), (14.2, 5.2), (14.25, 6.2), (13.85, 6.95), (13.2, 7.15), (12.7, 6.85), (12.55, 6.4)]
    for k in (-2, -1, 0, 1, 2):
        pts = []
        for i, (y, z) in enumerate(curl):
            f = i / (len(curl) - 1)
            pts.append((k * (0.06 + 0.42 * f), y - abs(k) * 0.1 * f, z - abs(k) * 0.22 * f))
        b.add(tube(pts, [0.14, 0.13, 0.12, 0.1, 0.09, 0.08, 0.07, 0.06], n=4, aspect=0.5, cap_end=True), "wood_dark")
    # 키잡이 노 둘 — 고물 가로보에 걸린다
    b.add(box(2.7, 0.3, 0.22, base=True), "wood_dark", T((0, 9.5, 2.62)))
    for sgn in (-1, 1):
        top_p, bot_p = Vector((sgn * 1.22, 9.35, 3.15)), Vector((sgn * 1.62, 12.3, 0.28))
        mid = top_p.lerp(bot_p, 0.62)
        b.add(tube([top_p, mid], 0.075, n=5, cap_start=True), "wood")
        b.add(tube([mid, bot_p], 0.3, n=4, aspect=0.16, up=(1, 0, 0), cap_end=True), "wood")
    # 돛대·활대·돛(순풍에 앞으로 부푼 네모돛, 아래 띠는 붉은 칠)·밧줄
    ym = -1.2
    b.add(tube([(0, ym, 2.2), (0, ym, 11.8)], [0.17, 0.1], n=6, cap_end=True), "wood")
    b.add(tube([(-4.6, ym - 0.22, 10.98), (0, ym - 0.22, 11.1), (4.6, ym - 0.22, 10.98)], [0.05, 0.09, 0.05], n=6, cap_start=True, cap_end=True), "wood")
    sail_top, sail_h = 10.9, 4.6
    sail = grid_sheet((-4.3, ym - 0.32, sail_top), (8.6, 0, 0), (0, 0, -sail_h), 4, 4,
                      bulge=lambda u, v: -0.7 * math.sin(math.pi * u) * (0.35 + 0.65 * math.sin(math.pi * v)), thickness=0.04)
    b.add(sail, "sail", pick=lambda c, n, k: "sail_band" if c.z < sail_top - sail_h * 0.75 else "sail")
    top_mast = (0, ym, 11.7)
    for end in ((0, -13.25, 3.9), (0, 12.9, 4.4), (1.7, ym + 0.1, 2.35), (-1.7, ym + 0.1, 2.35)):
        b.add(tube([top_mast, end], 0.025, n=3), "wood_dark")
    # 노 세 줄 — 위(트라니테스, 노 받이에서), 가운데(지기테스), 아래(탈라미테스). 날은 물에 잠긴다
    # 노는 몸통 폭을 따라 시작하고, 끝은 반폭 + reach에서 물(z 0.42)에 닿는다
    tiers = (
        ("thranite", linspace(-8.0, 8.0, 17), 3.2, 0.2),
        ("zygite", linspace(-7.65, 7.35, 16), 2.8, 0.15),
        ("thalamite", linspace(-7.3, 6.7, 15), 2.4, 0.1),
    )
    for tier, ys, reach, sweep in tiers:
        for y in ys:
            w, zk, zt = _hull(_hull_s(y))
            d = zt - zk
            if tier == "thranite":
                x0, z0 = w + 0.3, zt - 0.2
            elif tier == "zygite":
                x0, z0 = 0.9 * w, zk + 0.72 * d
            else:
                x0, z0 = 0.75 * w, zk + 0.5 * d
            for sgn in (-1, 1):
                start = Vector((sgn * x0, y, z0))
                tip = Vector((sgn * (w + reach), y + sweep, 0.42))
                blade = tip.lerp(start, 0.8 / (tip - start).length)
                b.add(tube([start, blade], 0.045, n=4), "wood")
                b.add(tube([blade, tip], 0.11, n=4, aspect=0.14, up=(0, 1, 0), cap_end=True), "wood")
    return {"origin": "center"}
