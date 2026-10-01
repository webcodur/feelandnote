# 트로이 전쟁 모델 전부 다시 굽기: 모델 → GLB → 미리 보기(512·128) → report.txt → 모아 보기 → 편 색 두 벌·디오라마
# 쓰는 법(저장소 뿌리에서):
#   Blender -b --factory-startup -P sw/web/scripts/myth-troy-models/build_all.py -- [키 …] [--no-preview] [--no-review] [--review]
#   node sw/web/scripts/myth-troy-models/check_glb.mjs   # 뒤이어 three.js 로더로 읽어 보고 report.txt 끝에 붙인다
# 키를 주면 그 모델만 다시 굽는다(보고서·모아 보기는 있는 GLB·미리 보기 전부로 다시 쓴다).
# 편 색 두 벌·디오라마(review.py)는 키 없이 전부 구울 때, 또는 --review를 줄 때만 만든다.
import importlib
import math
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bpy  # noqa: E402
from mathutils import Vector  # noqa: E402

import lib  # noqa: E402

MODULES = ["units", "nature", "camp", "city", "trojan_horse", "figures_a", "figures_b", "figures_c", "figures_d"]

# 인물 고유 말 27종(키 = DB 인물 slug). 없으면 3D 판이 병과 말로 대신 선다
FIGURES = [
    "achilles", "patroclus", "ajax-the-great", "teucer", "odysseus", "diomedes", "menelaus", "agamemnon",
    "idomeneus", "meriones", "machaon", "calchas", "nestor", "antilochus", "ajax-the-lesser",
    "hector", "paris", "aeneas", "sarpedon-of-lycia", "glaucus", "deiphobus",
    "pandarus", "polydamas", "helenus", "dolon", "penthesilea", "memnon",
]

# 명세 순서(보고서·모아 보기 순서)
ORDER = [
    "hoplite", "hero", "king", "archer", "skirmisher", "chariot", "rider", "seer", "healer",
    "godWarrior", "godArcher", "godRobed", "godTrident", "riverGod",
    "treeOlive", "treeCypress", "rockA", "rockB", "bush", "reeds", "ship", "hut", "tent", "palisade",
    "trenchStakes", "crenel", "tower", "gateClosed", "gateOpen", "house", "houseB", "column", "columnBroken",
    "temple", "altar", "brazier", "statue", "horse", "horseClosed", "spring", "tumulus", "shieldPile", "spearRack",
] + FIGURES

BUDGET = {"unit": 2500, "prop": 3000, "horse": 8000, "ship": 5000, "nestor": 3600, "penthesilea": 3600}


def registry():
    reg = {}
    for name in MODULES:
        try:
            mod = importlib.import_module(name)
        except ModuleNotFoundError as e:
            if e.name != name:
                raise
            continue
        except Exception as e:  # noqa: BLE001 — 다른 사람이 고치는 중인 모듈 하나가 전체 굽기를 막지 않게
            print("[건너뜀] %s 모듈을 읽지 못함: %s" % (name, e), flush=True)
            continue
        reg.update(mod.MODELS)
    return reg


def budget_of(key, info):
    return BUDGET.get(key, BUDGET[info["kind"]])


def frame_camera(ob, el=50.0, az=45.0, margin=1.18):
    """모델 상자를 카메라 평면에 비춰 필요한 넓이를 구한다. 칸당 픽셀이 늘 같도록 2.4의 반 단위로 올린다."""
    lo, hi = lib.bounds(ob)
    a, e = math.radians(az), math.radians(el)
    d = Vector((math.sin(a) * math.cos(e), -math.cos(a) * math.cos(e), math.sin(e)))
    f = -d
    r = f.cross(Vector((0, 0, 1))).normalized()
    u = r.cross(f).normalized()
    corners = [Vector((x, y, z)) for x in (lo.x, hi.x) for y in (lo.y, hi.y) for z in (lo.z, hi.z)]
    center = (lo + hi) / 2
    xs = [(c - center).dot(r) for c in corners]
    ys = [(c - center).dot(u) for c in corners]
    need = max(max(xs) - min(xs), max(ys) - min(ys)) * margin
    k = max(1.0, math.ceil(need / 2.4 * 2) / 2)
    return center, 2.4 * k, int(round(512 * k))


