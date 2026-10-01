# 트로이 전쟁 모델 공용 도우미 — 재질·도형·합치기·내보내기·미리 보기·보고
# 단위 1 = 칸 한 변. 원점은 발밑 가운데, 앞은 Blender -Y(glTF +Z).
import bpy
import bmesh
import json
import math
import os
import struct
import sys

import numpy as np
from mathutils import Euler, Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", "..", "..", ".."))
# 환경 변수로 내보낼 곳을 바꾸면 저장소 GLB를 건드리지 않고 처음부터 다시 굽는 시험을 할 수 있다
OUT_DIR = os.environ.get("MYTH_TROY_OUT") or os.path.join(REPO, "sw", "web", "public", "models", "myth-troy")
TMP_DIR = os.environ.get("MYTH_TROY_TMP") or "/tmp/myth-troy/assets"
PREVIEW_DIR = os.path.join(TMP_DIR, "previews")

# 재질 표 — 3D 판이 이름으로 색을 바꾸므로 이름·색은 명세 표와 똑같아야 한다
MATERIALS = {
    "TEAM": {"color": "#3f6fb0", "rough": 0.6, "metal": 0.0},
    "TEAM_DARK": {"color": "#25406a", "rough": 0.7, "metal": 0.0},
    "BRONZE": {"color": "#b8863b", "rough": 0.35, "metal": 0.85},
    "SKIN": {"color": "#d8a577", "rough": 0.7, "metal": 0.0},
    "CLOTH": {"color": "#e9e1cc", "rough": 0.8, "metal": 0.0},
    "LEATHER": {"color": "#7a4a28", "rough": 0.8, "metal": 0.0},
    "WOOD": {"color": "#8b5a2b", "rough": 0.8, "metal": 0.0},
    "WOOD_DARK": {"color": "#2c2724", "rough": 0.7, "metal": 0.0},
    "STONE": {"color": "#cdbf9f", "rough": 0.9, "metal": 0.0},
    "STONE_DARK": {"color": "#9c8b6f", "rough": 0.9, "metal": 0.0},
    "LEAF": {"color": "#6f7f48", "rough": 0.8, "metal": 0.0},
    "LEAF_DARK": {"color": "#3e5a36", "rough": 0.8, "metal": 0.0},
    "HORSE": {"color": "#8a5a36", "rough": 0.7, "metal": 0.0},
    "GOLD": {"color": "#e0b94c", "rough": 0.3, "metal": 0.9},
    "FLAME": {"color": "#ffb347", "emit": 3.0},
    "GLOW": {"color": "#fff1c1", "emit": 2.0},
    "WATER": {"color": "#5fb3c9", "rough": 0.2, "metal": 0.0},
    "RED_OCHRE": {"color": "#a24a2c", "rough": 0.7, "metal": 0.0},
    # 인물 고유 말에 쓰는 재질(편 색을 타지 않는다)
    "SKIN_DARK": {"color": "#7b4f35", "rough": 0.7, "metal": 0.0},
    "HAIR_GOLD": {"color": "#c89b3c", "rough": 0.7, "metal": 0.0},
    "HAIR_GREY": {"color": "#c9c3b8", "rough": 0.8, "metal": 0.0},
    "FUR": {"color": "#c79a5a", "rough": 0.9, "metal": 0.0},
    "FUR_DARK": {"color": "#4a3b2e", "rough": 0.9, "metal": 0.0},
    "BONE": {"color": "#ece2c6", "rough": 0.6, "metal": 0.0},
    "PURPLE": {"color": "#5c2a63", "rough": 0.7, "metal": 0.0},
}

TEAM_BLUE = "#3f6fb0"
TEAM_RED = "#b3392f"


# ---------------------------------------------------------------- 색·재질
def hex_lin(h):
    """sRGB 16진 색을 Blender가 쓰는 선형 값으로 바꾼다."""
    h = h.lstrip("#")
    out = []
    for i in (0, 2, 4):
        c = int(h[i:i + 2], 16) / 255.0
        out.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return tuple(out)


