# 장수 말 14종 — 보드게임 말처럼 머리·투구·방패·무기를 크게 과장한다
# 앞은 -Y, 말의 오른손은 -X 쪽. 받침은 넣지 않는다(3D 판이 편 색 받침을 깐다).
import math
import random

from mathutils import Vector

from lib import M, Model, box, cyl, lathe, rod, sphere, torus, tube
from figure import (HEAD_Z, arm, belt, bow, cape, crest, crown, diadem, halo, head, helmet_corinthian,
                    helmet_small, horse, kilt, laurel_top, legs, neck, pelta, phrygian_cap, pilos, quiver, robe,
                    sash, shield_round, shoulders, sleeve_arm, spear, sword, torso, trident, wheel, wreath)

GOD_SCALE = 1.3


def _armored_body(m, cuirass="BRONZE", greaves=True, hem="TEAM_DARK"):
    legs(m, greaves=greaves)
    kilt(m, hem=hem)
    torso(m, cuirass)
    belt(m)
    shoulders(m)
    neck(m)


def _feet(m, spread=0.05, mat="LEATHER"):
    """긴 옷 밑으로 내민 두 발."""
    for s in (-1, 1):
        m.add(box(0.056, 0.1, 0.034, 0.01), mat, True, M((s * spread, -0.05 - (0.014 if s > 0 else 0.0), 0.017)))


def _javelin(m, hand, tilt, length=0.84, frac=0.46, r=0.011):
    """손을 지나는 투창 하나(tilt=(앞으로 기울기, 옆 기울기))."""
    d = M(rot=(tilt[0], tilt[1], 0)).to_3x3() @ Vector((0, 0, 1))
    base = Vector(hand) - d * (length * frac)
    spear(m, base.x, base.y, base.z, base.z + length, r=r, tip_len=0.1, tip_w=0.022, tilt=tilt)


def _spear_through(m, hand, tilt, length, frac, **kw):
    d = M(rot=(tilt[0], tilt[1], 0)).to_3x3() @ Vector((0, 0, 1))
    base = Vector(hand) - d * (length * frac)
    return spear(m, base.x, base.y, base.z, base.z + length, tilt=tilt, **kw)


def _center_y(m):
    """앞뒤 길이의 가운데를 원점에 맞춘다(말·전차)."""
    ys = [v.co.y for v in m.bm.verts]
    m.transform(M((0, -(min(ys) + max(ys)) / 2, 0)))


# ---------------------------------------------------------------- 사람 장수
def hoplite():
    """중갑 보병: 깃 달린 투구, 둥근 방패, 오른손에 세운 창."""
    m = Model("hoplite")
    _armored_body(m)
    hand = (-0.19, -0.045, 0.40)
    arm(m, [(-0.1, 0.0, 0.452), (-0.16, -0.012, 0.37), hand])
    spear(m, hand[0], hand[1], 0.0, 0.98)
    arm(m, [(0.1, 0.0, 0.452), (0.15, -0.03, 0.37), (0.12, -0.09, 0.39)])
    shield_round(m, (0.085, -0.135, 0.36), yaw=25)
    helmet_corinthian(m)
    crest(m)
    return m


def hero():
    """영웅: 한 단계 크고 화려하게 — 높은 깃, 망토, 방패 돋을무늬, 긴 창."""
    m = Model("hero")
    _armored_body(m)
    cape(m, mat="TEAM_DARK")
    hand = (-0.19, -0.045, 0.41)
    arm(m, [(-0.1, 0.0, 0.452), (-0.16, -0.012, 0.37), hand])
    spear(m, hand[0], hand[1], 0.0, 1.1, tip_len=0.17, tip_w=0.034)
    arm(m, [(0.1, 0.0, 0.452), (0.15, -0.03, 0.37), (0.12, -0.09, 0.39)])
    shield_round(m, (0.085, -0.135, 0.36), yaw=25, boss="BRONZE")
    helmet_corinthian(m)
    crest(m, height=0.1, thick=0.032, back=-40.0, steps=13)
    m.transform(M(scale=1.08))
    return m


