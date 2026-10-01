# 트로이 성과 도시 — 흉벽·탑·성문 둘·집 둘·기둥 둘·신전·제단·화로·신상·두 샘
# 돌은 각진 면(flat)에 모서리만 작게 깎는다. 앞은 -Y(glTF +Z)이고, 판이 칸마다 돌려 놓는다.
# 판과 맞춘 자리(scene/decorPlan.ts): 흉벽은 칸 가운데서 바깥으로 0.42, 성문 횃불은 (±0.42, 앞 0.24, 높이 1.08),
# 탑 횃불은 가운데 높이 0.86. 판은 FLAME 재질 가운데마다 불빛을 켜므로 불꽃은 제단·화로에만 넣는다.
import math
import random

import bmesh
from mathutils import Matrix, Vector

from lib import M, Model, box, cone, cyl, ico, jitter, lathe, prism, rod, sphere, torus, tube
from figure import HEAD_Z, arm, crest, helmet_corinthian, robe, shield_round, shoulders, spear
from nature import _blob


# ---------------------------------------------------------------- 공용 조각
def _cube(m, lo, hi, mat="STONE", bevel=0.01, smooth=False, rot=None):
    """두 모서리 좌표(lo, hi)로 놓는 덩이. rot(도)을 주면 가운데를 축으로 돌린다."""
    size = [hi[i] - lo[i] for i in range(3)]
    mid = [(hi[i] + lo[i]) / 2 for i in range(3)]
    m.add(box(size[0], size[1], size[2], bevel), mat, smooth, M(mid, rot=rot or (0, 0, 0)))


def _shaft(r0, r1, z0, z1, flutes=10, depth=0.08, bulge=0.006):
    """도리스식 기둥 몸: 위로 가늘어지고 허리가 조금 부푼 몸(엔타시스)에 세로 홈을 판다."""

    def flute(r, z, a):
        return r * (1.0 - depth * (1.0 - math.cos(flutes * a)) / 2.0), a

    zm = (z0 + z1) / 2
    return lathe([(r0, z0), ((r0 + r1) / 2 + bulge, zm), (r1, z1)], flutes * 2, wobble=flute)


def _capital(r1, zs, h, n=16):
    """기둥머리 아래쪽 방석(에키누스). zs는 몸이 끝나는 높이, h는 기둥 전체 키."""
    return lathe([(0.0, zs - 0.005), (r1, zs - 0.005), (r1 * 1.12, zs + h * 0.025), (r1 * 1.42, zs + h * 0.06),
                  (r1 * 1.48, zs + h * 0.07), (0.0, zs + h * 0.07)], n)


def _doric(m, x, y, z0, h, r0, flutes=10, n_cap=16):
    """밑받침 없는 도리스식 기둥 하나: 홈 판 몸 + 어두운 목 띠 + 에키누스 + 네모 판(아바쿠스)."""
    r1 = r0 * 0.8
    zs = z0 + h * 0.86
    m.add(_shaft(r0, r1, z0, zs, flutes), "STONE", False, M((x, y, 0)))
    m.add(cyl(r1 * 1.04, r1 * 1.04, h * 0.018, 12, zs - h * 0.035), "STONE_DARK", False, M((x, y, 0)))
    m.add(_capital(r1, zs, h, n_cap), "STONE", False, M((x, y, 0)))
    a = r1 * 1.55
    _cube(m, (x - a, y - a, zs + h * 0.07), (x + a, y + a, z0 + h), "STONE", 0.006)


def _break(bm, z_cut, rng, tilt, amount=0.035):
    """+Z 끝을 부러진 면으로 만든다: 끝 뚜껑 가운데에 점을 넣고, 끝 점들을 비스듬하고 들쭉날쭉하게 흔든다."""
    caps = [f for f in bm.faces if all(v.co.z > z_cut - 1e-4 for v in f.verts)]
    bmesh.ops.poke(bm, faces=caps)
    for v in bm.verts:
        if v.co.z > z_cut - 1e-4:
            a = math.atan2(v.co.y, v.co.x)
            r = math.hypot(v.co.x, v.co.y)
            v.co.z += tilt * math.cos(a) * min(1.0, r / 0.1) + rng.uniform(-amount, amount * 0.5)
    return bm


def _flame(m, base, h, r, lean=(0.0, 0.0), phase=0.0):
    """불꽃 혀 하나: 밑이 불룩하고 위로 가며 흔들리다 뾰족해진다."""
    b = Vector(base)
    prof = (0.7, 1.0, 0.78, 0.42, 0.0)
    pts, rad = [], []
    for i, k in enumerate(prof):
        t = i / (len(prof) - 1)
        sway = math.sin(phase + t * 4.0) * r * 0.4 * t
        pts.append(b + Vector((lean[0] * t * t + sway, lean[1] * t * t, h * t)))
        rad.append(r * k)
    m.add(tube(pts, rad, 7), "FLAME", True)


def _fire(m, c, s=1.0, logs=True):
    """엇건 장작 셋 위에 불꽃 혀 다섯(가운데가 가장 높다)."""
    cx, cy, cz = c
    if logs:
        for k in range(3):
            a = math.radians(30 + 60 * k)
            d = Vector((math.cos(a), math.sin(a), 0.0)) * 0.11 * s
            m.add(rod(Vector(c) - d + Vector((0, 0, 0.012 * s)), Vector(c) + d + Vector((0, 0, 0.022 * s)),
                      0.017 * s, None, 5), "WOOD_DARK", False)
    _flame(m, (cx, cy, cz + 0.01 * s), 0.25 * s, 0.06 * s, (0.0, 0.0), 0.4)
    for k in range(4):
        a = math.radians(45 + 90 * k)
        off = Vector((math.cos(a), math.sin(a), 0.0)) * 0.045 * s
        _flame(m, (cx + off.x, cy + off.y, cz + 0.005 * s), (0.15 + 0.03 * (k % 2)) * s, 0.042 * s,
               (off.x * 0.8, off.y * 0.8), 1.3 * k)


def _beam_ends(m, xs, y, z):
    """평지붕 들보 끝: 벽 위쪽으로 둥근 통나무 끝이 줄지어 나온다(앞뒤 벽)."""
    for x in xs:
        m.add(cyl(0.017, 0.017, 0.07, 6, -0.035), "WOOD", False, M((x, y, z), rot=(90, 0, 0)))


