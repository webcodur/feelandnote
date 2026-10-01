# 트로이 장수 고유 말 2 — 판다로스·폴리다마스·헬레노스·돌론·펜테실레이아·멤논
# 병과 말(units.py)을 바탕으로 인물마다 한눈에 알아볼 표지(뿔 활·이리 가죽·도끼·햇살 방패 …)를 크게 과장한다.
# 앞은 -Y, 말의 오른손은 -X 쪽. 받침은 넣지 않는다(3D 판이 편 색 받침을 깐다).
import math

from mathutils import Matrix, Vector

from lib import M, Model, align_z, box, cone, cyl, lathe, prism, rod, sphere, torus, tube
from figure import (HEAD_Z, arm, belt, bow, cape, crest, crown, head, helmet_corinthian, helmet_small, horse, kilt,
                    laurel_top, legs, neck, pelta, phrygian_cap, quiver, robe, sash, shield_disc, shield_round,
                    shoulders, sleeve_arm, spear, torso)
from units import _center_y, _feet, _spear_through


# ---------------------------------------------------------------- 이 모듈만 쓰는 도우미
def _recolor(m, old, new):
    """다 만든 뒤 재질 하나를 통째로 바꾼다(figure.py 부품은 살을 늘 SKIN으로 칠한다)."""
    if old not in m.slots:
        return
    i = m.slots.index(old)
    if new not in m.slots:
        m.slots[i] = new
        return
    j = m.slots.index(new)
    for f in m.bm.faces:
        if f.material_index == i:
            f.material_index = j
    # 빈 슬롯이 재질 목록에 남지 않게 뒤 번호를 당긴다
    m.slots.pop(i)
    for f in m.bm.faces:
        if f.material_index > i:
            f.material_index -= 1


def _basis(o, xdir, zdir):
    """원점 o, +Z가 zdir, +X가 xdir(zdir에 수직으로 맞춤)인 틀."""
    z = Vector(zdir).normalized()
    x = Vector(xdir)
    x = (x - z * x.dot(z)).normalized()
    y = z.cross(x)
    mat = Matrix.Identity(4)
    for i in range(3):
        mat[i][0], mat[i][1], mat[i][2], mat[i][3] = x[i], y[i], z[i], o[i]
    return mat


def _about(pivot, rot=(0, 0, 0), scale=1.0):
    """pivot을 축으로 돌리거나 키우는 행렬(push에 쓴다)."""
    return M(pivot) @ M(rot=rot, scale=scale) @ M(tuple(-c for c in pivot))


def _horn_bow(m, grip, fwd, half=0.43, bulge=0.12, flick=0.05, nock=None, r0=0.027, r1=0.009, ridges=10):
    """들염소 뿔 두 개를 줌통에서 맞붙인 큰 활. fwd는 활 배가 향하는 쪽(과녁), 활 평면은 fwd와 위(Z).
    뿔마다 마디가 도드라지게 굵기를 번갈아 주고, 끝은 앞으로 젖혀 금 고리(κορώνη)를 씌운다.
    nock을 주면 시위를 그 점(당기는 손)까지 V자로 끌어당긴다."""
    g, f, up = Vector(grip), Vector(fwd).normalized(), Vector((0, 0, 1))
    n = 2 * ridges + 1
    pts, rad = [], []
    for i in range(n):
        v = -1 + 2 * i / (n - 1)
        a = abs(v)
        u = bulge * (1 - v * v) + flick * max(0.0, (a - 0.72) / 0.28) ** 2
        pts.append(g + f * (u - bulge) + up * (v * half))
        r = r1 + (r0 - r1) * (1 - a) ** 0.8
        rad.append(r * (1.3 if (i % 2 == 1 and a < 0.9) else 1.0))
    m.add(tube(pts, rad, 6), "BONE")
    m.add(cyl(r0 * 1.35, r0 * 1.35, 0.075, 8, -0.0375), "LEATHER", True, M(g))  # 줌통 가죽 감개
    for s in (-1, 1):
        m.add(torus(r0 * 1.3, 0.007, 8, 3), "GOLD", True, M(g + up * (s * 0.042)))
    tips = (Vector(pts[0]), Vector(pts[-1]))
    for t, s in zip(tips, (-1, 1)):
        m.add(sphere(0.02, 6, 4), "GOLD", True, M(t + f * 0.008 + up * (s * 0.01), scale=(1, 1, 1.5)))
    if nock is None:
        m.add(rod(tips[0], tips[1], 0.0035, None, 4), "CLOTH")
    else:
        for t in tips:
            m.add(rod(t, nock, 0.0035, None, 4), "CLOTH")
    return tips


