# 아카이아 진영 소품 — 검은 배·막사·천막·말뚝 울타리·도랑 말뚝·방패 더미·창 틀
import math
import random

from mathutils import Matrix, Vector

from lib import M, Model, align_z, box, cone, ico, jitter, loft, prism, rod, sphere, tube
from figure import crest, helmet_corinthian, shield_disc, spear

# ---------------------------------------------------------------- 검은 배
HALF = 0.86  # 배 몸통 반길이(충각·고물 장식까지 0.95)


def _w(t):
    return 0.29 * max(0.0, 1.0 - abs(t) ** 2.4) ** 0.75 + 0.02


def _zg(t):
    """뱃전 높이: 두 끝이 들리고 고물(+Y)이 더 높다."""
    return 0.34 + 0.1 * abs(t) ** 3 + (0.07 * t ** 4 if t > 0 else 0.0)


def _zk(t):
    return 0.02 + 0.1 * t ** 4


def _zd(t):
    return _zg(t) - 0.075


def _wi(t):
    w = _w(t)
    return max(w - 0.03, w * 0.35)


def _section(t):
    """배 단면 한 바퀴: 오른 뱃전 → 용골 → 왼 뱃전 → 안쪽 턱 → 갑판."""
    w, zg, zk = _w(t), _zg(t), _zk(t)
    D = zg - zk
    zd, wi = _zd(t), _wi(t)
    y = t * HALF
    outer = [(w, zg), (0.975 * w, zg - 0.3 * D), (0.86 * w, zg - 0.6 * D), (0.58 * w, zk + 0.13 * D), (0.22 * w, zk + 0.015), (0.0, zk)]
    port = [(-x, z) for x, z in reversed(outer[:-1])]
    inner = [(-wi, zg), (-wi, zd), (wi, zd), (wi, zg)]
    return [(x, y, z) for x, z in outer + port + inner]


def _hull_mat(f):
    c, n = f.calc_center_median(), f.normal
    t = c.y / HALF
    if n.z > 0.6 and c.z > _zd(t) - 0.01:
        return "WOOD"  # 갑판·뱃전 윗면
    if n.x * c.x < 0 and c.z > _zd(t) - 0.01:
        return "WOOD"  # 뱃전 안쪽
    if t < -0.55 and c.z > _zk(t) + 0.3 * (_zg(t) - _zk(t)):
        return "RED_OCHRE"  # 붉은 뺨(뱃머리)
    if c.z > _zg(t) - 0.035 and abs(t) < 0.9:
        return "RED_OCHRE"  # 뱃전 붉은 줄
    return "WOOD_DARK"


def _eye(m, s):
    """뱃머리 눈: 흰 타원 + 검은 눈동자(뱃전 겉면에 붙인다)."""
    t = -0.8
    w, zg, zk = _w(t), _zg(t), _zk(t)
    D = zg - zk
    p = Vector((s * 0.99 * w, t * HALF, zg - 0.2 * D))
    n = Vector((s * 0.9, -0.42, 0.05)).normalized()
    tang = Vector((0, 0, 1)).cross(n).normalized()
    up = n.cross(tang).normalized()
    rot = Matrix((n, tang, up)).transposed().to_4x4()
    m.add(sphere(1.0, 10, 6), "CLOTH", True, Matrix.Translation(p + n * 0.004) @ rot @ Matrix.Diagonal((0.012, 0.062, 0.04, 1)))
    m.add(sphere(1.0, 8, 5), "WOOD_DARK", True, Matrix.Translation(p + n * 0.012 - tang * 0.006 * s) @ rot @ Matrix.Diagonal((0.01, 0.024, 0.024, 1)))