def king():
    """왕: 금관, 긴 망토(TEAM), 왼손 왕홀(금 끝), 오른손 칼, 긴 수염."""
    m = Model("king")
    _feet(m)
    robe(m, top=0.47, r_top=0.072, r_bot=0.14, mat="CLOTH", hem="TEAM_DARK")
    belt(m, z=0.305, r=0.1, mat="GOLD", sy=0.82)
    # 망토는 어깨에서 앞쪽 옆구리까지 감싸 앞에서도 편 색이 보이게
    cape(m, top=0.47, bottom=0.03, r_top=0.108, r_bot=0.215, mat="TEAM", arc=262, sy=0.84, thick=0.016, hem="GOLD")
    shoulders(m, "TEAM", z=0.45, x=0.097, r=0.046)
    neck(m)
    head(m, hair="WOOD_DARK", beard="WOOD_DARK", beard_size=1.3, long_hair=True)
    crown(m, h=0.042, point_h=0.058, points=7)
    # 왼손 왕홀
    grip = (0.19, -0.05, 0.41)
    sleeve_arm(m, [(0.1, 0.0, 0.45), (0.168, -0.02, 0.38), grip], "CLOTH")
    m.add(rod((grip[0], grip[1], 0.02), (grip[0], grip[1], 0.9), 0.017, 0.015, 6), "WOOD")
    m.add(lathe([(0.0, 0.875), (0.026, 0.88), (0.044, 0.91), (0.03, 0.935), (0.058, 0.97), (0.042, 1.01), (0.0, 1.045)], 8),
          "GOLD", True, M((grip[0], grip[1], 0.0)))
    m.add(torus(0.02, 0.009, 8, 4), "GOLD", True, M((grip[0], grip[1], 0.36)))
    # 오른손 칼 — 앞으로 비스듬히 쳐든다
    hand = (-0.17, -0.1, 0.41)
    sleeve_arm(m, [(-0.1, 0.0, 0.45), (-0.165, -0.05, 0.38), hand], "CLOTH")
    sword(m, hand, direction=(-0.25, -0.5, 0.83), blade=0.27, width=0.044)
    m.transform(M(scale=1.06))
    return m


def archer():
    """궁수: 방패 없이 활, 등에 화살통, 앞으로 굽은 프리기아 모자(TEAM)."""
    m = Model("archer")
    legs(m, greaves=False, boots=True, stride=0.03)
    kilt(m, hem="TEAM_DARK")
    torso(m, "LEATHER")
    belt(m, mat="TEAM_DARK")
    sash(m, mat="TEAM_DARK", side=-1)
    neck(m)
    head(m, hair="WOOD_DARK")
    phrygian_cap(m, mat="TEAM")
    quiver(m, base=(0.075, 0.105, 0.24), top=(-0.075, 0.12, 0.57), r=0.04)
    grip = (0.205, -0.075, 0.41)
    arm(m, [(0.1, 0.0, 0.452), (0.165, -0.04, 0.42), grip])
    bow(m, grip, yaw=0.0, half=0.33, bulge=0.095, mat="WOOD", r=0.021)
    m.add(cyl(0.024, 0.024, 0.06, 6, -0.03), "LEATHER", True, M(grip))  # 활 줌통
    hand = (-0.16, -0.05, 0.33)
    arm(m, [(-0.1, 0.0, 0.452), (-0.15, -0.01, 0.37), hand])
    m.add(rod((-0.16, -0.16, 0.25), (-0.16, 0.06, 0.4), 0.005, None, 4), "WOOD")
    return m


def skirmisher():
    """경보병: 초승달 방패(펠타, TEAM), 투창 두 자루, 가죽 모자."""
    m = Model("skirmisher")
    legs(m, greaves=False, boots=True, stride=0.045)
    kilt(m, hem="TEAM_DARK")
    torso(m, "CLOTH")
    belt(m, mat="LEATHER")
    sash(m, mat="TEAM_DARK", side=1)
    neck(m)
    head(m, hair="WOOD_DARK")
    pilos(m)
    arm(m, [(0.1, 0.0, 0.452), (0.15, -0.03, 0.37), (0.12, -0.09, 0.39)])
    pelta(m, (0.09, -0.13, 0.38), yaw=25, R=0.185)
    hand = (-0.18, -0.03, 0.43)
    arm(m, [(-0.1, 0.0, 0.452), (-0.16, 0.0, 0.4), hand])
    _javelin(m, hand, (16, -9))
    _javelin(m, hand, (22, 5))
    return m


