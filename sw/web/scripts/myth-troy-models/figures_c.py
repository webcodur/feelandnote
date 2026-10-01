# 트로이 장수 고유 말 1 — 헥토르·파리스·아이네이아스·사르페돈·글라우코스·데이포보스
# 병과 말(units.py) 뼈대에 인물마다 한눈에 알아볼 표지(투구 깃·방패·무기·겉옷)를 크게 과장해 얹는다.
# 앞은 -Y, 말의 오른손은 -X 쪽. 받침은 넣지 않는다(3D 판이 편 색 받침을 깐다).
import math
import random

import bmesh
from mathutils import Vector

from lib import M, Model, align_z, box, cone, cyl, lathe, prism, rod, sphere, torus, tube
from figure import (HEAD_Z, arm, belt, cape, crest, head, helmet_corinthian, interp, kilt, neck, phrygian_cap,
                    quiver, sash, shield_round, shoulders, spear, sword, torso)
from units import _spear_through


# ---------------------------------------------------------------- 몸·갑옷
def _legs(m, greave="BRONZE", stride=0.022, spread=0.055, hip=0.24, knee=0.12):
    """두 다리 — figure.legs와 같되 정강이받이 재질을 고른다(글라우코스의 금 정강이받이)."""
    for s in (-1, 1):
        y = -stride if s > 0 else stride * 0.6
        ankle = (s * spread, y, 0.03)
        kn = (s * (spread + 0.003), y * 0.6, knee)
        hp = (s * (spread - 0.01), 0.0, hip)
        m.add(tube([ankle, kn, hp], [0.024, 0.029, 0.037], 8), "SKIN")
        if greave:
            m.add(tube([(ankle[0], ankle[1] - 0.002, 0.042), (kn[0], kn[1] - 0.002, knee + 0.018)], [0.031, 0.034], 8), greave)
        m.add(box(0.052, 0.092, 0.032, 0.009), "LEATHER", True, M((s * spread, y - 0.016, 0.016)))


def _armored(m, cuirass="BRONZE", greave="BRONZE", hem="TEAM_DARK", belt_mat="TEAM_DARK", shoulder="BRONZE",
             shoulder_r=0.04, stride=0.022):
    """중갑 몸: 다리·치마·흉갑·허리띠·어깨받이·목."""
    _legs(m, greave=greave, stride=stride)
    kilt(m, hem=hem)
    torso(m, cuirass)
    belt(m, mat=belt_mat, n=12)
    shoulders(m, shoulder, r=shoulder_r)
    neck(m)


def _shield_arm(m):
    """방패를 든 왼팔(방패 뒤에 숨는다)."""
    arm(m, [(0.1, 0.0, 0.452), (0.15, -0.03, 0.37), (0.12, -0.09, 0.39)])


def _spear_arm(m, hand=(-0.19, -0.045, 0.41)):
    """창을 쥔 오른팔."""
    arm(m, [(-0.1, 0.0, 0.452), (-0.16, -0.012, 0.37), hand])
    return hand


# ---------------------------------------------------------------- 투구 장식
CORINTH_R = [(-0.05, 0.111), (0.0, 0.114), (0.05, 0.108), (0.09, 0.086), (0.11, 0.05)]


def _helmet_band(m, c=(0, 0, HEAD_Z), mat="GOLD", z0=0.036, h=0.03, sy=1.1, points=0, point_h=0.05, point_w=0.02, n=14):
    """코린트 투구의 눈 틈 위를 두른 금 관 띠(투구처럼 앞뒤로 길다). points를 주면 위로 뾰족한 끝을 세운다."""
    cx, cy, cz = c
    r0, r1 = interp(z0, CORINTH_R), interp(z0 + h, CORINTH_R)
    band = lathe([(r0 - 0.002, z0), (r0 + 0.01, z0), (r1 + 0.01, z0 + h), (r1 - 0.002, z0 + h)], n, loop=True)
    m.add(band, mat, 35, M((cx, cy, cz), scale=(1, sy, 1)))
    for k in range(points):
        a = 2 * math.pi * k / points - math.pi / 2  # 하나는 이마 한가운데, 뒤통수 한가운데(깃 꼬리)는 피한다
        p = (cx + (r1 + 0.004) * math.cos(a), cy + (r1 + 0.004) * math.sin(a) * sy, cz + z0 + h - 0.006)
        m.add(cone(point_w, point_h, 4), mat, False, M(p, rot=(0, 0, math.degrees(a) + 45)))


