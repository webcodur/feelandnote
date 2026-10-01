/*
  파일명: components/features/game/myth/troy/scene/pathLine.ts
  기능: 길 미리 보기
  책임: 칸 가운데를 잇는 금빛 관(점선이 앞으로 흐른다)과 끝 화살촉을 그린다. 높이가 다른 칸 사이는 칸 경계에서 꺾어 계단처럼 오르내린다.
        나무·말에 가리지 않게 깊이 검사 없이 맨 위에 그린다.
*/ // ------------------------------
import {
  Color, ConeGeometry, CurvePath, Group, LineCurve3, Mesh, MeshBasicMaterial, Quaternion, TubeGeometry, Vector3,
} from "three";
import type { BattleMap, Point } from "../engine/types";
import { dashTexture } from "./fxTextures";
import { surfaceAt } from "./grid";
import { PATH_GOLD } from "./palette";

const LIFT = 0.1;

export class PathLine {
  readonly group = new Group();
  private readonly material: MeshBasicMaterial;
  private readonly arrowMat: MeshBasicMaterial;
  private readonly arrowGeo = new ConeGeometry(0.12, 0.26, 18);
  private tube: Mesh | null = null;
  private readonly arrow: Mesh;
  private path: Point[] | null = null;
  private length = 1;

  constructor(private readonly reduced: boolean) {
    const map = dashTexture().clone();
    map.needsUpdate = true;
    this.material = new MeshBasicMaterial({
      color: new Color(PATH_GOLD), alphaMap: map, transparent: true, depthTest: false, depthWrite: false, toneMapped: false,
    });
    this.arrowMat = new MeshBasicMaterial({ color: new Color(PATH_GOLD), depthTest: false, depthWrite: false, toneMapped: false });
    this.arrow = new Mesh(this.arrowGeo, this.arrowMat);
    this.arrow.renderOrder = 12;
    this.arrow.visible = false;
    this.group.add(this.arrow);
  }

  set(map: BattleMap | null, path: Point[] | null) {
    this.path = path;
    this.tube?.geometry.dispose();
    if (this.tube) this.group.remove(this.tube);
    this.tube = null;
    this.arrow.visible = false;
    if (!map || !path || path.length < 2) return;
    const pts: Vector3[] = [];
    path.forEach((p, i) => {
      const at = surfaceAt(map, p).add(new Vector3(0, LIFT, 0));
      const prev = pts[pts.length - 1];
      if (i > 0 && prev && Math.abs(prev.y - at.y) > 0.01) {
        const mid = prev.clone().lerp(at, 0.5);
        pts.push(new Vector3(mid.x, prev.y, mid.z), new Vector3(mid.x, at.y, mid.z));
      }
      pts.push(at);
    });
    // 화살촉 자리만큼 관을 짧게 끝낸다
    const last = pts[pts.length - 1];
    const before = pts[pts.length - 2];
    const dir = last.clone().sub(before).normalize();
    const end = last.clone().addScaledVector(dir, -0.16);
    const curve = new CurvePath<Vector3>();
    const line = [...pts.slice(0, -1), end];
    for (let i = 1; i < line.length; i += 1) curve.add(new LineCurve3(line[i - 1], line[i]));
    this.length = curve.getLength();
    const geo = new TubeGeometry(curve, Math.max(8, line.length * 10), 0.034, 8, false);
    this.tube = new Mesh(geo, this.material);
    this.tube.renderOrder = 11;
    this.group.add(this.tube);
    this.material.alphaMap?.repeat.set(this.length * 3.2, 1);
    this.arrow.position.copy(last).addScaledVector(dir, -0.05);
    this.arrow.quaternion.copy(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), dir));
    this.arrow.visible = true;
  }

  refresh(map: BattleMap) {
    this.set(map, this.path);
  }

  update(time: number) {
    if (this.material.alphaMap && !this.reduced) this.material.alphaMap.offset.x = -time * 1.4;
  }

  dispose() {
    this.tube?.geometry.dispose();
    this.material.alphaMap?.dispose();
    this.material.dispose();
    this.arrowMat.dispose();
    this.arrowGeo.dispose();
    this.group.clear();
  }
}