def _arrow(m, nock, tip, fletch="TEAM"):
    """시위에 먹인 화살: 자루 + 청동 촉 + 깃."""
    a, b = Vector(nock), Vector(tip)
    d = (b - a).normalized()
    m.add(rod(a, b - d * 0.035, 0.005, None, 4), "WOOD")
    m.add(cone(0.013, 0.045, 4), "BRONZE", False, Matrix.Translation(b - d * 0.04) @ align_z(d))
    for k in (0, 1):
        m.add(prism([(0.0, 0.0), (0.05, 0.0), (0.04, 0.016), (0.008, 0.016)], 0.004, "XZ"), fletch, False,
              _basis(a + d * 0.012, d, Vector((0, 0, 1)) if k == 0 else Vector((0, 0, -1))))


def _leather_cap(m, c=(0, 0, HEAD_Z)):
    """가죽 모자: 둥근 가죽 두건 + 말아 올린 짐승 가죽 테 + 귀덮개."""
    cx, cy, cz = c
    prof = [(0.0, 0.122), (0.05, 0.116), (0.09, 0.096), (0.11, 0.064), (0.117, 0.03), (0.116, 0.012), (0.0, 0.012)]
    m.add(lathe(prof, 12), "LEATHER", True, M((cx, cy + 0.016, cz)))
    m.add(torus(0.118, 0.018, 12, 4), "FUR", True, M((cx, cy + 0.016, cz + 0.02)))
    m.add(sphere(0.022, 6, 4), "LEATHER", True, M((cx, cy + 0.022, cz + 0.128), scale=(1, 1, 1.3)))  # 꼭지
    for s in (-1, 1):
        m.add(box(0.02, 0.055, 0.085), "LEATHER", True, M((cx + s * 0.104, cy + 0.016, cz - 0.03), rot=(0, s * 6, 0)))


def _open_helmet(m, c=(0, 0, HEAD_Z), mat="BRONZE", trim="GOLD", sy=1.05):
    """얼굴이 드러나는 투구: 둥근 정수리 + 금 이마 테 + 뒤통수를 두른 목 가리개(볼 덮개 없이 얼굴을 비운다)."""
    cx, cy, cz = c
    base = M((cx, cy + 0.024, cz), scale=(1, sy, 1))  # 뒤로 조금 물려 이마 테가 얼굴을 덜 가리게
    prof = [(0.0, 0.124), (0.058, 0.117), (0.095, 0.092), (0.114, 0.05), (0.119, 0.012), (0.0, 0.012)]
    m.add(lathe(prof, 12), mat, True, base)
    m.add(torus(0.12, 0.013, 12, 4, rn=0.014), trim, True, base @ M((0, 0, 0.012)))
    pts = []
    for k in range(7):  # 목 가리개: 귀 뒤에서 뒤통수까지
        a = math.radians(20 + 140 * k / 6)
        pts.append((cx + 0.121 * math.cos(a), cy + 0.024 + 0.121 * math.sin(a) * sy, cz - 0.03))
    m.add(tube(pts, [(0.045, 0.008)] * 7, 4, phase=45), mat, 50)


