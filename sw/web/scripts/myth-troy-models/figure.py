# 장수 말 몸 부품 — 다리·치마·몸통·팔·머리·투구·깃·방패·창·후광
# 사람 말 기준 키 0.72(투구 꼭대기 ≈0.70, 깃 끝 ≈0.85). 앞은 -Y, 말의 오른쪽은 -X, 왼쪽은 +X.
import math

import bmesh
from mathutils import Matrix, Vector

from lib import M, align_z, box, cone, cyl, lathe, prism, rod, sphere, torus, tube, xf

HEAD_Z = 0.585  # 머리 가운데 높이
HEAD_R = 0.1


def legs(m, stride=0.022, greaves=True, boots=False, spread=0.055, hip=0.24, knee=0.12):
    """두 다리. 왼발(+X)을 조금 앞으로 내디딘다."""
    for s in (-1, 1):
        y = -stride if s > 0 else stride * 0.6
        ankle = (s * spread, y, 0.03)
        kn = (s * (spread + 0.003), y * 0.6, knee)
        hp = (s * (spread - 0.01), 0.0, hip)
        m.add(tube([ankle, kn, hp], [0.024, 0.029, 0.037], 8), "SKIN")
        if greaves:
            m.add(tube([(ankle[0], ankle[1] - 0.002, 0.042), (kn[0], kn[1] - 0.002, knee + 0.018)], [0.031, 0.034], 8), "BRONZE")
        if boots:
            m.add(tube([(ankle[0], ankle[1], 0.03), (kn[0], kn[1], knee - 0.02)], [0.031, 0.032], 8), "LEATHER")
        m.add(box(0.052, 0.092, 0.032, 0.009), "LEATHER", True, M((s * spread, y - 0.016, 0.016)))


def kilt(m, top=0.31, bottom=0.15, r_top=0.078, r_bot=0.122, mat="CLOTH", hem="TEAM_DARK", sy=0.86, hem_mat=None):
    """짧은 키톤 치마(아래로 퍼짐) + 옷단 띠."""
    prof = [(r_top, top), (r_top + 0.022, top - 0.05), (r_bot - 0.008, bottom + 0.035), (r_bot, bottom)]
    m.add(lathe(prof, 14), mat, True, M(scale=(1, sy, 1)))
    if hem:
        m.add(torus(r_bot - 0.001, 0.009, 14, 4, rn=0.014), hem, True, M((0, 0, bottom + 0.008), scale=(1, sy, 1)))


def robe(m, top=0.47, r_top=0.07, r_bot=0.15, mat="CLOTH", hem="TEAM_DARK", sy=0.86, hem_h=0.03):
    """발까지 내려오는 긴 옷(종 모양) + 옷단."""
    prof = [(0.0, top + 0.01), (r_top, top), (r_top + 0.03, top - 0.06), (r_top + 0.035, top - 0.16),
            (r_bot - 0.03, 0.14), (r_bot - 0.005, 0.04), (r_bot, 0.0), (0.0, 0.0)]
    m.add(lathe(prof, 16), mat, True, M(scale=(1, sy, 1)))
    if hem:
        m.add(lathe([(r_bot + 0.003, 0.0), (r_bot - 0.004, hem_h)], 16, cap_start=False, cap_end=False),
              hem, True, M(scale=(1, sy, 1)))


def torso(m, mat="BRONZE", waist=0.28, top=0.49, sy=0.74, r_chest=0.105):
    """몸통(흉갑 또는 옷). 앞뒤로 조금 납작하다."""
    prof = [(0.0, waist), (0.084, waist), (0.092, waist + 0.05), (r_chest, waist + 0.12),
            (r_chest - 0.004, top - 0.045), (0.07, top - 0.012), (0.0, top)]
    m.add(lathe(prof, 14), mat, True, M(scale=(1, sy, 1)))


def belt(m, z=0.29, r=0.088, mat="TEAM_DARK", sy=0.76, n=14):
    m.add(torus(r, 0.011, n, 4, rn=0.014), mat, True, M((0, 0, z), scale=(1, sy, 1)))


def shoulders(m, mat="BRONZE", z=0.455, x=0.1, r=0.04, seg=(8, 5)):
    for s in (-1, 1):
        m.add(sphere(r, seg[0], seg[1]), mat, True, M((s * x, 0.0, z), scale=(1, 0.9, 0.8)))