def _horsehair_crest(m, c=(0, 0, HEAD_Z), height=0.12, r_h=0.113, sy=1.1, thick=0.036, mat="TEAM"):
    """헥토르의 말총 깃: 투구 위를 크게 넘어간 뒤 등 뒤로 흘러내리며 휘날린다.
    「청동과 말총 깃이 투구 꼭대기에서 무섭게 끄덕이는 것을 보고」 아이가 겁을 먹는다(『일리아스』 6.469~470)."""
    cx, cy, cz = c
    pts, rad = [], []
    steps = 10
    shape = [(0.0, 0.3), (0.2, 0.8), (0.45, 1.0), (0.75, 0.92), (1.0, 0.72)]
    for i in range(steps + 1):
        t = i / steps
        a = math.radians(122 + (-24 - 122) * t)
        hn = height * interp(t, shape)
        rr = r_h + hn
        pts.append((cx, cy + rr * math.cos(a) * sy, cz + rr * math.sin(a)))
        rad.append((hn, thick * (0.8 + 0.2 * interp(t, shape))))
    # 꼬리: 투구 뒤에서 떨어져 나와 뒤·아래로 흐르고 끝이 살짝 들린다(바람에 날리는 말총)
    last = Vector(pts[-1])
    for dy, dz, hn, th in ((0.05, -0.07, 0.07, 0.032), (0.1, -0.13, 0.058, 0.028), (0.16, -0.17, 0.042, 0.022),
                           (0.215, -0.18, 0.02, 0.014)):
        pts.append((cx, last.y + dy, last.z + dz))
        rad.append((hn, th))
    m.add(tube(pts, rad, 8, up=(0, 0, 1)), mat)


# ---------------------------------------------------------------- 방패 장식
def _shield_frame(center, yaw=25.0, pitch=0.0):
    """figure.shield_round과 같은 틀(+Z가 방패 앞면)."""
    return M(center) @ M(rot=(0, 0, yaw)) @ M(rot=(90 + pitch, 0, 0))


def _dome_z(r):
    """figure.shield_disc 앞면의 볼록한 높이(반지름 r에서)."""
    return interp(r, [(0.0, 0.045), (0.07, 0.041), (0.13, 0.03), (0.18, 0.012), (0.3, 0.0)])


def _shield(m, center, yaw=25.0, R=0.2, face="TEAM", rim="BRONZE", back="LEATHER", boss=None, boss_r=0.06,
            rings=(), ring_mat=None, pitch=0.0):
    """둥근 방패 — figure.shield_round에 돋은 배꼽과 앞면 고리를 가볍게(고리는 도넛 대신 얇은 띠) 얹는다."""
    frame = _shield_frame(center, yaw, pitch)
    shield_round(m, center, yaw=yaw, R=R, face=face, rim=rim, back=back, pitch=pitch)
    if boss:
        m.add(lathe([(0.0, 0.07), (boss_r * 0.55, 0.066), (boss_r, 0.05), (boss_r, 0.04), (0.0, 0.04)], 12), boss, True, frame)
    if rings:
        _face_rings(m, frame, rings, mat=ring_mat or boss or rim)
    return frame


def _face_rings(m, frame, radii, mat="GOLD", w=0.009, seg=18):
    """방패 앞면에 붙인 가는 동심 고리(겉면을 따라 살짝 띄운 띠)."""
    for r in radii:
        prof = [(r + w, _dome_z(r + w) + 0.004), (r - w, _dome_z(r - w) + 0.004)]
        m.add(lathe(prof, seg, cap_start=False, cap_end=False), mat, 35, frame)


def _rosette(m, frame, R=0.1, r_in=0.045, petals=8, mat="GOLD", depth=0.014):
    """방패 앞면 가운데 금 꽃잎 무늬(여덟 잎 장미꼴) + 가운데 알."""
    outline = []
    for k in range(petals * 2):
        a = math.pi * k / petals
        rr = R if k % 2 == 0 else r_in
        outline.append((rr * math.cos(a), rr * math.sin(a)))
    m.add(prism(outline, depth, "XY"), mat, False, frame @ M((0, 0, _dome_z(0.05) + 0.004)))
    m.add(sphere(0.028, 8, 4), mat, True, frame @ M((0, 0, 0.056), scale=(1, 1, 0.6)))


