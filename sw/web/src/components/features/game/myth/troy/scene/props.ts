/*
  파일명: components/features/game/myth/troy/scene/props.ts
  기능: 소품 층
  책임: 자리 표(decorPlan)를 받아 모델마다 부품별 InstancedMesh로 한꺼번에 그린다(모델 하나 = 재질 수만큼의 그리기).
        배는 덮은 칸으로 찾아 그을린 색을 입히고, 화로·제단 불꽃과 성문·탑 횃불 자리를 불빛 층에 넘긴다.
*/ // ------------------------------
import { Color, Group, InstancedMesh, Matrix4, Quaternion, Vector3 } from "three";
import type { Placement } from "./decorPlan";
import type { ModelTemplate } from "./models";
import { FX } from "./palette";
import type { ModelName } from "./types";

interface Entry {
  meshes: InstancedMesh[];
  index: number;
  placement: Placement;
}

const WHITE = new Color(1, 1, 1);
const CHAR = new Color(FX.char);
const UP = new Vector3(0, 1, 0);

export class PropLayer {
  readonly group = new Group();
  private entries: Entry[] = [];
  private meshes: InstancedMesh[] = [];
  private flames: Vector3[] = [];

  build(plan: Placement[], templates: Map<ModelName, ModelTemplate>, burned: Set<string>) {
    this.clear();
    const byKey = new Map<ModelName, Placement[]>();
    plan.forEach((p) => byKey.set(p.key, [...(byKey.get(p.key) ?? []), p]));
    const m = new Matrix4();
    const q = new Quaternion();
    const s = new Vector3();
    for (const [key, list] of byKey) {
      const template = templates.get(key);
      if (!template) continue;
      const meshes = template.parts.map((part) => {
        const mesh = new InstancedMesh(part.geometry, part.material, list.length);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        return mesh;
      });
      list.forEach((p, i) => {
        q.setFromAxisAngle(UP, p.rot);
        m.compose(p.pos, q, s.setScalar(p.scale));
        meshes.forEach((mesh) => {
          mesh.setMatrixAt(i, m);
          mesh.setColorAt(i, WHITE);
        });
        this.entries.push({ meshes, index: i, placement: p });
        template.flames.forEach((f) => this.flames.push(f.clone().multiplyScalar(p.scale).applyQuaternion(q).add(p.pos)));
        this.flames.push(...p.torches);
      });
      meshes.forEach((mesh) => {
        mesh.computeBoundingSphere();
        this.group.add(mesh);
      });
      this.meshes.push(...meshes);
    }
    this.ships([...burned]).forEach((entry) => this.char(entry, 1));
  }

  // 칸 가운데 하나라도 덮은 배
  ships(tiles: string[]): Entry[] {
    return this.entries.filter((e) => e.placement.key === "ship" && e.placement.tiles.some((k) => tiles.includes(k)));
  }

  // 0 그대로 → 1 다 탄 색
  char(entry: Entry, k: number) {
    const c = WHITE.clone().lerp(CHAR, Math.min(1, Math.max(0, k)));
    entry.meshes.forEach((mesh) => {
      mesh.setColorAt(entry.index, c);
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    });
  }

  flamePoints(): Vector3[] {
    return this.flames;
  }

  clear() {
    // 틀의 도형·재질은 나눠 쓰는 것이라 인스턴스 자원만 푼다
    this.meshes.forEach((mesh) => mesh.dispose());
    this.meshes = [];
    this.entries = [];
    this.flames = [];
    this.group.clear();
  }

  dispose() {
    this.clear();
  }
}

export type PropEntry = Entry;
