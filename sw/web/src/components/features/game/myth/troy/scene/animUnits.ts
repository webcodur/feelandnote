/*
  파일명: components/features/game/myth/troy/scene/animUnits.ts
  기능: 말 연출(이동·쓰러짐·물러남·나타남·수준 오름·상태·회복)
  책임: 보드게임 말처럼 칸마다 통통 튀며 걷고(움직임 줄이기면 미끄러짐), 넘어져 가라앉고, 뒤로 물러나며 사라지고,
        빛기둥과 함께 떨어져 나타난다. 끝나면 말의 자리·체력·보임이 연출 값과 같다.
*/ // ------------------------------
import { Vector3 } from "three";
import { chestOf, dur, dust, flashPiece, headOf, hold, popText, showFx, sparkle, type AnimCtx } from "./animKit";
import { floorPlate, lightPillar } from "./fxMeshes";
import { dirOf, facingAngle, nearestAngle } from "./grid";
import { FX } from "./palette";
import type { Piece } from "./piece";
import { EASE } from "./tween";
import type { AnimOf } from "./types";

export async function animMove(ctx: AnimCtx, a: AnimOf<"move">) {
  const piece = ctx.units.piece(a.unitId);
  if (!piece) return;
  const steps = a.path.filter((p, i) => i > 0 || p.x !== piece.unit.x || p.y !== piece.unit.y);
  await hold(piece, async () => {
    const from = new Vector3();
    const to = new Vector3();
    let cur = { x: piece.unit.x, y: piece.unit.y };
    if (!ctx.reduced && steps.length > 0) await ctx.tweens.run(0.07, (k) => piece.bob.scale.set(1 + 0.07 * k, 1 - 0.12 * k, 1 + 0.07 * k));
    for (const p of steps) {
      ctx.units.standOf(cur, from);
      ctx.units.standOf(p, to);
      const dir = dirOf(p.x - cur.x, p.y - cur.y);
      const r0 = piece.root.rotation.y;
      const r1 = nearestAngle(r0, facingAngle(dir));
      const climb = Math.max(0, to.y - from.y);
      const hop = ctx.reduced ? 0 : 0.17 + climb;
      await ctx.tweens.run(dur(ctx, 0.2 + climb * 0.2), (k) => {
        piece.root.position.lerpVectors(from, to, k);
        piece.root.position.y = from.y + (to.y - from.y) * k + hop * 4 * k * (1 - k);
        piece.root.rotation.y = r0 + (r1 - r0) * Math.min(1, k * 3);
        const s = ctx.reduced ? 0 : Math.sin(Math.PI * k);
        piece.bob.scale.set(1 - 0.05 * s, 1 + 0.1 * s, 1 - 0.05 * s);
      }, EASE.linear);
      if (!ctx.reduced) dust(ctx, to, 4, 0.7);
      cur = p;
      piece.unit.facing = dir;
    }
    if (!ctx.reduced && steps.length > 0) {
      await ctx.tweens.run(0.16, (k) => {
        const s = Math.sin(Math.PI * k) * (1 - k * 0.5);
        piece.bob.scale.set(1 + 0.12 * s, 1 - 0.2 * s, 1 + 0.12 * s);
      }, EASE.linear);
    }
    piece.bob.scale.set(1, 1, 1);
    piece.unit.x = cur.x;
    piece.unit.y = cur.y;
  });
  ctx.units.snap(piece);
}

function hide(piece: Piece) {
  piece.root.visible = false;
  piece.unit.hidden = true;
  piece.bob.rotation.set(0, 0, 0);
  piece.bob.position.set(0, 0, 0);
  piece.bob.scale.set(1, 1, 1);
  piece.setOpacity(1);
}

export async function animFall(ctx: AnimCtx, a: AnimOf<"fall">) {
  const piece = ctx.units.piece(a.unitId);
  if (!piece) return;
  await hold(piece, async () => {
    await Promise.all([
      flashPiece(ctx, piece, FX.hurtFlash, dur(ctx, 0.3), 0.8),
      ctx.tweens.run(dur(ctx, 0.3), (k) => {
        piece.bob.rotation.z = ctx.reduced ? 0 : Math.sin(k * Math.PI * 4) * 0.09 * (1 - k);
      }, EASE.linear),
    ]);
    await ctx.tweens.run(dur(ctx, 0.42), (k) => {
      piece.bob.rotation.x = -1.35 * k;
    }, EASE.inQuad);
    dust(ctx, piece.root.position, 12, 1.2);
    if (!ctx.reduced) ctx.rig.shake(0.35);
    await ctx.tweens.run(dur(ctx, 0.6), (k) => {
      piece.bob.position.y = -0.3 * k;
      piece.setOpacity(1 - k);
    }, EASE.inQuad);
    hide(piece);
  });
}

export async function animRetreat(ctx: AnimCtx, a: AnimOf<"retreat">) {
  const piece = ctx.units.piece(a.unitId);
  if (!piece) return;
  await hold(piece, async () => {
    const r0 = piece.root.rotation.y;
    const back = r0 + Math.PI;
    await ctx.tweens.run(dur(ctx, 0.18), (k) => {
      piece.root.rotation.y = r0 + Math.PI * k;
    });
    const start = piece.root.position.clone();
    const away = new Vector3(Math.sin(back), 0, Math.cos(back));
    await ctx.tweens.run(dur(ctx, 0.7), (k) => {
      piece.root.position.copy(start).addScaledVector(away, 0.6 * k);
      const hop = ctx.reduced ? 0 : Math.abs(Math.sin(k * Math.PI * 2)) * 0.12;
      piece.root.position.y = start.y + hop;
      piece.bob.scale.setScalar(1 - 0.35 * k);
      piece.setOpacity(1 - k);
    }, EASE.inQuad);
    dust(ctx, piece.root.position, 6, 0.8);
    hide(piece);
  });
  ctx.units.snap(piece);
}