def _sun_shield(m, center, yaw=25.0, R=0.21, rays=12):
    """햇살 방패: 앞면 TEAM, 가운데 금 해 + 굵고 가는 금 햇살이 번갈아 뻗는다, 금 테."""
    frame = M(center) @ M(rot=(0, 0, yaw)) @ M(rot=(90, 0, 0))
    shield_disc(m, frame, R, face="TEAM", rim="GOLD", back="LEATHER")
    m.add(lathe([(0.0, 0.078), (0.03, 0.074), (0.05, 0.062), (0.058, 0.046), (0.0, 0.046)], 12), "GOLD", True, frame)

    def dome(r):  # shield_disc 앞면 높이(겉면에 살짝 띄운다)
        tab = [(0.0, 0.045), (0.07, 0.041), (0.13, 0.03), (R - 0.02, 0.012)]
        for (r0, z0), (r1, z1) in zip(tab, tab[1:]):
            if r <= r1:
                return z0 + (z1 - z0) * (r - r0) / (r1 - r0) + 0.005
        return tab[-1][1] + 0.005

    for k in range(rays):
        a = 2 * math.pi * (k + 0.5) / rays
        long_ray = k % 2 == 0
        r_end = R - 0.03 if long_ray else R - 0.075
        rs = (0.058, (0.058 + r_end) / 2, r_end)
        pts = [(r * math.cos(a), r * math.sin(a), dome(r)) for r in rs]
        w = 0.024 if long_ray else 0.017
        m.add(tube(pts, [(0.005, w), (0.005, w * 0.55), (0.0, 0.0)], 4, up=(0, 0, 1)), "GOLD", 60, frame)
    return frame


# ---------------------------------------------------------------- 인물 말
def pandarus():
    """판다로스: 들염소 뿔 열여섯 뼘을 이어 만든 큰 활(『일리아스』 4.105~111)을 옆으로 당겨 겨눈다(4.116~126).
    말을 집에 두고 활만 믿고 걸어서 왔다(5.192~205) — 투구 없이 가죽 모자, 가죽 옷, 짧은 망토(TEAM), 등에 화살통."""
    m = Model("pandarus")
    legs(m, greaves=False, boots=True, stride=0.04, spread=0.06)
    kilt(m, mat="LEATHER", hem="TEAM_DARK")
    torso(m, "LEATHER")
    belt(m, mat="TEAM_DARK", n=12)
    cape(m, top=0.47, bottom=0.18, r_top=0.104, r_bot=0.175, mat="TEAM", arc=250, thick=0.012)
    shoulders(m, "LEATHER", seg=(6, 4))
    neck(m)
    quiver(m, base=(0.075, 0.155, 0.22), top=(-0.08, 0.16, 0.56), r=0.038, fletch="TEAM")
    # 머리는 과녁(왼쪽 +X)으로 돌린다
    m.push(_about((0, 0, HEAD_Z), rot=(0, 0, 55)))
    head(m, hair="WOOD_DARK")
    _leather_cap(m)
    m.pop()
    # 왼팔을 곧게 뻗어 줌통을 쥐고, 오른손은 턱 앞까지 시위를 당긴다
    grip = (0.27, -0.085, 0.5)
    nock = (-0.02, -0.085, 0.5)
    arm(m, [(0.1, 0.0, 0.452), (0.185, -0.045, 0.478), grip])
    arm(m, [(-0.1, 0.0, 0.452), (-0.15, -0.04, 0.51), nock])
    _horn_bow(m, grip, (1, 0, 0), half=0.44, bulge=0.13, flick=0.06, nock=nock, r0=0.036, r1=0.012)
    _arrow(m, nock, (grip[0] + 0.075, grip[1], grip[2]))
    return m


def polydamas():
    """폴리다마스: 홀로 앞뒤를 내다보는 신중한 참모(『일리아스』 18.249~252), 헥토르와 한밤에 태어난 벗.
    깃 없는 작은 투구에 얼굴을 드러내고, 발목까지 감싼 망토(TEAM), 땅에 세운 창.
    방패는 땅에 내려 몸에 기대 두고 왼손을 들어 헥토르에게 말을 건넨다(12.210~229 — 싸움을 서두르지 말자는 조언)."""
    m = Model("polydamas")
    legs(m, stride=0.012)
    kilt(m, hem="TEAM_DARK")
    torso(m, "BRONZE")
    belt(m, n=12)
    cape(m, top=0.47, bottom=0.04, r_top=0.108, r_bot=0.2, mat="TEAM", arc=250, sy=0.82, thick=0.014)
    shoulders(m, "TEAM", r=0.044, seg=(8, 4))
    neck(m)
    head(m, hair=None)
    helmet_small(m)
    # 오른손: 창을 땅에 세워 쥔다
    hand = (-0.175, -0.05, 0.4)
    arm(m, [(-0.1, 0.0, 0.452), (-0.16, -0.02, 0.38), hand])
    spear(m, hand[0], hand[1], 0.0, 0.98)
    # 방패: 땅에 내려 뒤로 기울여 몸에 기댄다
    shield_round(m, (0.14, -0.105, 0.19), yaw=30, R=0.19, pitch=-15, boss="BRONZE")
    # 왼손: 손바닥을 펴 앞으로 들어 올린다(조언하는 몸짓)
    arm(m, [(0.1, 0.0, 0.452), (0.19, -0.04, 0.475), (0.235, -0.1, 0.585)])
    m.add(box(0.05, 0.018, 0.058, 0.007), "SKIN", True, M((0.24, -0.105, 0.613), rot=(12, 0, -20)))  # 편 손바닥
    return m


