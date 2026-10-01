# 검수 그림 둘 — 내보낸 GLB를 다시 읽어서 만든다(게임이 받는 파일 그대로 보려고)
#  1) team_lineup.png: 장수 말 여섯을 파랑·빨강 두 벌로 칠해 두 줄로 세운 그림 + 게임 크기(칸 ≈ 52px)로 줄인 판
#  2) diorama.png: 칸 12×8 작은 전장(바다·모래·강·풀·성벽·성문·신전·집·배·목마·장수 말)을 1600×900으로 한 장
# 쓰는 법: build_all.py가 전부 구운 뒤 부르거나, 따로 Blender -b --factory-startup -P sw/web/scripts/myth-troy-models/review.py
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bpy  # noqa: E402

import lib  # noqa: E402

# 편 색은 3D 판(scene/palette.ts SIDE_COLOR·SIDE_DARK)과 같은 값
SIDES = {"blue": ("#3f6fb0", "#25406a"), "red": ("#b3392f", "#6b211b")}
LINEUP = ["hoplite", "hero", "king", "archer", "skirmisher", "seer"]

# 판 지형 색(scene/palette.ts TERRAIN_TOP·WATER_BED·WATER)
TOP = {"P": "#8f9d52", "S": "#dcc38f", "R": "#b59a6b", "F": "#6f8043", "H": "#9b8a64", "w": "#a39a6c", "W": "#2c5b5c",
       "L": "#cdbf9f", "G": "#b59a6b", "C": "#c9b27e", "X": "#d2b884", "Z": "#7d6545", "Q": "#a88b5c", "B": "#c7b08a",
       "T": "#d9d0bb", "K": "#bdb49f", "U": "#b8ab8c"}
WATER_FACE = {"w": "#62b0c0", "W": "#2f7f9a"}
STEP = 0.4
TOP_OFFSET = {"W": -0.25, "w": -0.1, "Z": -0.15}


# ---------------------------------------------------------------- GLB 읽기·놓기
class Stage:
    """GLB를 키마다 한 번 읽고, 두 번째부터는 메시를 나눠 쓰는 사본을 놓는다. 편 색은 사본마다 바꿔 칠한다."""

    def __init__(self):
        self.proto = {}
        self.side_mats = {}

    def _import(self, key):
        before = set(bpy.data.objects)
        bpy.ops.import_scene.gltf(filepath=os.path.join(lib.OUT_DIR, key + ".glb"))
        new = [o for o in bpy.data.objects if o not in before]
        meshes = [o for o in new if o.type == "MESH"]
        if len(meshes) != 1:
            raise RuntimeError("%s: 메시 오브젝트가 %d개" % (key, len(meshes)))
        return meshes[0]

    def _side_mat(self, side, which):
        k = (side, which)
        if k not in self.side_mats:
            color = SIDES[side][0 if which == "TEAM" else 1]
            spec = lib.MATERIALS[which]
            self.side_mats[k] = lib.make_material("PV_%s_%s" % (which, side), color, spec["rough"], spec["metal"])
        return self.side_mats[k]

    def put(self, key, loc, rot=0.0, scale=1.0, side=None):
        if key in self.proto:
            ob = self.proto[key].copy()
            bpy.context.scene.collection.objects.link(ob)
        else:
            ob = self._import(key)
            self.proto[key] = ob
        ob.rotation_mode = "XYZ"
        ob.location = loc
        ob.rotation_euler = (0.0, 0.0, math.radians(rot))
        ob.scale = (scale, scale, scale)
        if side:
            # 사본은 앞서 칠한 오브젝트 쪽 재질까지 물려받으므로, 이름은 메시가 쥔 원래 재질에서 읽는다
            for i, slot in enumerate(ob.material_slots):
                src = ob.data.materials[i]
                name = src.name.split(".")[0] if src else ""
                if name in ("TEAM", "TEAM_DARK"):
                    slot.link = "OBJECT"
                    slot.material = self._side_mat(side, name)
        return ob


def _mat(name, hexcol, rough=0.9, metal=0.0):
    return lib.pv_mat(name, hexcol, rough, metal)


