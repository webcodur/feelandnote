/*
  파일명: components/features/game/myth/troy/scene/picking.ts
  기능: 화면 한 점 → 칸 찾기
  책임: 카메라 광선을 말(몸통 원기둥과 머리 위 얼굴 메달)과 칸 기둥 상자에 견줘 가장 가까이 맞은 칸을 돌려준다.
        말 몸통이나 얼굴 메달을 누르면 그 말이 선 칸이 잡히고, 말 뒤 칸도 몸통 옆을 누르면 잡힌다. 절벽 옆면을 누르면 앞 칸이 잡힌다.
        몸통은 네모 상자 대신 원기둥으로 본다 — 비스듬히 보면 네모 상자는 폭이 1.4배로 넓어져 뒤 칸을 가로챈다.
*/ // ------------------------------
import { Box3, Ray, Raycaster, Sphere, Vector2, Vector3, type PerspectiveCamera } from "three";
import type { BattleMap, Point } from "../engine/types";
import { FLOOR_Y, surfaceY, worldX, worldZ } from "./grid";
import { MEDAL_SIZE, MEDAL_DROP, type Piece } from "./piece";

// 몸통 원기둥 반지름(말 모델 몸통 폭에 맞춘 값)
const BODY_R = 0.2;
// 메달이 없는 병사는 체력 막대까지 몸통으로 친다
const BAR_TOP = 0.12;
const raycaster = new Raycaster();
const ndc = new Vector2();
const box = new Box3();
const hit = new Vector3();
const up = new Vector3();
const medal = new Sphere();

export function rayAt(camera: PerspectiveCamera, x: number, y: number, w: number, h: number): Ray {
  ndc.set((x / Math.max(1, w)) * 2 - 1, -(y / Math.max(1, h)) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  return raycaster.ray;
}

// 세운 원기둥(가운데 cx·cz, 높이 y0~y1)에 광선이 처음 닿는 거리. 안 닿으면 null
function cylinderHit(ray: Ray, cx: number, cz: number, y0: number, y1: number, r: number): number | null {
  const { origin: o, direction: d } = ray;
  const ox = o.x - cx;
  const oz = o.z - cz;
  const a = d.x * d.x + d.z * d.z;
  const b = 2 * (ox * d.x + oz * d.z);
  const c = ox * ox + oz * oz - r * r;
  const disc = b * b - 4 * a * c;
  if (a > 1e-9 && disc >= 0) {
    const t = (-b - Math.sqrt(disc)) / (2 * a);
    const y = o.y + t * d.y;
    if (t >= 0 && y >= y0 && y <= y1) return t;
  }
  // 위에서 내려다보면 윗면으로 들어온다
  if (Math.abs(d.y) < 1e-9) return null;
  const t = (y1 - o.y) / d.y;
  const px = ox + t * d.x;
  const pz = oz + t * d.z;
  return t >= 0 && px * px + pz * pz <= r * r ? t : null;
}

export function pickTile(map: BattleMap, ray: Ray, pieces: Piece[], camera: PerspectiveCamera): Point | null {
  let best: Point | null = null;
  let bestD = Infinity;
  const consider = (p: Point, d: number) => {
    if (d >= bestD) return;
    bestD = d;
    best = p;
  };
  up.set(0, 1, 0).applyQuaternion(camera.quaternion);
  pieces.forEach((piece) => {
    if (!piece.root.visible || piece.unit.hidden) return;
    const at = piece.root.position;
    const top = at.y + (piece.medal ? piece.medal.position.y : piece.height + BAR_TOP);
    const t = cylinderHit(ray, at.x, at.z, at.y, top, BODY_R);
    const p = { x: piece.unit.x, y: piece.unit.y };
    if (t !== null) consider(p, t);
    if (!piece.medal) return;
    // 메달은 화면을 바라보는 그림이라 카메라 위쪽으로 떠 있다(기준점 아래로 MEDAL_DROP만큼 내려 둠)
    piece.medal.getWorldPosition(medal.center).addScaledVector(up, MEDAL_SIZE * (MEDAL_DROP + 0.5));
    medal.radius = MEDAL_SIZE / 2;
    if (ray.intersectSphere(medal, hit)) consider(p, hit.distanceTo(ray.origin));
  });
  map.tiles.forEach((tile, i) => {
    const x = i % map.width;
    const y = Math.floor(i / map.width);
    const cx = worldX(map, x);
    const cz = worldZ(map, y);
    box.min.set(cx - 0.5, FLOOR_Y, cz - 0.5);
    box.max.set(cx + 0.5, surfaceY(tile), cz + 0.5);
    if (ray.intersectBox(box, hit)) consider({ x, y }, hit.distanceTo(ray.origin));
  });
  return best;
}