def helenus():
    """헬레노스: 프리아모스의 아들, 새점 치는 이 가운데 으뜸(『일리아스』 6.76), 신들의 뜻을 알아듣는 예언자(7.44~53).
    예언자(seer) 바탕 긴 옷에 큰 프리기아 모자(TEAM), 왕자의 자줏빛 띠·금 허리띠, 월계 지팡이. 수염 없이 젊게."""
    m = Model("helenus")
    _feet(m)
    robe(m, top=0.47, r_top=0.07, r_bot=0.15, mat="CLOTH", hem="PURPLE", hem_h=0.05)
    belt(m, z=0.31, r=0.1, mat="GOLD", sy=0.82)
    sash(m, mat="PURPLE", side=-1, r=0.104)
    shoulders(m, "PURPLE", r=0.044, seg=(8, 4))
    neck(m)
    head(m, hair="WOOD_DARK", long_hair=True)
    m.push(_about((0, 0, HEAD_Z), scale=1.12))
    phrygian_cap(m, mat="TEAM")
    m.pop()
    m.add(torus(0.113, 0.011, 14, 4), "GOLD", True, M((0, 0.014, HEAD_Z + 0.004)))  # 모자 테(왕자)
    # 오른손 월계 지팡이
    hand = (-0.18, -0.045, 0.44)
    sleeve_arm(m, [(-0.1, 0.0, 0.45), (-0.16, -0.02, 0.39), hand], "CLOTH")
    top = (hand[0], hand[1], 0.92)
    m.add(rod((hand[0], hand[1], 0.02), top, 0.016, 0.014, 6), "WOOD")
    laurel_top(m, (top[0], top[1], top[2] + 0.03), size=0.07, n=8)
    for s in (-1, 1):  # 지팡이에 감은 띠
        m.add(tube([(top[0] + s * 0.014, top[1], 0.89), (top[0] + s * 0.036, top[1] - 0.01, 0.82), (top[0] + s * 0.042, top[1] - 0.012, 0.72)],
                   [0.012, 0.011, 0.008], 5), "TEAM")
    # 왼손을 앞으로 들어 앞날을 가리킨다
    sleeve_arm(m, [(0.1, 0.0, 0.45), (0.165, -0.07, 0.5), (0.18, -0.15, 0.575)], "CLOTH")
    return m