def _bsdf(mat):
    if mat.node_tree is None:
        mat.use_nodes = True
    for node in mat.node_tree.nodes:
        if node.type == "BSDF_PRINCIPLED":
            return node
    raise RuntimeError("Principled BSDF 없음: " + mat.name)


def make_material(name, color, rough=0.5, metal=0.0, emit=0.0):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    bsdf = _bsdf(mat)
    col = (*hex_lin(color), 1.0)
    bsdf.inputs["Base Color"].default_value = col
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metal
    if emit > 0:
        bsdf.inputs["Emission Color"].default_value = col
        bsdf.inputs["Emission Strength"].default_value = emit
    mat.diffuse_color = col
    return mat


def get_mat(name):
    spec = MATERIALS[name]
    mat = bpy.data.materials.get(name)
    if mat is not None:
        return mat
    return make_material(name, spec["color"], spec.get("rough", 0.5), spec.get("metal", 0.0), spec.get("emit", 0.0))


# ---------------------------------------------------------------- 변환
def M(loc=(0, 0, 0), rot=(0, 0, 0), scale=1.0):
    """위치·회전(도, XYZ)·크기로 4×4 행렬을 만든다."""
    if isinstance(scale, (int, float)):
        scale = (scale, scale, scale)
    r = Euler([math.radians(a) for a in rot], "XYZ").to_matrix().to_4x4()
    s = Matrix.Diagonal((scale[0], scale[1], scale[2], 1.0))
    return Matrix.Translation(Vector(loc)) @ r @ s


def xf(bm, m):
    bmesh.ops.transform(bm, matrix=m, verts=bm.verts)
    if m.to_3x3().determinant() < 0:
        bmesh.ops.reverse_faces(bm, faces=bm.faces)
    return bm


def align_z(d):
    """+Z를 방향 d로 돌리는 회전 행렬."""
    d = Vector(d).normalized()
    if d.dot(Vector((0, 0, 1))) < -0.9999:
        return Matrix.Rotation(math.pi, 4, "X")
    return Vector((0, 0, 1)).rotation_difference(d).to_matrix().to_4x4()


def _normals(bm):
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    return bm


# ---------------------------------------------------------------- 도형(각자 새 bmesh를 돌려준다)
def bevel_edges(bm, width, segs=1, angle=30.0):
    """면 사이 각이 angle보다 큰 모서리만 작게 깎는다."""
    lim = math.radians(angle)
    edges = [e for e in bm.edges if e.is_manifold and e.calc_face_angle(0.0) > lim]
    if edges and width > 0:
        bmesh.ops.bevel(bm, geom=edges, offset=width, offset_type="OFFSET", segments=segs,
                        profile=0.5, affect="EDGES", clamp_overlap=True)
    return bm


def box(sx, sy, sz, bevel=0.0, segs=1):
    """가운데가 원점인 상자."""
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0, matrix=Matrix.Diagonal((sx, sy, sz, 1.0)))
    if bevel > 0:
        bevel_edges(bm, bevel, segs)
    return bm