def preview(key, ob, info):
    sc = bpy.context.scene
    lib.setup_render(sc)
    lib.setup_world(sc)
    lib.add_sun(sc)
    nx, ny = info.get("foot", (1, 1))
    lib.ground_tiles(sc, nx, ny, info.get("ground", "#8f9d52"))
    if info["kind"] == "unit":
        ob.location.z = lib.team_base(sc, lib.TEAM_BLUE)
    center, scale, res = frame_camera(ob)
    cam = lib.add_camera(sc, center, ortho_scale=scale)
    big = os.path.join(lib.PREVIEW_DIR, key + ".png")
    small = os.path.join(lib.PREVIEW_DIR, key + "_128.png")
    lib.render(sc, big, res, res)
    lib.downscale(big, small, 4)
    if info["kind"] == "unit":
        # 판을 90°씩 돌리면 네 비스듬한 방향에서 보인다 — 넷을 한 장에(검수용)
        views = []
        for i, az in enumerate((45.0, -45.0, 135.0, -135.0)):
            bpy.data.objects.remove(cam)
            cam = lib.add_camera(sc, center, ortho_scale=scale * 0.62, az=az)
            p = os.path.join(lib.PREVIEW_DIR, "%s_v%d.png" % (key, i))
            lib.render(sc, p, 256, 256, 24)
            views.append(p)
        lib.contact_sheet(views, 2, os.path.join(lib.PREVIEW_DIR, key + "_4views.png"), pad=2)
        for p in views:
            os.remove(p)
    return big, small


def build_one(key, info, do_preview=True):
    lib.reset_scene()
    t0 = time.time()
    m = info["build"]()
    ob = m.finish()
    path = os.path.join(lib.OUT_DIR, key + ".glb")
    lib.export_glb(ob, path)
    lo, hi = lib.bounds(ob)
    tris = lib.tri_count(ob)
    size = hi - lo
    msg = "%-13s 삼각형 %5d  크기 %.2f×%.2f×%.2f" % (key, tris, size.x, size.y, size.z)
    if "--tally" in sys.argv:
        print("  " + ", ".join("%s %d" % kv for kv in sorted(m.tally.items(), key=lambda kv: -kv[1])))
    if do_preview:
        preview(key, ob, info)
    print("[모델] %s  %.1fs" % (msg, time.time() - t0), flush=True)
    return {"key": key, "dims": (size.x, size.y, size.z), "lo": tuple(lo), "hi": tuple(hi)}


