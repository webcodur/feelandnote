# 트로이 목마 — 이 게임의 얼굴. 2×2 칸, 키 2.2, 앞(-Y)이 말 머리.
# 몸·목·머리·다리는 판자를 길이로 이어 짠 통이다(판자는 WOOD, 판자 사이 좁은 이음매는 WOOD_DARK).
# 검은 널 바닥에 바퀴 넷 달린 받침 위에 서 있고, 왼 옆구리(+X, 미리 보기 카메라 쪽)의 문이 열려 줄사다리가 받침까지 드리웠다.
# 10장(목마·야간)에서 그리스 병사들이 빠져나와 성문을 여는 장면에 맞춘 모양이다.
import math
import random

import bmesh
from mathutils import Matrix, Vector

from lib import M, Model, align_z, box, cone, cyl, lathe, prism, rod, sphere, torus, tube

X_AXIS = Vector((1.0, 0.0, 0.0))


# ---------------------------------------------------------------- 판자 통
def _superellipse(th, power):
    c, s = math.cos(th), math.sin(th)
    return math.copysign(abs(c) ** (2.0 / power), c), math.copysign(abs(s) ** (2.0 / power), s)


def _section(C, U, V, a, b, planks, seam, power, rot0):
    """단면 한 바퀴: 판자마다 [판자 시작, 판자 끝] 두 점. 판자 면은 평평한 널빤지, 판자 끝과 다음 판자 시작 사이 좁은 면이 이음매다."""
    step = 2 * math.pi / planks
    g = step * seam / 2
    pts = []
    for k in range(planks):
        th0 = rot0 + k * step
        for th in (th0 + g, th0 + step - g):
            sx, sy = _superellipse(th, power)
            pts.append(C + U * (a * sx) + V * (b * sy))
    return pts


def _frames(centers):
    """YZ 평면 위 중심선의 틀: T 진행 방향, U는 늘 +X(말의 왼쪽), V = T×U(목에선 갈기 쪽, 머리에선 이마 쪽)."""
    out = []
    n = len(centers)
    for i in range(n):
        a, b = centers[max(i - 1, 0)], centers[min(i + 1, n - 1)]
        T = (b - a).normalized()
        out.append((T, X_AXIS.copy(), Vector((0.0, T.z, -T.y))))
    return out