def arm(m, pts, radii=(0.029, 0.025, 0.021), mat="SKIN", hand=True, hand_r=0.028, sides=7):
    """어깨→팔꿈치→손목 관 + 손(공)."""
    m.add(tube(pts, list(radii), sides), mat)
    if hand:
        m.add(sphere(hand_r, 8 if sides > 6 else 6, 5 if sides > 6 else 4), "SKIN", True, M(pts[-1]))


def neck(m, z0=0.465, z1=0.52, r=0.036):
    m.add(cyl(r, r * 0.95, z1 - z0, 8, z0), "SKIN")


def head(m, c=(0, 0, HEAD_Z), r=HEAD_R, hair="WOOD_DARK", beard=None, beard_size=1.0, long_hair=False):
    """맨머리: 살색 공 + 뒤·위를 덮는 머리칼 + (있으면) 수염."""
    cx, cy, cz = c
    m.add(sphere(r, 12, 8), "SKIN", True, M(c))
    if hair:
        m.add(sphere(r * 1.03, 12, 8), hair, True, M((cx, cy + 0.022, cz + 0.014), scale=(1.03, 1.0, 1.0)))
        if long_hair:
            m.add(sphere(r * 0.85, 10, 6), hair, True, M((cx, cy + 0.06, cz - 0.06), scale=(1.1, 0.7, 1.2)))
    if beard:
        b = beard_size
        m.add(sphere(0.062 * b, 10, 6), beard, True, M((cx, cy - 0.062, cz - 0.068 * b), scale=(1.15, 0.75, 1.15)))


def helmet_corinthian(m, c=(0, 0, HEAD_Z), mat="BRONZE", slit="WOOD_DARK", sy=1.1, trim=None, n=14):
    """코린트식 투구: 달걀꼴 청동 + 앞면 T자 틈."""
    prof = [(0.0, 0.117), (0.05, 0.11), (0.086, 0.09), (0.108, 0.05), (0.114, 0.0), (0.111, -0.05),
            (0.106, -0.085), (0.114, -0.103), (0.1, -0.113), (0.0, -0.108)]
    base = M(c, scale=(1, sy, 1))
    m.add(lathe(prof, n), mat, True, base)
    # 눈 틈(가로)과 입 틈(세로) — 겉면에 살짝 띄운 어두운 띠
    m.add(lathe([(0.1175, -0.004), (0.1175, 0.03)], 8, arc=112, start=-146, cap_start=False, cap_end=False), slit, True, base)
    m.add(lathe([(0.1125, -0.085), (0.1165, -0.004)], 2, arc=24, start=-102, cap_start=False, cap_end=False), slit, True, base)
    if trim:
        m.add(torus(0.113, 0.008, 16, 4, rn=0.01), trim, True, M((c[0], c[1], c[2] - 0.1), scale=(1, sy, 1)))


def interp(t, table):
    """[(t, 값)…] 꺾은선 보간."""
    for (t0, v0), (t1, v1) in zip(table, table[1:]):
        if t <= t1:
            return v0 + (v1 - v0) * (t - t0) / max(t1 - t0, 1e-9)
    return table[-1][1]


CREST_SHAPE = [(0.0, 0.25), (0.15, 0.75), (0.35, 1.0), (0.55, 0.95), (0.75, 0.7), (0.9, 0.45), (1.0, 0.2)]


def crest(m, c=(0, 0, HEAD_Z), mat="TEAM", height=0.07, sy=1.1, r_h=0.113, front=128.0, back=-28.0, thick=0.028,
          steps=11, shape=CREST_SHAPE, sides=8):
    """투구 깃: 투구 겉면을 따라 앞에서 뒤로 넘어가는 말총 관(단면은 납작한 타원)."""
    cx, cy, cz = c
    pts, rad = [], []
    for i in range(steps + 1):
        t = i / steps
        a = math.radians(front + (back - front) * t)
        # 앞은 낮게 시작해 정수리 조금 뒤에서 가장 높고, 꼬리로 가며 가늘어진다
        hn = max(height * interp(t, shape), 0.012)
        rr = r_h + hn
        pts.append((cx, cy + rr * math.cos(a) * sy, cz + rr * math.sin(a)))
        rad.append((hn, thick * (0.75 + 0.25 * interp(t, shape))))
    m.add(tube(pts, rad, sides, up=(0, 0, 1)), mat)


