/*
  파일명: components/features/game/myth/troy/scene/units.ts
  기능: 장수 말 층
  책임: setUnits 목록과 판 위 말을 맞춘다(있는 말은 자리·체력·상태만, 없는 말은 새로, 빠진 말은 푼다).
        고른 말은 살짝 들어 올리고 받침 둘레 금빛 고리를 돌린다. 매 장면 메달 자리와 체력 막대(깎인 몫이 천천히 줄어듦)를 맞춘다.
*/ // ------------------------------
import {
  AdditiveBlending, Color, Group, Mesh, MeshBasicMaterial, PlaneGeometry, TorusGeometry, Vector3,
} from "three";
import type { BattleMap, Point } from "../engine/types";
import { glowTexture } from "./fxTextures";
import { facingAngle, standAt } from "./grid";
import { HpBars } from "./hpBars";
import { loadModel } from "./models";
import { PIECE } from "./palette";
import { MEDAL_TOP, Piece } from "./piece";
import type { SceneUnit } from "./types";

const LIFT = 0.07;
const BAR_GAP = 0.05;
// 신·강의 신처럼 큰 말도 메달이 너무 높이 떠서 뒷줄 말을 가리지 않게 머리 높이를 여기서 자른다
const HEAD_CAP = 1.1;

export class UnitLayer {
  readonly group = new Group();
  readonly bars = new HpBars();
  private readonly pieces = new Map<string, Piece>();
  private readonly ring = new Group();
  private readonly ringGeo = new TorusGeometry(0.46, 0.017, 6, 20, 1.55);
  private readonly ringMat = new MeshBasicMaterial({ color: new Color(PIECE.ring), toneMapped: false });
  private readonly haloGeo = new PlaneGeometry(1.25, 1.25).rotateX(-Math.PI / 2);
  private readonly haloMat = new MeshBasicMaterial({
    color: new Color(PIECE.ring), alphaMap: glowTexture(), transparent: true, opacity: 0.55, depthWrite: false, blending: AdditiveBlending, toneMapped: false,
  });
  private map: BattleMap | null = null;
  private selected: string | null = null;
  private readonly tmp = new Vector3();
  onModel: () => void = () => {};

  constructor(private readonly reduced: boolean) {
    for (let i = 0; i < 3; i += 1) {
      const arc = new Mesh(this.ringGeo, this.ringMat);
      arc.rotation.set(-Math.PI / 2, 0, (i * Math.PI * 2) / 3);
      this.ring.add(arc);
    }
    const halo = new Mesh(this.haloGeo, this.haloMat);
    halo.position.y = -0.005;
    this.ring.add(halo);
    this.ring.position.y = 0.015;
    this.ring.visible = false;
    this.group.add(this.bars.mesh);
  }

  setMap(map: BattleMap) {
    this.map = map;
    this.pieces.forEach((p) => p.busy === 0 && this.snap(p));
  }

  setUnits(list: SceneUnit[]) {
    const ids = new Set(list.map((u) => u.id));
    [...this.pieces.values()].filter((p) => !ids.has(p.unit.id)).forEach((p) => this.remove(p));
    list.forEach((u) => {
      const old = this.pieces.get(u.id);
      const same = old && old.unit.model === u.model && old.unit.side === u.side && old.unit.isHero === u.isHero
        && old.unit.boss === u.boss && old.unit.portraitUrl === u.portraitUrl && old.unit.initial === u.initial;
      if (old && !same) this.remove(old);
      const piece = same && old ? old : this.create(u);
      piece.unit = { ...u };
      piece.setActed(u.acted);
      piece.root.visible = !u.hidden;
      piece.hpShown = piece.hpTarget = piece.lagShown = u.hp / Math.max(1, u.maxHp);
      if (piece.busy === 0) this.snap(piece);
    });
    this.select(this.selected);
  }

