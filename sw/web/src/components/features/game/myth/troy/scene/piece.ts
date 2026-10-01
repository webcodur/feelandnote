/*
  파일명: components/features/game/myth/troy/scene/piece.ts
  기능: 장수 말 하나
  책임: 모델(편 색으로 칠한 복제) + 편 색 받침(금빛 테두리, 우두머리는 붉은 금빛 두 겹) + 영웅 얼굴 메달을 한 덩이로 묶는다.
        행동 끝 어둡게·맞은 번쩍임·투명해짐을 재질마다 건다. 움직임은 root(칸 자리·방향)·lift(고른 말 들어 올림)·bob(연출) 세 겹으로 받는다.
*/ // ------------------------------
import { Color, CylinderGeometry, Group, Mesh, MeshStandardMaterial, Sprite, SpriteMaterial, TorusGeometry } from "three";
import { actedColor, isGlowing, pieceMaterial } from "./materials";
import type { ModelTemplate } from "./models";
import { PIECE, SIDE_COLOR } from "./palette";
import { medalTexture } from "./portraits";
import type { SceneUnit } from "./types";

export const BASE_H = 0.06;
export const MEDAL_SIZE = 0.42;
// 메달 밑변을 체력 막대 위로 띄우는 몫(메달 크기 비율)
export const MEDAL_DROP = 0.24;
// 막대 자리에서 메달 윗변까지(화면 기준 위쪽)
export const MEDAL_TOP = MEDAL_SIZE * (1 + MEDAL_DROP);

interface SharedGeos {
  base: CylinderGeometry;
  rim: TorusGeometry;
  rim2: TorusGeometry;
}
let geos: SharedGeos | null = null;
const sharedGeos = (): SharedGeos => {
  geos ??= {
    base: new CylinderGeometry(0.36, 0.375, BASE_H, 40).translate(0, BASE_H / 2, 0),
    rim: new TorusGeometry(0.362, 0.014, 6, 48).rotateX(Math.PI / 2),
    rim2: new TorusGeometry(0.392, 0.013, 6, 48).rotateX(Math.PI / 2),
  };
  return geos;
};

interface Tinted {
  mat: MeshStandardMaterial;
  color: Color;
  emissive: Color;
  glow: boolean;
}

export class Piece {
  readonly root = new Group();
  readonly lift = new Group();
  readonly bob = new Group();
  readonly model = new Group();
  readonly medal: Sprite | null = null;
  readonly sideColor: Color;
  unit: SceneUnit;
  height = 0.84;
  hpShown: number;
  hpTarget: number;
  lagShown: number;
  lagHold = 0;
  opacity = 1;
  // 연출이 붙잡고 있는 수. 0이 아니면 setUnits가 자리·방향을 덮어쓰지 않는다
  busy = 0;
  private tinted: Tinted[] = [];
  private modelTinted: Tinted[] = [];
  private acted = false;

  constructor(unit: SceneUnit) {
    this.unit = { ...unit };
    this.sideColor = new Color(SIDE_COLOR[unit.side]);
    this.root.add(this.lift);
    this.lift.add(this.bob);
    this.bob.add(this.model);
    this.model.position.y = BASE_H;
    const g = sharedGeos();
    const baseMat = new MeshStandardMaterial({ color: this.sideColor.clone(), roughness: 0.42, metalness: 0.12 });
    const rimMat = new MeshStandardMaterial({ color: new Color(unit.boss ? PIECE.bossRim2 : PIECE.rim), roughness: 0.28, metalness: 0.9 });
    const base = new Mesh(g.base, baseMat);
    base.castShadow = true;
    base.receiveShadow = true;
    const rim = new Mesh(g.rim, rimMat);
    rim.position.y = BASE_H;
    this.bob.add(base, rim);
    this.tinted.push(this.track(baseMat), this.track(rimMat));
    if (unit.boss) {
      const rim2Mat = new MeshStandardMaterial({ color: new Color(PIECE.bossRim), roughness: 0.3, metalness: 0.85 });
      const rim2 = new Mesh(g.rim2, rim2Mat);
      rim2.position.y = BASE_H * 0.45;
      this.bob.add(rim2);
      this.tinted.push(this.track(rim2Mat));
    }
    if (unit.isHero) {
      const map = medalTexture({ side: unit.side, initial: unit.initial, boss: unit.boss }, unit.portraitUrl);
      const medal = new Sprite(new SpriteMaterial({ map, depthTest: false, depthWrite: false, toneMapped: false, transparent: true }));
      medal.scale.setScalar(MEDAL_SIZE);
      // 기준점을 메달 아래로 내려, 머리 위 체력 막대 바로 위에 메달이 앉게 한다(화면 기준 위쪽)
      medal.center.set(0.5, -MEDAL_DROP);
      medal.renderOrder = 20;
      this.medal = medal;
      this.root.add(medal);
    }
    this.hpShown = this.hpTarget = this.lagShown = unit.hp / Math.max(1, unit.maxHp);
  }

  private track(mat: MeshStandardMaterial): Tinted {
    return { mat, color: mat.color.clone(), emissive: mat.emissive.clone(), glow: isGlowing(mat) };
  }

  setTemplate(template: ModelTemplate) {
    this.model.clear();
    this.modelTinted.forEach((t) => t.mat.dispose());
    this.modelTinted = template.parts.map((part) => {
      const mat = pieceMaterial(part.material, this.unit.side);
      const mesh = new Mesh(part.geometry, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.model.add(mesh);
      return this.track(mat);
    });
    this.height = template.height + BASE_H;
    this.setActed(this.acted);
    this.setOpacity(this.opacity);
  }

  private all(): Tinted[] {
    return [...this.tinted, ...this.modelTinted];
  }

  setActed(on: boolean) {
    this.acted = on;
    this.all().forEach((t) => (on && !t.glow ? actedColor(t.color, t.mat.color) : t.mat.color.copy(t.color)));
    this.medal?.material.color.setScalar(on ? 0.66 : 1);
  }

  // 맞은 번쩍임: k만큼 color로 달아오른다(0이면 원래대로)
  flash(color: Color, k: number) {
    this.all().forEach((t) => {
      if (t.glow) return;
      t.mat.emissive.copy(t.emissive).lerp(color, k);
    });
  }

  setOpacity(a: number) {
    this.opacity = a;
    const fade = a < 0.999;
    this.all().forEach((t) => {
      t.mat.transparent = fade;
      t.mat.opacity = a;
      t.mat.depthWrite = !fade;
    });
    if (this.medal) this.medal.material.opacity = a;
  }

  dispose() {
    this.all().forEach((t) => t.mat.dispose());
    this.medal?.material.map?.dispose();
    this.medal?.material.dispose();
    this.root.removeFromParent();
  }
}