def dolon():
    """돌론: 생김새는 못났으나 발이 빠른 정탐꾼(『일리아스』 10.314~316).
    회색 이리 가죽을 뒤집어쓰고 담비 가죽 모자를 쓰고 굽은 활과 날카로운 투창을 들었다(10.333~335).
    이리 머리(귀·주둥이)가 이마를 덮고 가죽이 등까지 늘어진다. 몸을 낮춰 살금살금 내딛는 작은 말."""
    m = Model("dolon")
    # 다리: 왼발은 앞으로 굽혀 딛고, 오른발은 뒤로 뻗어 뒤꿈치를 든다
    for p, foot in (([(0.05, -0.07, 0.03), (0.056, -0.09, 0.13), (0.045, 0.0, 0.22)], M((0.05, -0.088, 0.016))),
                    ([(-0.055, 0.12, 0.045), (-0.056, 0.05, 0.115), (-0.045, 0.01, 0.22)], M((-0.055, 0.1, 0.024), rot=(32, 0, 0)))):
        m.add(tube(p, [0.023, 0.028, 0.036], 7), "SKIN")
        m.add(tube([p[0], ((p[0][0] + p[1][0]) / 2, (p[0][1] + p[1][1]) / 2, (p[0][2] + p[1][2]) / 2)], [0.029, 0.031], 7), "LEATHER")
        m.add(box(0.05, 0.088, 0.03), "LEATHER", True, foot)
    # 윗몸은 엉덩이를 축으로 앞으로 숙인다
    m.push(M((0, 0, 0.22)) @ M(rot=(20, 0, 0)) @ M((0, 0, -0.24)))
    kilt(m, mat="TEAM", hem="TEAM_DARK")
    torso(m, "TEAM")
    belt(m, mat="LEATHER", n=12)
    neck(m)
    # 등을 덮은 이리 가죽 + 꼬리 + 늘어진 뒷다리
    cape(m, top=0.5, bottom=0.12, r_top=0.098, r_bot=0.165, mat="FUR_DARK", arc=200, sy=0.86, thick=0.014)
    m.add(tube([(0, 0.15, 0.15), (0, 0.19, 0.08), (0, 0.18, 0.0)], [0.03, 0.026, 0.006], 6), "FUR_DARK")
    for s in (-1, 1):
        m.add(tube([(s * 0.14, 0.07, 0.15), (s * 0.15, 0.08, 0.07)], [0.018, 0.012], 5), "FUR_DARK")
        # 앞다리 가죽을 가슴 앞에서 묶었다
        m.add(tube([(s * 0.098, 0.01, 0.47), (s * 0.06, -0.07, 0.435), (s * 0.012, -0.088, 0.405), (s * 0.022, -0.094, 0.33)],
                   [0.022, 0.02, 0.016, 0.011], 5), "FUR_DARK")
    m.add(sphere(0.024, 6, 4), "FUR_DARK", True, M((0, -0.092, 0.405)))
    # 머리: 숙인 몸에서 고개를 들어 앞을 살핀다
    m.push(_about((0, 0, 0.5), rot=(-16, 0, 0)))
    head(m, hair=None)
    m.add(sphere(0.117, 12, 7), "FUR_DARK", True, M((0, 0.045, HEAD_Z + 0.014), scale=(1.04, 1.0, 1.0)))  # 이리 가죽 두건
    m.add(torus(0.1, 0.017, 12, 4), "FUR", True, M((0, -0.004, HEAD_Z + 0.032), rot=(-14, 0, 0)))  # 담비 가죽 모자 테
    m.add(sphere(0.07, 8, 5), "FUR_DARK", True, M((0, -0.03, HEAD_Z + 0.085), scale=(1.1, 1.25, 0.75)))  # 이리 정수리
    m.add(tube([(0, -0.07, HEAD_Z + 0.085), (0, -0.13, HEAD_Z + 0.07), (0, -0.172, HEAD_Z + 0.055)],
               [(0.034, 0.04), (0.026, 0.029), (0.016, 0.017)], 6), "FUR_DARK")  # 주둥이
    m.add(sphere(0.017, 6, 4), "WOOD_DARK", True, M((0, -0.18, HEAD_Z + 0.06)))
    for s in (-1, 1):  # 뾰족한 두 귀(크게)
        m.add(cone(0.036, 0.09, 4), "FUR_DARK", False, M((s * 0.055, 0.005, HEAD_Z + 0.11), rot=(10, s * 16, 45)))
    m.pop()
    # 오른손 투창을 앞으로 겨누고, 왼손에 굽은 활
    hand = (-0.15, -0.12, 0.35)
    m.add(sphere(0.042, 6, 4), "FUR_DARK", True, M((-0.1, 0.0, 0.455), scale=(1, 0.9, 0.8)))
    m.add(sphere(0.042, 6, 4), "FUR_DARK", True, M((0.1, 0.0, 0.455), scale=(1, 0.9, 0.8)))
    arm(m, [(-0.1, 0.0, 0.452), (-0.155, -0.05, 0.38), hand])
    _spear_through(m, hand, (40, 0), 0.72, 0.42, r=0.011, tip_len=0.11, tip_w=0.024)
    grip = (0.175, -0.04, 0.31)
    arm(m, [(0.1, 0.0, 0.452), (0.155, -0.02, 0.37), grip])
    bow(m, grip, yaw=0.0, half=0.23, bulge=0.07, mat="WOOD", r=0.017)
    m.pop()
    m.transform(M(scale=0.92))
    return m


