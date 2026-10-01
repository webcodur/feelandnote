/*
  파일명: components/features/game/myth/troy/scene/shapes.ts
  기능: 대신 그리는 도형의 부품 조립
  책임: GLB가 아직 없을 때 쓸 간단한 도형(상자·원기둥·원뿔·공·고리…)을 부품 표 한 줄씩 받아 한 덩이로 조립한다.
        기본 도형은 크기 1짜리를 한 번만 만들어 나눠 쓰고, 부품마다 자리·회전·크기만 다르게 준다.
*/ // ------------------------------
import {
  BoxGeometry, ConeGeometry, CylinderGeometry, DodecahedronGeometry, Group, IcosahedronGeometry, Mesh,
  SphereGeometry, TorusGeometry, type BufferGeometry,
} from "three";
import { namedMaterial, type MaterialName } from "./materials";

export type ShapeKind =
  | "box" | "cyl" | "taper" | "cone" | "sphere" | "hemi" | "torus" | "arc" | "ico" | "dodeca" | "disc" | "prism" | "pyramid";

const MAKERS: Record<ShapeKind, () => BufferGeometry> = {
  box: () => new BoxGeometry(1, 1, 1),
  cyl: () => new CylinderGeometry(0.5, 0.5, 1, 18),
  taper: () => new CylinderGeometry(0.34, 0.5, 1, 18),
  cone: () => new ConeGeometry(0.5, 1, 18),
  sphere: () => new SphereGeometry(0.5, 18, 12),
  hemi: () => new SphereGeometry(0.5, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2),
  torus: () => new TorusGeometry(0.5, 0.09, 8, 28),
  arc: () => new TorusGeometry(0.5, 0.06, 6, 16, Math.PI),
  ico: () => new IcosahedronGeometry(0.5, 1),
  dodeca: () => new DodecahedronGeometry(0.5, 0),
  disc: () => new CylinderGeometry(0.5, 0.5, 1, 28),
  // 세모 기둥: 꼭짓점 하나가 +Z. x축으로 -90° 돌리면 박공(꼭짓점이 위, 길이가 Z)이 된다
  prism: () => new CylinderGeometry(0.5, 0.5, 1, 3),
  // 밑면 한 변 1인 네모뿔(지붕·천막)
  pyramid: () => new ConeGeometry(Math.SQRT1_2, 1, 4).rotateY(Math.PI / 4),
};

const geos = new Map<ShapeKind, BufferGeometry>();
const unitGeo = (kind: ShapeKind) => {
  const hit = geos.get(kind);
  if (hit) return hit;
  const geo = MAKERS[kind]();
  geos.set(kind, geo);
  return geo;
};

type Vec = [number, number, number];

// 부품 한 줄: [도형, 재질, 자리, 크기, 회전(라디안)]
export type Part = [ShapeKind, MaterialName, Vec, Vec | number, Vec?];

export function assemble(parts: Part[], scale = 1): Group {
  const group = new Group();
  parts.forEach(([kind, mat, pos, size, rot]) => {
    const mesh = new Mesh(unitGeo(kind), namedMaterial(mat));
    mesh.position.set(pos[0] * scale, pos[1] * scale, pos[2] * scale);
    const s = typeof size === "number" ? [size, size, size] : size;
    mesh.scale.set(s[0] * scale, s[1] * scale, s[2] * scale);
    if (rot) mesh.rotation.set(rot[0], rot[1], rot[2]);
    group.add(mesh);
  });
  return group;
}

// 같은 부품을 여러 자리에 늘어놓는다(말뚝·기둥·흉벽 요철)
export function repeat(count: number, make: (i: number) => Part): Part[] {
  return Array.from({ length: count }, (_, i) => make(i));
}

export const HALF_PI = Math.PI / 2;