def _pot(m, loc, h=0.1, mat="RED_OCHRE"):
    """붉은 흙 항아리: 배가 불룩하고 목이 좁다."""
    s = h / 0.1
    prof = [(0.0, 0.0), (0.022, 0.0), (0.04, 0.03), (0.042, 0.055), (0.03, 0.08), (0.017, 0.09), (0.021, 0.1), (0.0, 0.098)]
    m.add(lathe([(r * s, z * s) for r, z in prof], 8), mat, 50, M(loc))


WALL_NORMAL = {"front": (0, -1), "back": (0, 1), "left": (-1, 0), "right": (1, 0)}


def _on_wall(m, face, at, u0, u1, out0, out1, z0, z1, mat, bevel=0.0):
    """벽 겉면에 붙이는 판. face는 벽이 보는 쪽, at은 가운데에서 그 벽 겉면까지 거리,
    u는 벽을 따라 잰 자리, out은 겉면에서 바깥으로 잰 두께(음수면 벽 안으로 파묻힌다)."""
    nx, ny = WALL_NORMAL[face]
    a, b = sorted(((at + out0) * (nx or ny), (at + out1) * (nx or ny)))
    if nx == 0:
        _cube(m, (u0, a, z0), (u1, b, z1), mat, bevel)
    else:
        _cube(m, (a, u0, z0), (b, u1, z1), mat, bevel)


def _window(m, face, at, u, z, w=0.07, h=0.06):
    """벽의 작은 창: 어두운 구멍 + 밑의 나무 문턱."""
    _on_wall(m, face, at, u - w / 2, u + w / 2, -0.01, 0.004, z - h / 2, z + h / 2, "WOOD_DARK")
    _on_wall(m, face, at, u - w / 2 - 0.012, u + w / 2 + 0.012, -0.01, 0.014, z - h / 2 - 0.014, z - h / 2, "WOOD", 0.003)


def _door(m, x0, x1, y, z0, z1, recess="WOOD_DARK"):
    """앞벽(-Y 겉면이 y)의 문간: 어두운 문 + 나무 인방·문설주."""
    _cube(m, (x0, y - 0.008, z0), (x1, y + 0.01, z1), recess, 0.0)
    _cube(m, (x0 - 0.025, y - 0.02, z1), (x1 + 0.025, y + 0.01, z1 + 0.032), "WOOD", 0.004)
    for x in (x0 - 0.012, x1 + 0.012):
        _cube(m, (x - 0.012, y - 0.016, z0), (x + 0.012, y + 0.01, z1), "WOOD", 0.003)


def _ring(m, E, t, z0, z1, mat="STONE", bevel=0.006):
    """네모 둘레 담(바깥 반폭 E, 두께 t): 앞뒤 두 판 + 좌우 두 판."""
    _cube(m, (-E, -E, z0), (E, -E + t, z1), mat, bevel)
    _cube(m, (-E, E - t, z0), (E, E, z1), mat, bevel)
    _cube(m, (-E, -E + t, z0), (-E + t, E - t, z1), mat, bevel)
    _cube(m, (E - t, -E + t, z0), (E, E - t, z1), mat, bevel)


# ---------------------------------------------------------------- 성벽·탑·성문
def crenel():
    """성벽 위 흉벽 한 칸: 길이 1.0, 이 셋. 이웃 칸과 붙여도 이가 1/3 간격으로 고르게 이어진다."""
    m = Model("crenel")
    rng = random.Random(77)
    d = 0.07  # 반두께 — 판이 칸 가운데서 0.42 자리에 놓아도 칸 밖으로 나가지 않는다
    for i in range(3):  # 아래 담은 세 덩이, 이음매가 이 사이 틈 밑에 온다
        x0 = -0.5 + i / 3
        _cube(m, (x0, -d, 0.0), (x0 + 1 / 3, d, 0.15), "STONE", 0.01)
    _cube(m, (-0.5, -d - 0.006, 0.15), (0.5, d + 0.006, 0.172), "STONE_DARK", 0.005)  # 갓돌 — 틈 바닥이 어둡게 보인다
    for x in (-1 / 3, 0.0, 1 / 3):
        _cube(m, (x - 0.095, -d, 0.172), (x + 0.095, d, 0.33 + rng.uniform(-0.008, 0.006)), "STONE", 0.012)
    return m


def _brazier_bowl(m, c, r=0.115, legs=0.1, coal="WOOD_DARK"):
    """세 발 달린 청동 불판(탑 봉화용, 불꽃은 판이 켠다). c는 발끝 높이의 가운데."""
    cx, cy, cz = c
    top = cz + legs + 0.08

    def bowl_mat(f):
        p = f.calc_center_median()
        inside = math.hypot(p.x - cx, p.y - cy) < r * 0.85
        return coal if f.normal.z > 0.8 and p.z > top - 0.02 and inside else "BRONZE"

    prof = [(0.0, cz + legs), (r * 0.5, cz + legs + 0.005), (r * 0.87, cz + legs + 0.04), (r, top), (r * 0.88, top), (0.0, top - 0.012)]
    m.add(lathe(prof, 12), bowl_mat, 40, M((cx, cy, 0)))
    for k in range(3):
        a = math.radians(90 + 120 * k)
        p0 = Vector((cx + math.cos(a) * r * 0.62, cy + math.sin(a) * r * 0.62, cz + legs + 0.02))
        p1 = Vector((cx + math.cos(a) * r * 0.95, cy + math.sin(a) * r * 0.95, cz))
        m.add(rod(p0, p1, 0.011, 0.009, 5), "BRONZE", 40)
    for k in range(3):  # 불판에서 삐져나온 장작
        a = math.radians(20 + 120 * k)
        d = Vector((math.cos(a), math.sin(a), 0.35)).normalized()
        p = Vector((cx, cy, top - 0.01))
        m.add(rod(p - d * 0.02, p + d * 0.085, 0.012, None, 5), "WOOD", False)


