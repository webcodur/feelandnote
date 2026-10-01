# -*- coding: utf-8 -*-
"""
파일명: sw/web/scripts/myth-models/nature.py
기능: 식생·바위 모형 — 올리브 나무·사이프러스·낮은 바위(rock-a)·선 바위(rock-b)
책임: 수백 그루가 인스턴스로 그려지므로 삼각형을 아낀다(올리브 1천, 사이프러스 250, 바위 200 안팎).
      나무의 원점은 줄기 밑동, 바위는 바닥 가운데다. 게임이 밑동을 조금 묻으므로(land.ts SINK) 바닥은 평평하게 둔다.
"""
import math
import random

from common import T, chisel, ico, jitter, lathe, tube, xform


def olive(b, G):
    """비틀린 두 줄기가 갈라져 오르고, 은빛 도는 잎 뭉치가 넓게 얹힌 올리브(높이 약 4.7m)"""
    rng = random.Random(41)
    b.add(jitter(lathe([(0.55, 0.0), (0.46, 0.16), (0.34, 0.45)], 7), 0.08, rng, keep_floor=True), "bark")
    stems = [
        [(0.1, 0.02, 0.1), (0.2, 0.12, 0.7), (0.1, 0.24, 1.25), (0.32, 0.18, 1.8), (0.62, 0.1, 2.25)],
        [(-0.1, -0.04, 0.1), (-0.22, -0.14, 0.8), (-0.1, -0.22, 1.4), (-0.36, -0.1, 1.95), (-0.72, 0.05, 2.3)],
    ]
    for pts in stems:
        b.add(jitter(tube(pts, [0.29, 0.25, 0.2, 0.17, 0.13], n=6, phase=rng.random()), 0.055, rng), "bark")
    branches = [
        [(0.62, 0.1, 2.25), (1.05, 0.25, 2.7), (1.45, 0.35, 3.05)],
        [(0.62, 0.1, 2.25), (0.55, -0.5, 2.8), (0.5, -1.0, 3.15)],
        [(0.32, 0.18, 1.8), (0.22, 0.7, 2.55), (0.12, 1.15, 3.05)],
        [(-0.72, 0.05, 2.3), (-1.15, 0.35, 2.75), (-1.5, 0.5, 3.05)],
        [(-0.72, 0.05, 2.3), (-0.78, -0.5, 2.85), (-0.68, -1.05, 3.2)],
        [(-0.36, -0.1, 1.95), (-0.15, 0.25, 2.85), (0.05, 0.35, 3.5)],
    ]
    for pts in branches:
        b.add(tube(pts, [0.11, 0.075, 0.045], n=5), "bark")
    # 잎 뭉치 — 큰 것은 80면, 작은 것은 20면. 위를 보는 면 절반쯤과 몇몇 면을 은빛으로
    leaves = random.Random(9)

    def leaf_pick(c, n, k):
        if n.z > 0.3 and leaves.random() < 0.5:
            return "leaf_light"
        return "leaf_light" if leaves.random() < 0.1 else "leaf"

    # 가지 끝마다 뭉치를 따로 얹어 사이로 하늘과 가지가 보이게 한다
    clumps = [
        (1.55, 0.42, 3.25, 0.88, 2), (0.55, -1.15, 3.35, 0.84, 2), (0.14, 1.3, 3.25, 0.84, 2), (-1.6, 0.55, 3.25, 0.88, 2),
        (-0.72, -1.2, 3.4, 0.8, 2), (0.08, 0.35, 4.05, 0.95, 2), (1.05, 1.05, 3.85, 0.5, 1), (-1.0, -0.45, 3.95, 0.55, 1),
        (1.0, -0.6, 3.9, 0.5, 1), (-0.8, 1.15, 3.8, 0.5, 1),
    ]
    for (x, y, z, r, sub) in clumps:
        geo = jitter(ico(sub, 1.0), 0.16 if sub == 2 else 0.1, rng)
        b.add(geo, "leaf", T((x, y, z), (0, 0, rng.uniform(0, math.tau)), (r, r * rng.uniform(0.85, 1.1), r * 0.58)), pick=leaf_pick)
    return {"origin": "base"}


