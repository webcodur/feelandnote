/*
  파일명: components/features/game/myth/troy/scene/animKit.ts
  기능: 연출이 함께 쓰는 도구
  책임: 연출 함수들이 받는 판 자원 묶음(AnimCtx)과, 움직임 줄이기 시간 절반·말 붙잡기·흙먼지·반짝이·빛 도형 띄우기 같은
        짧은 도우미를 둔다. 연출 본체는 animUnits·animCombat·animWorld가 맡는다.
*/ // ------------------------------
import { Color, Vector3, type Group } from "three";
import type { BattleMap } from "../engine/types";
import type { CameraRig } from "./cameraRig";
import type { FloatTexts } from "./floatText";
import type { FxMesh } from "./fxMeshes";
import { FX } from "./palette";
import type { Particles } from "./particles";
import type { Piece } from "./piece";
import type { PropLayer } from "./props";
import { EASE, type Tweens } from "./tween";
import type { TextTone } from "./types";
import type { UnitLayer } from "./units";

export interface AnimCtx {
  map: BattleMap;
  units: UnitLayer;
  props: PropLayer;
  rig: CameraRig;
  tweens: Tweens;
  sparks: Particles;
  smoke: Particles;
  texts: FloatTexts;
  layer: Group;
  reduced: boolean;
  burned: Set<string>;
  refreshFlames: () => void;
  time: () => number;
}

// 움직임 줄이기면 연출 시간을 절반으로
export const dur = (ctx: AnimCtx, sec: number) => (ctx.reduced ? sec * 0.5 : sec);

// 연출하는 동안 setUnits가 말 자리를 덮어쓰지 않게 붙잡는다
export async function hold(piece: Piece, run: () => Promise<void>): Promise<void> {
  piece.busy += 1;
  try {
    await run();
  } finally {
    piece.busy -= 1;
  }
}

export const chestOf = (piece: Piece, out = new Vector3()) => out.copy(piece.root.position).setY(piece.root.position.y + piece.height * 0.55);
export const headOf = (piece: Piece, out = new Vector3()) => out.copy(piece.root.position).setY(piece.root.position.y + piece.height + 0.2);

// 말 머리 위 메달·막대 너머로 글자를 띄운다(얼굴을 가리지 않게)
export function popText(ctx: AnimCtx, piece: Piece, text: string, tone: TextTone): Promise<void> {
  const at = new Vector3();
  const lift = ctx.units.label(piece, at);
  return ctx.texts.show(at, text, tone, lift);
}

export function dust(ctx: AnimCtx, at: Vector3, count: number, scale = 1) {
  ctx.smoke.burst({
    count, at: new Vector3(at.x, at.y + 0.04, at.z), color: FX.dust, spread: 0.26 * scale, speed: 0.45 * scale, up: 0.12,
    flat: true, drag: 3.2, life: [0.35, 0.65], size: [0.12 * scale, 0.26 * scale], alpha: 0.5,
  });
}

export function sparkle(ctx: AnimCtx, at: Vector3, color: string, color2: string, count: number, up = 0.9) {
  ctx.sparks.burst({
    count, at, color, color2, spread: 0.32, speed: 0.25, up, gravity: -0.2, drag: 1.2, life: [0.6, 1.1], size: [0.07, 0.02],
  });
}

// 빛 도형을 판에 띄우고 k(0→1)에 맞춰 모양을 바꾸다 끝나면 푼다
export async function showFx(ctx: AnimCtx, fx: FxMesh, at: Vector3, sec: number, shape: (k: number, fx: FxMesh) => void) {
  fx.mesh.position.copy(at);
  ctx.layer.add(fx.mesh);
  await ctx.tweens.run(sec, (k) => {
    fx.setTime(ctx.time());
    shape(k, fx);
  }, EASE.linear);
  fx.dispose();
}

// 말을 k만큼 color로 달궜다가 식힌다
export function flashPiece(ctx: AnimCtx, piece: Piece, color: string, sec: number, peak = 1) {
  const c = new Color(color);
  return ctx.tweens.run(sec, (k) => piece.flash(c, (1 - k) * peak));
}

// 둘 사이 수평 방향(y는 0)
export function flatDir(from: Vector3, to: Vector3): Vector3 {
  const d = new Vector3(to.x - from.x, 0, to.z - from.z);
  return d.lengthSq() > 1e-6 ? d.normalize() : d.set(0, 0, 1);
}