def tower():
    """성벽 탑 윗부분(몸 0.9×0.9): 칸을 덮는 밑단 + 들여 쌓은 몸 + 띠돌 + 흉벽 둘레(이 여덟) + 문·활 구멍 + 가운데 봉화 불판.
    밑단이 칸 전체(1.0)를 덮는 까닭: 판이 탑 칸 가장자리에도 흉벽을 놓으므로 그 흉벽을 속에 감춘다."""
    m = Model("tower")
    _cube(m, (-0.5, -0.5, 0.0), (0.5, 0.5, 0.35), "STONE", 0.014)
    _cube(m, (-0.45, -0.45, 0.35), (0.45, 0.45, 0.47), "STONE", 0.012)
    _cube(m, (-0.44, -0.44, 0.47), (0.44, 0.44, 0.58), "STONE", 0.012)
    _cube(m, (-0.465, -0.465, 0.58), (0.465, 0.465, 0.62), "STONE_DARK", 0.008)  # 띠돌이 곧 탑 위 바닥
    E, t, w = 0.45, 0.085, 0.17
    z1, z2 = 0.67, 0.8
    _ring(m, E, t, 0.62, z1)
    for sx in (-1, 1):  # 모서리 이(네모 통돌)
        for sy in (-1, 1):
            xa, xb = sorted((sx * E, sx * (E - w)))
            ya, yb = sorted((sy * E, sy * (E - w)))
            _cube(m, (xa, ya, z1), (xb, yb, z2), "STONE", 0.012)
    for s in (-1, 1):  # 가운데 이
        ya, yb = sorted((s * E, s * (E - t)))
        _cube(m, (-w / 2, ya, z1), (w / 2, yb, z2), "STONE", 0.012)
        _cube(m, (ya, -w / 2, z1), (yb, w / 2, z2), "STONE", 0.012)
    # 앞문(성벽 위 길로 난다): 나무 문 + 청동 띠 둘 + 돌 인방
    _on_wall(m, "front", 0.44, -0.085, 0.085, -0.01, 0.012, 0.35, 0.55, "WOOD", 0.004)
    for z in (0.4, 0.5):
        _on_wall(m, "front", 0.44, -0.085, 0.085, -0.01, 0.018, z - 0.012, z + 0.012, "BRONZE", 0.003)
    _on_wall(m, "front", 0.44, -0.12, 0.12, -0.015, 0.022, 0.55, 0.585, "STONE_DARK", 0.004)
    # 활 구멍: 앞은 문 양옆, 나머지 세 벽은 둘씩
    for face, us in (("front", (-0.26, 0.26)), ("back", (-0.2, 0.2)), ("left", (-0.2, 0.2)), ("right", (-0.2, 0.2))):
        for u in us:
            _on_wall(m, face, 0.44, u - 0.016, u + 0.016, -0.005, 0.013, 0.41, 0.53, "WOOD_DARK")
    # 바닥 들창
    _cube(m, (0.12, 0.12, 0.62), (0.3, 0.3, 0.628), "WOOD_DARK", 0.0)
    _cube(m, (0.135, 0.135, 0.622), (0.285, 0.285, 0.636), "WOOD", 0.004)
    _brazier_bowl(m, (0.0, 0.0, 0.62))
    return m


def _gate_frame(m):
    """문틀: 세 켜로 쌓은 문설주 둘 + 통돌 인방(걸어 둔 청동 방패) + 갓돌·이 셋 + 문지방 + 밖(-Y)을 향한 청동 횃불 받침 둘."""
    D = 0.2
    for s in (-1, 1):
        inner, outer = s * 0.3, s * 0.5
        for k, (z0, z1) in enumerate(((0.0, 0.34), (0.34, 0.68), (0.68, 1.02))):
            o = 0.006 if k == 1 else 0.0  # 가운데 켜를 앞뒤와 문길 쪽으로 조금 내밀어 켜가 보이게
            xa, xb = sorted((inner - s * o, outer))
            _cube(m, (xa, -D - o, z0), (xb, D + o, z1), "STONE", 0.014)
    _cube(m, (-0.3, -D, 0.0), (0.3, D, 0.025), "STONE_DARK", 0.006)  # 문지방
    _cube(m, (-0.5, -0.215, 1.02), (0.5, 0.215, 1.19), "STONE", 0.016)  # 통돌 인방
    _cube(m, (-0.26, -0.222, 1.06), (0.26, -0.21, 1.15), "STONE_DARK", 0.0)
    m.add(cyl(0.048, 0.042, 0.02, 14, 0.0), "BRONZE", 35, M((0.0, -0.222, 1.105), rot=(90, 0, 0)))
    m.add(sphere(0.016, 8, 5), "BRONZE", True, M((0.0, -0.244, 1.105)))
    _cube(m, (-0.5, -D, 1.19), (0.5, D, 1.22), "STONE_DARK", 0.005)
    for x in (-1 / 3, 0.0, 1 / 3):  # 성벽 흉벽과 같은 1/3 간격의 이
        _cube(m, (x - 0.095, -D, 1.22), (x + 0.095, -0.06, 1.4), "STONE", 0.012)
    for s in (-1, 1):  # 횃불: 청동 팔에 건 고리 + 꽂아 둔 나무 횃대 — 판이 횃대 머리 바로 위(±0.42, 앞 0.24, 1.08)에 불을 켠다
        x = s * 0.42
        m.add(rod((x, -D + 0.005, 0.9), (x, -0.235, 0.93), 0.01, None, 5), "BRONZE", 40)
        m.add(torus(0.021, 0.006, 8, 4), "BRONZE", True, M((x, -0.245, 0.93)))
        m.add(rod((x, -0.245, 0.85), (x, -0.245, 1.02), 0.011, 0.013, 6), "WOOD", 40)
        m.add(cyl(0.02, 0.023, 0.045, 7, 1.015), "LEATHER", 40, M((x, -0.245, 0)))


def _leaf(m, s, angle):
    """문짝 하나(s=1 오른쪽 +X, -1 왼쪽). 경첩은 문설주 안쪽 모서리에 있고 angle(도)만큼 안(+Y)으로 열린다.
    세로 널 셋 + 청동 띠 셋(띠마다 징 셋) + 문고리."""
    W, T, H = 0.3, 0.06, 0.99
    frame = Matrix.Translation((s * 0.3, 0.03, 0.025)) @ M(rot=(0, 0, -s * angle))
    u0 = min(0.0, -s * W)  # 문짝 좌표: 경첩이 원점이고 가운데 쪽(-s)으로 뻗는다
    mid = u0 + W / 2
    m.add(box(W - 0.012, T * 0.5, H - 0.02), "WOOD_DARK", False, frame @ M((mid, 0, H / 2)))
    for k in range(3):
        m.add(box(W / 3 - 0.008, T, H, 0.006), "WOOD", False, frame @ M((u0 + (k + 0.5) * W / 3, 0, H / 2)))
    for z in (0.17, 0.5, 0.83):
        m.add(box(W - 0.004, T + 0.014, 0.05, 0.004), "BRONZE", 30, frame @ M((mid, 0, z)))
        for k in range(3):
            m.add(cone(0.014, 0.013, 6), "BRONZE", 30, frame @ M((u0 + (k + 0.5) * W / 3, -(T + 0.014) / 2, z), rot=(90, 0, 0)))
    m.add(torus(0.032, 0.007, 10, 4), "BRONZE", True, frame @ M((-s * (W - 0.05), -T / 2 - 0.014, 0.62), rot=(90, 0, 0)))