  private create(u: SceneUnit): Piece {
    const piece = new Piece(u);
    this.pieces.set(u.id, piece);
    this.group.add(piece.root);
    loadModel(u.model).then((template) => {
      if (this.pieces.get(u.id) !== piece) return;
      piece.setTemplate(template);
      this.onModel();
    });
    return piece;
  }

  private remove(piece: Piece) {
    if (this.ring.parent === piece.root) piece.root.remove(this.ring);
    this.pieces.delete(piece.unit.id);
    piece.dispose();
  }

  snap(piece: Piece) {
    if (!this.map) return;
    standAt(this.map, piece.unit, piece.root.position);
    piece.root.rotation.set(0, facingAngle(piece.unit.facing), 0);
  }

  standOf(p: Point, out = new Vector3()): Vector3 {
    return this.map ? standAt(this.map, p, out) : out.set(0, 0, 0);
  }

  piece(id: string): Piece | undefined {
    return this.pieces.get(id);
  }

  // 그 칸에 서 있는 보이는 말
  onTile(p: Point): Piece | undefined {
    return this.all().find((q) => q.root.visible && q.unit.x === p.x && q.unit.y === p.y);
  }

  // 체력 막대가 앉는 높이(말 뿌리 기준)
  private rise(p: Piece): number {
    return p.lift.position.y + p.bob.position.y + Math.min(p.height, HEAD_CAP) + BAR_GAP;
  }

  // 떠오르는 글자 자리: 막대 자리를 out에 담고, 화면 위쪽으로 메달(없으면 막대)을 비켜 띄울 몫을 돌려준다
  label(p: Piece, out: Vector3): number {
    out.copy(p.root.position);
    out.y += this.rise(p);
    return p.medal ? MEDAL_TOP - 0.06 : 0.03;
  }

  all(): Piece[] {
    return [...this.pieces.values()];
  }

  select(id: string | null) {
    this.selected = id;
    const piece = id ? this.pieces.get(id) : undefined;
    this.ring.removeFromParent();
    this.ring.visible = !!piece;
    piece?.root.add(this.ring);
  }

  update(dt: number, time: number) {
    this.bars.begin();
    const k = Math.min(1, dt * 12);
    this.pieces.forEach((p) => {
      const goal = p.unit.id === this.selected ? LIFT : 0;
      p.lift.position.y += (goal - p.lift.position.y) * k;
      p.hpShown = p.hpTarget < p.hpShown ? p.hpTarget : Math.min(p.hpTarget, p.hpShown + dt * 1.4);
      p.lagHold = Math.max(0, p.lagHold - dt);
      p.lagShown = p.lagHold > 0 ? Math.max(p.lagShown, p.hpShown) : Math.max(p.hpShown, p.lagShown - dt * 0.8);
      if (!p.root.visible || p.opacity <= 0.01) return;
      const rise = this.rise(p);
      p.medal?.position.set(0, rise, 0);
      this.tmp.copy(p.root.position);
      this.tmp.y += rise;
      this.bars.push(this.tmp, p.hpShown, p.lagShown, p.sideColor, p.opacity);
    });
    this.bars.end();
    this.ring.rotation.y = this.reduced ? 0 : time * 0.7;
  }

  // 체력을 바꾼다. 줄면 깎인 몫(빨강)이 잠시 남았다가 줄어든다
  setHp(piece: Piece, hp: number) {
    const ratio = Math.max(0, hp) / Math.max(1, piece.unit.maxHp);
    if (ratio < piece.hpShown) {
      piece.lagShown = Math.max(piece.lagShown, piece.hpShown);
      piece.lagHold = 0.45;
    }
    piece.hpTarget = ratio;
    piece.unit.hp = hp;
  }

  dispose() {
    this.pieces.forEach((p) => p.dispose());
    this.pieces.clear();
    this.bars.dispose();
    this.ringGeo.dispose();
    this.ringMat.dispose();
    this.haloGeo.dispose();
    this.haloMat.dispose();
    this.group.clear();
  }
}
