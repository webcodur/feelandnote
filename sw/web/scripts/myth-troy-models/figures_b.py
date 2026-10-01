# 인물 고유 말 — 그리스 영웅 2: 아가멤논·이도메네우스·메리오네스·마카온·칼카스·네스토르·안틸로코스·소 아이아스
# 병과 말(units.py)을 바탕으로 인물마다 한눈에 알아볼 표지(관·수염·투구·방패 무늬·지팡이)를 크게 과장한다.
# 앞은 -Y, 말의 오른손은 -X 쪽. 받침은 넣지 않는다(3D 판이 편 색 받침을 깐다).
import math

from mathutils import Vector

from lib import M, Model, box, cone, cyl, lathe, prism, rod, sphere, torus, tube
from figure import (HEAD_R, HEAD_Z, arm, belt, bow, cape, crest, crown, helmet_corinthian, horse, kilt, legs,
                    neck, quiver, robe, sash, shield_round, shoulders, sleeve_arm, spear, torso, wheel, wreath)
from units import _center_y, _feet, _javelin


# ---------------------------------------------------------------- 이 모듈만 쓰는 부품
def _head(m, c=(0, 0, HEAD_Z), hair="WOOD_DARK", beard=None, beard_size=1.0, long_hair=False, cap=True, seg=(10, 7)):
    """맨머리(면 수를 줄인 판): 살색 공 + 머리칼(cap=False면 투구 밑이라 뒷머리만) + 수염."""
    cx, cy, cz = c
    nu, nv = seg
    m.add(sphere(HEAD_R, nu, nv), "SKIN", True, M(c))
    if hair and cap:
        m.add(sphere(HEAD_R * 1.03, nu, nv), hair, True, M((cx, cy + 0.022, cz + 0.014), scale=(1.03, 1.0, 1.0)))
    if hair and long_hair:
        m.add(sphere(HEAD_R * 0.85, 8, 5), hair, True, M((cx, cy + 0.06, cz - 0.06), scale=(1.1, 0.7, 1.2)))
    if beard:
        b = beard_size
        m.add(sphere(0.062 * b, 8, 5), beard, True, M((cx, cy - 0.062, cz - 0.068 * b), scale=(1.15, 0.75, 1.15)))


def _long_beard(m, c=(0, 0, HEAD_Z), mat="HAIR_GREY", length=0.2, width=0.066, depth=0.04):
    """턱에서 가슴까지 늘어져 끝이 좁아지는 긴 수염."""
    cx, cy, cz = c
    pts = [(cx, cy - 0.066, cz - 0.035), (cx, cy - 0.094, cz - 0.09), (cx, cy - 0.1, cz - 0.035 - length * 0.7),
           (cx, cy - 0.088, cz - 0.035 - length)]
    rad = [(width * 0.95, depth), (width, depth * 1.05), (width * 0.62, depth * 0.75), (0.0, 0.0)]
    m.add(tube(pts, rad, 8, up=(1, 0, 0)), mat)


def _helm_open(m, c=(0, 0, HEAD_Z), mat="BRONZE", trim=None, n=14, cheeks=True):
    """얼굴을 드러낸 청동 투구: 정수리를 덮는 사발 + 챙 테 + 뒤쪽 목 가리개 + 볼 덮개(수염·앳된 얼굴이 보이게)."""
    cx, cy, cz = c
    base = M((cx, cy + 0.008, cz))
    prof = [(0.0, 0.124), (0.058, 0.116), (0.095, 0.09), (0.115, 0.05), (0.12, 0.012), (0.0, 0.012)]
    m.add(lathe(prof, n), mat, True, base)
    m.add(torus(0.12, 0.009, n, 4, rn=0.011), trim or mat, True, M((cx, cy + 0.008, cz + 0.012)))
    # 목 가리개: 뒤쪽 반 바퀴만 아래로 벌어진다
    m.add(lathe([(0.121, 0.014), (0.118, -0.045), (0.128, -0.088)], 8, arc=160, start=10, cap_start=False, cap_end=False),
          mat, True, base)
    if cheeks:
        for s in (-1, 1):
            m.add(box(0.016, 0.06, 0.082, 0.005), mat, True, M((cx + s * 0.106, cy - 0.02, cz - 0.034), rot=(6, 0, -s * 8)))