def gate_closed():
    """스카이아이 문(닫힘): 돌 문틀(폭 1.0, 키 1.4) + 두 짝 나무 문(청동 띠·징) + 안쪽 빗장."""
    m = Model("gateClosed")
    _gate_frame(m)
    for s in (-1, 1):
        _leaf(m, s, 0.0)
    m.add(rod((-0.36, 0.105, 0.52), (0.36, 0.105, 0.52), 0.028, None, 6), "WOOD_DARK", False)  # 빗장
    for x in (-0.2, 0.2):
        _cube(m, (x - 0.03, 0.06, 0.48), (x + 0.03, 0.14, 0.56), "BRONZE", 0.004)
    return m


def gate_open():
    """스카이아이 문(열림): 문짝이 안(+Y, 성 안)으로 활짝 열리고 빗장은 문설주 뒤에 기대 둔다."""
    m = Model("gateOpen")
    _gate_frame(m)
    for s in (-1, 1):
        _leaf(m, s, 80.0)
    m.add(rod((-0.46, 0.3, 0.0), (-0.43, 0.215, 0.74), 0.028, None, 6), "WOOD_DARK", False)
    return m


# ---------------------------------------------------------------- 집
def house():
    """트로이 집(0.8×0.8, 키 0.6): 돌 밑단 + 흙 바른 벽 + 흙 평지붕(들보 끝이 삐죽) + 문·창 + 지붕 위 항아리·장작 + 사다리."""
    m = Model("house")
    W = 0.33
    _cube(m, (-W - 0.02, -W - 0.02, 0.0), (W + 0.02, W + 0.02, 0.1), "STONE_DARK", 0.012)
    _cube(m, (-W, -W, 0.1), (W, W, 0.48), "STONE", 0.008)
    for y in (-W, W):
        _beam_ends(m, [-0.24 + i * 0.12 for i in range(5)], y, 0.455)
    e, rim = W + 0.035, 0.03
    _cube(m, (-e, -e, 0.48), (e, e, 0.53), "STONE_DARK", 0.01)  # 흙 지붕
    # 지붕 턱: 오른쪽 뒤 모서리는 사다리가 닿는 자리라 비운다
    _cube(m, (-e, -e, 0.53), (e, -e + rim, 0.6), "STONE", 0.006)
    _cube(m, (-e, e - rim, 0.53), (0.1, e, 0.6), "STONE", 0.006)
    _cube(m, (-e, -e + rim, 0.53), (-e + rim, e - rim, 0.6), "STONE", 0.006)
    _cube(m, (e - rim, -e + rim, 0.53), (e, 0.06, 0.6), "STONE", 0.006)
    _door(m, 0.03, 0.17, -W, 0.1, 0.36)
    _window(m, "front", W, -0.17, 0.35)
    _window(m, "left", W, 0.02, 0.33)
    _window(m, "right", W, -0.14, 0.33)
    _window(m, "back", W, 0.12, 0.35)
    _pot(m, (-0.2, 0.16, 0.53), 0.11)
    _pot(m, (-0.08, 0.22, 0.53), 0.085)
    for k in range(3):  # 지붕 위 장작 더미
        z = 0.545 + (0.024 if k == 2 else 0.0)
        y = -0.16 + (0.022 if k == 2 else k * 0.045)
        m.add(rod((0.02, y, z), (0.22, y + 0.01, z), 0.014, None, 5), "WOOD", False)
    rails = []
    for y in (0.14, 0.25):  # 오른벽에 기댄 사다리
        a, b = Vector((0.415, y, 0.0)), Vector((0.36, y, 0.66))
        m.add(rod(a, b, 0.01, None, 5), "WOOD", False)
        rails.append((a, b))
    for k in range(6):
        t = (k + 0.7) / 7
        m.add(rod(rails[0][0].lerp(rails[0][1], t), rails[1][0].lerp(rails[1][1], t), 0.007, None, 4), "WOOD", False)
    return m