def write_report(reg, dims):
    lines = ["트로이 전쟁 모델 보고 — sw/web/public/models/myth-troy/*.glb", ""]
    lines.append("%-13s %6s %6s %7s  %-18s %s" % ("키", "삼각형", "예산", "KB", "크기(x×y×z)", "재질"))
    total = 0
    bad = []
    for key in ORDER:
        path = os.path.join(lib.OUT_DIR, key + ".glb")
        if not os.path.exists(path):
            lines.append("%-13s  (없음)" % key)
            bad.append(key + ": 파일 없음")
            continue
        info = lib.glb_info(path)
        kind = reg[key] if key in reg else {"kind": "prop"}
        budget = budget_of(key, kind)
        total += info["bytes"]
        d = dims.get(key)
        dim = "%.2f×%.2f×%.2f" % d if d else "-"
        wrong = [n for n in info["materials"] if n not in lib.MATERIALS]
        flag = ""
        if info["tris"] > budget:
            flag += " 예산초과"
            bad.append("%s: 삼각형 %d > %d" % (key, info["tris"], budget))
        if info["bytes"] > 200 * 1024:
            flag += " 200KB초과"
        if wrong:
            flag += " 재질이름오류" + str(wrong)
            bad.append("%s: 재질 %s" % (key, wrong))
        if info["animations"] or info["cameras"]:
            bad.append("%s: 애니메이션·카메라가 들어 있음" % key)
        lines.append("%-13s %6d %6d %7.1f  %-18s %s%s" % (key, info["tris"], budget, info["bytes"] / 1024, dim,
                                                       ",".join(info["materials"]), flag))
    lines.append("")
    lines.append("합계 %.1f KB, 모델 %d개" % (total / 1024, sum(1 for k in ORDER if os.path.exists(os.path.join(lib.OUT_DIR, k + ".glb")))))
    lines.append("문제: " + ("없음" if not bad else "; ".join(bad)))
    with open(os.path.join(lib.TMP_DIR, "report.txt"), "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    print("\n".join(lines))


def load_dims():
    path = os.path.join(lib.TMP_DIR, "dims.txt")
    out = {}
    if os.path.exists(path):
        for line in open(path, encoding="utf-8"):
            k, x, y, z = line.split()
            out[k] = (float(x), float(y), float(z))
    return out


def save_dims(dims):
    with open(os.path.join(lib.TMP_DIR, "dims.txt"), "w", encoding="utf-8") as f:
        for k, (x, y, z) in dims.items():
            f.write("%s %.4f %.4f %.4f\n" % (k, x, y, z))


UNITS = ORDER[:14] + FIGURES
CITY = ORDER[ORDER.index("crenel"):ORDER.index("spring") + 1]  # 성과 도시·목마


def sheets():
    """모아 보기: 128px 판 전부(게임 크기) 한 장 + 512px 판 반 크기를 장수 말 / 진영·자연 / 성·도시·목마 석 장으로.
    모두 제 크기를 지켜 선반처럼 붙이고, 가로·세로 1400px 안으로 맞춘다."""
    keys = [k for k in ORDER if os.path.exists(os.path.join(lib.PREVIEW_DIR, k + "_128.png"))]
    if not keys:
        return
    size = lib.shelf_sheet([os.path.join(lib.PREVIEW_DIR, k + "_128.png") for k in keys], os.path.join(lib.TMP_DIR, "sheet_128.png"))
    print("[모아 보기] sheet_128.png %d×%d" % size)
    half = {}
    for k in keys:
        dst = os.path.join(lib.PREVIEW_DIR, k + "_half.png")
        lib.downscale(os.path.join(lib.PREVIEW_DIR, k + ".png"), dst, 2)
        half[k] = dst
    groups = (("sheet_units.png", [k for k in keys if k in UNITS]),
              ("sheet_props.png", [k for k in keys if k not in UNITS and k not in CITY]),
              ("sheet_city.png", [k for k in keys if k in CITY]))
    for name, ks in groups:
        if ks:
            size = lib.shelf_sheet([half[k] for k in ks], os.path.join(lib.TMP_DIR, name))
            print("[모아 보기] %s %d×%d" % ((name,) + size))


def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    flags = {a for a in argv if a.startswith("--")}
    keys = [a for a in argv if not a.startswith("--")]
    reg = registry()
    todo = keys or [k for k in ORDER if k in reg]
    missing = [k for k in todo if k not in reg]
    if missing:
        raise SystemExit("모르는 키: %s" % missing)
    os.makedirs(lib.PREVIEW_DIR, exist_ok=True)
    dims = load_dims()
    for key in todo:
        r = build_one(key, reg[key], "--no-preview" not in flags)
        dims[key] = r["dims"]
    save_dims(dims)
    lib.reset_scene()
    write_report(reg, dims)
    if "--no-preview" not in flags:
        sheets()
    # 편 색 두 벌·디오라마는 전부 구울 때(또는 --review를 줄 때) 마지막에 GLB를 다시 읽어 만든다
    if ("--no-review" not in flags and not keys) or "--review" in flags:
        import review
        review.run_all()


main()