def _driver(m):
    """전차 몰이꾼(허리 위만 보인다): 흉갑, 투구 깃, 오른손 창. 가려지는 곳은 면을 줄인다."""
    kilt(m, hem=None)
    torso(m, "BRONZE")
    belt(m, n=10)
    shoulders(m, seg=(6, 4))
    neck(m)
    helmet_corinthian(m, n=11)
    crest(m, height=0.08, sides=6)
    hand = (-0.17, -0.06, 0.42)
    arm(m, [(-0.1, 0.0, 0.452), (-0.15, -0.02, 0.37), hand], sides=5)
    _spear_through(m, hand, (8, 0), 0.9, 0.45, tip_len=0.14, tip_w=0.03)
    arm(m, [(0.1, 0.0, 0.452), (0.13, -0.08, 0.38), (0.07, -0.16, 0.39)], sides=5)


def chariot():
    """두 마리 말이 끄는 두 바퀴 전차 + 몰이꾼. 옆 가림 천은 TEAM."""
    m = Model("chariot")
    for s in (-1, 1):
        horse(m, M((s * 0.088, -0.17, 0.0), scale=0.86), stride=0.025 * s)
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
    m.add(tube(rail, 0.012, 4, phase=45), "WOOD")
    for s in (-1, 1):
        wheel(m, (s * 0.205, cy + 0.04, 0.16), R=0.16, spokes=6)
    m.add(rod((-0.24, cy + 0.04, 0.16), (0.24, cy + 0.04, 0.16), 0.012, None, 6), "WOOD")
    m.add(rod((0, cy - 0.12, 0.18), (0, -0.33, 0.335), 0.012, None, 6), "WOOD")
    m.add(rod((-0.14, -0.315, 0.345), (0.14, -0.315, 0.345), 0.013, None, 6), "WOOD")
    m.push(M((0, cy + 0.01, 0.186), scale=0.86))
    _driver(m)
    m.pop()
    _center_y(m)
    return m


def rider():
    """아마존 기병: 말 위의 여전사, 초승달 방패(TEAM), 창, 투구 깃, 편 색 안장 천."""
    m = Model("rider")
    hs = 1.16
    horse(m, M((0, 0.0, 0.0), scale=hs), stride=0.035)
    # 안장 천: 말 등을 덮는 반원 껍질(TEAM)
    cloth = lathe([(0.079, -0.075), (0.092, -0.075), (0.092, 0.075), (0.079, 0.075)], 12, arc=210, start=165, loop=True)
    m.add(cloth, "TEAM", 35, M((0, 0.012 * hs, 0.29 * hs), rot=(-90, 0, 0), scale=(1.0, 1.09, 1.0)))
    sit = 0.29 * hs + 0.072 * hs  # 말 등 윗면
    fs = 0.88
    m.push(M((0, 0.03, sit - 0.235 * fs), scale=fs))
    for s in (-1, 1):  # 말 옆구리로 내린 다리
        m.add(tube([(s * 0.05, 0.0, 0.24), (s * 0.105, -0.085, 0.2), (s * 0.108, -0.05, 0.06)], [0.037, 0.03, 0.025], 7), "SKIN")
        m.add(tube([(s * 0.108, -0.058, 0.11), (s * 0.108, -0.05, 0.05)], [0.031, 0.03], 7), "LEATHER")
    kilt(m, top=0.31, bottom=0.2, r_bot=0.12, hem="TEAM_DARK")
    torso(m, "CLOTH")
    belt(m, mat="LEATHER")
    shoulders(m, "BRONZE")
    neck(m)
    m.add(sphere(0.085, 10, 6), "WOOD_DARK", True, M((0, 0.075, HEAD_Z - 0.09), scale=(0.9, 0.6, 1.3)))  # 투구 밑 긴 머리
    helmet_corinthian(m)
    crest(m, height=0.075)
    arm(m, [(0.1, 0.0, 0.452), (0.15, -0.03, 0.37), (0.12, -0.09, 0.39)])
    pelta(m, (0.1, -0.12, 0.39), yaw=28, R=0.17)
    hand = (-0.17, -0.05, 0.43)
    arm(m, [(-0.1, 0.0, 0.452), (-0.16, -0.01, 0.38), hand])
    _spear_through(m, hand, (24, 0), 0.95, 0.45, tip_len=0.15, tip_w=0.03)
    m.pop()
    _center_y(m)
    return m