def house_b():
    """두 층 집(0.8×0.8, 키 0.8): 아래채 평지붕을 마당으로 쓰고 뒤 왼쪽에 윗채를 올렸다. 바깥 돌계단 + 마당 턱 + 포도 시렁."""
    m = Model("houseB")
    rng = random.Random(89)
    X0, X1, Y = -0.34, 0.24, 0.34  # 아래채 벽(오른쪽 0.24~0.37은 계단 자리)
    _cube(m, (X0 - 0.02, -Y - 0.02, 0.0), (X1 + 0.02, Y + 0.02, 0.09), "STONE_DARK", 0.012)
    _cube(m, (X0, -Y, 0.09), (X1, Y, 0.4), "STONE", 0.008)
    for y in (-Y, Y):
        _beam_ends(m, [X0 + 0.07 + i * 0.11 for i in range(5)], y, 0.375)
    _cube(m, (X0 - 0.03, -Y - 0.03, 0.4), (X1 + 0.03, Y + 0.03, 0.44), "STONE_DARK", 0.01)  # 아래채 지붕 = 마당
    U1, V0 = 0.04, -0.02  # 윗채: x -0.34~0.04, y -0.02~0.34
    _cube(m, (X0, V0, 0.44), (U1, Y, 0.72), "STONE", 0.008)
    _beam_ends(m, [X0 + 0.07 + i * 0.12 for i in range(3)], V0, 0.695)
    ex0, ex1, ey0, ey1 = X0 - 0.03, U1 + 0.03, V0 - 0.03, Y + 0.03
    _cube(m, (ex0, ey0, 0.72), (ex1, ey1, 0.76), "STONE_DARK", 0.01)
    r = 0.028
    _cube(m, (ex0, ey0, 0.76), (ex1, ey0 + r, 0.8), "STONE", 0.005)
    _cube(m, (ex0, ey1 - r, 0.76), (ex1, ey1, 0.8), "STONE", 0.005)
    _cube(m, (ex0, ey0 + r, 0.76), (ex0 + r, ey1 - r, 0.8), "STONE", 0.005)
    _cube(m, (ex1 - r, ey0 + r, 0.76), (ex1, ey1 - r, 0.8), "STONE", 0.005)
    # 마당 턱: 앞과 오른쪽(오른쪽 뒤는 계단 끝이라 비운다)
    _cube(m, (X0 - 0.03, -Y - 0.03, 0.44), (X1 + 0.03, -Y, 0.49), "STONE", 0.005)
    _cube(m, (X1, -Y, 0.44), (X1 + 0.03, 0.1, 0.49), "STONE", 0.005)
    # 바깥 돌계단: 앞에서 뒤로 오르며 마당 오른쪽 뒤 모서리에 닿는다
    steps = 6
    for i in range(steps):
        _cube(m, (X1 + 0.005, -0.27 + i * 0.085, 0.0), (X1 + 0.13, Y, (i + 1) * 0.44 / steps), "STONE_DARK", 0.006)
    _door(m, -0.13, 0.0, -Y, 0.09, 0.32)
    _window(m, "front", Y, 0.14, 0.29)
    _window(m, "left", -X0, 0.0, 0.29)
    _door(m, -0.22, -0.1, V0, 0.44, 0.63)  # 윗채 문(마당 쪽)
    _window(m, "right", U1, 0.17, 0.6)
    _window(m, "left", -X0, 0.15, 0.6)
    _pot(m, (0.14, -0.08, 0.44), 0.1)
    _pot(m, (0.19, 0.02, 0.44), 0.08)
    # 포도 시렁: 앞 기둥 둘 + 도리 + 서까래 셋 + 잎 덩이, 왼 기둥을 타고 오르는 포도 줄기
    zt = 0.66
    for x in (X0 + 0.03, X1 - 0.02):
        m.add(rod((x, -Y + 0.02, 0.44), (x, -Y + 0.02, zt), 0.013, None, 6), "WOOD", False)
    m.add(rod((X0, -Y + 0.02, zt), (X1 + 0.01, -Y + 0.02, zt), 0.012, None, 5), "WOOD", False)
    for x in (X0 + 0.05, -0.08, 0.16):
        m.add(rod((x, -Y - 0.01, zt + 0.012), (x, V0 + 0.01, zt + 0.012), 0.01, None, 5), "WOOD", False)
    m.add(tube([(X0 + 0.045, -Y + 0.03, 0.44), (X0 + 0.06, -Y + 0.04, 0.55), (X0 + 0.045, -Y + 0.03, zt)], [0.012, 0.01, 0.009], 5),
          "WOOD_DARK", False)
    for c, sc in (((X0 + 0.07, -0.24, zt + 0.03), (0.1, 0.11, 0.045)), ((-0.07, -0.26, zt + 0.035), (0.12, 0.1, 0.05)),
                  ((0.13, -0.2, zt + 0.03), (0.09, 0.1, 0.042)), ((-0.2, -0.1, zt + 0.03), (0.09, 0.08, 0.04))):
        m.add(_blob(rng, 1.0, 1, 0.2), "LEAF", 52, M(c, rot=(0, 0, rng.uniform(0, 360)), scale=sc))
    return m


# ---------------------------------------------------------------- 기둥·신전
def _plinth(m):
    _cube(m, (-0.19, -0.19, 0.0), (0.19, 0.19, 0.045), "STONE_DARK", 0.008)
    _cube(m, (-0.16, -0.16, 0.045), (0.16, 0.16, 0.08), "STONE", 0.008)


def column():
    """도리스식 기둥(키 1.0): 두 단 받침돌 위에 홈 판 몸 + 목 띠 + 에키누스 + 아바쿠스."""
    m = Model("column")
    _plinth(m)
    _doric(m, 0.0, 0.0, 0.08, 0.92, 0.115, 12)
    return m


def column_broken():
    """부러진 기둥: 0.45 언저리에서 비스듬히 꺾인 밑동 + 굴러떨어진 토막 + 엎어진 기둥머리 + 돌 부스러기."""
    m = Model("columnBroken")
    rng = random.Random(97)
    _plinth(m)
    stump = _break(_shaft(0.115, 0.105, 0.08, 0.42, 12), 0.42, rng, 0.045)
    m.add(stump, lambda f: "STONE_DARK" if f.normal.z > 0.35 and f.calc_center_median().z > 0.33 else "STONE", False)
    # 굴러떨어진 토막: 옆으로 누웠고 한쪽 끝이 깨졌다(깨진 면 재질은 눕히기 전에 가린다)
    drum = _break(_shaft(0.104, 0.098, 0.0, 0.3, 12, bulge=0.0), 0.3, rng, 0.03, 0.03)
    m.add_local(drum, lambda f: "STONE_DARK" if f.normal.z > 0.35 and f.calc_center_median().z > 0.24 else "STONE", False,
                M((0.03, -0.315, 0.098), rot=(0, 0, -8)) @ M(rot=(0, 90, 0)) @ M((0, 0, -0.15)))
    # 엎어진 기둥머리: 아바쿠스가 땅에 비스듬히 박히고 에키누스가 위를 본다
    cap = M((-0.3, 0.28, 0.0), rot=(0, 0, 20)) @ M((0, 0, 0.04), rot=(-10, 8, 0))
    m.add(box(0.28, 0.28, 0.06, 0.006), "STONE", False, cap @ M((0, 0, -0.005)))
    m.add(_capital(0.092, 0.0, 0.92, 16), "STONE", False, cap @ M((0, 0, 0.09), rot=(180, 0, 0)))
    for p, s in (((0.22, 0.16), 0.07), ((0.28, -0.03), 0.05), ((-0.07, 0.29), 0.055), ((0.12, 0.3), 0.04)):
        rock = jitter(ico(1.0, 1), 0.18, rng)
        for v in rock.verts:
            v.co.z = max(v.co.z, -0.3)
        m.add(rock, lambda f: "STONE" if f.normal.z > 0.4 else "STONE_DARK", False,
              M((p[0], p[1], s * 0.21), rot=(0, 0, rng.uniform(0, 360)), scale=(s, s * 0.85, s * 0.7)))
    return m