def lathe(profile, n=12, arc=360.0, start=0.0, cap_start=True, cap_end=True, loop=False, wobble=None):
    """profile [(r, z)…]을 Z축으로 돌린 몸. r≈0 인 점은 극점 하나가 된다.
    loop=True면 단면이 닫힌 고리(관·띠). wobble(r, z, 각)→(r, 각)으로 반지름·각을 흔들 수 있다."""
    bm = bmesh.new()
    full = abs(arc - 360.0) < 1e-6
    cols = n if full else n + 1
    rings = []
    for r, z in profile:
        if r < 1e-6:
            rings.append([bm.verts.new((0.0, 0.0, z))])
            continue
        ring = []
        for j in range(cols):
            a = math.radians(start + arc * j / n)
            rr, aa = wobble(r, z, a) if wobble else (r, a)
            ring.append(bm.verts.new((rr * math.cos(aa), rr * math.sin(aa), z)))
        rings.append(ring)
    pairs = list(range(len(rings) - 1)) + ([len(rings) - 1] if loop else [])
    for i in pairs:
        A, B = rings[i], rings[(i + 1) % len(rings)]
        if len(A) == 1 and len(B) == 1:
            continue
        for j in range(n):
            j2 = (j + 1) % cols
            if len(A) == 1:
                bm.faces.new((A[0], B[j2], B[j]))
            elif len(B) == 1:
                bm.faces.new((A[j], A[j2], B[0]))
            else:
                bm.faces.new((A[j], A[j2], B[j2], B[j]))
    if loop:
        return _normals(bm) if full else bm
    closed = full
    if full and len(rings[0]) > 1:
        if cap_start:
            bm.faces.new(list(reversed(rings[0])))
        else:
            closed = False
    if full and len(rings[-1]) > 1:
        if cap_end:
            bm.faces.new(rings[-1])
        else:
            closed = False
    return _normals(bm) if closed else bm


def cyl(r1, r2, h, n=12, z0=0.0, caps=True):
    """바닥 z0에서 위로 h만큼 선 원기둥(원뿔대)."""
    return lathe([(r1, z0), (r2, z0 + h)], n, cap_start=caps, cap_end=caps)


def rod(p0, p1, r0, r1=None, n=8, caps=True):
    """두 점 사이 막대(창 자루·팔다리)."""
    p0, p1 = Vector(p0), Vector(p1)
    d = p1 - p0
    bm = cyl(r0, r0 if r1 is None else r1, d.length, n, 0.0, caps)
    return xf(bm, Matrix.Translation(p0) @ align_z(d))


def cone(r, h, n=12, z0=0.0):
    return lathe([(r, z0), (0.0, z0 + h)], n)


def sphere(r=1.0, nu=12, nv=8):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=nu, v_segments=nv, radius=r)
    return bm


def ico(r=1.0, sub=1):
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=r)
    return bm


def torus(R, r, nu=16, nv=6, rn=None):
    """XY 평면의 고리. rn을 주면 단면을 세로로 눌러 (가로 r, 세로 rn) 타원으로 만든다."""
    rn = r if rn is None else rn
    bm = bmesh.new()
    rings = []
    for i in range(nu):
        a = 2 * math.pi * i / nu
        ring = []
        for j in range(nv):
            b = 2 * math.pi * j / nv
            rr = R + r * math.cos(b)
            ring.append(bm.verts.new((rr * math.cos(a), rr * math.sin(a), rn * math.sin(b))))
        rings.append(ring)
    for i in range(nu):
        A, B = rings[i], rings[(i + 1) % nu]
        for j in range(nv):
            j2 = (j + 1) % nv
            bm.faces.new((A[j], B[j], B[j2], A[j2]))
    return _normals(bm)