def _tusk_helmet(m, c=(0, 0, HEAD_Z), rows=((0.004, 9), (0.05, 8), (0.094, 6)), plume="TEAM"):
    """멧돼지 엄니 투구(10.261~265): 가죽 모자 겉에 흰 엄니 조각을 줄마다 엇갈린 방향으로 촘촘히 박았다.
    꼭지에서 뒤로 늘어진 짧은 술(plume)은 편 색."""
    cx, cy, cz = c
    oy = cy + 0.01
    prof = [(0.0, 0.17), (0.028, 0.163), (0.066, 0.136), (0.097, 0.094), (0.115, 0.048), (0.121, 0.004), (0.12, -0.022),
            (0.0, -0.022)]
    m.add(lathe(prof, 12), "LEATHER", True, M((cx, oy, cz)))
    m.add(torus(0.121, 0.01, 12, 4, rn=0.012), "LEATHER", True, M((cx, oy, cz - 0.02)))
    m.add(sphere(0.02, 6, 4), "LEATHER", True, M((cx, oy, cz + 0.172)))
    if plume:
        m.add(tube([(cx, oy - 0.012, cz + 0.182), (cx, oy + 0.04, cz + 0.2), (cx, oy + 0.1, cz + 0.17), (cx, oy + 0.13, cz + 0.1)],
                   [0.02, 0.026, 0.021, 0.006], 6), plume)
    radius = {0.004: 0.125, 0.05: 0.118, 0.094: 0.1}
    for k, (z, n) in enumerate(rows):
        r = radius[z]
        bend = 0.011 if k % 2 == 0 else -0.011  # 줄마다 초승달이 위·아래로 번갈아 휜다
        for i in range(n):
            a0 = 2 * math.pi * i / n + (math.pi / n if k % 2 else 0.0)
            span = 2 * math.pi / n * 0.86
            pts = []
            for t in (0.0, 0.5, 1.0):
                a = a0 + span * t
                rr = r + 0.006 * math.sin(math.pi * t)
                pts.append((cx + rr * math.cos(a), oy + rr * math.sin(a), cz + z + bend * math.sin(math.pi * t) - bend * 0.5))
            m.add(tube(pts, [(0.021, 0.005), (0.019, 0.006), (0.009, 0.004)], 4, phase=45), "BONE", 50)


def _gorgon_shield(m, center, yaw=25.0, R=0.2, rim="GOLD", snakes=8):
    """고르곤 얼굴 방패(11.32~37): 편 색 앞면 + 금 테 + 가운데 부릅뜬 금빛 고르곤 얼굴과 뱀 머리칼."""
    frame = shield_round(m, center, yaw=yaw, R=R, face="TEAM", rim=rim, back="LEATHER")
    # 방패 틀: X는 가로, Y는 위, Z는 앞
    m.add(lathe([(0.0, 0.076), (0.042, 0.072), (0.066, 0.058), (0.068, 0.043), (0.0, 0.043)], 12), "GOLD", True, frame)
    for s in (-1, 1):  # 부릅뜬 두 눈
        m.add(sphere(0.014, 6, 4), "WOOD_DARK", True, frame @ M((s * 0.025, 0.014, 0.073), scale=(1, 0.8, 0.55)))
    m.add(box(0.044, 0.013, 0.012), "RED_OCHRE", True, frame @ M((0, -0.027, 0.067)))  # 내민 혀
    for k in range(snakes):  # 얼굴을 두른 뱀 머리칼
        a = 2 * math.pi * (k + 0.5) / snakes
        u, v = math.cos(a), math.sin(a)
        w = 0.012 * (1 if k % 2 else -1)
        pts = [(0.062 * u, 0.062 * v, 0.05), (0.086 * u - w * v, 0.086 * v + w * u, 0.044), (0.11 * u, 0.11 * v, 0.036)]
        m.add(tube(pts, [0.009, 0.008, 0.004], 3), "GOLD", 60, frame)
    return frame