def temple():
    """작은 신전 앞면(2×1 칸, 키 1.3): 세 단 기단 + 도리스식 기둥 넷 + 들보·붉은 칠 띠와 세 줄 홈 판(트리글리프)
    + 박공(금 방패) + 붉은 기와 지붕 + 기둥 뒤 어두운 안채와 깊은 문(안에 금빛 신상)."""
    m = Model("temple")
    for hw, y0, y1, z0, z1, mat in ((0.97, -0.46, 0.44, 0.0, 0.05, "STONE_DARK"), (0.92, -0.41, 0.41, 0.05, 0.1, "STONE"),
                                    (0.87, -0.36, 0.38, 0.1, 0.15, "STONE")):
        _cube(m, (-hw, y0, z0), (hw, y1, z1), mat, 0.008)
    # 안채(켈라): 뒤 몸 + 앞벽 세 조각(가운데가 깊이 0.12인 문간) + 문틀
    zc, zd = 0.9, 0.64
    _cube(m, (-0.78, 0.06, 0.15), (0.78, 0.34, zc), "STONE_DARK", 0.008)
    _cube(m, (-0.78, -0.06, 0.15), (-0.13, 0.07, zc), "STONE_DARK", 0.008)
    _cube(m, (0.13, -0.06, 0.15), (0.78, 0.07, zc), "STONE_DARK", 0.008)
    _cube(m, (-0.14, -0.06, zd), (0.14, 0.07, zc), "STONE_DARK", 0.008)
    _cube(m, (-0.13, 0.052, 0.15), (0.13, 0.062, zd), "WOOD_DARK", 0.0)
    _cube(m, (-0.17, -0.078, zd), (0.17, -0.05, zd + 0.05), "STONE", 0.005)
    for x in (-0.15, 0.15):
        _cube(m, (x - 0.02, -0.074, 0.15), (x + 0.02, -0.05, zd), "STONE", 0.004)
    m.add(cone(0.05, 0.3, 8), "GOLD", 35, M((0.0, 0.02, 0.15)))  # 문 안 신상(옷자락)
    m.add(sphere(0.03, 8, 6), "GOLD", True, M((0.0, 0.02, 0.47)))
    for x in (-0.72, -0.24, 0.24, 0.72):
        _doric(m, x, -0.24, 0.15, 0.75, 0.07, 8, 12)
    _cube(m, (-0.86, -0.34, 0.9), (0.86, 0.36, 0.98), "STONE", 0.006)  # 들보
    _cube(m, (-0.85, -0.33, 0.98), (0.85, 0.35, 1.06), "RED_OCHRE", 0.004)  # 붉은 칠 띠(메토프 바탕)
    for i in range(7):  # 트리글리프: 앞면 일곱 + 양옆 셋씩
        x = -0.72 + i * 0.24
        _cube(m, (x - 0.03, -0.342, 0.982), (x + 0.03, -0.328, 1.058), "WOOD_DARK", 0.0)
    for s in (-1, 1):
        for y in (-0.24, 0.02, 0.26):
            xa, xb = sorted((s * 0.846, s * 0.858))
            _cube(m, (xa, y - 0.03, 0.982), (xb, y + 0.03, 1.058), "WOOD_DARK", 0.0)
    _cube(m, (-0.93, -0.4, 1.06), (0.93, 0.42, 1.1), "STONE", 0.006)  # 처마
    # 박공: 앞뒤 세모(어두운 바탕) + 지붕 속
    peak = 1.25
    gable = prism([(-0.9, 1.1), (0.9, 1.1), (0.0, peak)], 0.8, "XZ")
    m.add(gable, lambda f: "STONE_DARK" if abs(f.normal.y) > 0.9 else "STONE", False, M((0, 0.01, 0)))
    m.add(cyl(0.05, 0.05, 0.016, 14, 0.0), "GOLD", 35, M((0.0, -0.39, 1.155), rot=(90, 0, 0)))  # 박공 가운데 금 방패
    m.add(sphere(0.018, 8, 5), "GOLD", True, M((0.0, -0.407, 1.155)))
    ang = math.degrees(math.atan2(peak - 1.1, 0.9))
    slope = math.hypot(0.9, peak - 1.1)
    zmid = (peak + 1.1) / 2
    for s in (-1, 1):
        cx = s * 0.45
        # 비탈 처마돌(흰 돌 테두리, 앞뒤) + 붉은 기와 판 + 기와 골
        for y in (-0.41, 0.43):
            m.add(box(slope + 0.07, 0.05, 0.035, 0.005), "STONE", False, M((cx, y, zmid + 0.012), rot=(0, s * ang, 0)))
        m.add(box(slope + 0.08, 0.86, 0.03, 0.006), "RED_OCHRE", False, M((cx, 0.01, zmid + 0.022), rot=(0, s * ang, 0)))
        for k in range(7):
            y = -0.34 + k * 0.117
            m.add(rod((s * 0.03, y, peak + 0.037), (s * 0.95, y, 1.1 + 0.03), 0.011, None, 4), "RED_OCHRE", False)
    m.add(rod((0, -0.42, peak + 0.04), (0, 0.44, peak + 0.04), 0.02, None, 6), "RED_OCHRE", False)  # 용마루
    # 금 꼭지 장식(아크로테리온): 꼭대기 종려잎 꼴 + 양 끝 방울
    palm = [(-0.045, 0.0), (0.045, 0.0), (0.05, 0.03), (0.026, 0.058), (0.0, 0.07), (-0.026, 0.058), (-0.05, 0.03)]
    m.add(prism(palm, 0.014, "XZ"), "GOLD", 35, M((0.0, -0.42, peak + 0.03)))
    for s in (-1, 1):
        m.add(cone(0.028, 0.06, 6), "GOLD", False, M((s * 0.91, -0.41, 1.1)))
    return m


# ---------------------------------------------------------------- 제단·화로·신상·샘
def altar():
    """돌 제단(0.5×0.36): 밑단 + 몸 + 붉은 띠 + 갓돌 + 양끝 두루마리 받침 + 앞면 꽃줄 + 장작불."""
    m = Model("altar")
    _cube(m, (-0.29, -0.21, 0.0), (0.29, 0.21, 0.05), "STONE_DARK", 0.008)
    _cube(m, (-0.24, -0.16, 0.05), (0.24, 0.16, 0.28), "STONE", 0.008)
    _cube(m, (-0.247, -0.167, 0.225), (0.247, 0.167, 0.25), "RED_OCHRE", 0.003)
    _cube(m, (-0.27, -0.19, 0.28), (0.27, 0.19, 0.32), "STONE", 0.008)
    for s in (-1, 1):  # 두루마리 받침(볼스터) + 끝의 소용돌이 눈
        m.add(cyl(0.045, 0.045, 0.38, 12, -0.19), "STONE", False, M((s * 0.215, 0.0, 0.365), rot=(90, 0, 0)))
        for y in (-0.196, 0.196):
            m.add(cyl(0.028, 0.028, 0.012, 10, -0.006), "STONE_DARK", False, M((s * 0.215, y, 0.365), rot=(90, 0, 0)))
    # 앞면 꽃줄(올리브 잎) + 양끝에 늘어진 붉은 띠
    swag = [(-0.19, -0.166, 0.2), (-0.1, -0.172, 0.14), (0.0, -0.174, 0.12), (0.1, -0.172, 0.14), (0.19, -0.166, 0.2)]
    m.add(tube(swag, [0.014, 0.018, 0.02, 0.018, 0.014], 6), "LEAF", 50)
    for x in (-0.19, 0.19):
        m.add(tube([(x, -0.168, 0.2), (x * 1.02, -0.172, 0.14), (x * 1.04, -0.17, 0.09)], [0.008, 0.007, 0.005], 4), "RED_OCHRE")
    _fire(m, (0.0, 0.0, 0.32), 0.9)
    return m