def tube(pts, radii, n=8, closed=False, caps=True, up=(0, 0, 1), phase=0.0):
    """점 목록을 따라 훑는 관. radii는 수 하나·목록, 목록 원소는 r 또는 (법선 쪽 r, 옆쪽 r).
    n=4·phase=45면 납작한 띠(직사각형 단면)가 된다."""
    P = [Vector(p) for p in pts]
    k = len(P)
    R = [radii] * k if isinstance(radii, (int, float)) else list(radii)
    if len(R) != k:
        raise ValueError("tube: 점 %d개에 반지름 %d개" % (k, len(R)))
    R = [(r, r) if isinstance(r, (int, float)) else (r[0], r[1]) for r in R]
    T = []
    for i in range(k):
        if closed:
            a, b = P[(i - 1) % k], P[(i + 1) % k]
        else:
            a, b = P[max(i - 1, 0)], P[min(i + 1, k - 1)]
        T.append((b - a).normalized())
    ref = Vector(up)
    if abs(ref.normalized().dot(T[0])) > 0.95:
        ref = Vector((1, 0, 0)) if abs(T[0].x) < 0.9 else Vector((0, 1, 0))
    N = (ref - ref.project(T[0])).normalized()
    frames = []
    for i in range(k):
        if i > 0:
            N = T[i - 1].rotation_difference(T[i]) @ N
            N = (N - N.project(T[i])).normalized()
        frames.append((N.copy(), T[i].cross(N).normalized()))
    bm = bmesh.new()
    rings = []
    for i in range(k):
        rn, rb = R[i]
        if max(rn, rb) < 1e-6:
            rings.append([bm.verts.new(P[i])])
            continue
        Nv, Bv = frames[i]
        ring = []
        for j in range(n):
            a = 2 * math.pi * j / n + math.radians(phase)
            ring.append(bm.verts.new(P[i] + Nv * (math.cos(a) * rn) + Bv * (math.sin(a) * rb)))
        rings.append(ring)
    segs = k if closed else k - 1
    for i in range(segs):
        A, B = rings[i], rings[(i + 1) % k]
        if len(A) == 1 and len(B) == 1:
            continue
        for j in range(n):
            j2 = (j + 1) % n
            if len(A) == 1:
                bm.faces.new((A[0], B[j], B[j2]))
            elif len(B) == 1:
                bm.faces.new((A[j2], A[j], B[0]))
            else:
                bm.faces.new((A[j], B[j], B[j2], A[j2]))
    shut = closed
    if not closed and caps:
        shut = True
        if len(rings[0]) > 1:
            bm.faces.new(rings[0])
        if len(rings[-1]) > 1:
            bm.faces.new(list(reversed(rings[-1])))
    return _normals(bm) if shut else bm


def prism(outline, depth, plane="XZ", bevel=0.0, segs=1, angle=30.0):
    """2D 윤곽을 두께 depth로 뽑는다. XZ: 앞에서 본 모양(두께 Y), YZ: 옆모양(두께 X), XY: 위에서 본 모양(두께 Z)."""
    h = depth / 2.0

    def pt(u, v, w):
        if plane == "XZ":
            return (u, w, v)
        if plane == "YZ":
            return (w, u, v)
        return (u, v, w)

    bm = bmesh.new()
    F = [bm.verts.new(pt(u, v, -h)) for u, v in outline]
    B = [bm.verts.new(pt(u, v, h)) for u, v in outline]
    bm.faces.new(F)
    bm.faces.new(list(reversed(B)))
    for i in range(len(outline)):
        j = (i + 1) % len(outline)
        bm.faces.new((F[i], F[j], B[j], B[i]))
    _normals(bm)
    if bevel > 0:
        bevel_edges(bm, bevel, segs, angle)
    return bm


def loft(sections, caps=True):
    """같은 점 개수의 닫힌 단면들을 차례로 잇는다."""
    bm = bmesh.new()
    rings = [[bm.verts.new(Vector(p)) for p in sec] for sec in sections]
    m = len(rings[0])
    for i in range(len(rings) - 1):
        A, B = rings[i], rings[i + 1]
        for j in range(m):
            j2 = (j + 1) % m
            bm.faces.new((A[j], A[j2], B[j2], B[j]))
    if caps:
        bm.faces.new(list(reversed(rings[0])))
        bm.faces.new(rings[-1])
        return _normals(bm)
    return bm


def arc_pts(center, radius, a0, a1, steps, plane="YZ"):
    """평면 위 원호 점들(도 단위). YZ: (y, z), XZ: (x, z), XY: (x, y)."""
    cx, cy, cz = center
    out = []
    for i in range(steps + 1):
        a = math.radians(a0 + (a1 - a0) * i / steps)
        c, s = math.cos(a) * radius, math.sin(a) * radius
        if plane == "YZ":
            out.append((cx, cy + c, cz + s))
        elif plane == "XZ":
            out.append((cx + c, cy, cz + s))
        else:
            out.append((cx + c, cy + s, cz))
    return out