# ---------------------------------------------------------------- 가죽·활·칼집
def _pelt(m, rows, cols=16, sy=0.8, seed=5, fur="FUR", spot="FUR_DARK"):
    """어깨에 두르고 등으로 늘어뜨린 짐승 가죽(한 겹 — 판은 양면으로 그린다).
    rows=[(높이, 반지름, 두른 각)…] 위에서 아래로. 면마다 반점을 흩뿌리되 이웃끼리 붙지 않게 한다."""
    rng = random.Random(seed)
    bm = bmesh.new()
    grid = []
    for z, r, arc in rows:
        ring = []
        for j in range(cols + 1):
            a = math.radians(90 + arc * (j / cols - 0.5))
            ring.append(bm.verts.new((r * math.cos(a), r * math.sin(a) * sy, z)))
        grid.append(ring)
    names = []
    dark = set()
    for i in range(len(rows) - 1):
        for j in range(cols):
            bm.faces.new((grid[i][j], grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1]))
            near = {(i - 1, j), (i, j - 1), (i - 1, j - 1), (i - 1, j + 1)} & dark
            if not near and rng.random() < 0.42:
                dark.add((i, j))
            names.append(spot if (i, j) in dark else fur)
    coords = [[Vector(v.co) for v in ring] for ring in grid]
    m.add_local(bm, lambda f: names[f.index], True)
    return coords


def _drawn_bow(m, grip, nock, half=0.3, bulge=0.1, mat="WOOD", r=0.02):
    """시위를 당긴 활: 줌통은 앞손(grip), 시위는 뒷손(nock)까지 V자로 당겨지고 화살이 걸린다.
    활 평면은 화살 줄기와 위(Z)를 품는다. 활대 끝은 앞으로 되휜다(복합궁)."""
    g, n = Vector(grip), Vector(nock)
    back = n - g
    back.z = 0.0
    back.normalize()
    up = Vector((0, 0, 1))
    pts, radii = [], []
    for i in range(11):
        v = -1 + 2 * i / 10
        off = bulge * v * v - 0.05 * abs(v) ** 6
        pts.append(g + up * (v * half) + back * off)
        radii.append(r * (0.55 + 0.45 * (1 - abs(v))))
    m.add(tube(pts, radii, 6), mat)
    for tip in (pts[0], pts[-1]):  # 당겨진 시위 두 가닥
        m.add(rod(tip, n, 0.004, None, 4), "CLOTH")
    fwd = (g - n).normalized()
    m.add(rod(n - fwd * 0.02, g + fwd * 0.07, 0.006, None, 4), "WOOD")  # 화살대
    m.add(cone(0.014, 0.05, 4), "BRONZE", False, M(g + fwd * 0.07) @ align_z(fwd))  # 화살촉
    m.add(cyl(0.024, 0.024, 0.06, 6, -0.03), "LEATHER", True, M(grip))  # 줌통


def _scabbard(m, top, bottom, r=0.017, mat="LEATHER", chape="BRONZE"):
    """허리에 찬 칼집(끝에 청동 마구리)."""
    t, b = Vector(top), Vector(bottom)
    m.add(rod(t, b, r, r * 0.8, 6), mat)
    m.add(sphere(r * 1.25, 6, 4), chape, True, M(b))


def _open_helmet(m, c=(0, 0, HEAD_Z), mat="BRONZE", tilt=-18.0, n=14):
    """열린 투구(아티카식): 정수리·뒤통수를 덮고 얼굴은 드러낸다. 뒤가 낮고 이마가 높게 기울인 사발 + 볼 덮개."""
    cx, cy, cz = c
    prof = [(0.0, 0.124), (0.058, 0.114), (0.094, 0.085), (0.114, 0.042), (0.12, 0.0), (0.118, -0.04), (0.108, -0.045)]
    frame = M((cx, cy + 0.006, cz + 0.004), rot=(tilt, 0, 0), scale=(1, 1.06, 1))
    m.add(lathe(prof, n, cap_end=False), mat, True, frame)
    m.add(torus(0.117, 0.01, 12, 4, rn=0.012), mat, True, frame @ M((0, 0, -0.04)))
    for s in (-1, 1):  # 볼 덮개 — 앞으로 내려와 턱을 감싼다
        m.add(box(0.018, 0.07, 0.085), mat, True, M((cx + s * 0.1, cy - 0.028, cz - 0.045), rot=(0, 0, s * 16)))
    return frame


