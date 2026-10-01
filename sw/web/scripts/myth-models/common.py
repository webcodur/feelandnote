# -*- coding: utf-8 -*-
"""
파일명: sw/web/scripts/myth-models/common.py
기능: 신화 세계 3D 모형 굽기 — 공통 도우미 (블렌더 안에서만 돈다: bpy·bmesh·numpy)
책임:
  - 색(sRGB 16진)을 블렌더 재질로 만든다. 재질은 베이스 색·거칠기만 쓰고 금속성 0, 뒷면은 그리지 않는다(게임과 같다).
  - 조립기 Builder: 순수 파이썬 기본 도형(상자·깎인 상자·회전체·고리 잇기·관·얼음공·판 다각기둥)을 행렬로 옮겨
    bmesh 하나에 쌓는다. 면마다 재질을 붙이고 모두 각진 면(flat)으로 둔다. 면 방향은 늘 바깥(반시계)이다.
  - 내보내기: 원점을 바닥 가운데로 옮기고 glTF(Y 위·법선 있음·uv/색 없음·Draco 없음)로 내보낸 뒤
    꼭짓점 좌표를 16비트 정수, 법선을 8비트 정수로 줄인다(KHR_mesh_quantization, three.js GLTFLoader가 그대로 읽는다).
    법선을 빼면 더 작아지지만 게임 그림자(normalBias)가 법선을 쓰므로 뺄 수 없다.
  - 재기: 크기[x, 높이, z](m, glTF 축), 삼각형 수, 파일 크기
  - 미리보기: 내보낸 glb를 빈 장면에 다시 불러와 어두운 배경·3/4 각도로 렌더한다. 옆에 1.75m 사람 인형을 세운다.
  - 게임 치수: structures.ts·props.ts에서 읽는다(값을 여기 복제하지 않는다).
사용법은 bake.py 머리 주석을 본다.
"""
import json
import math
import os
import re
import struct

import bmesh
import bpy
from mathutils import Euler, Matrix, Vector

# ------------------------------ 게임 치수 읽기

WEB_ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
WORLD_DIR = os.path.join(WEB_ROOT, "src", "components", "features", "game", "myth", "world")


def _ts_object(src, name):
    found = re.search(r"export const " + name + r"\s*=\s*\{", src)
    if not found:
        raise RuntimeError(f"게임 코드에서 {name} 치수를 찾지 못했다")
    start = found.end() - 1
    depth = 0
    for end in range(start, len(src)):
        if src[end] == "{":
            depth += 1
        elif src[end] == "}":
            depth -= 1
            if depth == 0:
                body = src[start:end + 1]
                break
    body = re.sub(r"([A-Za-z_]\w*)\s*:", r'"\1":', body)
    body = re.sub(r",\s*}", "}", body)
    return json.loads(body)


def _ts_number(src, name):
    found = re.search(r"export const " + name + r"\s*=\s*(-?[\d.]+)", src)
    if not found:
        raise RuntimeError(f"게임 코드에서 {name} 값을 찾지 못했다")
    return float(found.group(1))


def game_constants():
    with open(os.path.join(WORLD_DIR, "structures.ts"), encoding="utf-8") as f:
        structures = f.read()
    with open(os.path.join(WORLD_DIR, "scene", "geometry", "props.ts"), encoding="utf-8") as f:
        props = f.read()
    return {
        "TEMPLE": _ts_object(structures, "TEMPLE"),
        "COLUMN": _ts_object(structures, "COLUMN"),
        "PEDESTAL_RADIUS": _ts_number(structures, "PEDESTAL_RADIUS"),
        "PEDESTAL_TOP": _ts_number(structures, "PEDESTAL_TOP"),
        "FLAME_BASE": _ts_number(props, "FLAME_BASE"),
    }


# ------------------------------ 색·재질