def seer():
    """예언자·사제: 긴 흰 옷 + 띠(TEAM_DARK), 월계 가지 지팡이, 월계관, 한 손을 들어 올림."""
    m = Model("seer")
    _feet(m)
    robe(m, top=0.47, r_top=0.07, r_bot=0.145, mat="CLOTH", hem="TEAM_DARK", hem_h=0.04)
    belt(m, z=0.31, r=0.1, mat="TEAM_DARK", sy=0.82)
    sash(m, mat="TEAM_DARK", side=1, r=0.104)
    shoulders(m, "CLOTH", r=0.042)
    neck(m)
    head(m, hair="WOOD_DARK", long_hair=True)
    wreath(m)
    hand = (-0.18, -0.045, 0.44)
    sleeve_arm(m, [(-0.1, 0.0, 0.45), (-0.16, -0.02, 0.39), hand], "CLOTH")
    top = (hand[0], hand[1], 0.9)
    m.add(rod((hand[0], hand[1], 0.02), top, 0.016, 0.014, 6), "WOOD")
    laurel_top(m, (top[0], top[1], top[2] + 0.03), size=0.068, n=8)
    for s in (-1, 1):  # 지팡이에 감은 양털 띠
        m.add(tube([(top[0] + s * 0.014, top[1], 0.87), (top[0] + s * 0.036, top[1] - 0.01, 0.8), (top[0] + s * 0.042, top[1] - 0.012, 0.7)],
                   [0.012, 0.011, 0.008], 5), "TEAM_DARK")
    sleeve_arm(m, [(0.1, 0.0, 0.45), (0.17, -0.05, 0.5), (0.19, -0.1, 0.6)], "CLOTH")
    return m


def healer():
    """의사(마카온): 짧은 키톤, 어깨 가방(LEATHER), 짧은 칼, 작은 투구, 짧은 망토(TEAM)."""
    m = Model("healer")
    legs(m, greaves=False, boots=True, stride=0.02)
    kilt(m, hem="TEAM_DARK")
    torso(m, "CLOTH")
    belt(m, mat="LEATHER")
    cape(m, top=0.47, bottom=0.25, r_top=0.1, r_bot=0.155, mat="TEAM", arc=230, thick=0.012)
    shoulders(m, "TEAM", r=0.042)
    neck(m)
    head(m, hair="WOOD_DARK")
    helmet_small(m)
    sash(m, mat="LEATHER", side=-1, r=0.105)
    # 왼쪽 허리 가방(크게) + 위로 비죽 나온 흰 붕대 두루마리
    bag = M((0.165, -0.035, 0.26), rot=(0, 0, 20))
    m.add(box(0.16, 0.085, 0.13, 0.016), "LEATHER", True, bag)
    m.add(box(0.166, 0.09, 0.045, 0.012), "LEATHER", True, bag @ M((0, -0.002, 0.058)))
    m.add(cyl(0.024, 0.024, 0.1, 8, -0.05), "CLOTH", True, bag @ M((0.0, 0.012, 0.09), rot=(0, 90, 0)))
    m.add(sphere(0.017, 6, 4), "BRONZE", True, bag @ M((0, -0.047, 0.045)))
    arm(m, [(0.1, 0.0, 0.452), (0.155, -0.02, 0.37), (0.16, -0.08, 0.36)])
    hand = (-0.17, -0.07, 0.34)
    arm(m, [(-0.1, 0.0, 0.452), (-0.15, -0.03, 0.37), hand])
    sword(m, hand, direction=(-0.15, -0.7, 0.55), blade=0.17, width=0.032)
    return m


# ---------------------------------------------------------------- 신(사람 말의 1.3배, 머리 뒤 후광)
def god_warrior():
    """전쟁의 신(아테나·아레스): 투구·창·방패, 가장자리 금, 후광."""
    m = Model("godWarrior")
    _feet(m)
    robe(m, top=0.44, r_top=0.08, r_bot=0.145, mat="CLOTH", hem="GOLD", hem_h=0.035)
    torso(m, "BRONZE", r_chest=0.108)
    belt(m, mat="GOLD", r=0.092)
    shoulders(m, "GOLD", r=0.042)
    neck(m)
    helmet_corinthian(m, trim="GOLD")
    crest(m, height=0.095, thick=0.032, back=-38.0, steps=12)
    hand = (-0.19, -0.045, 0.41)
    arm(m, [(-0.1, 0.0, 0.452), (-0.16, -0.012, 0.37), hand])
    spear(m, hand[0], hand[1], 0.0, 1.02, tip="GOLD", tip_len=0.16, tip_w=0.032)
    arm(m, [(0.1, 0.0, 0.452), (0.15, -0.03, 0.37), (0.12, -0.09, 0.39)])
    shield_round(m, (0.085, -0.135, 0.37), yaw=25, rim="GOLD", boss="GOLD", back="BRONZE")
    halo(m, (0, 0, HEAD_Z + 0.01), R=0.165, back=0.1)
    m.transform(M(scale=GOD_SCALE))
    return m