def _kinyras_cuirass(m, waist=0.28, top=0.49, sy=0.74, r_chest=0.105, n=12):
    """키니라스가 준 흉갑(11.19~28): 배 쪽은 검푸른 줄과 금 줄을 번갈아 두르고, 가슴은 청동."""
    zs = [waist, waist + 0.03, waist + 0.06, waist + 0.09, waist + 0.12, top - 0.045, top - 0.012]
    rs = [0.084, 0.089, 0.094, 0.1, r_chest, r_chest - 0.004, 0.07]
    prof = [(0.0, waist)] + list(zip(rs, zs)) + [(0.0, top)]
    stripes = ["GOLD", "WOOD_DARK", "GOLD", "WOOD_DARK"]

    def mat(f):
        z = f.calc_center_median().z
        k = int((z - waist) / 0.03)
        return stripes[k] if 0 <= k < len(stripes) and z > waist + 0.002 else "BRONZE"

    m.add(lathe(prof, n), mat, 30, M(scale=(1, sy, 1)))


def _snake_staff(m, base, top, r=0.015, coil=0.038, turns=2.5, snake="LEAF", staff="WOOD_DARK", body=0.017):
    """아스클레피오스의 지팡이: 곧은 나무 지팡이를 뱀 한 마리가 감아 오르다 끝에서 앞으로 머리를 든다.
    작게 보여도 감긴 줄이 읽히도록 짙은 자루에 밝은 뱀을 굵게 감는다."""
    b, t = Vector(base), Vector(top)
    m.add(rod(b, t, r, r * 0.85, 6), staff)
    m.add(sphere(r * 1.7, 6, 4), staff, True, M(t))
    z0 = b.z + (t.z - b.z) * 0.32
    z1 = t.z - 0.05
    a0 = math.pi / 2  # 뒤에서 감기 시작해 앞(-Y)에서 끝난다
    pts, rad = [], []
    steps = 16
    for i in range(steps + 1):
        u = i / steps
        a = a0 + 2 * math.pi * turns * u
        pts.append((t.x + coil * math.cos(a), t.y + coil * math.sin(a), z0 + (z1 - z0) * u))
        rad.append(body * (0.35 + 0.65 * min(1.0, u * 2.5)))
    pts.append((t.x, t.y - coil - 0.012, z1 + 0.045))
    rad.append(body * 0.9)
    pts.append((t.x, t.y - coil - 0.028, z1 + 0.075))
    rad.append(body * 0.8)
    m.add(tube(pts, rad, 5), snake)
    m.add(sphere(body * 1.6, 6, 4), snake, True, M((t.x, t.y - coil - 0.04, z1 + 0.082), scale=(0.9, 1.4, 0.75)))


def _bird(m, p, mat="WOOD_DARK", beak="GOLD", span=0.088, lift=38.0):
    """지팡이 끝에 내려앉아 날개를 치켜든 새(점치는 새): 몸통·머리·부리 + 위로 편 두 날개(lift도) + 꼬리."""
    fr = M(p)
    m.add(sphere(0.03, 8, 5), mat, True, fr @ M(scale=(0.85, 1.5, 0.85)))
    m.add(sphere(0.021, 6, 4), mat, True, fr @ M((0, -0.045, 0.026)))
    m.add(cone(0.009, 0.03, 4), beak, False, fr @ M((0, -0.062, 0.022), rot=(90, 0, 0)))
    wing = [(0.0, -0.024), (0.0, 0.024), (span * 0.55, 0.034), (span, 0.014), (span * 0.92, -0.01), (span * 0.5, -0.03)]
    for s in (-1, 1):
        pts = [(s * u, v) for u, v in wing]
        m.add(prism(pts, 0.008, "XY"), mat, False, fr @ M((s * 0.012, 0.0, 0.012), rot=(0, -s * lift, 0)))
    m.add(prism([(-0.012, 0.03), (0.012, 0.03), (0.028, 0.08), (-0.028, 0.08)], 0.007, "XY"), mat, False, fr @ M(rot=(14, 0, 0)))