# 이름: (sRGB 색, 거칠기) — 차분한 색만 둔다. 게임 올림포스 색표(palette.ts)와 어울리게 골랐다
PALETTE = {
    "marble": ("#e9e1d1", 0.72),
    "marble_shade": ("#d3c8b4", 0.8),
    "marble_worn": ("#cfc5b1", 0.88),
    "marble_dark": ("#a89e8c", 0.92),
    "triglyph": ("#727780", 0.8),
    "roof": ("#9c5b44", 0.86),
    "roof_dark": ("#7f4a37", 0.88),
    "gilt": ("#ad8f52", 0.5),
    "bronze": ("#80603e", 0.5),
    "bronze_dark": ("#56402c", 0.6),
    "coal": ("#2a221d", 0.95),
    "ember": ("#6d2f1a", 0.9),
    "wood": ("#7a5739", 0.85),
    "wood_light": ("#96734f", 0.85),
    "wood_dark": ("#4b3424", 0.86),
    "hull": ("#2f2723", 0.8),
    "hull_band": ("#8a3d2c", 0.8),
    "sail": ("#e0d4bb", 0.92),
    "sail_band": ("#9a4832", 0.92),
    "eye_white": ("#e6e0d2", 0.6),
    "eye_dark": ("#201b18", 0.6),
    "bark": ("#665646", 0.95),
    "bark_dark": ("#4f4337", 0.95),
    "leaf": ("#5a6c45", 0.9),
    "leaf_light": ("#939f7c", 0.9),
    "conifer": ("#324a2e", 0.92),
    "conifer_light": ("#46603c", 0.92),
    "rock": ("#a29b8f", 0.95),
    "rock_dark": ("#857f76", 0.96),
    "granite": ("#b39a8a", 0.8),
    "granite_dark": ("#8f7a6d", 0.85),
    "vermilion": ("#a8432e", 0.7),
    "lacquer": ("#26211f", 0.6),
    "thatch": ("#8d7650", 0.95),
    "thatch_dark": ("#6f5c3f", 0.95),
    "turf": ("#6b7446", 0.95),
    "runestone": ("#9aa0a0", 0.93),
    "rune_paint": ("#8e3b2c", 0.85),
}


