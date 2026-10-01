# 자연 소품 — 올리브·사이프러스·바위·덤불·갈대·무덤 둔덕
# 바위·나무 둥치는 각진 면(flat), 잎 덩이는 거의 매끈하게.
import math
import random

from mathutils import Vector

from lib import M, Model, cyl, ico, jitter, lathe, rod, sphere, tube


def _blob(rng, r, sub=2, amount=0.16, flat=1.0):
    """울퉁불퉁한 잎 덩이(흔든 이십면체 공)."""
    bm = ico(1.0, sub)
    for v in bm.verts:
        n = v.co.normalized()
        v.co = n * (1.0 + rng.uniform(-amount, amount))
    for v in bm.verts:
        v.co.z *= flat
    return bm


def _rock(rng, w, d, h, sub=1, amount=0.22):
    """각진 바위: 흔든 공을 눌러 바닥을 평평하게 자른다."""
    bm = ico(1.0, sub)
    for v in bm.verts:
        v.co = v.co.normalized() * (1.0 + rng.uniform(-amount, amount))
    for v in bm.verts:
        v.co.x *= w / 2
        v.co.y *= d / 2
        v.co.z = max(v.co.z, -0.35) * h / 1.35
    lo = min(v.co.z for v in bm.verts)
    for v in bm.verts:
        v.co.z -= lo
    return bm


def _rock_mat(f):
    return "STONE" if f.normal.z > 0.45 else "STONE_DARK"


def tree_olive():
    """올리브: 뒤틀린 둥치가 셋으로 갈라지고, 넓고 낮은 잎 덩이가 덮는다. 키 ≈0.86."""
    m = Model("treeOlive")
    rng = random.Random(21)
    trunk = [(0, 0, 0.0), (0.035, -0.01, 0.12), (-0.015, 0.025, 0.24), (0.02, 0.005, 0.33)]
    m.add(jitter(tube(trunk, [0.085, 0.062, 0.056, 0.05], 7), 0.008, rng, keep_bottom=0.001), "WOOD", False)
    m.add(jitter(cyl(0.12, 0.07, 0.07, 7), 0.012, rng, keep_bottom=0.001), "WOOD", False)  # 뿌리 쪽 퍼짐
    for tip, r in (((-0.2, 0.06, 0.52), 0.036), ((0.21, -0.07, 0.53), 0.036), ((0.03, 0.19, 0.57), 0.032), ((-0.04, -0.17, 0.55), 0.03)):
        mid = ((0.02 + tip[0]) / 2 + rng.uniform(-0.03, 0.03), (0.005 + tip[1]) / 2, (0.33 + tip[2]) / 2 + 0.02)
        m.add(jitter(tube([(0.02, 0.005, 0.31), mid, tip], [0.046, r, r * 0.7], 6), 0.005, rng), "WOOD", False)
    clumps = [((-0.21, 0.06, 0.6), (0.25, 0.23, 0.15)), ((0.22, -0.07, 0.61), (0.25, 0.23, 0.15)),
              ((0.03, 0.2, 0.64), (0.23, 0.21, 0.14)), ((0.0, -0.02, 0.72), (0.27, 0.25, 0.15)),
              ((-0.05, -0.2, 0.62), (0.21, 0.19, 0.13)), ((0.17, 0.16, 0.7), (0.17, 0.16, 0.11))]
    for i, (c, s) in enumerate(clumps):
        m.add(_blob(rng, 1.0, 2, 0.14), "LEAF", 52, M(c, rot=(0, 0, rng.uniform(0, 360)), scale=s))
    return m


def tree_cypress():
    """사이프러스: 좁고 높은 불꽃 모양(비틀린 골). 키 1.2."""
    m = Model("treeCypress")
    rng = random.Random(5)
    m.add(jitter(cyl(0.05, 0.04, 0.12, 6), 0.006, rng, keep_bottom=0.001), "WOOD", False)

    def flame(r, z, a):
        return r * (1.0 + 0.13 * math.sin(4 * a + 7.0 * z)), a

    prof = [(0.0, 0.07), (0.1, 0.085), (0.148, 0.2), (0.162, 0.4), (0.145, 0.64), (0.108, 0.86), (0.06, 1.04), (0.022, 1.15), (0.0, 1.2)]
    body = lathe(prof, 14, wobble=flame)
    jitter(body, 0.01, rng)
    m.add(body, "LEAF_DARK", 55)
    return m


def rock_a():
    """언덕 바위(폭 0.5): 큰 바위 하나 + 곁에 작은 돌 둘."""
    m = Model("rockA")
    rng = random.Random(8)
    m.add(_rock(rng, 0.5, 0.42, 0.3), _rock_mat, False, M((0, 0, 0), rot=(0, 0, 20)))
    m.add(_rock(rng, 0.17, 0.14, 0.11), _rock_mat, False, M((0.2, -0.17, 0), rot=(0, 0, 70)))
    m.add(_rock(rng, 0.12, 0.1, 0.07), _rock_mat, False, M((-0.22, -0.13, 0), rot=(0, 0, 10)))
    return m