def shield_disc(m, frame, R=0.2, face="TEAM", rim="BRONZE", back="LEATHER", boss=None, boss_r=0.06, seg=18):
    """틀(frame)의 +Z가 앞면인 둥근 방패: 불룩한 앞면 + 청동 테(+ 돋을무늬)."""
    prof = [(0.0, 0.045), (0.07, 0.041), (0.13, 0.03), (R - 0.02, 0.012), (R - 0.02, -0.012), (0.0, -0.012)]
    dome = xf(lathe(prof, seg), frame)
    n_front = (frame.to_3x3() @ Vector((0, 0, 1))).normalized()
    m.add(dome, lambda f: face if f.normal.dot(n_front) > 0.35 else back)
    m.add(torus(R - 0.016, 0.021, seg, 4, rn=0.022), rim, True, frame)
    if boss:
        m.add(lathe([(0.0, 0.07), (boss_r * 0.55, 0.066), (boss_r, 0.05), (boss_r, 0.04), (0.0, 0.04)], 12), boss, True, frame)
        m.add(torus(0.115 * R / 0.2, 0.01, seg, 4, rn=0.008), boss, True, frame @ M((0, 0, 0.034)))
    return frame


def shield_round(m, center, yaw=25.0, R=0.2, face="TEAM", rim="BRONZE", back="LEATHER", boss=None, boss_r=0.06, pitch=0.0):
    """둥근 호플론 방패. 앞면이 -Y에서 +X 쪽으로 yaw도 돌아 있다."""
    frame = M(center) @ M(rot=(0, 0, yaw)) @ M(rot=(90 + pitch, 0, 0))
    return shield_disc(m, frame, R, face, rim, back, boss, boss_r)


def spear(m, x, y, z0=0.0, z1=1.0, r=0.016, tip="BRONZE", shaft="WOOD", tip_len=0.15, tip_w=0.03, tilt=None):
    """곧게 세운 창(tilt=(x각, y각)이면 기울임). 잎꼴 창끝 + 물미."""
    base = Vector((x, y, z0))
    rot = M(rot=(tilt[0], tilt[1], 0)) if tilt else Matrix.Identity(4)
    top = base + (rot.to_3x3() @ Vector((0, 0, z1 - z0)))
    m.add(rod(base + rot.to_3x3() @ Vector((0, 0, 0.04)), top, r, r * 0.9, 6), shaft)
    frame = Matrix.Translation(top) @ rot
    m.add(lathe([(0.0, -0.01), (tip_w, tip_len * 0.35), (tip_w * 0.75, tip_len * 0.65), (0.0, tip_len)], 6), tip, True, frame)
    m.add(lathe([(0.0, 0.0), (r * 1.2, 0.045), (r * 1.1, 0.05)], 6), tip, True, Matrix.Translation(base) @ rot)
    return top


def halo(m, c, R=0.15, r=0.016, back=0.075):
    """머리 뒤 둥근 후광 고리(정면을 향해 선다)."""
    m.add(torus(R, r, 24, 5), "GLOW", True, M((c[0], c[1] + back, c[2]), rot=(90, 0, 0)))