def srgb_to_linear(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def material(name):
    found = bpy.data.materials.get(name)
    if found:
        return found
    hexstr, rough = PALETTE[name]
    h = hexstr.lstrip("#")
    r, g, b = (srgb_to_linear(int(h[i:i + 2], 16) / 255) for i in (0, 2, 4))
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (r, g, b, 1)
    mat.roughness = rough
    mat.metallic = 0
    mat.use_backface_culling = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (r, g, b, 1)
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = 0
    return mat


# ------------------------------ 행렬·수 도우미

def T(at=(0, 0, 0), rot=(0, 0, 0), scale=1.0):
    s = scale if isinstance(scale, (tuple, list)) else (scale, scale, scale)
    return Matrix.LocRotScale(Vector(at), Euler(rot, "XYZ"), Vector(s))


def linspace(a, b, n):
    if n == 1:
        return [(a + b) / 2]
    return [a + (b - a) * i / (n - 1) for i in range(n)]


def lerp(a, b, t):
    return a + (b - a) * t


def smoothstep(e0, e1, x):
    t = max(0.0, min(1.0, (x - e0) / (e1 - e0)))
    return t * t * (3 - 2 * t)


# ------------------------------ 기본 도형 — 모두 (꼭짓점 목록, 면 목록)을 돌려준다. 면은 바깥에서 보아 반시계

BOX_FACES = {
    "bottom": (0, 3, 2, 1), "top": (4, 5, 6, 7), "front": (0, 1, 5, 4),
    "back": (2, 3, 7, 6), "left": (3, 0, 4, 7), "right": (1, 2, 6, 5),
}


def box(sx, sy, sz, skip=(), base=False):
    """가운데 기준 상자. base=True면 밑면이 z=0. front=-y, back=+y, left=-x, right=+x"""
    x, y = sx / 2, sy / 2
    z0, z1 = (0.0, sz) if base else (-sz / 2, sz / 2)
    verts = [(-x, -y, z0), (x, -y, z0), (x, y, z0), (-x, y, z0), (-x, -y, z1), (x, -y, z1), (x, y, z1), (-x, y, z1)]
    return verts, [f for k, f in BOX_FACES.items() if k not in skip]


def tapered_box(bx, by, tx, ty, h, shift=(0.0, 0.0), skip=()):
    """밑면 bx×by(z=0), 윗면 tx×ty(z=h)인 깎인 상자. shift는 윗면 가운데를 옮긴다"""
    verts = [(-bx / 2, -by / 2, 0), (bx / 2, -by / 2, 0), (bx / 2, by / 2, 0), (-bx / 2, by / 2, 0)]
    sx, sy = shift
    verts += [(sx - tx / 2, sy - ty / 2, h), (sx + tx / 2, sy - ty / 2, h), (sx + tx / 2, sy + ty / 2, h), (sx - tx / 2, sy + ty / 2, h)]
    return verts, [f for k, f in BOX_FACES.items() if k not in skip]


def lathe(profile, n, phase=0.0, cap_bottom=False, cap_top=False, flute=0.0, flute_rings=None, twist=0.0, radial=None):
    """z축 회전체. profile=[(r, z), ...] 아래→위(바깥 면이 오른쪽). r=0은 꼭짓점 하나로 모은다.
    flute: 홀수 꼭짓점을 안으로 들이는 비율(세로 홈). twist: z 1m당 도는 각. radial(j, i): 꼭짓점마다 반지름 배율"""
    verts, faces, rings = [], [], []
    for i, (r, z) in enumerate(profile):
        if r <= 1e-6:
            rings.append([len(verts)])
            verts.append((0.0, 0.0, z))
            continue
        fl = flute if (flute_rings is None or i in flute_rings) else 0.0
        ring = []
        for j in range(n):
            a = phase + twist * z + 2 * math.pi * j / n
            rr = r * (1 - fl) if (fl and j % 2) else r
            if radial:
                rr *= radial(j, i)
            ring.append(len(verts))
            verts.append((rr * math.cos(a), rr * math.sin(a), z))
        rings.append(ring)
    for a_ring, b_ring in zip(rings, rings[1:]):
        if len(a_ring) == 1 and len(b_ring) == 1:
            continue
        for j in range(n):
            k = (j + 1) % n
            if len(a_ring) == 1:
                faces.append((a_ring[0], b_ring[k], b_ring[j]))
            elif len(b_ring) == 1:
                faces.append((a_ring[j], a_ring[k], b_ring[0]))
            else:
                faces.append((a_ring[j], a_ring[k], b_ring[k], b_ring[j]))
    if cap_bottom and len(rings[0]) > 1:
        faces.append(tuple(reversed(rings[0])))
    if cap_top and len(rings[-1]) > 1:
        faces.append(tuple(rings[-1]))
    return verts, faces


def _newell(ring):
    n = Vector((0.0, 0.0, 0.0))
    for i in range(len(ring)):
        a, b = Vector(ring[i]), Vector(ring[(i + 1) % len(ring)])
        n.x += (a.y - b.y) * (a.z + b.z)
        n.y += (a.z - b.z) * (a.x + b.x)
        n.z += (a.x - b.x) * (a.y + b.y)
    return n


def _centroid(ring):
    c = Vector((0.0, 0.0, 0.0))
    for p in ring:
        c += Vector(p)
    return c / len(ring)


def loft(rings, cap_start=False, cap_end=False):
    """같은 꼭짓점 수의 고리를 차례로 잇는다. 고리 방향은 스스로 맞춘다(면이 바깥을 본다)"""
    direction = _centroid(rings[-1]) - _centroid(rings[0])
    widest = max(rings, key=lambda r: _newell(r).length)
    if _newell(widest).dot(direction) < 0:
        rings = [list(reversed(r)) for r in rings]
    verts, faces, idx = [], [], []
    for ring in rings:
        idx.append(list(range(len(verts), len(verts) + len(ring))))
        verts.extend(tuple(p) for p in ring)
    n = len(rings[0])
    for a_ring, b_ring in zip(idx, idx[1:]):
        for j in range(n):
            k = (j + 1) % n
            faces.append((a_ring[j], a_ring[k], b_ring[k], b_ring[j]))
    if cap_start:
        faces.append(tuple(reversed(idx[0])))
    if cap_end:
        faces.append(tuple(idx[-1]))
    return verts, faces


def tube(points, radii, n=6, cap_start=False, cap_end=False, phase=0.0, aspect=1.0, up=None):
    """점을 따라 가는 관(굽은 가지·다리·기둥). radii는 수 하나나 점마다의 목록. aspect는 단면 납작함"""
    pts = [Vector(p) for p in points]
    tangents = []
    for i in range(len(pts)):
        if i == 0:
            t = pts[1] - pts[0]
        elif i == len(pts) - 1:
            t = pts[-1] - pts[-2]
        else:
            t = (pts[i + 1] - pts[i]).normalized() + (pts[i] - pts[i - 1]).normalized()
        tangents.append(t.normalized())
    ref = Vector(up) if up else (Vector((0, 0, 1)) if abs(tangents[0].z) < 0.9 else Vector((1, 0, 0)))
    normal = (ref - ref.dot(tangents[0]) * tangents[0]).normalized()
    rings = []
    for i, p in enumerate(pts):
        t = tangents[i]
        normal = (normal - normal.dot(t) * t).normalized()
        binormal = t.cross(normal)
        r = radii[i] if isinstance(radii, (list, tuple)) else radii
        ring = []
        for j in range(n):
            a = phase + 2 * math.pi * j / n
            ring.append(tuple(p + normal * (math.cos(a) * r * aspect) + binormal * (math.sin(a) * r)))
        rings.append(ring)
    return loft(rings, cap_start, cap_end)


def ico(subdiv=2, radius=1.0):
    """얼음공(정이십면체 쪼갬). subdiv 1 = 20면, 2 = 80면"""
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=subdiv, radius=radius)
    bm.verts.index_update()
    verts = [tuple(v.co) for v in bm.verts]
    faces = [tuple(v.index for v in f.verts) for f in bm.faces]
    bm.free()
    return verts, faces