def rock_b():
    """작은 언덕 바위(폭 0.35)."""
    m = Model("rockB")
    rng = random.Random(13)
    m.add(_rock(rng, 0.35, 0.3, 0.24), _rock_mat, False, M(rot=(0, 0, -30)))
    m.add(_rock(rng, 0.1, 0.09, 0.06), _rock_mat, False, M((0.16, -0.1, 0)))
    return m


def bush():
    """낮은 덤불: 잎 덩이 다섯, 밝고 어두운 잎을 섞는다."""
    m = Model("bush")
    rng = random.Random(17)
    parts = [((0.0, 0.0, 0.16), 0.17, "LEAF"), ((0.15, -0.06, 0.11), 0.12, "LEAF_DARK"), ((-0.14, -0.05, 0.12), 0.13, "LEAF"),
             ((-0.06, 0.13, 0.12), 0.12, "LEAF_DARK"), ((0.09, 0.12, 0.1), 0.1, "LEAF")]
    for c, r, mat in parts:
        m.add(_blob(rng, 1.0, 2, 0.16, 0.85), mat, 52, M(c, rot=(0, 0, rng.uniform(0, 360)), scale=r))
    for k in range(5):  # 흰 꽃 몇 송이
        a = 2 * math.pi * k / 5 + 0.4
        m.add(sphere(0.018, 6, 4), "CLOTH", True, M((0.14 * math.cos(a), 0.12 * math.sin(a), 0.22 + 0.03 * (k % 2))))
    return m


def reeds():
    """물가 갈대 무더기: 가늘고 긴 잎이 바깥으로 휘고, 부들 이삭 몇 개."""
    m = Model("reeds")
    rng = random.Random(29)
    m.add(_blob(rng, 1.0, 1, 0.2, 0.5), "LEAF_DARK", 50, M((0, 0, 0.02), scale=(0.16, 0.14, 0.08)))
    for k in range(16):
        a = rng.uniform(0, 2 * math.pi)
        r0 = rng.uniform(0.0, 0.1)
        h = rng.uniform(0.3, 0.56)
        lean = rng.uniform(0.06, 0.18)
        x0, y0 = r0 * math.cos(a), r0 * math.sin(a)
        dx, dy = lean * math.cos(a), lean * math.sin(a)
        pts = [(x0, y0, 0.0), (x0 + dx * 0.25, y0 + dy * 0.25, h * 0.5), (x0 + dx * 0.65, y0 + dy * 0.65, h * 0.85), (x0 + dx, y0 + dy, h)]
        m.add(tube(pts, [0.014, 0.011, 0.007, 0.0], 3), "LEAF" if k % 3 else "LEAF_DARK", 70)
        if k % 4 == 0:
            tip = Vector(pts[2])
            m.add(cyl(0.017, 0.016, 0.075, 6), "LEATHER", True, M(tip - Vector((0, 0, 0.02))))
    return m


def tumulus():
    """풀 덮인 무덤 둔덕: 둥근 흙더미 + 밑동 돌 테 + 꼭대기 비석."""
    m = Model("tumulus")
    rng = random.Random(31)
    mound = lathe([(0.0, 0.34), (0.12, 0.33), (0.25, 0.27), (0.35, 0.17), (0.42, 0.07), (0.45, 0.0), (0.0, 0.0)], 18)
    for v in mound.verts:
        if 0.01 < v.co.z < 0.335:
            v.co += Vector((rng.uniform(-1, 1), rng.uniform(-1, 1), rng.uniform(-0.5, 0.5))) * 0.012
    m.add(mound, "LEAF", 50)
    for k in range(16):
        a = 2 * math.pi * k / 16 + rng.uniform(-0.05, 0.05)
        m.add(_rock(rng, 0.1, 0.08, 0.07, 1, 0.18), _rock_mat, False,
              M((0.455 * math.cos(a), 0.455 * math.sin(a), 0.0), rot=(0, 0, math.degrees(a) + 90)))
    m.add(_rock(rng, 0.1, 0.06, 0.26, 1, 0.08), "STONE", False, M((0.0, 0.0, 0.3)))
    return m


MODELS = {
    "treeOlive": {"build": tree_olive, "kind": "prop"},
    "treeCypress": {"build": tree_cypress, "kind": "prop"},
    "rockA": {"build": rock_a, "kind": "prop"},
    "rockB": {"build": rock_b, "kind": "prop"},
    "bush": {"build": bush, "kind": "prop"},
    "reeds": {"build": reeds, "kind": "prop", "ground": "#62b0c0"},
    "tumulus": {"build": tumulus, "kind": "prop"},
}