# ---------------------------------------------------------------- 그리스 영웅 2
def agamemnon():
    """아가멤논: 갑옷 입은 왕 — 금관, 키니라스의 줄무늬 흉갑(11.19~28), 고르곤 얼굴 방패(11.32~37),
    헤파이스토스가 만든 조상의 왕홀(2.101~108, 금 끝), 발까지 닿는 긴 망토(TEAM), 검은 긴 수염."""
    m = Model("agamemnon")
    legs(m)
    kilt(m, hem="GOLD")
    cape(m, top=0.47, bottom=0.03, r_top=0.108, r_bot=0.215, mat="TEAM", arc=226, sy=0.84, thick=0.016)
    _kinyras_cuirass(m)
    belt(m, mat="GOLD", n=10)
    shoulders(m, "GOLD", r=0.044, seg=(8, 4))
    neck(m)
    _head(m, hair="WOOD_DARK", beard="WOOD_DARK", beard_size=1.3, long_hair=True)
    crown(m, h=0.042, point_h=0.058, points=7)
    # 오른손 왕홀: 검은 자루에 금 고리, 끝은 큰 금 꼭지
    hand = (-0.19, -0.05, 0.41)
    arm(m, [(-0.1, 0.0, 0.452), (-0.16, -0.015, 0.37), hand])
    m.add(rod((hand[0], hand[1], 0.02), (hand[0], hand[1], 0.9), 0.017, 0.015, 6), "WOOD_DARK")
    m.add(lathe([(0.0, 0.875), (0.028, 0.88), (0.046, 0.91), (0.032, 0.935), (0.062, 0.975), (0.045, 1.015), (0.0, 1.05)], 8),
          "GOLD", True, M((hand[0], hand[1], 0.0)))
    for z in (0.16, 0.56, 0.74):
        m.add(cyl(0.023, 0.023, 0.026, 6, -0.013), "GOLD", True, M((hand[0], hand[1], z)))
    arm(m, [(0.1, 0.0, 0.452), (0.15, -0.03, 0.37), (0.12, -0.09, 0.39)])
    _gorgon_shield(m, (0.085, -0.135, 0.36), yaw=25)
    m.transform(M(scale=1.1))
    return m


def idomeneus():
    """이도메네우스: 크레타 왕, 반백(μεσαιπόλιος, 13.361) — 얼굴을 드러낸 투구 밑으로 흰 수염이 가슴까지,
    뒷머리는 검어 반쯤 센 머리. 중갑, 창으로 이름난 왕(δουρικλυτός), 둥근 방패(13.405~407)."""
    m = Model("idomeneus")
    legs(m)
    kilt(m, hem="TEAM_DARK")
    torso(m, "BRONZE", r_chest=0.11)
    belt(m, n=10)
    shoulders(m, r=0.046)
    neck(m)
    # 수염은 과장해서 크게 — 투구 밑 얼굴에서 가슴 앞까지 흰 덩어리가 보이게
    _head(m, hair="HAIR_GREY", beard="HAIR_GREY", beard_size=1.5, long_hair=True, cap=False)
    _long_beard(m, length=0.21, width=0.088, depth=0.05)
    _helm_open(m)
    crest(m, c=(0, 0.008, HEAD_Z), r_h=0.122, sy=1.0, height=0.085, thick=0.03, back=-36.0, steps=12)
    hand = (-0.19, -0.045, 0.41)
    arm(m, [(-0.1, 0.0, 0.452), (-0.16, -0.012, 0.37), hand], radii=(0.032, 0.027, 0.023))
    spear(m, hand[0], hand[1], 0.0, 1.04, tip_len=0.16, tip_w=0.033)
    # 방패는 왼쪽 옆구리에 낮게 내려 옆을 향하게 든다 — 비스듬한 앞에서도 수염과 가슴이 가리지 않게
    arm(m, [(0.1, 0.0, 0.452), (0.155, 0.0, 0.37), (0.155, -0.03, 0.3)], radii=(0.032, 0.027, 0.023))
    shield_round(m, (0.182, -0.035, 0.29), yaw=76, R=0.2, boss="BRONZE")
    m.transform(M(scale=1.06))
    return m