def slab(points2d, depth, center=True):
    """xz 평면 다각형을 y 방향으로 두께 depth만큼 민 판. 앞면이 -y를 본다"""
    n = len(points2d)
    area = sum(points2d[i][0] * points2d[(i + 1) % n][1] - points2d[(i + 1) % n][0] * points2d[i][1] for i in range(n))
    pts = list(points2d) if area > 0 else list(reversed(points2d))
    y0, y1 = (-depth / 2, depth / 2) if center else (0.0, depth)
    verts = [(x, y0, z) for x, z in pts] + [(x, y1, z) for x, z in pts]
    faces = [tuple(range(n)), tuple(n + i for i in reversed(range(n)))]
    for i in range(n):
        k = (i + 1) % n
        faces.append((i, n + i, n + k, k))
    return verts, faces


def grid_sheet(corner, u_vec, v_vec, nu, nv, bulge=None, thickness=0.04):
    """돛처럼 얇은 판. corner에서 u·v 방향으로 nu×nv 칸. bulge(u, v) → 법선 방향 부풂(m). 앞뒤 면과 테두리가 있다"""
    c, u, v = Vector(corner), Vector(u_vec), Vector(v_vec)
    normal = u.cross(v).normalized()
    front, back = [], []
    for j in range(nv + 1):
        for i in range(nu + 1):
            s, t = i / nu, j / nv
            p = c + u * s + v * t + normal * (bulge(s, t) if bulge else 0.0)
            front.append(tuple(p + normal * thickness / 2))
            back.append(tuple(p - normal * thickness / 2))
    verts = front + back
    off = len(front)
    faces = []
    w = nu + 1
    for j in range(nv):
        for i in range(nu):
            a, b, cc, d = j * w + i, j * w + i + 1, (j + 1) * w + i + 1, (j + 1) * w + i
            faces.append((a, b, cc, d))
            faces.append((off + a, off + d, off + cc, off + b))
    # 테두리: 아래 줄 → 오른쪽 → 위 줄 → 왼쪽(반시계)
    loop = [i for i in range(w)] + [j * w + nu for j in range(1, nv + 1)] + [nv * w + i for i in range(nu - 1, -1, -1)] + [j * w for j in range(nv - 1, 0, -1)]
    for a, b in zip(loop, loop[1:] + loop[:1]):
        faces.append((b, a, off + a, off + b))
    return verts, faces