export async function animSpawn(ctx: AnimCtx, a: AnimOf<"spawn">) {
  const jobs = a.unitIds.map(async (id, i) => {
    const piece = ctx.units.piece(id);
    if (!piece) return;
    await ctx.tweens.wait(dur(ctx, 0.12 * i));
    await hold(piece, async () => {
      ctx.units.snap(piece);
      piece.unit.hidden = false;
      piece.root.visible = true;
      const at = piece.root.position.clone();
      const pillar = showFx(ctx, lightPillar(FX.spawn, 0.34, 2.6), at, dur(ctx, 1.1), (k, fx) => {
        fx.setOpacity(Math.sin(Math.PI * k) * 0.9);
        fx.mesh.scale.set(1 - k * 0.3, 1, 1 - k * 0.3);
      });
      sparkle(ctx, chestOf(piece), FX.spawn, FX.goodGold, 16, 1.1);
      await ctx.tweens.run(dur(ctx, 0.55), (k) => {
        piece.bob.position.y = ctx.reduced ? 0 : (1 - k) * 1.3;
        piece.setOpacity(ctx.reduced ? k : Math.min(1, k * 3));
      }, ctx.reduced ? EASE.linear : EASE.outBounce);
      piece.setOpacity(1);
      piece.bob.position.y = 0;
      dust(ctx, at, 10, 1);
      await pillar;
    });
  });
  await Promise.all(jobs);
}

export async function animLevelUp(ctx: AnimCtx, a: AnimOf<"levelUp">) {
  const piece = ctx.units.piece(a.unitId);
  if (!piece) return;
  await hold(piece, async () => {
    const at = piece.root.position.clone();
    const pillar = showFx(ctx, lightPillar(FX.level, 0.42, 2.2), at, dur(ctx, 1.4), (k, fx) => fx.setOpacity(Math.sin(Math.PI * k) * 0.8));
    const rings = [0, 1, 2].map(async (i) => {
      await ctx.tweens.wait(dur(ctx, i * 0.16));
      await showFx(ctx, floorPlate(FX.level, true, 1.2), at, dur(ctx, 0.9), (k, fx) => {
        fx.mesh.position.y = at.y + 0.05 + k * (piece.height + 0.3);
        fx.mesh.scale.setScalar(1.1 - 0.4 * k);
        fx.setOpacity(Math.sin(Math.PI * k));
      });
    });
    sparkle(ctx, chestOf(piece), FX.level, FX.goodGold, 26, 1.4);
    const hop = ctx.tweens.run(dur(ctx, 0.4), (k) => {
      piece.bob.position.y = ctx.reduced ? 0 : Math.sin(Math.PI * k) * 0.28;
    }, EASE.linear);
    await Promise.all([pillar, ...rings, hop, flashPiece(ctx, piece, FX.level, dur(ctx, 0.9), 0.7)]);
    piece.bob.position.y = 0;
  });
}

export async function animStatus(ctx: AnimCtx, a: AnimOf<"status">) {
  const piece = ctx.units.piece(a.unitId);
  if (!piece) return;
  const good = a.tone === "good";
  await hold(piece, async () => {
    const top = headOf(piece);
    if (good) sparkle(ctx, chestOf(piece), FX.good, FX.goodGold, 22, 1.1);
    else ctx.sparks.burst({ count: 18, at: top, color: FX.bad, color2: FX.badDark, spread: 0.3, speed: 0.15, up: -0.6, drag: 1, life: [0.7, 1.1], size: [0.09, 0.03] });
    const ring = showFx(ctx, floorPlate(good ? FX.good : FX.bad, true, 1.2), piece.root.position.clone().setY(piece.root.position.y + 0.04), dur(ctx, 0.8), (k, fx) => {
      fx.mesh.scale.setScalar(0.6 + k * 0.7);
      fx.setOpacity((1 - k) * 0.9);
    });
    const shiver = ctx.tweens.run(dur(ctx, 0.45), (k) => {
      piece.bob.position.x = good || ctx.reduced ? 0 : Math.sin(k * Math.PI * 10) * 0.03 * (1 - k);
    }, EASE.linear);
    await Promise.all([ring, shiver, flashPiece(ctx, piece, good ? FX.good : FX.bad, dur(ctx, 0.6), 0.55)]);
    piece.bob.position.x = 0;
  });
}

export async function animHeal(ctx: AnimCtx, a: AnimOf<"heal">) {
  const piece = ctx.units.piece(a.unitId);
  if (!piece) return;
  await hold(piece, async () => {
    const base = piece.root.position.clone().setY(piece.root.position.y + 0.04);
    const ring = showFx(ctx, floorPlate(FX.heal, false, 1.5), base, dur(ctx, 0.9), (k, fx) => fx.setOpacity(Math.sin(Math.PI * k) * 0.9));
    sparkle(ctx, chestOf(piece), FX.heal, FX.healGold, 22, 1);
    ctx.units.setHp(piece, a.hp);
    const text = popText(ctx, piece, `+${a.amount}`, "heal");
    await Promise.all([ring, text, flashPiece(ctx, piece, FX.heal, dur(ctx, 0.6), 0.45)]);
  });
}