def meriones():
    """메리오네스: 이도메네우스의 종자, 활의 명수(23.859~883) — 멧돼지 엄니 투구(10.261~265),
    왼손 활과 등의 화살통(10.260 오디세우스에게 빌려 준 것), 오른손 창, 짧은 망토(TEAM)."""
    m = Model("meriones")
    legs(m, greaves=False, boots=True, stride=0.03)
    kilt(m, hem="TEAM_DARK")
    torso(m, "LEATHER")
    belt(m, mat="TEAM_DARK", n=10)
    cape(m, top=0.47, bottom=0.24, r_top=0.1, r_bot=0.16, mat="TEAM", arc=236, thick=0.012)
    shoulders(m, "LEATHER", seg=(6, 4))
    neck(m)
    _head(m, hair=None)
    _tusk_helmet(m)
    quiver(m, base=(0.075, 0.14, 0.26), top=(-0.075, 0.15, 0.58), r=0.038)
    grip = (0.205, -0.075, 0.41)
    arm(m, [(0.1, 0.0, 0.452), (0.165, -0.04, 0.42), grip])
    bow(m, grip, yaw=0.0, half=0.3, bulge=0.09, mat="WOOD", r=0.02)
    m.add(cyl(0.024, 0.024, 0.06, 6, -0.03), "LEATHER", True, M(grip))
    hand = (-0.19, -0.045, 0.4)
    arm(m, [(-0.1, 0.0, 0.452), (-0.16, -0.012, 0.37), hand])
    spear(m, hand[0], hand[1], 0.0, 0.96, tip_len=0.14)
    return m


def machaon():
    """마카온: 아스클레피오스의 아들, 뛰어난 의사(ἰητὴρ ἀγαθός, 11.514~515) — healer를 바탕으로 수염,
    허리의 큰 약 가방, 아버지의 표지인 뱀 감긴 지팡이, 짧은 망토(TEAM), 작은 투구."""
    m = Model("machaon")
    legs(m, greaves=False, boots=True, stride=0.02)
    kilt(m, hem="TEAM_DARK")
    torso(m, "CLOTH")
    belt(m, mat="LEATHER", n=10)
    cape(m, top=0.47, bottom=0.22, r_top=0.1, r_bot=0.165, mat="TEAM", arc=236, thick=0.012)
    shoulders(m, "TEAM", r=0.043, seg=(8, 4))
    neck(m)
    _head(m, hair="WOOD_DARK", beard="WOOD_DARK", beard_size=1.2, cap=False, long_hair=True)
    _helm_open(m, cheeks=False)
    m.add(sphere(0.022, 6, 4), "BRONZE", True, M((0, 0.008, HEAD_Z + 0.132)))
    # 왼쪽 허리 약 가방(크게) + 위로 비죽 나온 흰 붕대 두루마리, 어깨끈
    bag = M((0.168, -0.035, 0.26), rot=(0, 0, 20))
    m.add(box(0.17, 0.09, 0.135, 0.016), "LEATHER", True, bag)
    m.add(box(0.176, 0.096, 0.045, 0.012), "LEATHER", True, bag @ M((0, -0.002, 0.06)))
    m.add(cyl(0.026, 0.026, 0.11, 8, -0.055), "CLOTH", True, bag @ M((0.0, 0.012, 0.095), rot=(0, 90, 0)))
    m.add(tube([(0.15, -0.02, 0.32), (0.05, -0.075, 0.42), (-0.08, -0.03, 0.47)], 0.012, 4, phase=45), "LEATHER")
    arm(m, [(0.1, 0.0, 0.452), (0.155, -0.02, 0.37), (0.16, -0.08, 0.36)])
    hand = (-0.18, -0.06, 0.41)
    arm(m, [(-0.1, 0.0, 0.452), (-0.155, -0.02, 0.37), hand])
    _snake_staff(m, (hand[0], hand[1], 0.0), (hand[0], hand[1], 0.9))
    return m