# ------------------------------ 모양 다듬기

def xform(geo, m):
    verts, faces = geo
    return [tuple(m @ Vector(v)) for v in verts], faces


def jitter(geo, amount, rng, axes=(1.0, 1.0, 1.0), keep_floor=False):
    """같은 꼭짓점은 한 번만 흔든다(도형 안 꼭짓점을 나눠 쓰므로 면이 벌어지지 않는다)"""
    verts, faces = geo
    out = []
    for v in verts:
        d = [rng.uniform(-1, 1) * amount * a for a in axes]
        nv = (v[0] + d[0], v[1] + d[1], v[2] + d[2])
        if keep_floor and v[2] <= 1e-5:
            nv = (nv[0], nv[1], v[2])
        out.append(nv)
    return out, faces


def chisel(geo, planes):
    """평면 너머 꼭짓점을 평면으로 눌러 깎은 면을 만든다. planes=[(법선, 거리)]"""
    verts, faces = geo
    out = []
    for v in verts:
        p = Vector(v)
        for n, d in planes:
            n = Vector(n).normalized()
            over = p.dot(n) - d
            if over > 0:
                p = p - n * over
        out.append(tuple(p))
    return out, faces


# ------------------------------ 조립기

class Builder:
    def __init__(self):
        self.bm = bmesh.new()
        self.mats = []
        self.slots = {}

    def slot(self, name):
        if name not in self.slots:
            self.slots[name] = len(self.mats)
            self.mats.append(name)
        return self.slots[name]

    def add(self, geo, mat, m=None, pick=None):
        """geo를 행렬 m으로 옮겨 쌓는다. pick(가운데, 법선, 면 번호) → 재질 이름(면마다 고를 때)"""
        verts, faces = geo
        mm = m if m is not None else Matrix.Identity(4)
        flip = mm.to_3x3().determinant() < 0
        bverts = [self.bm.verts.new(mm @ Vector(v)) for v in verts]
        for k, f in enumerate(faces):
            loop = [bverts[i] for i in f]
            if flip:
                loop.reverse()
            try:
                face = self.bm.faces.new(loop)
            except ValueError:
                continue
            name = mat
            if pick:
                face.normal_update()
                name = pick(face.calc_center_median(), face.normal, k)
            face.material_index = self.slot(name)
            face.smooth = False
        return bverts

    def finish(self, name, origin="center"):
        """메시 물체를 만든다. origin: center=바닥 가운데(바운딩 박스), base=원점 그대로 두고 바닥만 z=0"""
        loose = [v for v in self.bm.verts if not v.link_faces]
        if loose:
            bmesh.ops.delete(self.bm, geom=loose, context="VERTS")
        mesh = bpy.data.meshes.new(name)
        self.bm.to_mesh(mesh)
        self.bm.free()
        for mname in self.mats:
            mesh.materials.append(material(mname))
        xs = [v.co.x for v in mesh.vertices]
        ys = [v.co.y for v in mesh.vertices]
        zs = [v.co.z for v in mesh.vertices]
        if origin == "center":
            offset = Vector((-(min(xs) + max(xs)) / 2, -(min(ys) + max(ys)) / 2, -min(zs)))
        else:
            offset = Vector((0, 0, -min(zs)))
        mesh.transform(Matrix.Translation(offset))
        mesh.shade_flat()
        mesh.update()
        obj = bpy.data.objects.new(name, mesh)
        bpy.context.scene.collection.objects.link(obj)
        return obj