def jitter(bm, amount, rng, keep_bottom=None):
    """꼭짓점을 조금씩 흔든다(바위·잎 덩이). keep_bottom 아래 점은 z를 두고 옆으로만."""
    for v in bm.verts:
        d = Vector((rng.uniform(-1, 1), rng.uniform(-1, 1), rng.uniform(-1, 1))) * amount
        if keep_bottom is not None and v.co.z <= keep_bottom:
            d.z = 0.0
        v.co += d
    return bm


# ---------------------------------------------------------------- 모델(부품을 하나의 메시로 모은다)
class Model:
    def __init__(self, key):
        self.key = key
        self.bm = bmesh.new()
        self.slots = []
        self.frames = []
        self.tally = {}  # 부른 함수별 삼각형 수(예산 맞출 때 본다)

    def push(self, m):
        """이후 부품 전부에 m을 덧씌운다(말 위의 기수, 전차 위의 몰이꾼 등)."""
        self.frames.append((self.frames[-1] if self.frames else Matrix.Identity(4)) @ m)

    def pop(self):
        self.frames.pop()

    def slot(self, name):
        if name not in MATERIALS:
            raise KeyError("재질 표에 없는 이름: " + name)
        if name not in self.slots:
            self.slots.append(name)
        return self.slots.index(name)

    def add(self, part, mat, smooth=True, m=None):
        """부품을 합친다. smooth: True(각 40°로 매끈), 숫자(그 각), False(각진 면). mat는 이름 또는 면→이름 함수."""
        if m is not None:
            xf(part, m)
        part.normal_update()
        # 재질 함수는 틀(push)을 씌우기 전 좌표로 판단한다
        names = [mat(f) if callable(mat) else mat for f in part.faces]
        if self.frames:
            xf(part, self.frames[-1])
            part.normal_update()
        ang = None if smooth is False else (40.0 if smooth is True else float(smooth))
        who = sys._getframe(1).f_code.co_name
        self.tally[who] = self.tally.get(who, 0) + sum(len(f.verts) - 2 for f in part.faces)
        vmap = {v: self.bm.verts.new(v.co) for v in part.verts}
        for f, name in zip(part.faces, names):
            nf = self.bm.faces.new([vmap[v] for v in f.verts])
            nf.material_index = self.slot(name)
            nf.smooth = ang is not None
        if ang is not None:
            lim = math.radians(ang)
            for e in part.edges:
                if e.is_manifold and e.calc_face_angle(0.0) > lim:
                    ne = self.bm.edges.get((vmap[e.verts[0]], vmap[e.verts[1]]))
                    if ne is not None:
                        ne.smooth = False
        part.free()
        return self

    def add_local(self, part, mat, smooth=True, m=None):
        """add와 같되 재질 함수를 옮기기 전, 부품을 만든 자리 좌표로 판단한다(눕힌 바퀴의 테, 누운 토막의 깨진 끝 등)."""
        part.normal_update()
        part.faces.index_update()
        names = [mat(f) if callable(mat) else mat for f in part.faces]
        if m is not None:
            xf(part, m)
        return self.add(part, lambda f: names[f.index], smooth)

    def transform(self, m):
        """지금까지 모은 것 전체를 옮기거나 키운다(신은 1.3배 등)."""
        bmesh.ops.transform(self.bm, matrix=m, verts=self.bm.verts)
        return self

    def finish(self):
        me = bpy.data.meshes.new(self.key)
        self.bm.normal_update()
        self.bm.to_mesh(me)
        self.bm.free()
        for name in self.slots:
            me.materials.append(get_mat(name))
        ob = bpy.data.objects.new(self.key, me)
        bpy.context.scene.collection.objects.link(ob)
        return ob