def penthesilea():
    """펜테실레이아: 아레스의 딸, 트라케 태생 아마존의 여왕(『아이티오피스』, 프로클로스 요약).
    기병(rider) 바탕 — 금관 두른 깃 투구, 번쩍 쳐든 도끼(사가리스), 금테 두른 큰 초승달 방패(펠타, TEAM),
    투구 밑으로 흘러내린 긴 머리, 편 색 안장 천과 말 머리 깃."""
    m = Model("penthesilea")
    hs = 1.16
    # 말은 병과 기병(밤색)과 한눈에 갈리게 잿빛 흰 말로(색은 이 말만의 약속, 원전 근거 아님)
    horse(m, M((0, 0.0, 0.0), scale=hs), mat="HAIR_GREY", stride=0.045, tail_lift=0.8)
    cloth = lathe([(0.079, -0.08), (0.092, -0.08), (0.092, 0.08), (0.079, 0.08)], 12, arc=210, start=165, loop=True)
    m.add(cloth, "TEAM", 35, M((0, 0.012 * hs, 0.29 * hs), rot=(-90, 0, 0), scale=(1.0, 1.09, 1.0)))
    for s in (-1, 1):  # 안장 천 아랫단 금 띠(천 끝자리: 반지름 0.092, 15° 아래)
        x = s * 0.092 * math.cos(math.radians(15))
        z = 0.29 * hs - 1.09 * 0.092 * math.sin(math.radians(15))
        m.add(rod((x, 0.012 * hs - 0.08, z), (x, 0.012 * hs + 0.08, z), 0.009, None, 4), "GOLD")
    # 말 머리 깃(TEAM)
    m.add(tube([(0, -0.24 * hs, 0.49 * hs), (0, -0.236 * hs, 0.555 * hs), (0, -0.215 * hs, 0.6 * hs)],
               [(0.012, 0.016), (0.022, 0.018), (0.006, 0.01)], 6), "TEAM")
    sit = 0.29 * hs + 0.072 * hs
    fs = 0.9
    m.push(M((0, 0.03, sit - 0.235 * fs), scale=fs))
    for s in (-1, 1):  # 말 옆구리로 내린 다리 + 긴 장화
        m.add(tube([(s * 0.05, 0.0, 0.24), (s * 0.105, -0.085, 0.2), (s * 0.108, -0.05, 0.06)], [0.037, 0.03, 0.025], 7), "SKIN")
        m.add(tube([(s * 0.106, -0.075, 0.17), (s * 0.108, -0.05, 0.05)], [0.032, 0.03], 7), "LEATHER")
    kilt(m, top=0.31, bottom=0.2, r_bot=0.12, hem="GOLD")
    torso(m, "BRONZE")
    belt(m, mat="GOLD")
    shoulders(m, "BRONZE")
    neck(m)
    # 투구 밑으로 흘러내린 긴 머리 타래
    m.add(tube([(0, 0.1, HEAD_Z - 0.03), (0, 0.155, HEAD_Z - 0.1), (0, 0.18, HEAD_Z - 0.2), (0, 0.17, HEAD_Z - 0.3)],
               [(0.04, 0.05), (0.036, 0.045), (0.03, 0.036), (0.012, 0.014)], 7), "WOOD_DARK")
    helmet_corinthian(m, trim="GOLD")
    m.push(_about((0, 0, HEAD_Z), scale=(1, 1.1, 1)))
    crown(m, r=0.108, z0=0.018, h=0.03, points=7, point_h=0.05)
    m.pop()
    crest(m, height=0.085, thick=0.03, back=-34.0, steps=12)
    # 왼팔 초승달 방패
    arm(m, [(0.1, 0.0, 0.452), (0.15, -0.03, 0.37), (0.12, -0.09, 0.39)])
    pelta(m, (0.1, -0.125, 0.39), yaw=28, R=0.21, edge="GOLD")
    # 오른손 도끼를 머리 위로 쳐든다
    hand = Vector((-0.19, -0.01, 0.64))
    arm(m, [(-0.1, 0.0, 0.452), (-0.18, 0.015, 0.53), tuple(hand)])
    d = Vector((-0.1, 0.22, 0.97)).normalized()
    m.add(rod(hand - d * 0.1, hand + d * 0.34, 0.012, 0.011, 6), "WOOD")
    m.add(sphere(0.016, 6, 4), "GOLD", True, M(hand - d * 0.105))
    head_at = hand + d * 0.28
    fr = _basis(head_at, (0, -1, 0), d)
    k = 1.4  # 판 위에서 도끼로 읽히게 날을 크게 과장한다
    blade = [(0.0, -0.022), (0.05, -0.03), (0.105, -0.07), (0.13, -0.055), (0.15, -0.02), (0.153, 0.0), (0.15, 0.02),
             (0.13, 0.055), (0.105, 0.07), (0.05, 0.03), (0.0, 0.022)]
    m.add(prism([(u * k, v * k) for u, v in blade], 0.016, "XZ"), "BRONZE", 35, fr)
    m.add(prism([(0.0, -0.018), (-0.1, 0.0), (0.0, 0.018)], 0.014, "XZ"), "BRONZE", 35, fr)  # 뒤쪽 부리
    m.add(cyl(0.022, 0.022, 0.07, 6, -0.035), "GOLD", True, fr)
    m.pop()
    _center_y(m)
    return m