def _slab(name, lo, hi, mat, bevel=0.0):
    bm = lib.box(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2], bevel)
    ob = lib._link(bm, name, mat)
    ob.location = ((lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2)
    return ob


def _shade(hexcol, k):
    h = hexcol.lstrip("#")
    rgb = [min(255, max(0, int(int(h[i:i + 2], 16) * k))) for i in (0, 2, 4)]
    return "#%02x%02x%02x" % tuple(rgb)


def _scene():
    sc = lib.reset_scene()
    lib.setup_render(sc)
    lib.setup_world(sc)
    lib.add_sun(sc)
    return sc


# ---------------------------------------------------------------- 1) 편 색 두 벌
def team_lineup():
    """뒷줄 파랑, 앞줄 빨강. 같은 장수 말이 위아래로 서서 편만 바뀐다."""
    sc = _scene()
    stage = Stage()
    n = len(LINEUP)
    lib.ground_tiles(sc, n, 2, "#8f9d52")
    for row, side in enumerate(("blue", "red")):
        y = 0.5 - row  # 뒷줄 +0.5, 앞줄 -0.5
        for i, key in enumerate(LINEUP):
            x = i - (n - 1) / 2
            h = lib.team_base(sc, SIDES[side][0], (x, y, 0.0))
            stage.put(key, (x, y, h), side=side)
    lib.add_camera(sc, (0.0, 0.0, 0.45), ortho_scale=n + 0.6, el=50.0, az=18.0)
    big = os.path.join(lib.TMP_DIR, "team_lineup_big.png")
    small = os.path.join(lib.TMP_DIR, "team_lineup_game.png")
    lib.render(sc, big, 1380, 690, 64)  # 여백을 붙여도 1400px 안에 들게
    lib.downscale(big, small, 4)  # 칸 한 변 ≈ 209px → 52px(휴대폰에서 보이는 크기)
    size = lib.shelf_sheet([big, small], os.path.join(lib.TMP_DIR, "team_lineup.png"))
    for p in (big, small):
        os.remove(p)
    print("[검수] team_lineup.png %d×%d (위 1380×690, 아래 게임 크기 345×172)" % size)


# ---------------------------------------------------------------- 2) 디오라마
# 칸 12×8. 윗줄(y=0)이 성 안, 아랫줄(y=7)이 바다. 판의 y가 커질수록 카메라 쪽(Blender -Y)이다.
MAP = [
    "BKBTTKRBKBBB",  # 0 성 안: 집·신상·신전·제단·길·화로
    "LLLLLLGLLLLL",  # 1 성벽 + 스카이아이 문
    "PPFPPRRPUPPH",  # 2 성벽 앞 들: 샘·숲·폐허·목마
    "FPPHPRRPPPPF",  # 3 들: 맞붙은 두 편
    "PwWWwwwWWWwP",  # 4 스카만드로스 강(길이 여울로 건넌다)
    "QQSwSSSSZZSS",  # 5 모래톱: 울타리·도랑
    "CCXwSCCSSXCS",  # 6 진영: 천막·막사·배·창 틀·방패 더미
    "WWwWWWWWWwWW",  # 7 바다(배 이물이 여울에 걸린다)
]
HEIGHT = {"B": 1, "K": 1, "T": 1, "L": 2, "H": 1}
# (x, y) 칸에 선 성벽 두 곳은 탑, 성 안 길(6,0)과 성문은 들과 같은 높이
TOWERS = [(2, 1), (9, 1)]
ROAD_DOWN = {(6, 0)}


def _tile_top(ch, x, y):
    h = 0 if (x, y) in ROAD_DOWN else HEIGHT.get(ch, 0)
    return h * STEP + TOP_OFFSET.get(ch, 0.0)


def _world(x, y):
    """판 칸 (x, y) → Blender (X, Y). 판 +y는 three +Z(카메라 쪽) = Blender -Y."""
    return x + 0.5 - 6.0, -(y + 0.5 - 4.0)


def _tiles(sc, rng):
    floor = -0.6
    for y, row in enumerate(MAP):
        for x, ch in enumerate(row):
            X, Y = _world(x, y)
            top = _tile_top(ch, x, y)
            k = 1.0 + rng.uniform(-0.04, 0.04)
            side = "#9c8b6f" if ch in "LKTB" else ("#3a3226" if ch in "wW" else "#5b3e28")
            _slab("DT_side", (X - 0.49, Y - 0.49, floor), (X + 0.49, Y + 0.49, top - 0.03), _mat("side_" + side, side, 1.0))
            col = _shade(TOP[ch], k)
            _slab("DT_top", (X - 0.49, Y - 0.49, top - 0.03), (X + 0.49, Y + 0.49, top), _mat("top_" + col, col, 0.95), 0.012)
            if ch in WATER_FACE:
                wc = WATER_FACE[ch]
                _slab("DT_water", (X - 0.5, Y - 0.5, -0.07), (X + 0.5, Y + 0.5, -0.05), _mat("water_" + wc, wc, 0.12, 0.0))
    _slab("DT_under", (-9.0, -7.0, floor - 0.3), (9.0, 7.0, floor), _mat("under", "#4a3f33", 1.0))


def _decor(stage, rng):
    put = stage.put

    def at(x, y, dx=0.0, dy=0.0):
        X, Y = _world(x, y)
        return (X + dx, Y - dy, _tile_top(MAP[y][x], x, y))

    # 성 안
    houses = {0: "house", 2: "houseB", 7: "house", 9: "houseB", 10: "house", 11: "houseB"}
    for x, key in houses.items():
        put(key, at(x, 0), rot=90 * rng.randrange(4), scale=0.95)
    put("statue", at(1, 0))
    put("altar", at(5, 0))
    put("brazier", at(8, 0))
    tx, ty = _world(3.5, 0)
    put("temple", (tx, ty + 0.05, _tile_top("T", 3, 0)))
    # 성벽: 바깥(+y, 카메라 쪽)과 양 끝에 흉벽, 탑 둘, 성문(열림)
    for x, ch in enumerate(MAP[1]):
        if ch != "L":
            continue
        put("crenel", at(x, 1, 0.0, 0.42))
        if x in (0, 11):
            s = -1 if x == 0 else 1
            put("crenel", at(x, 1, s * 0.42, 0.0), rot=90 * (3 if x == 0 else 1))
    for x, y in TOWERS:
        put("tower", at(x, y))
    put("gateOpen", at(6, 1))
    # 들: 샘, 숲, 바위, 폐허, 덤불, 목마
    put("spring", at(1, 2))
    for (x, y), n in (((2, 2), 3), ((0, 3), 2), ((11, 3), 3)):
        a0 = rng.uniform(0, math.tau)
        for i in range(n):
            a = a0 + math.tau * i / n
            key = "treeCypress" if (i == 1 and n == 3) else "treeOlive"
            put(key, at(x, y, math.sin(a) * 0.3, math.cos(a) * 0.3), rot=rng.uniform(0, 360), scale=0.8 + rng.uniform(0, 0.2))
    for x, y in ((3, 3), (11, 2)):
        put("rockA", at(x, y, 0.15, -0.1), rot=rng.uniform(0, 360))
        put("rockB", at(x, y, -0.22, 0.2), rot=rng.uniform(0, 360), scale=0.8)
    put("columnBroken", at(8, 2), rot=rng.uniform(0, 360))
    put("column", at(8, 2, 0.32, -0.3), scale=0.8)
    put("bush", at(4, 2, 0.3, -0.25), scale=0.8)
    put("bush", at(0, 4, 0.1, -0.2), scale=0.7)
    put("tumulus", at(0, 2), scale=0.9)
    hx, hy = _world(9.5, 2.5)
    put("horse", (hx, hy, 0.0), rot=270)  # 머리가 왼쪽, 문 달린 옆구리가 카메라 쪽
    # 강가 갈대
    for x, y in ((1, 4), (4, 4), (10, 4), (3, 5)):
        put("reeds", at(x, y, 0.0, -0.3), rot=rng.uniform(0, 360), scale=0.9)
    # 모래톱·진영
    for x in (0, 1):
        put("palisade", at(x, 5), rot=180)
    for x in (8, 9):
        put("trenchStakes", at(x, 5), rot=180 + rng.uniform(-10, 10))
    put("tent", at(0, 6), rot=90)
    put("hut", at(1, 6), rot=180)
    put("spearRack", at(5, 6), rot=180)
    put("shieldPile", at(6, 6))
    put("tent", at(10, 6), rot=0)
    for x in (2, 9):  # 배: 고물은 모래에, 이물(앞)은 바다 쪽 여울에
        X, Y = _world(x, 6.5)
        put("ship", (X, Y, -0.04))


def _units(sc, stage):
    """장수 말: 파랑(아카이아)은 모래톱·들에서 성 쪽(rot 180)을, 빨강(트로이)은 들·성벽에서 바다 쪽(rot 0)을 본다."""
    units = [
        ("hero", (6, 5), "blue"), ("hoplite", (5, 5), "blue"), ("hoplite", (7, 5), "blue"), ("archer", (4, 6), "blue"),
        ("king", (7, 6), "blue"), ("seer", (8, 6), "blue"), ("chariot", (7, 3), "blue"), ("godWarrior", (4, 3), "blue"),
        ("hero", (6, 2), "red"), ("hoplite", (5, 2), "red"), ("hoplite", (7, 2), "red"), ("skirmisher", (3, 2), "red"),
        ("archer", (4, 1), "red"), ("archer", (8, 1), "red"), ("king", (6, 0), "red"), ("riverGod", (2, 4), "red"),
        ("rider", (11, 4), "red"),
    ]
    for key, (x, y), side in units:
        ch = MAP[y][x]
        X, Y = _world(x, y)
        z = -0.08 if ch == "W" else _tile_top(ch, x, y)
        h = lib.team_base(sc, SIDES[side][0], (X, Y, z)) if ch != "W" else 0.0
        stage.put(key, (X, Y, z + h), rot=180 if side == "blue" else 0, side=side)


def diorama():
    sc = _scene()
    rng = random.Random(1184)  # 트로이가 무너진 해로 전하는 기원전 1184년
    stage = Stage()
    _tiles(sc, rng)
    _decor(stage, rng)
    _units(sc, stage)
    lib.add_camera(sc, (0.0, -0.05, 0.25), el=50.0, az=0.0, dist=28.0, lens=70.0)
    path = os.path.join(lib.TMP_DIR, "diorama.png")
    lib.render(sc, path, 1600, 900, 96)
    print("[검수] diorama.png 1600×900")


def run_all():
    team_lineup()
    diorama()
    lib.reset_scene()


if __name__ == "__main__":
    run_all()