# ------------------------------ 장면·내보내기·줄이기

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def bounds(objs):
    lo = Vector((1e9, 1e9, 1e9))
    hi = Vector((-1e9, -1e9, -1e9))
    for o in objs:
        for c in o.bound_box:
            w = o.matrix_world @ Vector(c)
            lo = Vector((min(lo.x, w.x), min(lo.y, w.y), min(lo.z, w.z)))
            hi = Vector((max(hi.x, w.x), max(hi.y, w.y), max(hi.z, w.z)))
    return lo, hi


def gltf_size(obj):
    """glTF 축(x, 위, 앞뒤) 크기(m). 블렌더 z가 glTF y, 블렌더 -y가 glTF z다"""
    lo, hi = bounds([obj])
    d = hi - lo
    return [round(d.x, 2), round(d.z, 2), round(d.y, 2)]


def export_glb(obj, path):
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.export_scene.gltf(
        filepath=path, export_format="GLB", use_selection=True, export_yup=True, export_apply=True,
        export_normals=True, export_texcoords=False, export_tangents=False, export_vertex_color="NONE",
        export_materials="EXPORT", export_animations=False, export_skins=False, export_morph=False,
        export_cameras=False, export_lights=False, export_extras=False,
        export_draco_mesh_compression_enable=False,
    )


def read_glb(path):
    with open(path, "rb") as f:
        raw = f.read()
    magic, version, total = struct.unpack_from("<4sII", raw, 0)
    if magic != b"glTF" or version != 2 or total != len(raw):
        raise ValueError(f"glb 머리가 이상하다: {path}")
    offset, doc, binbuf = 12, None, b""
    while offset < total:
        length, kind = struct.unpack_from("<I4s", raw, offset)
        chunk = raw[offset + 8:offset + 8 + length]
        if kind == b"JSON":
            doc = json.loads(chunk.decode("utf-8"))
        elif kind == b"BIN\x00":
            binbuf = chunk
        offset += 8 + length
    return doc, binbuf


def write_glb(path, doc, binbuf):
    js = json.dumps(doc, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    js += b" " * ((4 - len(js) % 4) % 4)
    bb = bytes(binbuf) + b"\x00" * ((4 - len(binbuf) % 4) % 4)
    total = 12 + 8 + len(js) + 8 + len(bb)
    with open(path, "wb") as f:
        f.write(struct.pack("<4sII", b"glTF", 2, total))
        f.write(struct.pack("<I4s", len(js), b"JSON"))
        f.write(js)
        f.write(struct.pack("<I4s", len(bb), b"BIN\x00"))
        f.write(bb)
    return total


_COMP = {5120: ("<i1", 1), 5121: ("<u1", 1), 5122: ("<i2", 2), 5123: ("<u2", 2), 5125: ("<u4", 4), 5126: ("<f4", 4)}
_NCOMP = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4}


def read_accessor(doc, binbuf, index):
    import numpy as np
    acc = doc["accessors"][index]
    view = doc["bufferViews"][acc["bufferView"]]
    dtype, size = _COMP[acc["componentType"]]
    comps = _NCOMP[acc["type"]]
    stride = view.get("byteStride", size * comps)
    start = view.get("byteOffset", 0) + acc.get("byteOffset", 0)
    arr = np.ndarray(shape=(acc["count"], comps), dtype=np.dtype(dtype), buffer=binbuf, offset=start, strides=(stride, size))
    return np.array(arr)


