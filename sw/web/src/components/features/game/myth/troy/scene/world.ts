/*
  파일명: components/features/game/myth/troy/scene/world.ts
  기능: 판 위 층 묶음
  책임: 판 덩어리·말·강조·길·불빛·입자·떠오르는 글자·연출 도형 층을 한데 만들어 장면에 올리고, 매 장면 시간을 흘려 준다.
        탄 배에서 피어오르는 연기, 연출에 넘길 자원 묶음(AnimCtx)도 여기서 만든다. BoardView는 이 묶음을 이어 쓰기만 한다.
*/ // ------------------------------
import { Group, type Scene, type Vector3 } from "three";
import type { BattleMap } from "../engine/types";
import type { AnimCtx } from "./animKit";
import { BoardMesh } from "./board";
import type { CameraRig } from "./cameraRig";
import { Flames } from "./flames";
import { FloatTexts } from "./floatText";
import { Highlights } from "./highlights";
import { FX } from "./palette";
import { Particles } from "./particles";
import { PathLine } from "./pathLine";
import { Tweens } from "./tween";
import { UnitLayer } from "./units";

export class World {
  readonly board = new BoardMesh();
  readonly units: UnitLayer;
  readonly highlights: Highlights;
  readonly pathLine: PathLine;
  readonly flames = new Flames();
  readonly tweens = new Tweens();
  readonly sparks = new Particles(720, true);
  readonly smoke = new Particles(360, false);
  readonly texts: FloatTexts;
  readonly fxLayer = new Group();
  readonly burned = new Set<string>();
  time = 0;
  private smolders: Vector3[] = [];
  private smolderClock = 0;

  constructor(scene: Scene, private readonly reduced: boolean) {
    this.units = new UnitLayer(reduced);
    this.highlights = new Highlights(reduced);
    this.pathLine = new PathLine(reduced);
    this.texts = new FloatTexts(this.tweens, reduced ? 0.5 : 1);
    scene.add(
      this.board.group, this.units.group, this.highlights.group, this.pathLine.group, this.flames.group,
      this.fxLayer, this.sparks.points, this.smoke.points, this.texts.group,
    );
  }

  update(dt: number, now: number) {
    this.time += dt;
    this.tweens.update(now);
    this.board.update(this.time);
    this.units.update(dt, this.time);
    this.highlights.update(this.time);
    this.pathLine.update(this.time);
    this.flames.update(this.time);
    this.sparks.update(dt);
    this.smoke.update(dt);
    this.smolderClock += dt;
    if (this.smolderClock < 0.3 || this.smolders.length === 0) return;
    this.smolderClock = 0;
    this.smolders.forEach((at) => this.smoke.burst({
      count: 1, at, color: FX.smoke, color2: FX.smokeLight, spread: 0.3, speed: 0.05, up: 0.5, gravity: -0.05,
      drag: 0.6, life: [1.6, 2.4], size: [0.25, 0.7], alpha: 0.32,
    }));
  }

  // 불 자리(화로·제단·횃불) + 탄 배 자리를 불빛 층에 다시 넘긴다
  refreshFlames() {
    const ships = this.board.props.ships([...this.burned]);
    this.smolders = ships.map((s) => s.placement.pos.clone().setY(s.placement.pos.y + 0.35));
    this.flames.setSources([...this.board.props.flamePoints(), ...this.smolders]);
  }

  animCtx(map: BattleMap, rig: CameraRig): AnimCtx {
    return {
      map, units: this.units, props: this.board.props, rig, tweens: this.tweens, sparks: this.sparks, smoke: this.smoke,
      texts: this.texts, layer: this.fxLayer, reduced: this.reduced, burned: this.burned,
      refreshFlames: () => this.refreshFlames(), time: () => this.time,
    };
  }

  setPointScale(pixelHeight: number, fov: number) {
    this.sparks.setScale(pixelHeight, fov);
    this.smoke.setScale(pixelHeight, fov);
  }

  busy(): boolean {
    return this.tweens.busy();
  }

  dispose() {
    this.tweens.finishAll();
    [this.board, this.units, this.highlights, this.pathLine, this.flames, this.sparks, this.smoke, this.texts].forEach((l) => l.dispose());
    this.fxLayer.clear();
  }
}