def tri_count(ob):
    me = ob.data
    me.calc_loop_triangles()
    return len(me.loop_triangles)


def bounds(ob):
    vs = [ob.matrix_world @ v.co for v in ob.data.vertices]
    lo = Vector((min(v.x for v in vs), min(v.y for v in vs), min(v.z for v in vs)))
    hi = Vector((max(v.x for v in vs), max(v.y for v in vs), max(v.z for v in vs)))
    return lo, hi


# ---------------------------------------------------------------- 장면 비우기·내보내기
def reset_scene():
    for coll in (bpy.data.objects, bpy.data.meshes, bpy.data.materials, bpy.data.lights,
                 bpy.data.cameras, bpy.data.curves, bpy.data.images, bpy.data.node_groups):
        for item in list(coll):
            coll.remove(item)
    sc = bpy.context.scene
    for c in list(sc.collection.children):
        bpy.data.collections.remove(c)
    return sc


def export_glb(ob, path):
    for o in bpy.context.scene.objects:
        o.select_set(False)
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=path, export_format="GLB", use_selection=True, export_yup=True, export_apply=True,
        export_materials="EXPORT", export_texcoords=False, export_normals=True, export_animations=False,
        export_cameras=False, export_lights=False, export_extras=False, export_morph=False,
        export_skins=False, export_image_format="NONE",
    )


def glb_info(path):
    """GLB를 직접 풀어 삼각형·메시·재질을 센다(내보낸 결과 그대로)."""
    with open(path, "rb") as f:
        data = f.read()
    magic, _ver, _length = struct.unpack_from("<III", data, 0)
    if magic != 0x46546C67:
        raise ValueError("GLB 아님: " + path)
    clen, _ctype = struct.unpack_from("<II", data, 12)
    js = json.loads(data[20:20 + clen].decode("utf-8"))
    tris = 0
    verts = 0
    for mesh in js.get("meshes", []):
        for prim in mesh["primitives"]:
            acc = js["accessors"][prim["indices"]]
            tris += acc["count"] // 3
            verts += js["accessors"][prim["attributes"]["POSITION"]]["count"]
    mats = [m.get("name", "?") for m in js.get("materials", [])]
    return {
        "tris": tris, "verts": verts, "meshes": len(js.get("meshes", [])), "nodes": len(js.get("nodes", [])),
        "materials": mats, "bytes": len(data), "extensions": js.get("extensionsUsed", []),
        "animations": len(js.get("animations", [])), "cameras": len(js.get("cameras", [])),
    }


# ---------------------------------------------------------------- 미리 보기 무대(내보내기 뒤에만 쓴다)
PX_PER_M = 512 / 2.4  # 512px 판에서 칸 한 변 ≈ 213px → 128px로 줄이면 ≈ 53px(게임 크기)


def pv_mat(name, color, rough=0.8, metal=0.0, emit=0.0):
    return make_material("PV_" + name, color, rough, metal, emit)


def _link(bm, name, mat):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    me.materials.append(mat)
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    return ob


def setup_world(sc, strength=1.0):
    world = sc.world or bpy.data.worlds.new("PV_World")
    sc.world = world
    if world.node_tree is None:
        world.use_nodes = True
    nt = world.node_tree
    nt.nodes.clear()
    tc = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    bg = nt.nodes.new("ShaderNodeBackground")
    out = nt.nodes.new("ShaderNodeOutputWorld")
    nt.links.new(tc.outputs["Generated"], sep.inputs[0])
    nt.links.new(sep.outputs["Z"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], bg.inputs["Color"])
    nt.links.new(bg.outputs["Background"], out.inputs["Surface"])
    els = ramp.color_ramp.elements
    els[0].position = 0.35
    els[0].color = (*hex_lin("#8a7658"), 1.0)
    els[1].position = 0.75
    els[1].color = (*hex_lin("#bcd6ee"), 1.0)
    mid = els.new(0.52)
    mid.color = (*hex_lin("#efe4cc"), 1.0)
    bg.inputs["Strength"].default_value = strength
    return world