def calchas():
    """칼카스: 새를 보고 점치는 이 가운데 으뜸(οἰωνοπόλων ὄχ' ἄριστος, 1.69~70) — 긴 흰옷, 흰 긴 수염과 머리,
    월계관, 지팡이 끝에 날개를 편 새, 왼손은 하늘을 가리킨다. 편 색 겉옷(TEAM)."""
    m = Model("calchas")
    _feet(m)
    robe(m, top=0.47, r_top=0.07, r_bot=0.15, mat="CLOTH", hem="TEAM_DARK", hem_h=0.04)
    belt(m, z=0.31, r=0.1, mat="TEAM_DARK", sy=0.82)
    # 겉옷(히마티온)은 어깨에서 앞쪽 옆구리까지 감싸고, 가슴을 비껴 두른 띠가 흰 수염 뒤 바탕이 된다
    cape(m, top=0.47, bottom=0.07, r_top=0.107, r_bot=0.2, mat="TEAM", arc=258, sy=0.84, thick=0.015)
    sash(m, z_top=0.46, z_bot=0.3, mat="TEAM", side=1, r=0.104)
    shoulders(m, "TEAM", z=0.45, x=0.096, r=0.045)
    neck(m)
    _head(m, hair="HAIR_GREY", beard="HAIR_GREY", beard_size=1.2, long_hair=True)
    _long_beard(m, length=0.22, width=0.064)
    wreath(m)
    # 지팡이는 몸에서 조금 떼어 짚는다 — 새 날개가 가운데 축(메달 자리)으로 들어오지 않게
    hand = (-0.225, -0.06, 0.44)
    sleeve_arm(m, [(-0.1, 0.0, 0.45), (-0.175, -0.025, 0.39), hand], "CLOTH")
    top = (hand[0], hand[1], 0.87)
    m.add(rod((hand[0], hand[1], 0.02), top, 0.015, 0.013, 6), "WOOD")
    m.add(cyl(0.022, 0.018, 0.03, 6), "WOOD", True, M(top))
    _bird(m, (top[0], top[1], top[2] + 0.055), span=0.072, lift=46)
    # 왼손을 하늘로 들어 새가 날아간 쪽을 가리킨다
    sleeve_arm(m, [(0.1, 0.0, 0.45), (0.165, -0.04, 0.54), (0.18, -0.07, 0.67)], "CLOTH")
    m.add(rod((0.18, -0.072, 0.685), (0.186, -0.088, 0.74), 0.009, 0.007, 4), "SKIN")
    return m


def _nestor_driver(m):
    """늙은 몰이꾼(허리 위만 보인다): 흉갑, 맨머리 흰 머리·흰 긴 수염에 금 머리띠, 두 손 고삐, 오른손 채찍,
    등에 멘 온통 금 방패. 두 손 위치를 돌려준다(몰이꾼 틀 안의 좌표)."""
    kilt(m, hem=None)
    torso(m, "BRONZE")
    belt(m, n=10)
    shoulders(m, seg=(6, 4))
    neck(m)
    _head(m, hair="HAIR_GREY", beard="HAIR_GREY", beard_size=1.25, long_hair=True)
    _long_beard(m, length=0.19, width=0.066)
    m.add(torus(0.104, 0.011, 12, 4, rn=0.013), "GOLD", True, M((0, 0.014, HEAD_Z + 0.03), rot=(-8, 0, 0)))
    lh, rh = (0.075, -0.17, 0.4), (-0.075, -0.17, 0.41)
    arm(m, [(0.1, 0.0, 0.452), (0.135, -0.08, 0.39), lh], sides=5)
    arm(m, [(-0.1, 0.0, 0.452), (-0.135, -0.08, 0.39), rh], sides=5)
    # 채찍(8.116~117 고삐를 잡고 말을 채찍질한다): 오른손에서 솟은 자루 + 앞으로 휘날리는 끈
    wt = Vector((-0.15, -0.12, 0.8))
    m.add(rod(rh, wt, 0.009, 0.006, 5), "WOOD")
    m.add(tube([wt, (-0.13, -0.22, 0.84), (-0.08, -0.3, 0.79), (-0.05, -0.34, 0.72)], [0.006, 0.005, 0.004, 0.003], 4), "LEATHER")
    # 하늘까지 이름난 온통 금 방패(8.192~193) — 등에 멘다
    shield_round(m, (0.0, 0.125, 0.43), yaw=180, R=0.16, face="GOLD", rim="GOLD", back="LEATHER", pitch=-10)
    return lh, rh