def ship():
    """뭍에 끌어올린 검은 배: 길이 1.9, 폭 0.6. 앞(-Y)이 뱃머리(붉은 뺨·눈·충각), 뒤는 휘어 오른 아플라스톤."""
    m = Model("ship")
    rng = random.Random(61)
    secs = [_section(-1 + 2 * i / 22) for i in range(23)]
    m.add(loft(secs), _hull_mat, 38)
    for s in (-1, 1):
        _eye(m, s)
    # 충각(뱃머리 아래로 내민 코) + 청동 씌움
    m.add(prism([(-0.845, 0.015), (-0.935, 0.05), (-0.93, 0.105), (-0.84, 0.16)], 0.07, "YZ", bevel=0.008), "WOOD_DARK", 40)
    m.add(box(0.08, 0.035, 0.06, 0.008), "BRONZE", True, M((0, -0.935, 0.078)))
    # 이물 기둥
    m.add(tube([(0, -0.85, 0.4), (0, -0.885, 0.48), (0, -0.9, 0.56), (0, -0.885, 0.625)], [0.032, 0.028, 0.024, 0.018], 6), "WOOD_DARK")
    m.add(sphere(0.026, 8, 5), "RED_OCHRE", True, M((0, -0.883, 0.63)))
    # 고물 장식(아플라스톤): 위로 솟았다가 앞으로 말린다
    stern = [(0, 0.83, 0.46), (0, 0.9, 0.58), (0, 0.925, 0.7), (0, 0.9, 0.81), (0, 0.84, 0.87), (0, 0.78, 0.86), (0, 0.755, 0.8), (0, 0.775, 0.755)]
    m.add(tube(stern, [0.042, 0.037, 0.032, 0.027, 0.022, 0.018, 0.014, 0.01], 7), "WOOD_DARK")
    for k in (-1, 1):  # 부채처럼 벌어진 끝 깃
        m.add(tube([(0, 0.9, 0.81), (k * 0.05, 0.9, 0.86), (k * 0.075, 0.875, 0.9)], [0.016, 0.012, 0.006], 5), "WOOD_DARK")
    m.add(box(0.34, 0.2, 0.025, 0.006), "WOOD", True, M((0, 0.66, _zd(0.66 / HALF) + 0.06)))  # 고물 갑판
    # 노걸이에 걸친 노: 손잡이는 배 안, 날은 모래 위
    for s in (-1, 1):
        for y in (-0.36, -0.02, 0.32):
            t = y / HALF
            lock = Vector((s * _w(t), y, _zg(t) + 0.015))
            end = Vector((s * 0.485, y + 0.07, 0.012))
            inner = lock + (lock - end) * 0.38
            blade0 = lock + (end - lock) * 0.72
            m.add(rod(inner, blade0, 0.01, 0.009, 5), "WOOD")
            d = (end - blade0).normalized()
            m.add(box(0.05, 0.008, 1.0, 0.0), "WOOD", True,
                  Matrix.Translation((blade0 + end) / 2) @ align_z(d) @ Matrix.Diagonal((1, 1, (end - blade0).length + 0.02, 1)))
    # 키잡이 노(오른쪽 고물)
    m.add(rod((0.2, 0.62, _zg(0.72) + 0.05), (0.33, 0.9, 0.06), 0.014, 0.012, 6), "WOOD")
    m.add(box(0.012, 0.16, 0.07, 0.004), "WOOD", True, M((0.32, 0.875, 0.08), rot=(-30, 0, 20)))
    # 눕힌 돛대(받침에 얹음) + 활대에 감아 묶은 돛
    zd0 = _zd(0.0)
    m.add(rod((0, -0.56, zd0 + 0.13), (0, 0.72, zd0 + 0.23), 0.024, 0.02, 6), "WOOD")
    m.add(rod((0, 0.56, zd0 - 0.01), (0, 0.56, zd0 + 0.14), 0.016, None, 5), "WOOD")
    for k in (-1, 1):
        m.add(rod((0, 0.56, zd0 + 0.12), (k * 0.045, 0.56, zd0 + 0.2), 0.011, None, 4), "WOOD")
    sail = [(0.075, -0.42 + 0.085 * i, zd0 + 0.08 + 0.006 * i) for i in range(11)]
    m.add(tube(sail, [0.03 + 0.012 * math.sin(i * 1.3) ** 2 for i in range(11)], 7), "CLOTH")
    m.add(rod((0.075, -0.5, zd0 + 0.075), (0.075, 0.5, zd0 + 0.14), 0.012, None, 5), "WOOD")
    # 가로 걸상
    for y in (-0.5, -0.26, 0.2, 0.44):
        t = y / HALF
        m.add(box(2 * _wi(t) - 0.01, 0.045, 0.02, 0.005), "WOOD", True, M((0, y, _zd(t) + 0.04)))
    # 배를 떠받친 버팀목과 괸 돌
    for s in (-1, 1):
        for y in (-0.42, 0.4):
            t = y / HALF
            top = Vector((s * 0.9 * _w(t), y, _zg(t) - 0.42 * (_zg(t) - _zk(t))))
            foot = Vector((s * (_w(t) + 0.13), y + 0.03, 0.0))
            m.add(rod(foot, top, 0.018, 0.015, 5), "WOOD", False)
        m.add(jitter(ico(0.05, 1), 0.012, rng), "STONE", False, M((s * 0.12, -0.2 * s, 0.03), scale=(1.2, 1.0, 0.7)))
    return m