# ---------------------------------------------------------------- 인물
def hector():
    """헥토르: 「번쩍이는 투구의」(κορυθαίολος) 트로이 총대장. 가장 위엄 있게 —
    크게 휘날리는 말총 깃(6.469~470), 창끝 아래 금고리를 두른 열한 척 창(6.318~320),
    발목과 목덜미를 치는 큰 방패(6.117~118 — 짙은 가죽 테, 가운데 돋은 배꼽)."""
    m = Model("hector")
    _armored(m, hem="TEAM_DARK")
    cape(m, top=0.47, bottom=0.07, r_top=0.1, r_bot=0.2, mat="TEAM_DARK", arc=210)
    hand = _spear_arm(m, (-0.19, -0.045, 0.41))
    top = spear(m, hand[0], hand[1], 0.0, 1.2, tip_len=0.2, tip_w=0.038, r=0.017)
    m.add(torus(0.024, 0.011, 10, 4), "GOLD", True, M((top.x, top.y, top.z - 0.012)))  # 창끝을 묶은 금고리
    m.add(torus(0.021, 0.008, 10, 4), "GOLD", True, M((top.x, top.y, top.z - 0.04)))
    _shield_arm(m)
    _shield(m, (0.1, -0.14, 0.3), yaw=30, R=0.25, rim="WOOD_DARK", boss="BRONZE", boss_r=0.07, rings=(0.145,))
    helmet_corinthian(m)
    m.add(torus(0.113, 0.009, 12, 4, rn=0.011), "GOLD", True, M((0, 0, HEAD_Z - 0.1), scale=(1, 1.1, 1)))  # 번쩍이는 금테
    _horsehair_crest(m, height=0.11)
    m.transform(M(scale=1.12))
    return m


def paris():
    """파리스(알렉산드로스): 「어깨에 표범 가죽을 두르고 굽은 활과 칼을」(『일리아스』 3.16~17).
    갑옷 없이 짧은 옷, 프리기아 모자(TEAM), 긴 머리. 활시위를 당긴 자세로 궁수 병과 말과 가른다."""
    m = Model("paris")
    _legs(m, greave=None, stride=0.05)
    kilt(m, hem="TEAM_DARK")
    torso(m, "CLOTH")
    belt(m, mat="LEATHER", n=12)
    neck(m)
    head(m, hair=None)
    m.add(sphere(0.088, 10, 6), "WOOD_DARK", True, M((0, 0.06, HEAD_Z - 0.07), scale=(1.12, 0.72, 1.3)))  # 모자 밑 긴 머리
    phrygian_cap(m, mat="TEAM")
    # 표범 가죽: 어깨를 덮고 등으로는 무릎 위까지 늘어진다. 앞가슴만 조금 열어 두고 양옆까지 감싸서
    # 앞에서 봐도 얼룩 가죽이 보이게 한다
    rows = [(0.508, 0.074, 200), (0.475, 0.15, 296), (0.41, 0.142, 272), (0.34, 0.142, 252), (0.27, 0.148, 236),
            (0.19, 0.156, 226)]
    grid = _pelt(m, rows, cols=16, sy=0.8)
    # 앞발 두 짝을 가슴에서 묶는다
    knot = Vector((0.0, -0.094, 0.425))
    for p in (grid[1][0], grid[1][-1]):
        m.add(tube([p, (p + knot) / 2 + Vector((0, -0.012, 0.0)), knot], [0.02, 0.018, 0.016], 6), "FUR")
    m.add(sphere(0.024, 8, 5), "FUR_DARK", True, M(knot))
    for s in (-1, 1):
        a = knot + Vector((s * 0.012, -0.004, -0.01))
        b = knot + Vector((s * 0.03, -0.01, -0.085))
        m.add(tube([a, b], [0.014, 0.017], 6), "FUR")
        m.add(sphere(0.02, 6, 4), "FUR_DARK", True, M(b))
    # 표범 꼬리가 등 뒤로 늘어진다
    m.add(tube([(0.0, 0.118, 0.22), (0.012, 0.138, 0.15), (0.004, 0.14, 0.09), (-0.018, 0.128, 0.05)],
               [0.016, 0.014, 0.012, 0.011], 6), lambda f: "FUR_DARK" if f.calc_center_median().z < 0.085 else "FUR")
    quiver(m, base=(0.085, 0.165, 0.26), top=(-0.06, 0.18, 0.58), r=0.038)
    # 앞손은 활을 앞으로 내밀고, 뒷손은 시위를 가슴까지 당긴다
    grip = (0.11, -0.225, 0.48)
    arm(m, [(0.1, 0.0, 0.452), (0.108, -0.11, 0.468), grip])
    nock = (-0.055, -0.045, 0.5)
    arm(m, [(-0.1, 0.0, 0.452), (-0.17, 0.035, 0.49), nock])
    _drawn_bow(m, grip, nock, half=0.31, bulge=0.11, r=0.027)
    m.transform(M(scale=1.04))
    return m