def god_archer():
    """활의 신(아폴론·아르테미스): 금활, 화살통, 짧은 망토(TEAM), 월계관, 후광."""
    m = Model("godArcher")
    legs(m, greaves=False, stride=0.03)
    kilt(m, hem="GOLD")
    torso(m, "CLOTH")
    belt(m, mat="GOLD")
    cape(m, top=0.47, bottom=0.2, r_top=0.1, r_bot=0.17, mat="TEAM", arc=210, thick=0.013)
    shoulders(m, "GOLD", r=0.036)
    neck(m)
    head(m, hair="WOOD_DARK", long_hair=True)
    wreath(m)
    quiver(m, base=(0.075, 0.12, 0.25), top=(-0.075, 0.135, 0.58), r=0.038, fletch="GOLD")
    grip = (0.205, -0.075, 0.42)
    arm(m, [(0.1, 0.0, 0.452), (0.165, -0.04, 0.43), grip])
    bow(m, grip, yaw=0.0, half=0.35, bulge=0.1, mat="GOLD", r=0.021)
    arm(m, [(-0.1, 0.0, 0.452), (-0.16, -0.03, 0.4), (-0.19, -0.07, 0.46)])
    halo(m, (0, 0, HEAD_Z + 0.01), R=0.155, back=0.08)
    m.transform(M(scale=GOD_SCALE))
    return m


def god_robed():
    """옷 입은 신(아프로디테·헤라·테티스·제우스): 긴 옷 + 금 옷단, 편 색 겉옷, 금 머리띠·홀, 후광."""
    m = Model("godRobed")
    _feet(m)
    robe(m, top=0.47, r_top=0.072, r_bot=0.15, mat="CLOTH", hem="GOLD", hem_h=0.04)
    belt(m, z=0.34, r=0.098, mat="GOLD", sy=0.82)
    cape(m, top=0.47, bottom=0.05, r_top=0.108, r_bot=0.2, mat="TEAM", arc=230, sy=0.84, thick=0.015, hem="GOLD")
    sash(m, mat="TEAM", side=-1, r=0.103)
    shoulders(m, "TEAM", z=0.45, x=0.095, r=0.043)
    neck(m)
    head(m, hair="WOOD_DARK", long_hair=True)
    diadem(m)
    grip = (0.18, -0.06, 0.4)
    sleeve_arm(m, [(0.1, 0.0, 0.45), (0.16, -0.03, 0.38), grip], "CLOTH")
    m.add(rod((grip[0], grip[1], 0.05), (grip[0], grip[1], 0.82), 0.013, 0.011, 6), "GOLD")
    m.add(sphere(0.04, 10, 6), "GOLD", True, M((grip[0], grip[1], 0.845)))
    sleeve_arm(m, [(-0.1, 0.0, 0.45), (-0.17, -0.05, 0.5), (-0.2, -0.1, 0.6)], "CLOTH")
    halo(m, (0, 0, HEAD_Z + 0.01), R=0.16, back=0.085)
    m.transform(M(scale=GOD_SCALE))
    return m


def god_trident():
    """포세이돈: 맨가슴, 허리 두른 겉옷(TEAM), 긴 수염, 금관, 금 삼지창, 후광."""
    m = Model("godTrident")
    legs(m, greaves=False, stride=0.035)
    kilt(m, top=0.33, bottom=0.14, r_top=0.085, r_bot=0.13, mat="TEAM", hem="TEAM_DARK")
    torso(m, "SKIN", r_chest=0.108)
    sash(m, mat="TEAM", side=1, r=0.106)
    shoulders(m, "SKIN", r=0.043)
    neck(m)
    head(m, hair="WOOD_DARK", beard="WOOD_DARK", beard_size=1.35, long_hair=True)
    crown(m, points=5, point_h=0.05)
    hand = (-0.19, -0.05, 0.43)
    arm(m, [(-0.1, 0.0, 0.452), (-0.165, -0.02, 0.38), hand], radii=(0.033, 0.028, 0.023))
    trident(m, (hand[0], hand[1], 0.02), (hand[0], hand[1], 0.86), prong=0.15, width=0.07)
    arm(m, [(0.1, 0.0, 0.452), (0.16, -0.02, 0.36), (0.17, -0.07, 0.3)], radii=(0.033, 0.028, 0.023))
    halo(m, (0, 0, HEAD_Z + 0.01), R=0.16, back=0.09)
    m.transform(M(scale=GOD_SCALE))
    return m


