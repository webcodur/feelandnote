/*
  파일명: components/features/game/myth/troy/scene/models.ts
  기능: 모델 읽기와 틀 만들기
  책임: /models/myth-troy/<key>.glb를 키마다 한 번만 받아 두고(없거나 깨졌으면 대신 그리는 도형으로), 재질이 같은 메시를 합친
        틀(ModelTemplate)로 바꾼다. 틀은 말·소품이 복제해 쓰는 읽기 전용 자원이라 뷰가 사라져도 페이지가 살아 있는 동안 남긴다.
*/ // ------------------------------
import { Box3, BufferGeometry, Vector3, type Material, type Mesh, type Object3D } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { ModelKey } from "../engine/types";
import { fallbackProp } from "./fallbackBuildings";
import { fallbackUnit } from "./fallbackUnits";
import { baseName } from "./materials";
import { PROP_KEYS, type ModelName, type PropKey } from "./types";

export interface ModelPart {
  geometry: BufferGeometry;
  material: Material;
}

export interface ModelTemplate {
  key: ModelName;
  parts: ModelPart[];
  // 발밑에서 가장 높은 곳까지(메달·체력 막대 자리)
  height: number;
  // 방출 재질 FLAME의 가운데(밤 불빛 자리)
  flames: Vector3[];
  fromFile: boolean;
}

const MODEL_DIR = "/models/myth-troy/";
const cache = new Map<ModelName, Promise<ModelTemplate>>();
const done = new Map<ModelName, ModelTemplate>();
let loader: GLTFLoader | null = null;

const isPropKey = (key: ModelName): key is PropKey => (PROP_KEYS as readonly string[]).includes(key);
const fallback = (key: ModelName): Object3D => (isPropKey(key) ? fallbackProp(key) : fallbackUnit(key as ModelKey));

// 위치·법선만 남긴 사본(텍스처 없이 재질 색만 쓰는 규격이라 uv·색은 버린다)
function bakedCopy(mesh: Mesh): BufferGeometry {
  const src = mesh.geometry;
  const geo = new BufferGeometry();
  geo.setAttribute("position", src.getAttribute("position").clone());
  const normal = src.getAttribute("normal");
  if (normal) geo.setAttribute("normal", normal.clone());
  if (src.index) geo.setIndex(src.index.clone());
  geo.applyMatrix4(mesh.matrixWorld);
  const flat = geo.index ? geo.toNonIndexed() : geo;
  if (!normal) flat.computeVertexNormals();
  return flat;
}

function toTemplate(key: ModelName, root: Object3D, fromFile: boolean): ModelTemplate {
  root.updateMatrixWorld(true);
  const groups = new Map<Material, BufferGeometry[]>();
  root.traverse((obj) => {
    const mesh = obj as Mesh;
    if (!mesh.isMesh) return;
    const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    groups.set(material, [...(groups.get(material) ?? []), bakedCopy(mesh)]);
  });
  const parts = [...groups].map(([material, list]) => ({ material, geometry: mergeGeometries(list) ?? list[0] }));
  const box = new Box3().setFromObject(root);
  const flames = parts
    .filter((part) => baseName(part.material) === "FLAME")
    .map((part) => {
      part.geometry.computeBoundingBox();
      return part.geometry.boundingBox?.getCenter(new Vector3()) ?? new Vector3();
    });
  const template = { key, parts, height: Math.max(0.3, headHeight(parts) ?? box.max.y), flames, fromFile };
  done.set(key, template);
  return template;
}

// 가운데 축 가까이(머리·투구·깃)에서 가장 높은 곳. 옆에 세워 든 창끝은 메달 자리를 밀어 올리지 않게 뺀다
function headHeight(parts: ModelPart[]): number | null {
  let top = -1;
  parts.forEach(({ geometry }) => {
    const pos = geometry.getAttribute("position");
    for (let i = 0; i < pos.count; i += 1) {
      if (Math.hypot(pos.getX(i), pos.getZ(i)) < 0.15) top = Math.max(top, pos.getY(i));
    }
  });
  return top > 0 ? top : null;
}

export function loadModel(key: ModelName): Promise<ModelTemplate> {
  const hit = cache.get(key);
  if (hit) return hit;
  loader ??= new GLTFLoader();
  const job = loader
    .loadAsync(`${MODEL_DIR}${key}.glb`)
    .then((gltf) => toTemplate(key, gltf.scene, true))
    .catch(() => toTemplate(key, fallback(key), false));
  cache.set(key, job);
  return job;
}

export async function loadModels(keys: ModelName[]): Promise<Map<ModelName, ModelTemplate>> {
  const unique = [...new Set(keys)];
  const list = await Promise.all(unique.map((key) => loadModel(key)));
  return new Map(list.map((t) => [t.key, t]));
}

// 읽힌 틀 가운데 파일에서 온 것과 대신 그린 것의 수
export function modelCounts(): { file: number; fallback: number } {
  const all = [...done.values()];
  return { file: all.filter((t) => t.fromFile).length, fallback: all.filter((t) => !t.fromFile).length };
}