def aeneas():
    """아이네이아스: 아프로디테와 안키세스의 아들, 다르다니아 사람들의 대장(『일리아스』 2.819~821).
    얼굴이 드러나는 열린 투구, 창 두 자루, 편 색 망토, 방패 가운데 금 꽃잎 돋을무늬
    (어머니 여신을 떠올리게 하려고 붙인 여덟 잎 무늬 — 무늬 모양 자체는 서사시에 없는 창작).
    헥토르보다 한 단 소박하게 — 깃은 낮고 방패는 보통 크기."""
    m = Model("aeneas")
    _armored(m, hem="TEAM_DARK")
    # 망토는 무릎 위까지만 — 뒤에서 봐도 발끝까지 끌리는 사르페돈의 왕 망토와 갈린다
    cape(m, top=0.47, bottom=0.2, r_top=0.1, r_bot=0.18, mat="TEAM", arc=230, thick=0.014)
    hand = _spear_arm(m, (-0.185, -0.05, 0.42))
    _spear_through(m, hand, (5, -5), 1.0, 0.42, tip_len=0.14, tip_w=0.03, r=0.014)
    _spear_through(m, hand, (15, 5), 0.96, 0.42, tip_len=0.14, tip_w=0.03, r=0.014)
    _shield_arm(m)
    frame = _shield(m, (0.085, -0.135, 0.36), yaw=25)
    _rosette(m, frame, R=0.1, r_in=0.05)
    head(m, hair=None)  # 수염 없이 — 열린 투구 밑 맨얼굴이 헥토르·사르페돈의 닫힌 투구와 갈린다
    _open_helmet(m, tilt=-18.0)
    m.push(M((0, 0.006, HEAD_Z + 0.004)) @ M(rot=(-18.0, 0, 0)) @ M((0, 0, -HEAD_Z)))
    crest(m, height=0.07, r_h=0.12, sy=1.06, front=122, back=-26, steps=10)
    m.pop()
    m.transform(M(scale=1.06))
    return m


def sarpedon():
    """사르페돈: 리키아의 왕, 제우스의 아들. 「두드려 편 청동 둥근 방패, 안쪽에 소가죽을 대고
    금 막대로 둘레를 빙 둘러 꿰맨」 방패(『일리아스』 12.294~297) — 청동 앞면에 금 테 여러 겹.
    왕의 표지로 투구에 금 관, 발목까지 끌리는 금단 긴 망토(TEAM), 창 두 자루(12.298)."""
    m = Model("sarpedon-of-lycia")
    _armored(m, hem="TEAM_DARK")
    cape(m, top=0.475, bottom=0.02, r_top=0.112, r_bot=0.22, mat="TEAM", arc=250, sy=0.84, thick=0.016, hem="GOLD")
    hand = _spear_arm(m, (-0.19, -0.045, 0.42))
    _spear_through(m, hand, (4, -4), 1.02, 0.4, tip_len=0.15, tip_w=0.032, r=0.015)
    _spear_through(m, hand, (13, 6), 0.96, 0.42, tip_len=0.15, tip_w=0.032, r=0.015)
    _shield_arm(m)
    _shield(m, (0.09, -0.14, 0.36), yaw=25, R=0.21, face="BRONZE", rim="GOLD", boss="GOLD", boss_r=0.05,
            rings=(0.155, 0.12, 0.085))
    helmet_corinthian(m)
    _helmet_band(m, points=5, point_h=0.08, point_w=0.028)
    crest(m, height=0.085, thick=0.03, back=-34.0, steps=11)
    m.transform(M(scale=1.08))
    return m