def brazier():
    """청동 세발 화로(키 0.5): 깊은 청동 대야 + 바깥으로 휜 다리 셋(사자 발) + 가운데 고리 + 손잡이 둘 + 숯과 불."""
    m = Model("brazier")
    top = 0.34

    def bowl_mat(f):
        p = f.calc_center_median()
        return "WOOD_DARK" if f.normal.z > 0.8 and p.z > top - 0.03 and math.hypot(p.x, p.y) < 0.15 else "BRONZE"

    prof = [(0.0, 0.22), (0.08, 0.225), (0.135, 0.26), (0.162, 0.31), (0.172, top), (0.158, top), (0.0, top - 0.02)]
    m.add(lathe(prof, 16), bowl_mat, 45)
    m.add(torus(0.17, 0.009, 16, 4), "BRONZE", True, M((0, 0, top)))
    for k in range(3):
        a = math.radians(90 + 120 * k)
        c, s = math.cos(a), math.sin(a)
        pts = [(c * 0.13, s * 0.13, 0.3), (c * 0.16, s * 0.16, 0.22), (c * 0.15, s * 0.15, 0.12), (c * 0.19, s * 0.19, 0.03)]
        m.add(tube(pts, [0.016, 0.014, 0.012, 0.013], 6), "BRONZE", 40)
        m.add(sphere(0.026, 8, 5), "BRONZE", True, M((c * 0.2, s * 0.2, 0.018), scale=(1.2, 1.2, 0.7)))  # 사자 발
    m.add(torus(0.152, 0.008, 18, 4), "BRONZE", True, M((0, 0, 0.13)))
    for s in (-1, 1):  # 세운 고리 손잡이
        m.add(torus(0.04, 0.008, 10, 4), "BRONZE", True, M((s * 0.18, 0.0, top + 0.02), rot=(90, 0, 90)))
    for k in range(6):  # 숯 덩이
        a = math.radians(60 * k + 15)
        m.add(ico(0.026, 1), "WOOD_DARK", False, M((0.085 * math.cos(a), 0.085 * math.sin(a), top - 0.008)))
    _fire(m, (0.0, 0.0, top - 0.01), 0.72, logs=False)
    return m


def statue():
    """받침 위 아테나 신상(팔라디온, 키 1.0): 돌 몸에 금 투구·깃·가슴 가리개(아이기스)·창·방패 테.
    예스러운 곧은 자세로 오른손을 들어 창을 쥐고 왼팔에 방패를 멘다."""
    m = Model("statue")
    _cube(m, (-0.19, -0.19, 0.0), (0.19, 0.19, 0.06), "STONE_DARK", 0.008)
    _cube(m, (-0.15, -0.15, 0.06), (0.15, 0.15, 0.26), "STONE", 0.008)
    _cube(m, (-0.153, -0.153, 0.19), (0.153, 0.153, 0.21), "GOLD", 0.002)  # 새김 띠
    _cube(m, (-0.17, -0.17, 0.26), (0.17, 0.17, 0.3), "STONE", 0.008)
    m.push(M((0.0, 0.0, 0.3), scale=0.8))
    for s in (-1, 1):  # 옷자락 밑 두 발
        m.add(box(0.05, 0.08, 0.03, 0.008), "STONE", False, M((s * 0.045, -0.085, 0.015)))
    robe(m, top=0.47, r_top=0.07, r_bot=0.12, mat="STONE", hem="GOLD", sy=0.84, hem_h=0.035)
    shoulders(m, "STONE", r=0.04)
    # 아이기스: 가슴을 덮는 금 깃(앞쪽으로 반 바퀴 남짓) + 가운데 고르곤 얼굴
    aegis = lathe([(0.1, 0.37), (0.113, 0.37), (0.106, 0.46), (0.093, 0.46)], 12, arc=220, start=-200, loop=True)
    bmesh.ops.recalc_face_normals(aegis, faces=aegis.faces[:])
    m.add(aegis, "GOLD", 40, M(scale=(1.0, 0.86, 1.0)))
    m.add(sphere(0.024, 8, 5), "STONE_DARK", True, M((0.0, -0.1, 0.41), scale=(1, 0.5, 1)))
    m.add(cyl(0.036, 0.034, 0.06, 8, 0.46), "STONE", True)
    m.add(sphere(0.098, 12, 8), "STONE", True, M((0, 0, HEAD_Z)))
    helmet_corinthian(m, mat="GOLD", slit="STONE_DARK", n=14)
    crest(m, mat="GOLD", height=0.075)
    hand = (-0.165, -0.04, 0.6)
    arm(m, [(-0.1, 0.0, 0.452), (-0.175, -0.01, 0.52), hand], mat="STONE", hand=False)
    m.add(sphere(0.028, 8, 5), "STONE", True, M(hand))
    spear(m, hand[0], hand[1], 0.2, 0.8, r=0.014, tip="GOLD", shaft="GOLD", tip_len=0.13, tip_w=0.028)
    arm(m, [(0.1, 0.0, 0.452), (0.15, -0.03, 0.37), (0.12, -0.09, 0.39)], mat="STONE", hand=False)
    shield_round(m, (0.085, -0.13, 0.35), yaw=22, R=0.18, face="STONE", rim="GOLD", back="STONE_DARK", boss="GOLD", boss_r=0.05)
    m.pop()
    return m