def quantize(src, dst):
    """좌표 16비트·법선 8비트 정수로 줄여 dst에 쓴다. (파일 크기, 삼각형 수)를 돌려준다"""
    import numpy as np
    doc, binbuf = read_glb(src)
    out = bytearray()
    views, accessors = [], []

    def push(blob, target, stride=None):
        while len(out) % 4:
            out.append(0)
        view = {"buffer": 0, "byteOffset": len(out), "byteLength": len(blob), "target": target}
        if stride:
            view["byteStride"] = stride
        out.extend(blob)
        views.append(view)
        return len(views) - 1

    peak = 0.0
    for mesh in doc["meshes"]:
        for prim in mesh["primitives"]:
            peak = max(peak, float(np.abs(read_accessor(doc, binbuf, prim["attributes"]["POSITION"])).max()))
    step = peak / 32000.0
    triangles = 0
    for mesh in doc["meshes"]:
        for prim in mesh["primitives"]:
            attrs = prim["attributes"]
            pos = read_accessor(doc, binbuf, attrs["POSITION"]).astype(np.float64)
            nor = read_accessor(doc, binbuf, attrs["NORMAL"]).astype(np.float64)
            q = np.round(pos / step).astype(np.int16)
            packed = np.zeros((len(q), 4), dtype="<i2")
            packed[:, :3] = q
            accessors.append({"bufferView": push(packed.tobytes(), 34962, 8), "componentType": 5122, "count": int(len(q)),
                              "type": "VEC3", "min": q.min(axis=0).tolist(), "max": q.max(axis=0).tolist()})
            pos_index = len(accessors) - 1
            unit = nor / np.maximum(np.linalg.norm(nor, axis=1, keepdims=True), 1e-12)
            nq = np.round(unit * 127).astype(np.int8)
            npk = np.zeros((len(nq), 4), dtype="i1")
            npk[:, :3] = nq
            accessors.append({"bufferView": push(npk.tobytes(), 34962, 4), "componentType": 5120, "normalized": True,
                              "count": int(len(nq)), "type": "VEC3"})
            nor_index = len(accessors) - 1
            idx = read_accessor(doc, binbuf, prim["indices"]).reshape(-1)
            if int(idx.max()) < 65536:
                ib, kind = idx.astype("<u2"), 5123
            else:
                ib, kind = idx.astype("<u4"), 5125
            accessors.append({"bufferView": push(ib.tobytes(), 34963), "componentType": kind, "count": int(len(ib)), "type": "SCALAR"})
            prim["indices"] = len(accessors) - 1
            prim["attributes"] = {"POSITION": pos_index, "NORMAL": nor_index}
            triangles += len(ib) // 3
    for node in doc.get("nodes", []):
        if "mesh" not in node:
            continue
        if node.get("children"):
            raise RuntimeError("모형 조각 노드에 자식이 있으면 눈금을 걸 수 없다")
        s = node.get("scale", [1, 1, 1])
        node["scale"] = [s[0] * step, s[1] * step, s[2] * step]
    doc["accessors"] = accessors
    doc["bufferViews"] = views
    doc["buffers"] = [{"byteLength": len(out)}]
    for key in ("extensionsUsed", "extensionsRequired"):
        names = doc.get(key, [])
        if "KHR_mesh_quantization" not in names:
            names.append("KHR_mesh_quantization")
        doc[key] = names
    return write_glb(dst, doc, out), triangles


# ------------------------------ 미리보기

def _look_at(obj, target):
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def _human(builder_cls, at):
    """1.75m 기준 인형 — 크기 감을 보려고 미리보기에만 세운다"""
    b = builder_cls()
    x, y = at
    for side in (-1, 1):
        b.add(box(0.13, 0.15, 0.86, base=True), "_ref", T((x + side * 0.09, y, 0)))
        b.add(box(0.09, 0.1, 0.6, base=True), "_ref", T((x + side * 0.25, y, 0.82)))
    b.add(box(0.4, 0.22, 0.6, base=True), "_ref", T((x, y, 0.84)))
    b.add(ico(2, 0.12), "_ref", T((x, y, 1.62)))
    b.add(box(0.1, 0.1, 0.1, base=True), "_ref", T((x, y, 1.42)))
    return b