def glaucus():
    """글라우코스: 리키아의 장수, 사르페돈의 벗. 디오메데스와 무구를 바꾸며 내준
    「황소 백 마리 값의 금 무구」(『일리아스』 6.235~236) — 금 흉갑·금 치마 드리개·금 정강이받이·금 투구·금 팔찌.
    깃 투구, 창 하나, 금 흉갑을 가리지 않게 등에 멘 방패(TEAM)."""
    m = Model("glaucus")
    # 치마(금 가죽띠 드리개)까지 금으로 — 몸 전체가 금빛으로 보여야 청동 장수들 사이에서 튄다
    _legs(m, greave="GOLD")
    kilt(m, mat="GOLD", hem="TEAM_DARK")
    torso(m, "GOLD", r_chest=0.112)
    belt(m, mat="TEAM_DARK", n=12)
    shoulders(m, "GOLD", r=0.05)
    neck(m)
    hand = (-0.19, -0.045, 0.41)
    arm(m, [(-0.1, 0.0, 0.452), (-0.16, -0.012, 0.37), hand])
    m.add(tube([(-0.162, -0.016, 0.365), (-0.186, -0.04, 0.4)], [0.029, 0.026], 7), "GOLD")  # 금 팔찌
    spear(m, hand[0], hand[1], 0.0, 1.04, tip_len=0.16, tip_w=0.032)
    # 방패는 등에 메어(헥토르도 등에 메고 걷는다, 6.117~118) 앞에서는 금 흉갑이 통째로 보이게 한다.
    # 뒤에서는 방패 앞면(TEAM)이 편 색을 보인다. 왼손은 허리에 얹는다.
    sash(m, mat="LEATHER", side=-1, r=0.113)
    arm(m, [(0.1, 0.0, 0.452), (0.17, 0.0, 0.37), (0.125, -0.035, 0.3)])
    _shield(m, (0.0, 0.125, 0.34), yaw=180, R=0.19, rim="GOLD", boss="GOLD", boss_r=0.045)
    helmet_corinthian(m, mat="GOLD")
    crest(m, height=0.09, thick=0.032, back=-36.0, steps=12)
    m.transform(M(scale=1.04))
    return m


def deiphobus():
    """데이포보스: 프리아모스의 아들, 헬레노스의 형제. 「둥근 방패를 앞에 들고 그 밑으로 가볍게 발을 떼며」
    나아간다(『일리아스』 13.156~158). 창 대신 뽑아 든 칼, 허리의 칼집, 앞으로 든 방패, 투구 깃 + 왕자의 금 관 띠."""
    m = Model("deiphobus")
    _armored(m, hem="TEAM_DARK", stride=0.04)
    sash(m, mat="LEATHER", side=1, r=0.104)
    _scabbard(m, (0.125, 0.0, 0.31), (0.15, 0.1, 0.13))
    hand = (-0.2, -0.04, 0.63)
    arm(m, [(-0.1, 0.0, 0.452), (-0.19, 0.0, 0.53), hand])
    sword(m, hand, direction=(-0.1, 0.12, 0.99), blade=0.33, width=0.064)
    _shield_arm(m)
    _shield(m, (0.08, -0.15, 0.38), yaw=22, R=0.2, boss="BRONZE", rings=(0.115,))
    helmet_corinthian(m)
    _helmet_band(m)
    m.add(prism([(-0.045, 0.0), (0.045, 0.0), (0.024, 0.034), (0.0, 0.052), (-0.024, 0.034)], 0.012, "XZ"), "GOLD", 35,
          M((0, -0.138, HEAD_Z + 0.034), rot=(-22, 0, 0)))  # 이마 앞 금 장식판
    crest(m, height=0.09, thick=0.03, back=-32.0, steps=11)
    m.transform(M(scale=1.04))
    return m


MODELS = {
    "hector": {"build": hector, "kind": "unit"},
    "paris": {"build": paris, "kind": "unit"},
    "aeneas": {"build": aeneas, "kind": "unit"},
    "sarpedon-of-lycia": {"build": sarpedon, "kind": "unit"},
    "glaucus": {"build": glaucus, "kind": "unit"},
    "deiphobus": {"build": deiphobus, "kind": "unit"},
}
