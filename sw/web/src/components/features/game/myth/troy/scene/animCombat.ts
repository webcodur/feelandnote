/*
  파일명: components/features/game/myth/troy/scene/animCombat.ts
  기능: 공격 연출(근접·원거리)
  책임: 근접은 움츠렸다 뛰어들어 치고 돌아오고, 원거리는 활을 당겨 포물선으로 쏜다. 맞으면 불티·번쩍임·밀려남·피해 숫자와
        체력 막대가 줄고, 치명이면 더 크게 터지며 판이 흔들린다(움직임 줄이기면 흔들림 없음). 빗나가면 과녁이 옆으로 비킨다.
*/ // ------------------------------
import { CylinderGeometry, Group, Mesh, MeshBasicMaterial, Color, Quaternion, Vector3 } from "three";
import { chestOf, dur, flashPiece, flatDir, hold, popText, showFx, type AnimCtx } from "./animKit";
import { floorPlate } from "./fxMeshes";
import { angleToward, dirOf, nearestAngle } from "./grid";
import { FX } from "./palette";
import type { Piece } from "./piece";
import { EASE } from "./tween";
import type { AnimOf } from "./types";

type Strike = AnimOf<"melee">;

// 공격하는 쪽이 과녁을 보게 돌린다(끝나면 네 방향 가운데 가까운 쪽을 facing으로 남긴다)
async function faceTarget(ctx: AnimCtx, atk: Piece, tgt: Piece) {
  const d = flatDir(atk.root.position, tgt.root.position);
  const r0 = atk.root.rotation.y;
  const r1 = nearestAngle(r0, angleToward(d.x, d.z));
  await ctx.tweens.run(dur(ctx, 0.12), (k) => {
    atk.root.rotation.y = r0 + (r1 - r0) * k;
  });
  atk.unit.facing = dirOf(tgt.unit.x - atk.unit.x, tgt.unit.y - atk.unit.y);
}

async function impact(ctx: AnimCtx, a: Strike, tgt: Piece, from: Vector3, power: number) {
  const dir = flatDir(from, tgt.root.position);
  const home = tgt.root.position.clone();
  if (!a.hit) {
    const side = new Vector3(-dir.z, 0, dir.x).multiplyScalar(0.26);
    await ctx.tweens.run(dur(ctx, 0.34), (k) => {
      const s = Math.sin(Math.PI * k);
      tgt.root.position.copy(home).addScaledVector(side, s);
      tgt.root.position.y = home.y + (ctx.reduced ? 0 : s * 0.1);
    }, EASE.linear);
    tgt.root.position.copy(home);
    return;
  }
  const at = chestOf(tgt);
  ctx.sparks.burst({
    count: a.crit ? 34 : 16, at, color: a.crit ? FX.crit : FX.spark, color2: FX.ember, spread: 0.12,
    speed: a.crit ? 2.4 : 1.6, up: 0.4, gravity: 3.2, drag: 2.2, life: [0.25, 0.55], size: [a.crit ? 0.1 : 0.075, 0.015],
  });
  if (a.crit) {
    showFx(ctx, floorPlate(FX.critFlash, true, 1.6), home.clone().setY(home.y + 0.05), dur(ctx, 0.5), (k, fx) => {
      fx.mesh.scale.setScalar(0.4 + k * 1.3);
      fx.setOpacity(1 - k);
    });
    if (!ctx.reduced) ctx.rig.shake(1.1);
  }
  ctx.units.setHp(tgt, a.targetHp);
  const text = popText(ctx, tgt, String(a.damage), a.crit ? "crit" : "damage");
  const push = 0.1 * power * (a.crit ? 1.6 : 1);
  await Promise.all([
    flashPiece(ctx, tgt, a.crit ? FX.critFlash : FX.hitFlash, dur(ctx, 0.32), a.crit ? 1 : 0.85),
    ctx.tweens.run(dur(ctx, 0.3), (k) => {
      const s = Math.sin(Math.PI * Math.min(1, k * 1.4)) * (1 - k * 0.3);
      tgt.root.position.copy(home).addScaledVector(dir, push * s);
      tgt.bob.rotation.x = ctx.reduced ? 0 : -0.18 * s * power;
    }, EASE.linear),
    text.then(() => undefined),
  ]);
  tgt.root.position.copy(home);
  tgt.bob.rotation.x = 0;
}