def cypress(b, G):
    """위로 좁아지는 불꽃 모양 사이프러스(높이 약 8.2m). 세로 결이 천천히 비틀린다"""
    rng = random.Random(5)
    b.add(lathe([(0.17, 0.0), (0.12, 0.6)], 6), "bark")
    prof = [(0.3, 0.35), (0.64, 0.8), (0.86, 1.7), (0.93, 2.8), (0.87, 4.0), (0.73, 5.2), (0.53, 6.3), (0.31, 7.2), (0.11, 7.85), (0.0, 8.2)]
    body = lathe(prof, 12, flute=0.16, twist=0.32, radial=lambda j, i: 1 + 0.07 * math.sin(j * 1.9 + i * 1.3))
    tint = random.Random(8)
    b.add(jitter(body, 0.05, rng), "conifer", pick=lambda c, n, k: "conifer_light" if tint.random() < 0.3 else "conifer")
    return {"origin": "base"}


def _rock_pick(seed):
    """아래를 보는 면과 몇몇 면을 어둡게 — 결과 이끼 낀 틈처럼 보인다"""
    rng = random.Random(seed)

    def pick(c, n, k):
        if n.z < -0.2:
            return "rock_dark"
        return "rock_dark" if rng.random() < 0.3 else "rock"
    return pick


def _cuts(rng, count, reach, tilt=0.35):
    """옆으로 기운 깎는 면 여러 장(바위 둘레를 돌며)"""
    planes = []
    for i in range(count):
        a = i * math.tau / count + rng.uniform(-0.3, 0.3)
        planes.append(((math.cos(a), math.sin(a), rng.uniform(-tilt, tilt)), reach * rng.uniform(0.85, 1.0)))
    return planes


def rock_a(b, G):
    """낮고 넓은 바위(약 2.5×1.9×1.2m) — 둘레와 윗면이 평평하게 깎이고, 옆에 작은 돌이 붙었다"""
    rng = random.Random(13)
    geo = xform(jitter(ico(2, 1.0), 0.17, rng), T(scale=(1.2, 0.95, 0.85)))
    planes = [((0.3, -0.2, 1.0), 0.74), ((-0.35, 0.3, 1.0), 0.8), ((0, 0, -1), 0.32)]
    planes += [((x * 1.2, y * 0.95, z), d) for (x, y, z), d in _cuts(rng, 6, 0.93)]
    b.add(chisel(geo, planes), "rock", pick=_rock_pick(1))
    small = xform(jitter(ico(2, 1.0), 0.15, rng), T((1.05, -0.62, -0.1), (0, 0, 0.7), (0.52, 0.44, 0.42)))
    b.add(chisel(small, [((0, 0, -1), 0.32), ((0.2, -0.4, 1.0), 0.2)]), "rock", pick=_rock_pick(2))
    return {"origin": "center"}


def rock_b(b, G):
    """세로로 선 바위(약 1.7×1.5×2.4m) — 여러 장으로 깎인 옆면, 비스듬한 윗면, 밑에 기댄 작은 덩이"""
    rng = random.Random(77)
    geo = xform(jitter(ico(2, 1.0), 0.15, rng), T(scale=(0.78, 0.66, 1.8)))
    planes = [((0.5, -0.3, 1.0), 1.45), ((0, 0, -1), 0.6)]
    planes += [((x * 0.78, y * 0.66, z), d) for (x, y, z), d in _cuts(rng, 7, 0.62, tilt=0.2)]
    b.add(chisel(geo, planes), "rock", pick=_rock_pick(3))
    lean = xform(jitter(ico(2, 1.0), 0.14, rng), T((0.58, 0.38, -0.4), (0.3, -0.25, 0.4), (0.5, 0.42, 0.62)))
    b.add(chisel(lean, [((0, 0, -1), 0.6), ((0.6, 0.3, 0.8), 0.52)]), "rock", pick=_rock_pick(4))
    return {"origin": "center"}