# ---------------------------------------------------------------- 막사·천막
def hut():
    """아카이아 진영 막사(0.8×0.8): 통나무 벽 + 층층이 얹은 짚 지붕 + 문."""
    m = Model("hut")
    rng = random.Random(41)
    W, D, r = 0.62, 0.54, 0.034
    for i in range(4):
        z = r + i * 2 * r * 0.95
        for s in (-1, 1):
            m.add(jitter(rod((-W / 2 - 0.05, s * D / 2, z), (W / 2 + 0.05, s * D / 2, z), r, r * 0.92, 6), 0.004, rng), "WOOD", False)
            z2 = z + r * 0.95
            m.add(jitter(rod((s * W / 2, -D / 2 - 0.05, z2), (s * W / 2, D / 2 + 0.05, z2), r, r * 0.92, 6), 0.004, rng), "WOOD", False)
    top = r + 3 * 2 * r * 0.95 + r * 0.95 + r
    m.add(box(W - 0.02, D - 0.02, top), "WOOD_DARK", False, M((0, 0, top / 2)))
    # 문: 어두운 틈 + 문설주·상인방
    m.add(box(0.17, 0.03, 0.23), "WOOD_DARK", False, M((0.1, -D / 2 - 0.03, 0.115)))
    for x in (0.1 - 0.1, 0.1 + 0.1):
        m.add(box(0.035, 0.05, 0.26, 0.006), "WOOD", False, M((x, -D / 2 - 0.035, 0.13)))
    m.add(box(0.26, 0.055, 0.04, 0.006), "WOOD", False, M((0.1, -D / 2 - 0.035, 0.265)))
    # 박공 벽(나무판)과 짚 지붕
    ridge = 0.64
    eave_y = D / 2 + 0.15
    eave_z = top - 0.02
    for s in (-1, 1):
        m.add(prism([(-D / 2, top), (D / 2, top), (0.0, ridge - 0.02)], 0.03, "YZ"), "WOOD", False, M((s * (W / 2 + 0.01), 0, 0)))
    a = math.atan2(ridge - eave_z, eave_y)
    for s in (-1, 1):
        # 짚 세 층: 처마에서 용마루 쪽으로 한 층씩 들어가며 겹친다
        for k, (inset, thick) in enumerate(((0.0, 0.075), (0.15, 0.07), (0.29, 0.065))):
            ey = s * (eave_y - inset * math.cos(a))
            ez = eave_z + inset * math.sin(a) + 0.028 * k
            rz = ridge + 0.028 * k
            slab = prism([(ey, ez), (0.0, rz), (0.0, rz + thick), (ey, ez + thick)], W + 0.22 - 0.03 * k, "YZ")
            for v in slab.verts:  # 짚 끝이 들쭉날쭉하게
                if abs(v.co.y) > abs(ey) - 0.01:
                    v.co.y += s * rng.uniform(-0.02, 0.015)
                    v.co.z += rng.uniform(-0.012, 0.004)
            m.add(slab, "STONE_DARK" if k < 2 else "STONE", False)
    m.add(jitter(rod((-W / 2 - 0.13, 0, ridge + 0.05), (W / 2 + 0.13, 0, ridge + 0.05), 0.03, None, 6), 0.004, rng), "WOOD", False)
    for s in (-1, 1):  # 용마루 끝 엇갈린 막대
        x = s * (W / 2 + 0.08)
        for k in (-1, 1):
            m.add(rod((x, k * 0.06, ridge - 0.02), (x, -k * 0.07, ridge + 0.14), 0.013, None, 4), "WOOD", False)
    return m