export async function animMelee(ctx: AnimCtx, a: Strike) {
  const atk = ctx.units.piece(a.attackerId);
  const tgt = ctx.units.piece(a.targetId);
  if (!atk || !tgt) {
    if (tgt) ctx.units.setHp(tgt, a.targetHp);
    return;
  }
  await hold(atk, () => hold(tgt, async () => {
    await faceTarget(ctx, atk, tgt);
    const home = atk.root.position.clone();
    const dir = flatDir(home, tgt.root.position);
    const reach = Math.min(0.5, home.distanceTo(tgt.root.position) * 0.45);
    await ctx.tweens.run(dur(ctx, a.crit ? 0.2 : 0.13), (k) => {
      atk.root.position.copy(home).addScaledVector(dir, -0.1 * k);
      atk.bob.scale.set(1 + 0.05 * k, 1 - 0.08 * k, 1 + 0.05 * k);
    }, EASE.outQuad);
    await ctx.tweens.run(dur(ctx, 0.09), (k) => {
      atk.root.position.copy(home).addScaledVector(dir, -0.1 + (reach + 0.1) * k);
      atk.root.position.y = home.y + (ctx.reduced ? 0 : Math.sin(Math.PI * k) * 0.08);
      atk.bob.scale.set(1 - 0.04 * k, 1 + 0.06 * k, 1 - 0.04 * k);
    }, EASE.inQuad);
    const hit = impact(ctx, a, tgt, home, 1);
    if (a.crit && !ctx.reduced) await ctx.tweens.wait(0.07);
    await ctx.tweens.run(dur(ctx, 0.22), (k) => {
      atk.root.position.copy(home).addScaledVector(dir, reach * (1 - k));
      atk.root.position.y = home.y;
      atk.bob.scale.set(1, 1, 1);
    });
    atk.root.position.copy(home);
    await hit;
  }));
}

function arrowMesh(): Group {
  const group = new Group();
  const shaft = new Mesh(new CylinderGeometry(0.012, 0.012, 0.34, 6).rotateX(Math.PI / 2), new MeshBasicMaterial({ color: new Color(FX.arrow) }));
  const tip = new Mesh(new CylinderGeometry(0, 0.03, 0.08, 6).rotateX(Math.PI / 2).translate(0, 0, 0.2), new MeshBasicMaterial({ color: new Color(FX.spark), toneMapped: false }));
  group.add(shaft, tip);
  return group;
}

export async function animRanged(ctx: AnimCtx, a: Strike) {
  const atk = ctx.units.piece(a.attackerId);
  const tgt = ctx.units.piece(a.targetId);
  if (!atk || !tgt) {
    if (tgt) ctx.units.setHp(tgt, a.targetHp);
    return;
  }
  await hold(atk, () => hold(tgt, async () => {
    await faceTarget(ctx, atk, tgt);
    await ctx.tweens.run(dur(ctx, 0.2), (k) => atk.bob.scale.set(1 + 0.04 * k, 1 - 0.07 * k, 1 + 0.04 * k), EASE.outQuad);
    atk.bob.scale.set(1, 1, 1);
    const start = chestOf(atk).add(new Vector3(0, 0.12, 0));
    const aim = chestOf(tgt);
    const dir = flatDir(start, aim);
    const end = a.hit ? aim : aim.clone().addScaledVector(new Vector3(-dir.z, 0, dir.x), 0.42).setY(tgt.root.position.y + 0.05);
    const dist = start.distanceTo(end);
    const arc = 0.25 + dist * 0.1;
    const arrow = arrowMesh();
    ctx.layer.add(arrow);
    const p = new Vector3();
    const prev = start.clone();
    const q = new Quaternion();
    const fwd = new Vector3(0, 0, 1);
    const flight = dur(ctx, 0.22 + dist * 0.05);
    const dodge = !a.hit ? impact(ctx, a, tgt, start, 0.6) : null;
    await ctx.tweens.run(flight, (k) => {
      p.lerpVectors(start, end, k);
      p.y += Math.sin(Math.PI * k) * arc;
      arrow.position.copy(p);
      const v = p.clone().sub(prev);
      if (v.lengthSq() > 1e-8) arrow.quaternion.copy(q.setFromUnitVectors(fwd, v.normalize()));
      prev.copy(p);
      if (Math.random() < 0.5) ctx.sparks.burst({ count: 1, at: p, color: FX.spark, spread: 0.01, speed: 0.05, life: [0.2, 0.3], size: [0.04, 0.01], alpha: 0.7 });
    }, EASE.linear);
    const hit = a.hit ? impact(ctx, a, tgt, start, 0.6) : dodge;
    await ctx.tweens.wait(dur(ctx, a.hit ? 0.05 : 0.35));
    arrow.traverse((o) => {
      const m = o as Mesh;
      if (!m.isMesh) return;
      m.geometry.dispose();
      (m.material as MeshBasicMaterial).dispose();
    });
    arrow.removeFromParent();
    await hit;
  }));
}