def cape(m, top=0.47, bottom=0.12, r_top=0.1, r_bot=0.19, mat="TEAM_DARK", arc=200.0, sy=0.8, thick=0.014, hem=None):
    """등 뒤로 늘어진 망토(반쯤 돈 원뿔 껍질, 두께 있음). hem을 주면 아랫단에 띠를 두른다."""
    start = 90 - arc / 2
    if hem:
        pts = []
        for j in range(13):
            a = math.radians(start + arc * j / 12)
            pts.append((r_bot * math.cos(a) - thick * 0.5 * math.cos(a), (r_bot - thick * 0.5) * math.sin(a) * sy, bottom + 0.009))
        m.add(tube(pts, [(0.011, 0.012)] * 13, 4, phase=45), hem, 60)
    prof_out = [(r_bot, bottom), (r_top + 0.02, (top + bottom) / 2 + 0.05), (r_top, top)]
    prof_in = [(r - thick, z) for r, z in prof_out]
    n = 12
    bm = bmesh.new()
    rings_o, rings_i = [], []
    for (ro, z), (ri, _z) in zip(prof_out, prof_in):
        ro_ring, ri_ring = [], []
        for j in range(n + 1):
            a = math.radians(start + arc * j / n)
            ro_ring.append(bm.verts.new((ro * math.cos(a), ro * math.sin(a), z)))
            ri_ring.append(bm.verts.new((ri * math.cos(a), ri * math.sin(a), z)))
        rings_o.append(ro_ring)
        rings_i.append(ri_ring)
    for i in range(len(prof_out) - 1):
        for j in range(n):
            bm.faces.new((rings_o[i][j], rings_o[i][j + 1], rings_o[i + 1][j + 1], rings_o[i + 1][j]))
            bm.faces.new((rings_i[i][j], rings_i[i + 1][j], rings_i[i + 1][j + 1], rings_i[i][j + 1]))
    last = len(prof_out) - 1
    for j in range(n):  # 위·아래 가장자리
        bm.faces.new((rings_o[0][j + 1], rings_o[0][j], rings_i[0][j], rings_i[0][j + 1]))
        bm.faces.new((rings_o[last][j], rings_o[last][j + 1], rings_i[last][j + 1], rings_i[last][j]))
    for i in range(last):  # 양 옆 가장자리
        bm.faces.new((rings_o[i][0], rings_o[i + 1][0], rings_i[i + 1][0], rings_i[i][0]))
        bm.faces.new((rings_o[i + 1][n], rings_o[i][n], rings_i[i][n], rings_i[i + 1][n]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    m.add(bm, mat, True, M(scale=(1, sy, 1)))


def bow(m, grip, yaw=45.0, half=0.28, bulge=0.075, mat="WOOD", string="CLOTH", r=0.012):
    """복합궁: 활 평면을 yaw도 돌려 세운다. 활 배는 앞(-Y)을 향한다."""
    pts = []
    for i in range(11):
        v = -1 + 2 * i / 10
        u = bulge * (1 - v * v) - 0.035 * (abs(v) ** 6)  # 끝이 뒤로 휘는 모양
        pts.append((0.0, -u, v * half))
    frame = M(grip) @ M(rot=(0, 0, yaw))
    radii = [r * (0.55 + 0.45 * (1 - abs(-1 + 2 * i / 10))) for i in range(11)]
    m.add(tube(pts, radii, 6), mat, True, frame)
    tip_a, tip_b = Vector(pts[0]), Vector(pts[-1])
    m.add(rod(tip_a, tip_b, 0.0035, None, 4), string, True, frame)
    return frame


def quiver(m, base, top, r=0.036, mat="LEATHER", fletch="CLOTH", arrows=4):
    """등에 멘 화살통 + 위로 삐져나온 깃."""
    b, t = Vector(base), Vector(top)
    m.add(rod(b, t, r, r * 1.08, 8), mat)
    d = (t - b).normalized()
    side = d.cross(Vector((0, 1, 0))).normalized()
    for k in range(arrows):
        off = side * (-0.018 + 0.012 * k) + Vector((0, (k % 2) * 0.012 - 0.006, 0))
        p0 = t + off
        p1 = p0 + d * (0.07 + 0.01 * (k % 2))
        m.add(rod(p0, p1, 0.004, None, 4), "WOOD")
        m.add(prism([(-0.013, 0.0), (0.013, 0.0), (0.009, 0.05), (-0.009, 0.05)], 0.006), fletch, True,
              Matrix.Translation(p1 - d * 0.05) @ align_z(d))


def sword(m, grip, direction=(0, -0.4, -1), blade=0.2, width=0.03, mat="BRONZE", hilt="LEATHER", pommel="GOLD"):
    """잎꼴 청동 칼(나우에형). grip에서 direction으로 날이 뻗는다."""
    d = Vector(direction).normalized()
    frame = Matrix.Translation(Vector(grip)) @ align_z(d)
    outline = [(-width * 0.35, 0.0), (width * 0.35, 0.0), (width * 0.5, blade * 0.55), (width * 0.3, blade * 0.9), (0.0, blade),
               (-width * 0.3, blade * 0.9), (-width * 0.5, blade * 0.55)]
    m.add(prism(outline, 0.012, "XZ"), mat, True, frame @ M((0, 0, 0.03)))
    m.add(box(width * 1.8, 0.02, 0.014), hilt, True, frame @ M((0, 0, 0.028)))
    m.add(rod(Vector(grip) - d * 0.03, Vector(grip) + d * 0.022, 0.009, None, 6), hilt)
    m.add(sphere(0.014, 8, 5), pommel, True, M(Vector(grip) - d * 0.035))


def sleeve_arm(m, pts, sleeve="CLOTH", radii=(0.031, 0.026, 0.021), hand=True):
    """윗팔은 소매(옷), 아래팔은 살."""
    a, b, c = pts
    m.add(tube([a, b], [radii[0] + 0.004, radii[1] + 0.004], 7), sleeve)
    m.add(tube([b, c], [radii[1], radii[2]], 7), "SKIN")
    if hand:
        m.add(sphere(0.028, 8, 5), "SKIN", True, M(c))


def crown(m, c=(0, 0, HEAD_Z), mat="GOLD", r=0.104, z0=0.035, h=0.036, points=7, point_h=0.045):
    """금관: 머리를 두른 띠 + 뾰족한 끝."""
    cx, cy, cz = c
    band = lathe([(r, z0), (r + 0.013, z0), (r + 0.016, z0 + h), (r + 0.003, z0 + h)], 16, loop=True)
    m.add(band, mat, 35, M((cx, cy + 0.008, cz)))
    for k in range(points):
        a = 2 * math.pi * (k + 0.5) / points
        p = (cx + (r + 0.01) * math.cos(a), cy + 0.008 + (r + 0.01) * math.sin(a), cz + z0 + h - 0.004)
        m.add(cone(0.017, point_h, 4), mat, False, M(p))


def diadem(m, c=(0, 0, HEAD_Z), mat="GOLD", r=0.103):
    """신의 머리띠(스테파네): 앞이 높은 초승달 꼴 금띠."""
    cx, cy, cz = c
    ring = lathe([(r, 0.02), (r + 0.012, 0.02), (r + 0.014, 0.05), (r + 0.002, 0.05)], 16, loop=True)
    m.add(ring, mat, 35, M((cx, cy + 0.01, cz)))
    front = [(-0.07, 0.0), (0.07, 0.0), (0.045, 0.045), (0.0, 0.065), (-0.045, 0.045)]
    m.add(prism(front, 0.012, "XZ"), mat, 35, M((cx, cy - r + 0.0, cz + 0.035), rot=(-12, 0, 0)))


def wreath(m, c=(0, 0, HEAD_Z), mat="LEAF", r=0.104, z=0.035, rng=None):
    """월계관: 울퉁불퉁한 잎 고리."""
    import random
    rng = rng or random.Random(7)
    t = torus(r, 0.022, 14, 4, rn=0.016)
    for v in t.verts:
        v.co += Vector((rng.uniform(-1, 1), rng.uniform(-1, 1), rng.uniform(-1, 1))) * 0.006
    m.add(t, mat, False, M((c[0], c[1] + 0.012, c[2] + z), rot=(-10, 0, 0)))


def phrygian_cap(m, c=(0, 0, HEAD_Z), mat="TEAM", flaps=True):
    """프리기아 모자: 부드러운 원뿔, 끝이 앞으로 굽는다 + 양옆 볼 덮개."""
    cx, cy, cz = c
    pts = [(cx, cy + 0.016, cz - 0.004), (cx, cy + 0.008, cz + 0.06), (cx, cy - 0.006, cz + 0.118),
           (cx, cy - 0.036, cz + 0.17), (cx, cy - 0.078, cz + 0.19), (cx, cy - 0.114, cz + 0.172), (cx, cy - 0.128, cz + 0.138)]
    rad = [0.107, 0.103, 0.083, 0.06, 0.04, 0.024, 0.0]
    m.add(tube(pts, rad, 12), mat)
    if flaps:
        for s in (-1, 1):
            m.add(sphere(0.045, 8, 5), mat, True, M((cx + s * 0.084, cy + 0.018, cz - 0.055), scale=(0.42, 0.9, 1.35)))


def pilos(m, c=(0, 0, HEAD_Z), mat="LEATHER"):
    """가벼운 가죽 모자(필로스): 낮고 끝이 조금 뾰족한 원뿔."""
    cx, cy, cz = c
    prof = [(0.0, 0.0), (0.109, 0.0), (0.112, 0.03), (0.098, 0.075), (0.062, 0.115), (0.022, 0.14), (0.0, 0.145)]
    m.add(lathe(prof, 14), mat, True, M((cx, cy + 0.008, cz + 0.012)))
    m.add(torus(0.111, 0.009, 14, 4), mat, True, M((cx, cy + 0.008, cz + 0.014)))


def helmet_small(m, c=(0, 0, HEAD_Z), mat="BRONZE", knob="BRONZE"):
    """작은 청동 투구(볏 없음): 머리를 덮는 반구 + 챙 + 꼭지."""
    cx, cy, cz = c
    prof = [(0.0, 0.122), (0.055, 0.115), (0.092, 0.09), (0.112, 0.045), (0.116, 0.0), (0.114, -0.02), (0.0, -0.02)]
    m.add(lathe(prof, 14), mat, True, M((cx, cy + 0.01, cz)))
    m.add(torus(0.117, 0.01, 14, 4), mat, True, M((cx, cy + 0.01, cz - 0.012)))
    m.add(sphere(0.022, 8, 5), knob, True, M((cx, cy + 0.01, cz + 0.13)))
    for s in (-1, 1):  # 볼 덮개
        m.add(box(0.016, 0.06, 0.07, 0.006), mat, True, M((cx + s * 0.105, cy - 0.015, cz - 0.05)))


def pelta(m, center, yaw=25.0, R=0.18, face="TEAM", edge="BRONZE", back="LEATHER", thick=0.024):
    """초승달 방패(펠타): 뿔 두 개가 위로 선 초승달."""
    horn = math.radians(22)
    hx, hz = R * math.cos(horn), R * math.sin(horn)
    cz = 0.105  # 안쪽 원 가운데 높이
    ri = math.hypot(hx, hz - cz)
    outline = []
    steps = 14
    for i in range(steps + 1):  # 바깥 호: 왼 뿔 → 아래 → 오른 뿔
        a = math.radians(180 - 22) + (math.radians(360 + 22) - math.radians(180 - 22)) * i / steps
        outline.append((R * math.cos(a), R * math.sin(a)))
    a0 = math.atan2(hz - cz, hx)
    a1 = math.atan2(hz - cz, -hx)
    if a1 > a0:
        a1 -= 2 * math.pi
    for i in range(1, 8):  # 안쪽 호: 오른 뿔 → 아래 → 왼 뿔
        a = a0 + (a1 - a0) * i / 8
        outline.append((ri * math.cos(a), cz + ri * math.sin(a)))
    frame = M(center) @ M(rot=(0, 0, yaw))
    front = frame.to_3x3() @ Vector((0, -1, 0))
    part = xf(prism(outline, thick, "XZ"), frame)
    m.add(part, lambda f: face if f.normal.dot(front) > 0.6 else (back if f.normal.dot(front) < -0.6 else edge))
    # 테두리 청동 띠 — 같은 편 색 받침 위에서도 초승달 윤곽이 보이게
    rim = [(u, -thick * 0.25, v) for u, v in outline]
    m.add(tube(rim, 0.012, 4, closed=True, phase=45), edge, 60, frame)
    m.add(sphere(0.03, 6, 4), edge, True, frame @ M((0, -thick / 2, -0.06), scale=(1, 0.55, 1)))
    return frame


HORSE_BODY = [(0.0, -0.205), (0.046, -0.198), (0.07, -0.168), (0.08, -0.11), (0.075, -0.03), (0.073, 0.05),
              (0.078, 0.12), (0.066, 0.172), (0.036, 0.2), (0.0, 0.205)]


def horse(m, frame, mat="HORSE", dark="WOOD_DARK", stride=0.0, tail_lift=0.0):
    """살아 있는 말(Y축으로 돌린 몸통 + 네 다리 + 굽은 목·머리 + 갈기·꼬리). 앞은 -Y, 원점은 몸 아래 땅."""
    m.push(frame)
    m.add(lathe(HORSE_BODY, 8), mat, True, M((0, 0, 0.29)) @ M(scale=(0.92, 1, 1.08)) @ M(rot=(-90, 0, 0)))

    def hoof(f):
        return dark if f.calc_center_median().z < 0.04 else mat

    for s in (-1, 1):
        fy = -0.125 - stride * s
        m.add(tube([(s * 0.038, -0.125, 0.28), (s * 0.039, fy - 0.006, 0.14), (s * 0.038, fy, 0.045), (s * 0.038, fy, 0.0)],
                   [0.027, 0.019, 0.016, 0.019], 5), hoof)
        by = 0.13 + stride * s
        m.add(tube([(s * 0.04, 0.13, 0.28), (s * 0.04, by + 0.04, 0.15), (s * 0.039, by + 0.012, 0.045), (s * 0.039, by + 0.012, 0.0)],
                   [0.03, 0.019, 0.016, 0.019], 5), hoof)
    m.add(tube([(0, -0.15, 0.3), (0, -0.2, 0.39), (0, -0.228, 0.46)], [0.056, 0.045, 0.036], 7), mat)
    m.add(tube([(0, -0.222, 0.485), (0, -0.268, 0.447), (0, -0.312, 0.396)], [(0.04, 0.034), (0.034, 0.03), (0.026, 0.024)], 7), mat)
    for s in (-1, 1):
        m.add(cone(0.013, 0.04, 4), mat, False, M((s * 0.018, -0.21, 0.5), rot=(-12, 0, 0)))
    m.add(tube([(0, -0.12, 0.36), (0, -0.172, 0.425), (0, -0.208, 0.515)], [(0.024, 0.013), (0.028, 0.014), (0.016, 0.01)], 4), dark, False)
    m.add(tube([(0, 0.19, 0.32 + tail_lift * 0.02), (0, 0.232, 0.275 + tail_lift * 0.05), (0, 0.25, 0.16 + tail_lift * 0.09)],
               [0.02, 0.025, 0.008], 5), dark)
    m.pop()


def wheel(m, center, R=0.16, spokes=6, mat="WOOD", hub="BRONZE", rim_r=0.019, tire="WOOD_DARK"):
    """전차 바퀴(바퀴 면은 YZ, 축은 X). 바깥 테는 어두운 쇠·가죽 테."""
    frame = M(center) @ M(rot=(0, 90, 0))
    ring = torus(R - rim_r, rim_r, 16, 4, rn=rim_r * 1.3)
    # 바깥쪽 면은 어두운 테(쇠·가죽), 안쪽·옆은 나무
    m.add(ring, lambda f: tire if (f.calc_center_median() - frame.translation).length > R - rim_r * 0.4 else mat, True, frame)
    for k in range(spokes):
        a = 2 * math.pi * k / spokes
        p = Vector((math.cos(a) * (R - rim_r), math.sin(a) * (R - rim_r), 0.0))
        m.add(rod(Vector((0, 0, 0)), p, 0.011, None, 4, caps=False), mat, True, frame)
    m.add(cyl(0.036, 0.028, 0.08, 6, -0.04), hub, True, frame)


def sash(m, z_top=0.45, z_bot=0.3, r=0.1, mat="TEAM_DARK", sy=0.76, side=1):
    """어깨에서 반대편 허리로 비스듬히 두른 띠."""
    tilt = math.degrees(math.atan2(z_top - z_bot, 2 * r)) * side
    m.add(torus(r, 0.012, 14, 4, rn=0.016), mat, True, M((0, 0, (z_top + z_bot) / 2), rot=(0, tilt, 0), scale=(1, sy, 1)))


def laurel_top(m, top, mat="LEAF", n=7, size=0.045, rng=None):
    """지팡이 끝 월계 가지: 잎 덩이 몇 개."""
    import random
    rng = rng or random.Random(3)
    t = Vector(top)
    for k in range(n):
        a = 2 * math.pi * k / n + rng.uniform(-0.3, 0.3)
        up = rng.uniform(-0.02, 0.05)
        p = t + Vector((math.cos(a) * size * 0.9, math.sin(a) * size * 0.9, up))
        leaf = sphere(size * 0.55, 6, 4)
        m.add(leaf, mat, False, M(p, rot=(rng.uniform(-40, 40), rng.uniform(-40, 40), math.degrees(a)), scale=(1.0, 0.45, 0.45)))
    m.add(sphere(size * 0.6, 8, 5), mat, False, M(t + Vector((0, 0, 0.03))))


def trident(m, base, top, mat="GOLD", r=0.017, prong=0.16, width=0.075):
    """삼지창: 곧은 자루 + 가로대 + 미늘 달린 날 셋."""
    b, t = Vector(base), Vector(top)
    m.add(rod(b, t, r, r * 0.9, 6), mat)
    m.add(box(width * 2 + 0.03, 0.028, 0.03, 0.006), mat, True, M(t + Vector((0, 0, 0.012))))
    for s in (-1, 0, 1):
        x = s * width
        h = prong * (1.18 if s == 0 else 1.0)
        p0 = t + Vector((x, 0, 0.0))
        m.add(rod(p0, p0 + Vector((0, 0, h)), 0.011, 0.009, 5), mat)
        # 미늘 달린 끝
        m.add(lathe([(0.0, 0.0), (0.024, 0.02), (0.0, 0.07)], 4), mat, False, M(p0 + Vector((0, 0, h - 0.01))))