def spring():
    """두 샘(『일리아스』 22권): 돌벽 물꼭지 둘 → 둥근 돌 물확 둘(왼쪽은 김이 오르는 더운 샘, 오른쪽은 찬 샘)
    → 앞의 넓은 빨래 돌확. 돌확 가에 빨던 옷과 물동이."""
    m = Model("spring")
    rng = random.Random(101)
    # 바닥 판석: 크기가 다른 돌 판을 틈을 두고 깐다
    for i, (x0, x1) in enumerate(((-0.45, -0.16), (-0.15, 0.13), (0.14, 0.45))):
        for j, (y0, y1) in enumerate(((-0.45, -0.1), (-0.09, 0.25))):
            _cube(m, (x0 + 0.004, y0 + 0.004, 0.0), (x1 - 0.004, y1 - 0.004, 0.022 + 0.004 * ((i + j) % 2)),
                  "STONE_DARK" if (i + j) % 2 else "STONE", 0.006)
    # 뒷벽 + 갓돌
    for x0, x1 in ((-0.44, -0.147), (-0.147, 0.147), (0.147, 0.44)):
        _cube(m, (x0, 0.24, 0.0), (x1, 0.4, 0.34), "STONE", 0.012)
    _cube(m, (-0.455, 0.225, 0.34), (0.455, 0.415, 0.37), "STONE_DARK", 0.006)
    bowl = [(0.0, 0.02), (0.13, 0.02), (0.152, 0.07), (0.158, 0.135), (0.14, 0.142), (0.126, 0.118), (0.0, 0.118)]
    for s in (-1, 1):
        x = s * 0.22
        # 물꼭지(청동 관) + 떨어지는 물줄기
        _cube(m, (x - 0.045, 0.228, 0.23), (x + 0.045, 0.245, 0.3), "STONE_DARK", 0.004)
        m.add(rod((x, 0.24, 0.265), (x, 0.18, 0.258), 0.013, 0.012, 7), "BRONZE", 40)
        m.add(tube([(x, 0.185, 0.258), (x, 0.158, 0.235), (x, 0.14, 0.19), (x, 0.13, 0.13)], [0.009, 0.01, 0.011, 0.012], 6), "WATER")
        # 둥근 물확: 윗면 안쪽이 물
        m.add(lathe(bowl, 14),
              lambda f: "WATER" if f.normal.z > 0.9 and f.calc_center_median().z < 0.125 else "STONE", False, M((x, 0.07, 0)))
    for dx, dy, z, r in ((0.0, 0.0, 0.18, 0.05), (0.022, -0.01, 0.26, 0.045), (-0.012, -0.02, 0.34, 0.04),
                         (0.016, -0.03, 0.42, 0.032), (-0.004, -0.035, 0.48, 0.022)):
        m.add(_blob(rng, 1.0, 2, 0.12), "CLOTH", 60, M((-0.22 + dx, 0.07 + dy, z), scale=(r, r, r * 0.8)))  # 더운 샘의 김
    for k in range(3):  # 찬 샘 가 이끼
        a = math.radians(-40 + 45 * k)
        m.add(_blob(rng, 1.0, 1, 0.2), "LEAF_DARK", 50,
              M((0.22 + 0.16 * math.cos(a), 0.07 + 0.16 * math.sin(a), 0.02), scale=(0.035, 0.03, 0.022)))
    # 빨래 돌확: 바닥 + 네 테두리 + 물
    X, Y0, Y1, t = 0.37, -0.4, -0.14, 0.035
    _cube(m, (-X, Y0, 0.0), (X, Y1, 0.05), "STONE", 0.006)
    _cube(m, (-X, Y0, 0.05), (X, Y0 + t, 0.12), "STONE", 0.008)
    _cube(m, (-X, Y1 - t, 0.05), (X, Y1, 0.12), "STONE", 0.008)
    for s in (-1, 1):
        xa, xb = sorted((s * X, s * (X - t)))
        _cube(m, (xa, Y0 + t, 0.05), (xb, Y1 - t, 0.12), "STONE", 0.008)
    _cube(m, (-X + t, Y0 + t, 0.05), (X - t, Y1 - t, 0.1), "WATER", 0.0)
    for s in (-1, 1):  # 물확에서 빨래 돌확으로 넘치는 물길
        _cube(m, (s * 0.22 - 0.025, -0.15, 0.02), (s * 0.22 + 0.025, -0.07, 0.1), "STONE_DARK", 0.003)
        _cube(m, (s * 0.22 - 0.014, -0.155, 0.1), (s * 0.22 + 0.014, -0.075, 0.11), "WATER", 0.0)
    # 테두리에 걸쳐 둔 빨래(흰 옷, 붉은 단)
    _cube(m, (-0.2, Y0 - 0.003, 0.12), (-0.02, Y0 + t + 0.01, 0.132), "CLOTH", 0.004)
    _cube(m, (-0.2, Y0 - 0.012, 0.04), (-0.02, Y0 - 0.002, 0.13), "CLOTH", 0.003)
    _cube(m, (-0.2, Y0 - 0.014, 0.04), (-0.02, Y0 - 0.004, 0.058), "RED_OCHRE", 0.002)
    # 물동이(휘드리아)
    hyd = [(0.0, 0.0), (0.03, 0.0), (0.045, 0.04), (0.05, 0.08), (0.036, 0.118), (0.019, 0.132), (0.024, 0.15), (0.0, 0.148)]
    m.add(lathe(hyd, 10), "RED_OCHRE", 50, M((0.39, -0.07, 0.022)))
    m.add(torus(0.022, 0.006, 8, 4), "RED_OCHRE", True, M((0.39, -0.022, 0.12), rot=(90, 0, 90)))
    return m


MODELS = {
    "crenel": {"build": crenel, "kind": "prop", "ground": "#cdbf9f"},
    "tower": {"build": tower, "kind": "prop", "ground": "#cdbf9f"},
    "gateClosed": {"build": gate_closed, "kind": "prop", "ground": "#b59a6b"},
    "gateOpen": {"build": gate_open, "kind": "prop", "ground": "#b59a6b"},
    "house": {"build": house, "kind": "prop", "ground": "#c7b08a"},
    "houseB": {"build": house_b, "kind": "prop", "ground": "#c7b08a"},
    "column": {"build": column, "kind": "prop", "ground": "#bdb49f"},
    "columnBroken": {"build": column_broken, "kind": "prop", "ground": "#b8ab8c"},
    "temple": {"build": temple, "kind": "prop", "foot": (2, 1), "ground": "#d9d0bb"},
    "altar": {"build": altar, "kind": "prop", "ground": "#d9d0bb"},
    "brazier": {"build": brazier, "kind": "prop", "ground": "#bdb49f"},
    "statue": {"build": statue, "kind": "prop", "ground": "#d9d0bb"},
    "spring": {"build": spring, "kind": "prop"},
}
