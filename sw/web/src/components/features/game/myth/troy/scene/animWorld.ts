/*
  파일명: components/features/game/myth/troy/scene/animWorld.ts
  기능: 판 연출(글자·지형 번쩍임·배 불탐·신 내림·흔들림)
  책임: 칸 위에 글자를 띄우고, 바뀐 칸을 번쩍이며 흙먼지를 올리고, 배를 불꽃·연기 속에 그을리고, 하늘에서 빛기둥을 내리꽂는다.
        움직임 줄이기면 흔들림은 건너뛰고 시간은 절반이다.
*/ // ------------------------------
import { Vector3 } from "three";
import { dur, dust, popText, showFx, sparkle, type AnimCtx } from "./animKit";
import { floorPlate, lightPillar } from "./fxMeshes";
import { surfaceAt, tileKey } from "./grid";
import { FX, HIGHLIGHT_COLOR } from "./palette";
import { EASE } from "./tween";
import type { AnimOf } from "./types";

// 말이 서 있는 칸이면 그 말 메달 위에, 빈 칸이면 칸 위에 띄운다
export async function animText(ctx: AnimCtx, a: AnimOf<"text">) {
  const piece = ctx.units.onTile(a.tile);
  if (piece) return popText(ctx, piece, a.text, a.tone);
  const at = surfaceAt(ctx.map, a.tile).add(new Vector3(0, 1.05, 0));
  await ctx.texts.show(at, a.text, a.tone);
}

export async function animTerrain(ctx: AnimCtx, a: AnimOf<"terrain">) {
  const jobs = a.tiles.map(async (p, i) => {
    await ctx.tweens.wait(dur(ctx, Math.min(0.4, i * 0.03)));
    const at = surfaceAt(ctx.map, p).add(new Vector3(0, 0.03, 0));
    dust(ctx, at, 6, 0.9);
    await showFx(ctx, floorPlate(HIGHLIGHT_COLOR.flash, false, 1.6), at, dur(ctx, 0.75), (k, fx) => {
      fx.mesh.scale.setScalar(0.5 + EASE.outCubic(k) * 0.7);
      fx.setOpacity(Math.sin(Math.PI * Math.min(1, k * 1.6)) * 0.95);
    });
  });
  await Promise.all(jobs);
}

export async function animBurn(ctx: AnimCtx, a: AnimOf<"burn">) {
  const keys = a.tiles.map((p) => tileKey(p.x, p.y));
  const ships = ctx.props.ships(keys);
  const centers = ships.length > 0
    ? ships.map((s) => s.placement.pos.clone().setY(s.placement.pos.y + 0.3))
    : a.tiles.map((p) => surfaceAt(ctx.map, p).add(new Vector3(0, 0.15, 0)));
  const total = dur(ctx, 1.9);
  let last = 0;
  await ctx.tweens.run(total, (k) => {
    ships.forEach((s) => ctx.props.char(s, Math.min(1, k * 1.4)));
    const t = k * total;
    if (t - last < 0.05) return;
    last = t;
    centers.forEach((c) => {
      const fade = 1 - Math.max(0, k - 0.75) * 3;
      ctx.sparks.burst({
        count: 4, at: c, color: FX.fireCore, color2: FX.fire, spread: 0.45, speed: 0.15, up: 1.3, gravity: -0.4,
        drag: 1.4, life: [0.35, 0.7], size: [0.26, 0.06], alpha: 0.9 * fade,
      });
      ctx.smoke.burst({
        count: 2, at: c.clone().setY(c.y + 0.35), color: FX.smoke, color2: FX.smokeLight, spread: 0.35, speed: 0.1, up: 0.8,
        gravity: -0.1, drag: 0.8, life: [1.1, 1.8], size: [0.35, 0.9], alpha: 0.55,
      });
      if (Math.random() < 0.4) ctx.sparks.burst({ count: 2, at: c, color: FX.ember, spread: 0.3, speed: 0.8, up: 1.6, gravity: 0.6, life: [0.6, 1.2], size: [0.05, 0.01] });
    });
  }, EASE.linear);
  keys.forEach((k) => ctx.burned.add(k));
  ships.forEach((s) => s.placement.tiles.forEach((k) => ctx.burned.add(k)));
  ctx.refreshFlames();
}

export async function animDivine(ctx: AnimCtx, a: AnimOf<"divine">) {
  const base = surfaceAt(ctx.map, a.tile);
  const height = 9;
  const pillar = showFx(ctx, lightPillar(FX.divine, 0.46, height), base, dur(ctx, 1.7), (k, fx) => {
    const grow = Math.min(1, k / 0.2);
    fx.mesh.scale.set(1 + (1 - grow) * 0.8, 1, 1 + (1 - grow) * 0.8);
    fx.mesh.position.y = base.y + (1 - EASE.outCubic(grow)) * height;
    fx.setOpacity(k < 0.2 ? grow : 1 - Math.max(0, (k - 0.6) / 0.4));
  });
  await ctx.tweens.wait(dur(ctx, 0.3));
  if (!ctx.reduced) ctx.rig.shake(0.7);
  const ring = showFx(ctx, floorPlate(FX.divine, true, 2.4), base.clone().setY(base.y + 0.05), dur(ctx, 0.9), (k, fx) => {
    fx.mesh.scale.setScalar(0.3 + EASE.outCubic(k) * 1.6);
    fx.setOpacity(1 - k);
  });
  const glow = showFx(ctx, floorPlate(FX.divine, false, 2), base.clone().setY(base.y + 0.04), dur(ctx, 1.3), (k, fx) => {
    fx.setOpacity(Math.sin(Math.PI * k) * 0.9);
  });
  sparkle(ctx, base.clone().setY(base.y + 0.3), FX.divine, FX.goodGold, 36, 1.8);
  dust(ctx, base, 10, 1.3);
  await Promise.all([pillar, ring, glow]);
}

export async function animShake(ctx: AnimCtx, a: AnimOf<"shake">) {
  if (!ctx.reduced) ctx.rig.shake(a.strength);
  await ctx.tweens.wait(dur(ctx, 0.35));
}