def tent():
    """천막: 흰 천(CLOTH) 두 경사면 + 끝단·모서리 띠(TEAM_DARK) + 앞문 걷어 올림."""
    m = Model("tent")
    L, W, H = 0.72, 0.64, 0.5
    ang = math.degrees(math.atan2(H, W / 2))
    slope = math.hypot(W / 2, H)
    for s in (-1, 1):
        m.add(box(slope, L, 0.014, 0.004), "CLOTH", 40, M((s * W / 4, 0, H / 2), rot=(0, s * ang, 0)))
        # 아랫단 띠
        m.add(box(0.05, L + 0.01, 0.018, 0.004), "TEAM_DARK", 40, M((s * (W / 2 - 0.02), 0, 0.02), rot=(0, s * ang, 0)))
        # 앞·뒤 모서리 띠
        for y in (-L / 2, L / 2):
            m.add(rod((0, y, H), (s * W / 2, y, 0.0), 0.013, None, 5), "TEAM_DARK")
    m.add(rod((0, -L / 2 - 0.04, H), (0, L / 2 + 0.04, H), 0.016, None, 6), "TEAM_DARK")
    m.add(prism([(-W / 2, 0.0), (W / 2, 0.0), (0.0, H)], 0.014, "XZ"), "CLOTH", 40, M((0, L / 2 - 0.006, 0)))
    m.add(prism([(-W / 2 + 0.05, 0.0), (W / 2 - 0.05, 0.0), (0.0, H - 0.07)], 0.01, "XZ"), "WOOD_DARK", 40, M((0, -L / 2 + 0.06, 0)))
    for s in (-1, 1):  # 걷어 묶은 앞자락
        m.add(prism([(0.0, 0.0), (s * 0.13, 0.0), (0.0, 0.34)], 0.012, "XZ"), "CLOTH", 40,
              M((s * 0.2, -L / 2 - 0.02, 0.03), rot=(0, 0, s * 35)))
        m.add(sphere(0.02, 6, 4), "TEAM_DARK", True, M((s * 0.2, -L / 2 - 0.03, 0.2)))
    for y in (-L / 2 - 0.02, L / 2 + 0.02):  # 기둥
        m.add(rod((0, y, 0.0), (0, y, H + 0.07), 0.014, None, 6), "WOOD")
        m.add(sphere(0.02, 6, 4), "TEAM_DARK", True, M((0, y, H + 0.08)))
        for s in (-1, 1):  # 당김줄 + 말뚝
            peg = Vector((s * 0.2, y + (0.2 if y > 0 else -0.2), 0.0))
            m.add(rod((0, y, H + 0.04), peg + Vector((0, 0, 0.03)), 0.004, None, 3), "LEATHER")
            m.add(rod(peg, peg + Vector((0, 0, 0.05)), 0.009, 0.006, 4), "WOOD")
    return m


# ---------------------------------------------------------------- 울타리·말뚝
def _stake(m, base, top, r, mat="WOOD", rng=None):
    """끝을 뾰족하게 깎은 말뚝."""
    b, t = Vector(base), Vector(top)
    d = (t - b).normalized()
    body = rod(b, t - d * 0.08, r, r * 0.95, 7)
    if rng:
        jitter(body, r * 0.08, rng)
    m.add(body, mat, False)
    m.add(cone(r * 0.95, 0.1, 7), mat, False, Matrix.Translation(t - d * 0.08) @ align_z(d))


def palisade():
    """말뚝 울타리 한 칸: 폭 1.0, 뾰족한 말뚝 8개, 키 0.6, 가로 묶음 둘."""
    m = Model("palisade")
    rng = random.Random(71)
    n = 8
    for i in range(n):
        x = -0.4375 + i * 0.125
        h = rng.uniform(0.53, 0.6)
        lean = rng.uniform(-3, 3)
        top = (x + math.sin(math.radians(lean)) * h, -0.02 * rng.uniform(0, 1), h)
        _stake(m, (x, 0.0, 0.0), top, rng.uniform(0.048, 0.056), rng=rng)
    for z in (0.17, 0.4):
        m.add(rod((-0.5, 0.045, z), (0.5, 0.045, z + 0.01), 0.018, None, 6), "LEATHER")
    return m