def plank_loft(stations, planks=12, seam=0.09, power=2.4, rot0=0.0, caps=("WOOD_DARK", "WOOD_DARK")):
    """판자로 짠 통. stations = [(가운데, 반폭 a, 반높이 b)…]. (bmesh, 면별 재질 목록)을 돌려준다."""
    centers = [Vector(c) for c, _a, _b in stations]
    frames = _frames(centers)
    bm = bmesh.new()
    rings = []
    for (c, a, b), (T, U, V) in zip(stations, frames):
        rings.append([bm.verts.new(p) for p in _section(Vector(c), U, V, a, b, planks, seam, power, rot0)])
    mats = []
    n = len(rings[0])
    for A, B in zip(rings, rings[1:]):
        for j in range(n):
            j2 = (j + 1) % n
            bm.faces.new((A[j], A[j2], B[j2], B[j]))
            mats.append("WOOD" if j % 2 == 0 else "WOOD_DARK")
    bm.faces.new(list(reversed(rings[0])))
    mats.append(caps[0])
    bm.faces.new(rings[-1])
    mats.append(caps[1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bm.faces.index_update()
    return bm, mats


def _add_loft(m, stations, smooth=10, **kw):
    """판자 면은 길이 방향으로만 매끈하게 잇는다. 판자와 이음매 사이는 10°를 넘어 각이 서므로 널빤지는 평평하게 남고,
    길이 방향으로 점을 나눠 써서 파일이 작아진다."""
    bm, mats = plank_loft(stations, **kw)
    m.add(bm, lambda f: mats[f.index], smooth)


def _at(stations, s):
    """중심선 위 비율 s(0~1) 자리의 (가운데, T, U, V, a, b) — 마디 사이를 곧게 잇는다."""
    centers = [Vector(c) for c, _a, _b in stations]
    frames = _frames(centers)
    x = s * (len(stations) - 1)
    i = min(int(x), len(stations) - 2)
    f = x - i
    C = centers[i].lerp(centers[i + 1], f)
    T = frames[i][0].lerp(frames[i + 1][0], f).normalized()
    V = Vector((0.0, T.z, -T.y))
    a = stations[i][1] + (stations[i + 1][1] - stations[i][1]) * f
    b = stations[i][2] + (stations[i + 1][2] - stations[i][2]) * f
    return C, T, X_AXIS.copy(), V, a, b


def _basis(T, U, V):
    """부품 좌표(X 옆, Y 진행, Z 위)를 (U, T, V) 틀에 맞추는 회전. 오른손 좌표가 되도록 옆축을 -U로 둔다."""
    return Matrix((-U, T, V)).transposed().to_4x4()


def _outline(C, U, V, a, b, n=18, grow=0.0, power=2.4, arc=(0.0, 360.0)):
    """단면 둘레를 바깥으로 grow만큼 띄운 점들(띠 테·굴레·꽃줄)."""
    pts = []
    full = abs(arc[1] - arc[0] - 360.0) < 1e-6
    count = n if full else n + 1
    for i in range(count):
        th = math.radians(arc[0] + (arc[1] - arc[0]) * i / n)
        sx, sy = _superellipse(th, power)
        pts.append(C + U * ((a + grow) * sx) + V * ((b + grow) * sy))
    return pts


# ---------------------------------------------------------------- 뼈대 치수
# 몸통 옆모습: 등선(기갑이 솟고 허리가 조금 꺼졌다가 엉덩이가 둥글다)과 배선(가슴이 깊고 옆구리로 가며 올라간다), 반폭
BODY_HALF = 0.68
BODY_TOP = [(-1.0, 1.28), (-0.8, 1.44), (-0.55, 1.47), (-0.2, 1.43), (0.2, 1.42), (0.55, 1.47), (0.85, 1.42), (1.0, 1.3)]
BODY_BOT = [(-1.0, 1.06), (-0.8, 0.93), (-0.55, 0.89), (-0.1, 0.9), (0.3, 0.95), (0.6, 1.0), (0.85, 1.06), (1.0, 1.15)]
BODY_W = [(-1.0, 0.15), (-0.8, 0.26), (-0.55, 0.31), (-0.1, 0.325), (0.3, 0.315), (0.6, 0.335), (0.85, 0.285), (1.0, 0.15)]
# 목은 몸통 속에서 시작해 머리 속에서 끝난다(두 끝 뚜껑이 겉에 드러나지 않게)
NECK = [((0.0, -0.36, 1.24), 0.22, 0.3), ((0.0, -0.5, 1.46), 0.19, 0.235), ((0.0, -0.6, 1.64), 0.16, 0.19),
        ((0.0, -0.665, 1.79), 0.14, 0.16), ((0.0, -0.69, 1.9), 0.125, 0.14), ((0.0, -0.7, 1.98), 0.11, 0.12)]
HEAD = [((0.0, -0.57, 1.985), 0.132, 0.158), ((0.0, -0.675, 1.96), 0.145, 0.172), ((0.0, -0.78, 1.875), 0.122, 0.138),
        ((0.0, -0.865, 1.775), 0.105, 0.116), ((0.0, -0.925, 1.68), 0.097, 0.104)]
# 다리 마디 (y, z, 반지름): 어깨·엉덩이 → 팔꿈치·허벅지 → 무릎·뒷무릎(비절) → 발목. 뒷다리는 뒤로 꺾였다 앞으로 내려온다
LEGS = {
    "front": (0.17, [(-0.44, 1.05, 0.1), (-0.45, 0.76, 0.075), (-0.45, 0.62, 0.06), (-0.46, 0.4, 0.05)]),
    "hind": (0.18, [(0.44, 1.08, 0.11), (0.52, 0.8, 0.075), (0.54, 0.64, 0.06), (0.5, 0.4, 0.05)]),
}
DECK_Z = 0.3


def _lerp_table(t, table):
    for (t0, v0), (t1, v1) in zip(table, table[1:]):
        if t <= t1:
            return v0 + (v1 - v0) * (t - t0) / (t1 - t0)
    return table[-1][1]


def _body_shape(t):
    """몸통 비율 자리 t(-1 가슴 ~ 1 엉덩이)의 (가운데 높이, 반폭, 반높이). 두 끝 1/4은 달걀처럼 오므린다."""
    top, bot, w = _lerp_table(t, BODY_TOP), _lerp_table(t, BODY_BOT), _lerp_table(t, BODY_W)
    u = max(0.0, (abs(t) - 0.75) / 0.25)
    c = (1.0 - min(u, 1.0) ** 2.2) ** (1 / 2.2)
    return (top + bot) / 2, w * c, (top - bot) / 2 * c


def _body_stations(n=14):
    out = []
    for i in range(n):
        t = -math.cos(math.pi * i / (n - 1)) * 0.985
        zc, a, b = _body_shape(t)
        out.append(((0.0, BODY_HALF * t, zc), a, b))
    return out


def _body_x(z, y):
    """몸통 옆면이 높이 z에서 X로 얼마나 나와 있나(문을 몸에 붙일 때 쓴다)."""
    zc, a, b = _body_shape(y / BODY_HALF)
    u = min(1.0, abs(z - zc) / b)
    return a * (1.0 - u ** 2.4) ** (1 / 2.4)


# ---------------------------------------------------------------- 몸의 부품
def _legs(m):
    """판자 다리 넷: 굵은 윗다리가 가는 정강이로 좁아지고, 무릎을 검은 띠로 감고, 발굽에 청동을 씌웠다."""
    for name, (x0, path) in LEGS.items():
        for s in (-1, 1):
            x = s * x0
            _add_loft(m, [((x, y, z), r, r) for y, z, r in path], planks=6, power=3.0, rot0=math.radians(30))
            ky, kz, kr = path[2]
            m.add(cyl(kr + 0.014, kr + 0.014, 0.05, 8, -0.025), "WOOD_DARK", False, M((x, ky, kz)))
            fy, fz, fr = path[3]
            hoof = [(0.0, DECK_Z), (0.072, DECK_Z), (0.068, DECK_Z + 0.035), (fr + 0.008, fz + 0.012), (0.0, fz + 0.012)]
            m.add(lathe(hoof, 8), "BRONZE", False, M((x, fy - 0.006, 0.0)))


def _mane(m):
    """목 등성이를 따라 선 검은 널 갈기(정수리 쪽이 높다)."""
    rng = random.Random(3)
    count = 10
    for k in range(count):
        s = 0.2 + 0.7 * k / (count - 1)
        C, T, U, V, a, b = _at(NECK, s)
        h = 0.12 + 0.07 * (k / (count - 1)) + rng.uniform(-0.012, 0.012)
        board = [(-0.042, -0.04), (0.042, -0.04), (0.048, h * 0.7), (0.0, h), (-0.036, h * 0.8)]
        m.add(prism(board, 0.028, "YZ"), "WOOD_DARK", False, Matrix.Translation(C + V * (b - 0.01)) @ _basis(T, U, V))


def _tail(m):
    """꼬리: 엉덩이 위에서 뒤로 휘었다가 늘어지는 검은 줄 다섯 + 뿌리의 청동 고리."""
    root = Vector((0.0, 0.63, 1.31))
    for k in range(-2, 3):
        x = 0.013 * k
        pts = [root + Vector((x, 0.0, 0.0)), Vector((x * 1.3, 0.72, 1.27)), Vector((x * 2.4, 0.79, 1.05)),
               Vector((x * 3.6, 0.785 - 0.008 * abs(k), 0.78 + 0.035 * abs(k)))]
        m.add(tube(pts, [0.032, 0.03, 0.021, 0.006], 5), "WOOD_DARK", 50)
    m.add(torus(0.064, 0.013, 10, 3), "BRONZE", True, M((0.0, 0.672, 1.292), rot=(66, 0, 0)))


def _head_parts(m):
    """귀·칠한 눈·콧구멍·입·앞머리 + 청동 굴레(코띠·볼띠·이마띠·이마 원판)."""
    for s in (-1, 1):  # 귀: 정수리에서 위로, 조금 뒤로 젖히고 바깥으로 벌린다(앞뒤로 납작한 네모뿔)
        C, T, U, V, a, b = _at(HEAD, 0.1)
        base = C + V * (b * 0.8) + U * (s * 0.066)
        d = (V * 0.92 - T * 0.3 + U * (s * 0.18)).normalized()
        m.add(cone(0.05, 0.1, 4), "WOOD", False, Matrix.Translation(base) @ align_z(d) @ M(rot=(0, 0, 45), scale=(1.0, 0.6, 1.0)))
    for s in (-1, 1):  # 배처럼 칠한 눈: 흰 바탕 + 검은 눈동자(작게 보여도 눈이 먼저 읽히게 크게 칠했다)
        C, T, U, V, a, b = _at(HEAD, 0.3)
        p = C + U * (s * (a - 0.004)) + V * (b * 0.3)
        frame = Matrix.Translation(p) @ _basis(T, U, V)
        m.add(sphere(1.0, 8, 5), "CLOTH", True, frame @ M(scale=(0.016, 0.06, 0.042)))
        m.add(sphere(1.0, 6, 4), "WOOD_DARK", True, frame @ M((s * -0.011, -0.005, 0.0), scale=(0.013, 0.027, 0.027)))
    C, T, U, V, a, b = _at(HEAD, 1.0)
    for s in (-1, 1):  # 콧구멍
        m.add(sphere(0.02, 6, 4), "WOOD_DARK", True, Matrix.Translation(C + T * 0.006 + U * (s * 0.042) + V * 0.015) @ _basis(T, U, V)
              @ M(scale=(1.0, 0.5, 0.75)))
    m.add(box(0.11, 0.012, 0.012), "WOOD_DARK", False, Matrix.Translation(C + T * 0.006 - V * 0.05) @ _basis(T, U, V))  # 입
    C, T, U, V, a, b = _at(HEAD, 0.14)
    for k in (-1, 0, 1):  # 앞머리: 두 귀 사이에서 이마 쪽으로 눕힌 짧은 널
        d = (V * 0.35 + T * 0.65 + U * (0.25 * k)).normalized()
        base = C + V * (b * 0.9) + U * (0.03 * k)
        m.add(prism([(-0.022, 0.0), (0.022, 0.0), (0.0, 0.085)], 0.018, "YZ"), "WOOD_DARK", False,
              Matrix.Translation(base) @ align_z(d))
    # 굴레
    C, T, U, V, a, b = _at(HEAD, 0.72)
    band = _outline(C, U, V, a, b, 12, grow=0.006)
    m.add(tube(band, [(0.016, 0.007)] * len(band), 4, closed=True, up=tuple(T), phase=45), "BRONZE", 40)
    C0, T0, U0, V0, a0, b0 = _at(HEAD, 0.12)
    for s in (-1, 1):
        p0 = C + U * (s * (a + 0.006))
        p1 = C0 + U0 * (s * (a0 + 0.006)) + V0 * (b0 * 0.45)
        m.add(tube([p0, p0.lerp(p1, 0.5) + U * (s * 0.004), p1], 0.008, 4, phase=45), "BRONZE", 40)
    C, T, U, V, a, b = _at(HEAD, 0.2)
    brow = _outline(C, U, V, a, b, 8, grow=0.006, arc=(-20.0, 200.0))
    m.add(tube(brow, [(0.012, 0.006)] * len(brow), 4, up=tuple(T), phase=45), "BRONZE", 40)
    C, T, U, V, a, b = _at(HEAD, 0.48)
    m.add(cyl(0.036, 0.03, 0.014, 12, 0.0), "BRONZE", 35, Matrix.Translation(C + V * (b - 0.004)) @ _basis(T, U, V))


def _garland(m):
    """목 밑동에 두른 올리브 꽃줄 + 흰·붉은 꽃(트로이 사람들이 끌어들이며 걸었다)."""
    rng = random.Random(9)
    C, T, U, V, a, b = _at(NECK, 0.2)
    pts = _outline(C, U, V, a, b, 16, grow=0.012)
    for p in pts:
        p += Vector((rng.uniform(-1, 1), rng.uniform(-1, 1), rng.uniform(-1, 1))) * 0.006
    m.add(tube(pts, 0.026, 5, closed=True, up=tuple(T)), "LEAF", 45)
    for k in range(0, 16, 2):
        m.add(sphere(0.021, 5, 3), "CLOTH" if k % 4 == 0 else "RED_OCHRE", True, M(pts[k] + (pts[k] - C).normalized() * 0.02))


def _door(m, opened=True):
    """왼 옆구리 문: 어두운 문간 + 나무 문틀 + 문짝(세로 널·청동 경첩·문고리).
    열면 문짝이 바깥으로 55° 벌어지고 받침까지 줄사다리가 드리운다. 닫으면 문짝이 문틀에 붙고 청동 빗장이 가로지른다."""
    y0, y1 = -0.11, 0.19
    zc = _body_shape(((y0 + y1) / 2) / BODY_HALF)[0]
    z0, z1 = zc - 0.12, zc + 0.12
    xs = _body_x(zc, (y0 + y1) / 2) + 0.006
    # 문간과 문틀은 몸 속으로 깊이 박아, 몸이 둥글게 빠지는 위아래에서도 틈이 보이지 않게 한다
    m.add(box(0.05, y1 - y0, z1 - z0), "WOOD_DARK", False, M((xs - 0.02, (y0 + y1) / 2, (z0 + z1) / 2)))
    fw = 0.032
    for (ya, yb, za, zb) in ((y0 - fw, y1 + fw, z1, z1 + fw), (y0 - fw, y1 + fw, z0 - fw, z0),
                             (y0 - fw, y0, z0, z1), (y1, y1 + fw, z0, z1)):
        m.add(box(0.07, yb - ya, zb - za), "WOOD", False, M((xs - 0.011, (ya + yb) / 2, (za + zb) / 2)))
    # 문짝: 앞쪽 모서리에 경첩, 밖(+X)으로 55° 열림(닫으면 0°)
    hinge = Matrix.Translation((xs + 0.012, y0, 0.0)) @ M(rot=(0, 0, -55 if opened else 0))
    W, H = y1 - y0, z1 - z0
    m.add(box(0.016, W - 0.01, H - 0.01), "WOOD_DARK", False, hinge @ M((0.0, W / 2, (z0 + z1) / 2)))
    for k in range(3):
        m.add(box(0.028, W / 3 - 0.008, H), "WOOD", False, hinge @ M((0.0, (k + 0.5) * W / 3, (z0 + z1) / 2)))
    for z in (z0 + 0.05, z1 - 0.05):
        m.add(box(0.036, W * 0.8, 0.026), "BRONZE", 30, hinge @ M((0.0, W * 0.4, z)))
    m.add(torus(0.024, 0.006, 8, 3), "BRONZE", True, hinge @ M((0.022, W - 0.05, (z0 + z1) / 2), rot=(0, 90, 0)))
    if not opened:
        # 닫힌 문: 문틀 두 끝의 청동 고리에 가로 빗장을 건다
        for y in (y0 - 0.012, y1 + 0.012):
            m.add(box(0.03, 0.03, 0.05), "BRONZE", 30, M((xs + 0.03, y, (z0 + z1) / 2)))
        m.add(rod((xs + 0.045, y0 - 0.04, (z0 + z1) / 2), (xs + 0.045, y1 + 0.04, (z0 + z1) / 2), 0.012, None, 6), "BRONZE", 40)
        return
    # 줄사다리: 문턱에서 받침까지, 배 밑이 안으로 굽어 허공에 드리운다
    ropes = []
    for y in (-0.02, 0.1):
        pts = [Vector((xs + 0.01, y, z0 + 0.01)), Vector((xs + 0.035, y, 0.78)), Vector((xs + 0.05, y + 0.01, 0.5)),
               Vector((xs + 0.09, y + 0.02, DECK_Z + 0.012)), Vector((xs + 0.16, y + 0.03, DECK_Z + 0.012))]
        m.add(tube(pts, 0.009, 5), "LEATHER", 50)
        ropes.append(pts)
    for k in range(6):
        t = 0.1 + 0.8 * k / 5
        p = _lerp_path(ropes[0][:4], t)
        q = _lerp_path(ropes[1][:4], t)
        m.add(rod(p, q, 0.009, None, 5), "WOOD", False)


def _lerp_path(pts, t):
    x = t * (len(pts) - 1)
    i = min(int(x), len(pts) - 2)
    return pts[i].lerp(pts[i + 1], x - i)


# ---------------------------------------------------------------- 받침
WHEEL_R = 0.17


def _wheel(m, x, y, s):
    """세 쪽 널 원판 바퀴(바퀴 면은 YZ). 테는 어둡게, 바깥 면에 가로 널 이음매 둘·세로 띠 둘·청동 굴대 머리."""
    R, w = WHEEL_R, 0.07
    disc = cyl(R, R, w, 18, -w / 2)
    m.add_local(disc, lambda f: "WOOD" if abs(f.normal.z) > 0.5 else "WOOD_DARK", 30, M((x, y, R), rot=(0, 90, 0)))
    face = x + s * (w / 2)
    for dz in (-0.055, 0.055):  # 널 이음매
        half = math.sqrt(R * R - dz * dz) - 0.012
        m.add(box(0.006, 2 * half, 0.01), "WOOD_DARK", False, M((face, y, R + dz)))
    for dy in (-0.07, 0.07):  # 널을 잡아 주는 세로 띠
        half = math.sqrt(R * R - dy * dy) - 0.014
        m.add(box(0.018, 0.034, 2 * half), "WOOD_DARK", False, M((face + s * 0.009, y + dy, R)))
    m.add(cyl(0.045, 0.038, 0.045, 10, 0.0), "BRONZE", 35, M((face, y, R), rot=(0, s * 90, 0)))
    m.add(box(0.014, 0.018, 0.1), "WOOD_DARK", False, M((face + s * 0.035, y, R)))  # 굴대 머리를 꿴 비녀장


def _platform(m):
    """바퀴 넷 달린 썰매 받침: 검은 널 바닥 + 긴 받침목 둘 + 끝이 밝게 드러난 가로목 셋 + 굴대 둘 + 굴대 받이 + 끄는 밧줄 둘.
    바닥을 어둡게 둔 까닭: 위에서 내려다보면 받침이 가장 넓게 보이므로, 밝으면 말보다 받침이 먼저 눈에 든다."""
    X, Y = 0.55, 0.8
    n = 7
    w = (2 * X - (n - 1) * 0.008) / n
    for k in range(n):
        x = -X + w / 2 + k * (w + 0.008)
        m.add(box(w, 2 * Y - 0.012 * (k % 3), 0.05), "WOOD_DARK", False, M((x, 0.0, DECK_Z - 0.025)))
    for s in (-1, 1):
        m.add(box(0.12, 2 * Y + 0.1, 0.09), "WOOD_DARK", False, M((s * 0.5, 0.0, 0.205)))
    for y in (-Y + 0.05, 0.0, Y - 0.05):
        m.add(box(2 * X + 0.1, 0.09, 0.07), "WOOD", False, M((0.0, y, 0.215)))
    for y in (-0.52, 0.52):
        m.add(rod((-0.73, y, WHEEL_R), (0.73, y, WHEEL_R), 0.028, None, 8), "WOOD_DARK", False)
        for s in (-1, 1):
            m.add(box(0.14, 0.14, 0.08), "WOOD_DARK", False, M((s * 0.5, y, 0.14)))
            _wheel(m, s * 0.66, y, s)
    # 끄는 밧줄: 받침목 앞 끝에 감아 묶고 땅으로 늘어뜨렸다가 옆으로 사려 두었다
    for s, tail in ((1, [(0.72, -0.972), (0.86, -0.9), (0.92, -0.78), (0.9, -0.66)]),
                    (-1, [(-0.72, -0.985), (-0.88, -0.92), (-0.95, -0.8)])):
        m.add(torus(0.074, 0.013, 10, 3), "LEATHER", True, M((s * 0.5, -0.81, 0.205), rot=(90, 0, 0)))
        pts = [Vector((s * 0.5, -0.83, 0.14)), Vector((s * 0.515, -0.9, 0.07)), Vector((s * 0.55, -0.955, 0.018))]
        pts += [Vector((px, py, 0.018)) for px, py in tail]
        m.add(tube(pts, 0.018, 5), "LEATHER", 50)


# ---------------------------------------------------------------- 목마
def _build_horse(m, opened):
    """받침·바퀴 + 판자 몸통·목·머리·다리 + 갈기·꼬리·굴레·꽃줄 + 옆문.
    몸통에 띠 테를 두르면 술통처럼 읽혀서 두르지 않았다. 판자 이음매와 말 옆모습(깊은 가슴·올라간 옆구리)으로 읽히게 한다."""
    _platform(m)
    _legs(m)
    _add_loft(m, _body_stations(), planks=14, rot0=0.0)
    _add_loft(m, NECK, planks=10, rot0=math.radians(18))
    _add_loft(m, HEAD, planks=8, rot0=math.radians(22.5), caps=("WOOD", "WOOD"))
    _mane(m)
    _tail(m)
    _head_parts(m)
    _garland(m)
    _door(m, opened)
    return m


def horse():
    """트로이 목마(2×2 칸, 키 2.2) — 옆문이 열려 줄사다리가 드리운 모양(10장 싸움판: 장수들이 빠져나온 뒤)."""
    return _build_horse(Model("horse"), True)


def horse_closed():
    """닫힌 트로이 목마 — 옆문을 닫고 빗장을 건 모양(10장 이야기: 트로이 사람들이 성안으로 끌어들일 때)."""
    return _build_horse(Model("horseClosed"), False)


MODELS = {
    "horse": {"build": horse, "kind": "horse", "foot": (2, 2), "ground": "#b59a6b"},
    "horseClosed": {"build": horse_closed, "kind": "horse", "foot": (2, 2), "ground": "#b59a6b"},
}