def nestor():
    """네스토르: 게레니아의 기마인(ἱππότα Νέστωρ), 늙은 전차 무사(8.80~116) — chariot을 바탕으로
    흰 머리·흰 수염 몰이꾼이 두 손에 고삐를 쥐고 채찍을 든다. 등에는 온통 금이라 이름난 방패(8.192~193)."""
    m = Model("nestor")
    hs = 0.86
    for s in (-1, 1):
        horse(m, M((s * 0.088, -0.17, 0.0), scale=hs), stride=0.025 * s)
    cy = 0.13
    m.add(box(0.3, 0.22, 0.022, 0.006), "WOOD", True, M((0, cy, 0.175)))
    wall = lathe([(0.15, 0.186), (0.164, 0.186), (0.164, 0.365), (0.15, 0.365)], 12, arc=220, start=160, loop=True)

    def wall_mat(f):
        c = f.calc_center_median()
        radial = Vector((c.x, c.y - cy, 0.0)).normalized()
        return "TEAM" if f.normal.dot(radial) > 0.2 and abs(f.normal.z) < 0.5 else "WOOD"

    m.add(wall, wall_mat, 35, M((0, cy, 0), scale=(1.0, 0.78, 1.0)))
    rail = []
    for i in range(9):
        a = math.radians(160 + 220 * i / 8)
        rail.append((0.157 * math.cos(a), cy + 0.157 * math.sin(a) * 0.78, 0.37))
    m.add(tube(rail, 0.012, 4, phase=45), "GOLD")
    for s in (-1, 1):
        wheel(m, (s * 0.205, cy + 0.04, 0.16), R=0.16, spokes=6)
    m.add(rod((-0.24, cy + 0.04, 0.16), (0.24, cy + 0.04, 0.16), 0.012, None, 6), "WOOD")
    m.add(rod((0, cy - 0.12, 0.18), (0, -0.33, 0.335), 0.012, None, 6), "WOOD")
    m.add(rod((-0.14, -0.315, 0.345), (0.14, -0.315, 0.345), 0.013, None, 6), "WOOD")
    ds, dz = 0.92, 0.186
    m.push(M((0, cy + 0.01, dz), scale=ds))
    hands = _nestor_driver(m)
    m.pop()
    # 고삐: 두 손에서 각 말의 재갈까지 조금 처져 늘어진다
    for h, s in zip(hands, (1, -1)):
        p0 = Vector((h[0] * ds, cy + 0.01 + h[1] * ds, dz + h[2] * ds))
        p2 = Vector((s * 0.088, -0.17 - 0.29 * hs, 0.41 * hs))
        mid = (p0 + p2) / 2 + Vector((0, 0, -0.03))
        m.add(tube([p0, mid, p2], 0.005, 4), "LEATHER", False)
    _center_y(m)
    return m


def antilochus():
    """안틸로코스: 네스토르의 날랜 아들, 젊은이 가운데 가장 빠른 발(15.569~570, 23.756) — 얼굴을 드러낸 깃 투구,
    작은 둥근 방패, 머리 위로 치켜든 투창 두 자루, 정강이받이 없는 가벼운 가죽 차림. 키를 조금 작게."""
    m = Model("antilochus")
    legs(m, greaves=False, boots=True, stride=0.06)
    kilt(m, hem="TEAM_DARK")
    torso(m, "LEATHER")
    belt(m, mat="TEAM_DARK", n=10)
    shoulders(m, "LEATHER", seg=(6, 4))
    neck(m)
    _head(m, hair="WOOD_DARK", cap=False, long_hair=True)
    _helm_open(m)
    crest(m, c=(0, 0.008, HEAD_Z), r_h=0.122, sy=1.0, height=0.095, thick=0.03, back=-40.0, steps=12)
    arm(m, [(0.1, 0.0, 0.452), (0.15, -0.03, 0.37), (0.12, -0.09, 0.39)])
    shield_round(m, (0.09, -0.125, 0.37), yaw=25, R=0.155, boss="BRONZE", boss_r=0.045)
    # 오른손을 어깨 위로 치켜들어 투창 두 자루를 앞으로 겨눈다
    hand = (-0.17, 0.02, 0.57)
    arm(m, [(-0.1, 0.0, 0.452), (-0.175, 0.04, 0.5), hand])
    _javelin(m, hand, (68, -4), length=0.82, frac=0.5)
    _javelin(m, hand, (76, 7), length=0.78, frac=0.5)
    m.transform(M(scale=0.93))
    return m