def river_god():
    """스카만드로스: 소용돌이치는 물기둥에서 솟은 상반신(WATER), 갈대 관, 거품. 키 1.2."""
    m = Model("riverGod")
    rng = random.Random(11)

    def swirl(r, z, a):
        return r * (1.0 + 0.17 * math.sin(3 * a)), a + 3.4 * z

    col = [(0.0, 0.0), (0.25, 0.0), (0.245, 0.05), (0.2, 0.14), (0.16, 0.26), (0.135, 0.4), (0.12, 0.52), (0.115, 0.62), (0.0, 0.63)]
    m.add(lathe(col, 18, wobble=swirl), "WATER", 50)
    # 밑동 물결 고리 두 겹 + 거품
    for z, R, r in ((0.05, 0.25, 0.042), (0.24, 0.175, 0.03)):
        ring = torus(R, r, 18, 5)
        for v in ring.verts:
            v.co.z += 0.018 * math.sin(3 * math.atan2(v.co.y, v.co.x) + z * 9)
        m.add(ring, "WATER", 50, M((0, 0, z)))
    for k in range(7):
        a = 2 * math.pi * k / 7 + 0.3
        p = (0.255 * math.cos(a), 0.255 * math.sin(a), 0.08 + 0.012 * (k % 2))
        m.add(sphere(0.038, 8, 5), "CLOTH", True, M(p, rot=(0, 0, math.degrees(a)), scale=(0.8, 1.3, 0.55)))
    # 상반신
    m.add(lathe([(0.0, 0.56), (0.118, 0.58), (0.13, 0.66), (0.14, 0.76), (0.125, 0.84), (0.07, 0.875), (0.0, 0.88)], 14),
          "WATER", True, M(scale=(1, 0.76, 1)))
    hc = (0.0, 0.0, 0.975)
    m.add(sphere(0.1, 12, 8), "WATER", True, M(hc))
    m.add(sphere(0.104, 12, 8), "WATER", True, M((0, 0.03, hc[2] + 0.01), scale=(1.03, 1.0, 1.0)))
    m.add(tube([(0, -0.07, 0.93), (0, -0.095, 0.86), (0, -0.085, 0.79)], [0.055, 0.05, 0.02], 8), "WATER")  # 흐르는 수염
    for s in (-1, 1):  # 두 팔을 치켜든다
        m.add(sphere(0.045, 8, 5), "WATER", True, M((s * 0.125, 0.0, 0.84)))
        m.add(tube([(s * 0.125, 0.0, 0.84), (s * 0.215, -0.03, 0.93), (s * 0.235, -0.06, 1.06)], [0.036, 0.03, 0.025], 7), "WATER")
        m.add(sphere(0.032, 8, 5), "WATER", True, M((s * 0.238, -0.062, 1.08)))
    # 갈대 관
    for k in range(7):
        a = math.radians(-160 + 140 * k / 6)
        base = Vector((0.07 * math.cos(a), 0.07 * math.sin(a) + 0.01, 1.04))
        tip = base + Vector((0.08 * math.cos(a), 0.05 * math.sin(a), 0.15 + 0.02 * (k % 2)))
        m.add(rod(base, tip, 0.012, 0.003, 4), "LEAF", False)
        if k in (1, 5):
            m.add(cyl(0.012, 0.012, 0.05, 5), "LEATHER", True, M(tip - Vector((0, 0, 0.055))))
    return m


MODELS = {
    "hoplite": {"build": hoplite, "kind": "unit"},
    "hero": {"build": hero, "kind": "unit"},
    "king": {"build": king, "kind": "unit"},
    "archer": {"build": archer, "kind": "unit"},
    "skirmisher": {"build": skirmisher, "kind": "unit"},
    "chariot": {"build": chariot, "kind": "unit"},
    "rider": {"build": rider, "kind": "unit"},
    "seer": {"build": seer, "kind": "unit"},
    "healer": {"build": healer, "kind": "unit"},
    "godWarrior": {"build": god_warrior, "kind": "unit"},
    "godArcher": {"build": god_archer, "kind": "unit"},
    "godRobed": {"build": god_robed, "kind": "unit"},
    "godTrident": {"build": god_trident, "kind": "unit"},
    "riverGod": {"build": river_god, "kind": "unit"},
}