def trench_stakes():
    """도랑에 비스듬히 박은 날 선 말뚝 두 줄(앞 -Y로 기울임)."""
    m = Model("trenchStakes")
    rng = random.Random(73)
    for row, y0 in enumerate((-0.12, 0.16)):
        for i in range(4):
            x = -0.36 + i * 0.24 + (0.12 if row else 0.0) + rng.uniform(-0.03, 0.03)
            if abs(x) > 0.42:
                continue
            L = rng.uniform(0.3, 0.4)
            tilt = math.radians(rng.uniform(38, 48))
            yaw = math.radians(rng.uniform(-12, 12))
            d = Vector((math.sin(yaw) * math.sin(tilt), -math.cos(yaw) * math.sin(tilt), math.cos(tilt)))
            base = Vector((x, y0, -0.03))
            _stake(m, base, base + d * L, 0.03, rng=rng)
    return m


# ---------------------------------------------------------------- 방패 더미·창 틀
def shield_pile():
    """방패 더미: 둘은 눕혀 겹치고 둘은 기대 세움 + 깃 투구 + 눕힌 창."""
    m = Model("shieldPile")
    shield_disc(m, M((0.0, 0.03, 0.022)), R=0.2, face="BRONZE", back="LEATHER")
    shield_disc(m, M((0.06, -0.03, 0.08), rot=(7, -9, 0)), R=0.17, face="TEAM", back="LEATHER")
    shield_disc(m, M((-0.05, 0.22, 0.19), rot=(62, 0, -8)), R=0.19, face="TEAM", back="LEATHER", boss="BRONZE")
    shield_disc(m, M((0.24, 0.12, 0.17), rot=(64, 0, 62)), R=0.17, face="LEATHER", rim="BRONZE", back="WOOD")
    m.push(M((0.03, -0.06, 0.13), rot=(0, 14, -30), scale=0.78) @ M((0, 0, -0.47)))
    helmet_corinthian(m, n=12)
    crest(m, height=0.07, sides=6)
    m.pop()
    for k, (a, b) in enumerate((((-0.34, -0.22, 0.02), (0.36, 0.1, 0.05)), ((-0.3, 0.02, 0.03), (0.34, -0.3, 0.1)))):
        d = (Vector(b) - Vector(a))
        spear(m, a[0], a[1], a[2], a[2] + d.length, r=0.013, tilt=_tilt_of(d))
    return m


def _tilt_of(d):
    """+Z를 d로 돌리는 (x각, y각) — spear()의 tilt 순서(X 다음 Y)에 맞춘다."""
    d = Vector(d).normalized()
    return (math.degrees(math.atan2(-d.y, math.hypot(d.x, d.z))), math.degrees(math.atan2(d.x, d.z)))


def spear_rack():
    """창을 세워 둔 나무 틀: 기둥 둘 + 가로대 둘 + 창 여섯 + 기대 둔 방패."""
    m = Model("spearRack")
    for s in (-1, 1):
        m.add(box(0.05, 0.05, 0.62, 0.008), "WOOD", 40, M((s * 0.37, 0, 0.31)))
        m.add(box(0.05, 0.32, 0.04, 0.008), "WOOD", 40, M((s * 0.37, 0, 0.02)))
    m.add(box(0.82, 0.05, 0.045, 0.008), "WOOD", 40, M((0, 0, 0.57)))
    m.add(box(0.82, 0.13, 0.03, 0.008), "WOOD", 40, M((0, 0.0, 0.07)))
    for i in range(6):
        x = -0.27 + i * 0.108
        spear(m, x, 0.035, 0.085, 1.02 + 0.02 * (i % 2), r=0.014, tilt=(-5, 0), tip_len=0.13, tip_w=0.026)
    shield_disc(m, M((0.47, -0.08, 0.2), rot=(80, 0, 40)), R=0.18, face="TEAM", back="LEATHER")
    return m


MODELS = {
    "ship": {"build": ship, "kind": "ship", "foot": (1, 2), "ground": "#d2b884"},
    "hut": {"build": hut, "kind": "prop", "ground": "#c9b27e"},
    "tent": {"build": tent, "kind": "prop", "ground": "#c9b27e"},
    "palisade": {"build": palisade, "kind": "prop", "ground": "#a88b5c"},
    "trenchStakes": {"build": trench_stakes, "kind": "prop", "ground": "#7d6545"},
    "shieldPile": {"build": shield_pile, "kind": "prop", "ground": "#c9b27e"},
    "spearRack": {"build": spear_rack, "kind": "prop", "ground": "#c9b27e"},
}