def ajax_the_lesser():
    """소 아이아스: 로크리스 사람, 몸집이 작고(ὀλίγος, 2.527) 아마 흉갑(λινοθώρηξ, 2.529)을 입었다 —
    흰 아마 흉갑의 어깨 덮개·가죽 술 치마, 깃 투구, 두 손에 창 한 자루씩. 방패 없이 흉갑을 드러낸다."""
    m = Model("ajax-the-lesser")
    legs(m)
    # 밑에 받쳐 입은 짙은 키톤 — 흰 술 조각 사이로 비쳐 술 치마가 따로 읽힌다
    kilt(m, mat="TEAM_DARK", hem="TEAM_DARK")
    torso(m, "CLOTH")
    m.add(torus(0.104, 0.01, 12, 4, rn=0.013), "TEAM_DARK", True, M((0, 0, 0.405), scale=(1, 0.75, 1)))  # 가슴 둘레 무늬 띠
    # 흉갑 아래 술(프테뤼게스): 허리를 두른 흰 띠 조각이 아래로 벌어진다
    for k in range(12):
        a = 2 * math.pi * (k + 0.5) / 12
        p = (0.112 * math.cos(a), 0.112 * math.sin(a) * 0.84, 0.25)
        m.add(box(0.05, 0.012, 0.1), "CLOTH", False, M(p, rot=(0, 0, math.degrees(a) + 90)) @ M(rot=(-14, 0, 0)))
    belt(m, mat="TEAM_DARK", n=10)
    # 어깨 덮개(에포미데스): 등에서 넘어와 가슴에서 묶는 두꺼운 아마 판
    for s in (-1, 1):
        m.add(box(0.07, 0.19, 0.02, 0.006), "CLOTH", True, M((s * 0.062, -0.012, 0.487), rot=(0, s * 10, 0)))
        m.add(box(0.074, 0.02, 0.05, 0.004), "TEAM_DARK", True, M((s * 0.058, -0.09, 0.455), rot=(-12, 0, 0)))
    shoulders(m, "CLOTH", r=0.04, seg=(8, 4))
    neck(m)
    helmet_corinthian(m)
    crest(m, height=0.09, thick=0.03, back=-36.0, steps=12)
    hand = (-0.19, -0.045, 0.4)
    arm(m, [(-0.1, 0.0, 0.452), (-0.16, -0.012, 0.37), hand])
    spear(m, hand[0], hand[1], 0.0, 1.0, tip_len=0.15)
    lhand = (0.18, -0.07, 0.37)
    arm(m, [(0.1, 0.0, 0.452), (0.16, -0.03, 0.38), lhand])
    base = Vector(lhand) - M(rot=(14, 10, 0)).to_3x3() @ Vector((0, 0, 1)) * 0.35
    spear(m, base.x, base.y, base.z, base.z + 0.95, tip_len=0.14, tilt=(14, 10))
    m.transform(M(scale=0.95))
    return m


MODELS = {
    "agamemnon": {"build": agamemnon, "kind": "unit"},
    "idomeneus": {"build": idomeneus, "kind": "unit"},
    "meriones": {"build": meriones, "kind": "unit"},
    "machaon": {"build": machaon, "kind": "unit"},
    "calchas": {"build": calchas, "kind": "unit"},
    "nestor": {"build": nestor, "kind": "unit"},
    "antilochus": {"build": antilochus, "kind": "unit"},
    "ajax-the-lesser": {"build": ajax_the_lesser, "kind": "unit"},
}