def setup_render(sc, view="ACES 1.3", exposure=0.35):
    sc.render.engine = "BLENDER_EEVEE"
    sc.eevee.taa_render_samples = 48
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_mode = "RGB"
    sc.render.film_transparent = False
    sc.view_settings.view_transform = view
    sc.view_settings.look = "None"
    sc.view_settings.exposure = exposure
    sc.render.resolution_percentage = 100


def add_sun(sc, az=-15.0, el=55.0, energy=4.2, color="#fff1dc", angle=6.0):
    light = bpy.data.lights.new("PV_Sun", "SUN")
    light.energy = energy
    light.color = hex_lin(color)
    light.angle = math.radians(angle)
    ob = bpy.data.objects.new("PV_Sun", light)
    sc.collection.objects.link(ob)
    a, e = math.radians(az), math.radians(el)
    d = Vector((math.sin(a) * math.cos(e), -math.cos(a) * math.cos(e), math.sin(e)))
    ob.rotation_euler = (-d).to_track_quat("-Z", "Y").to_euler()
    return ob


def add_camera(sc, target, ortho_scale=None, el=50.0, az=45.0, dist=12.0, lens=None):
    cam = bpy.data.cameras.new("PV_Cam")
    if ortho_scale is not None:
        cam.type = "ORTHO"
        cam.ortho_scale = ortho_scale
    else:
        cam.lens = lens or 50.0
    cam.clip_start = 0.05
    cam.clip_end = 200.0
    ob = bpy.data.objects.new("PV_Cam", cam)
    sc.collection.objects.link(ob)
    a, e = math.radians(az), math.radians(el)
    d = Vector((math.sin(a) * math.cos(e), -math.cos(a) * math.cos(e), math.sin(e)))
    t = Vector(target)
    ob.location = t + d * dist
    ob.rotation_euler = (-d).to_track_quat("-Z", "Y").to_euler()
    sc.camera = ob
    return ob


def team_base(sc, team_hex, loc=(0, 0, 0)):
    """판이 까는 편 색 받침 흉내(미리 보기 전용)."""
    base = cyl(0.36, 0.35, 0.035, 32)
    _link(base, "PV_Base", pv_mat("Base_" + team_hex, team_hex, 0.6)).location = loc
    rim = torus(0.355, 0.008, 40, 4)
    xf(rim, M((0, 0, 0.035)))
    _link(rim, "PV_BaseRim", pv_mat("Gold", "#e0b94c", 0.3, 0.9)).location = loc
    return 0.035


def ground_tiles(sc, nx, ny, color="#8f9d52", center=(0, 0)):
    """칸 모양 바닥(미리 보기 전용)."""
    for i in range(nx):
        for j in range(ny):
            t = box(0.98, 0.98, 0.3, 0.02)
            x = center[0] + (i - (nx - 1) / 2.0)
            y = center[1] + (j - (ny - 1) / 2.0)
            _link(t, "PV_Tile", pv_mat("Tile_" + color, color, 0.9)).location = (x, y, -0.15)
    under = box(40, 40, 0.1)
    _link(under, "PV_Under", pv_mat("Under", "#6f6554", 1.0)).location = (0, 0, -0.35)


def render(sc, path, w, h, samples=48):
    sc.render.resolution_x = w
    sc.render.resolution_y = h
    sc.eevee.taa_render_samples = samples
    sc.render.filepath = path
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.ops.render.render(write_still=True)


# ---------------------------------------------------------------- 그림 다루기(numpy)
def load_rgba(path):
    img = bpy.data.images.load(path, check_existing=False)
    w, h = img.size
    a = np.empty(w * h * 4, np.float32)
    img.pixels.foreach_get(a)
    bpy.data.images.remove(img)
    return a.reshape(h, w, 4)