def render_preview(glb_path, png_path, azimuth=35.0, elevation=20.0, width=800, height=600, human=True):
    reset()
    PALETTE["_ref"] = ("#6f8fb8", 0.7)
    PALETTE["_ground"] = ("#2b2d33", 1.0)
    bpy.ops.import_scene.gltf(filepath=glb_path)
    scene = bpy.context.scene
    objs = [o for o in scene.objects if o.type == "MESH"]
    lo, hi = bounds(objs)
    extra = []
    if human:
        span = hi - lo
        hb = _human(Builder, (lo.x - 0.75, lo.y + min(span.y * 0.3, 2.0)))
        mesh = bpy.data.meshes.new("_human")
        hb.bm.to_mesh(mesh)
        hb.bm.free()
        mesh.materials.append(material("_ref"))
        mesh.shade_flat()
        hobj = bpy.data.objects.new("_human", mesh)
        hobj.visible_shadow = False
        scene.collection.objects.link(hobj)
        extra.append(hobj)
    flo, fhi = bounds(objs + extra)
    center = (flo + fhi) / 2
    radius = (fhi - flo).length / 2
    # 바닥 판
    gb = Builder()
    gb.add(box(radius * 8, radius * 8, 0.02, base=True), "_ground", T((center.x, center.y, -0.021)))
    gmesh = bpy.data.meshes.new("_ground")
    gb.bm.to_mesh(gmesh)
    gb.bm.free()
    gmesh.materials.append(material("_ground"))
    gobj = bpy.data.objects.new("_ground", gmesh)
    scene.collection.objects.link(gobj)
    # 빛: 왼쪽 앞 위의 해 + 오른쪽 뒤의 약한 테두리 빛, 어두운 하늘
    world = bpy.data.worlds.new("_world")
    scene.world = world
    if world.node_tree is None:
        world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    bg.inputs[0].default_value = (0.018, 0.02, 0.026, 1)
    bg.inputs[1].default_value = 1.0
    for name, direction, energy, angle in (("_sun", (-0.55, -0.75, 0.9), 4.2, 2.0), ("_rim", (0.8, 0.9, 0.5), 1.1, 6.0)):
        light = bpy.data.lights.new(name, "SUN")
        light.energy = energy
        light.angle = math.radians(angle)
        lobj = bpy.data.objects.new(name, light)
        scene.collection.objects.link(lobj)
        lobj.location = center + Vector(direction) * radius * 4
        _look_at(lobj, center)
    fill = bpy.data.lights.new("_fill", "SUN")
    fill.energy = 0.6
    fill.use_shadow = False
    fobj = bpy.data.objects.new("_fill", fill)
    scene.collection.objects.link(fobj)
    fobj.location = center + Vector((0.6, -0.8, 0.2)) * radius * 4
    _look_at(fobj, center)
    # 사진기: 오른쪽 앞 3/4, 바운딩 박스가 화면에 들어오게 거리를 맞춘다
    cam_data = bpy.data.cameras.new("_cam")
    cam_data.lens = 50
    cam = bpy.data.objects.new("_cam", cam_data)
    scene.collection.objects.link(cam)
    scene.camera = cam
    scene.render.resolution_x = width
    scene.render.resolution_y = height
    scene.render.resolution_percentage = 100
    az, el = math.radians(azimuth), math.radians(elevation)
    direction = Vector((math.sin(az) * math.cos(el), -math.cos(az) * math.cos(el), math.sin(el)))
    from bpy_extras.object_utils import world_to_camera_view
    corners = [Vector((x, y, z)) for x in (flo.x, fhi.x) for y in (flo.y, fhi.y) for z in (flo.z, fhi.z)]
    near, far = radius * 0.5, radius * 20
    for _ in range(40):
        mid = (near + far) / 2
        cam.location = center + direction * mid
        _look_at(cam, center)
        bpy.context.view_layer.update()
        inside = all(0.04 <= p.x <= 0.96 and 0.05 <= p.y <= 0.95 and p.z > 0 for p in (world_to_camera_view(scene, cam, c) for c in corners))
        if inside:
            far = mid
        else:
            near = mid
    cam.location = center + direction * far
    _look_at(cam, center)
    cam_data.clip_start = max(0.01, far * 0.01)
    cam_data.clip_end = far * 10
    scene.render.engine = "BLENDER_EEVEE"
    try:
        scene.eevee.taa_render_samples = 32
        scene.eevee.use_shadows = True
    except AttributeError:
        pass
    for vt in ("AgX", "Standard"):
        try:
            scene.view_settings.view_transform = vt
            break
        except TypeError:
            continue
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGB"
    scene.render.filepath = png_path
    bpy.ops.render.render(write_still=True)
    return png_path