def memnon():
    """멤논: 새벽의 여신 에오스의 아들, 아이티오피아의 왕. 헤파이스토스가 만든 무구를 입고 왔다(『아이티오피스』, 프로클로스 요약).
    짙은 살빛(SKIN_DARK)이 얼굴·팔·다리로 드러나게 얼굴을 가리지 않는 투구 + 금 이마 테, 금 흉갑·어깨,
    방패 앞면(TEAM)에 금 해와 햇살(새벽의 아들), 창. 『오뒷세이아』 11.522 — 가장 잘생긴 사내로 꼽힌다(수염 없이)."""
    m = Model("memnon")
    legs(m, greaves=False)  # 정강이받이 없이 짙은 살빛 다리를 드러낸다
    kilt(m, hem="TEAM_DARK")
    torso(m, "GOLD")
    belt(m, mat="TEAM_DARK", n=10)
    cape(m, top=0.47, bottom=0.14, r_top=0.1, r_bot=0.18, mat="TEAM_DARK", arc=200, thick=0.013)
    shoulders(m, "GOLD", seg=(8, 4))
    neck(m)
    head(m, hair="WOOD_DARK")
    hc = (0, 0, HEAD_Z + 0.022)  # 투구를 조금 올려 얼굴을 넓게 드러낸다
    _open_helmet(m, hc)
    crest(m, c=(0, 0.024, hc[2]), sy=1.05, r_h=0.12, height=0.08, thick=0.03, back=-34.0, steps=12)
    hand = (-0.19, -0.045, 0.41)
    arm(m, [(-0.1, 0.0, 0.452), (-0.16, -0.012, 0.37), hand])
    spear(m, hand[0], hand[1], 0.0, 1.06, tip="GOLD", tip_len=0.16, tip_w=0.032)
    # 방패를 조금 높이·바깥으로 들어 짙은 살빛 다리가 방패 밑으로 보이게
    arm(m, [(0.1, 0.0, 0.452), (0.155, -0.03, 0.38), (0.14, -0.09, 0.41)])
    _sun_shield(m, (0.11, -0.135, 0.4), yaw=32, R=0.21)
    _recolor(m, "SKIN", "SKIN_DARK")
    m.transform(M(scale=1.06))
    return m


MODELS = {
    "pandarus": {"build": pandarus, "kind": "unit"},
    "polydamas": {"build": polydamas, "kind": "unit"},
    "helenus": {"build": helenus, "kind": "unit"},
    "dolon": {"build": dolon, "kind": "unit"},
    "penthesilea": {"build": penthesilea, "kind": "unit"},
    "memnon": {"build": memnon, "kind": "unit"},
}