def save_rgba(arr, path):
    h, w = arr.shape[:2]
    img = bpy.data.images.new("tmp_save", w, h, alpha=True)
    img.pixels.foreach_set(np.ascontiguousarray(arr, dtype=np.float32).ravel())
    img.filepath_raw = path
    img.file_format = "PNG"
    img.save()
    bpy.data.images.remove(img)


def downscale(src, dst, factor):
    a = load_rgba(src)
    h, w = a.shape[:2]
    h2, w2 = h // factor, w // factor
    b = a[:h2 * factor, :w2 * factor].reshape(h2, factor, w2, factor, 4).mean(axis=(1, 3))
    save_rgba(b, dst)


def shelf_sheet(paths, dst, max_w=1400, max_h=1400, pad=6, bg=(0.12, 0.12, 0.13)):
    """그림을 제 크기 그대로 선반처럼 줄지어 붙인다(키 큰 것부터, 같은 키 안에서는 받은 순서).
    한 줄이 max_w를 넘으면 다음 줄로 내린다. 다 붙인 판이 max_w·max_h를 넘으면 정수배로 줄여서 저장한다
    — 칸마다 가장 큰 그림 크기를 쓰던 격자 방식은 큰 그림 하나가 판 전체를 부풀렸다."""
    imgs = [load_rgba(p) for p in paths]
    order = sorted(range(len(imgs)), key=lambda i: -imgs[i].shape[0])
    rows, row, row_w = [], [], pad
    for i in order:
        w = imgs[i].shape[1]
        if row and row_w + w + pad > max_w:
            rows.append(row)
            row, row_w = [], pad
        row.append(i)
        row_w += w + pad
    if row:
        rows.append(row)
    W = max(pad + sum(imgs[i].shape[1] + pad for i in r) for r in rows)
    H = pad + sum(max(imgs[i].shape[0] for i in r) + pad for r in rows)
    out = np.zeros((H, W, 4), np.float32)
    out[..., 0], out[..., 1], out[..., 2], out[..., 3] = bg[0], bg[1], bg[2], 1.0
    top = pad
    for r in rows:
        x = pad
        for i in r:
            im = imgs[i]
            y0 = H - top - im.shape[0]  # numpy 배열은 아래 줄이 먼저
            out[y0:y0 + im.shape[0], x:x + im.shape[1]] = im
            x += im.shape[1] + pad
        top += max(imgs[i].shape[0] for i in r) + pad
    f = max(1, math.ceil(max(W / max_w, H / max_h)))
    if f > 1:
        h2, w2 = H // f, W // f
        out = out[H - h2 * f:, :w2 * f].reshape(h2, f, w2, f, 4).mean(axis=(1, 3))
    save_rgba(out, dst)
    return out.shape[1], out.shape[0]


def contact_sheet(paths, cols, dst, pad=6, bg=(0.12, 0.12, 0.13)):
    """같은 크기로 맞추지 않은 그림들을 격자로 붙인다(칸 크기는 가장 큰 그림)."""
    imgs = [load_rgba(p) for p in paths]
    ch = max(i.shape[0] for i in imgs)
    cw = max(i.shape[1] for i in imgs)
    rows = (len(imgs) + cols - 1) // cols
    H = rows * ch + (rows + 1) * pad
    W = cols * cw + (cols + 1) * pad
    out = np.zeros((H, W, 4), np.float32)
    out[..., 0], out[..., 1], out[..., 2], out[..., 3] = bg[0], bg[1], bg[2], 1.0
    for k, im in enumerate(imgs):
        r, c = divmod(k, cols)
        # numpy 배열은 아래쪽 줄이 먼저다 → 위에서부터 채우려면 줄 번호를 뒤집는다
        y0 = H - (pad + r * (ch + pad)) - im.shape[0]
        x0 = pad + c * (cw + pad)
        out[y0:y0 + im.shape[0], x0:x0 + im.shape[1]] = im
    save_rgba(out, dst)
