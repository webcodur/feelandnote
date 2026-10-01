/*
  파일명: components/features/game/myth/troy/campaign/campaign.test.ts
  기능: 트로이 전쟁 장 자료 검사
  책임: 열 장의 지도·출진 칸·배치·배 장식·사건이 부르는 장면과 장수가 서로 맞는지 본다(끝까지 돌려 보는 검사는 journey.test.ts가 맡는다).
*/ // ------------------------------
import assert from "node:assert/strict";
import { test } from "node:test";
import { CLASSES, TERRAIN } from "../engine";
import type { UnitSpawn } from "../engine";
import { blockedByDecor } from "../engine/grid";
import { HEROES } from "./heroes";
import { CHAPTERS } from "./index";

const key = (p: { x: number; y: number }) => `${p.x},${p.y}`;

function spawnsOf(entry: (typeof CHAPTERS)[number]): UnitSpawn[] {
  return [...entry.battle.units, ...entry.battle.events.flatMap((e) => e.actions.flatMap((a) => (a.do === "spawn" ? a.units : [])))];
}

for (const entry of CHAPTERS) {
  const { battle, story } = entry;
  const map = battle.map;
  test(`${entry.id} 지도·출진 칸·배치`, () => {
    assert.equal(map.tiles.length, map.width * map.height);
    const deploy = new Set(battle.deploy.map(key));
    assert.equal(deploy.size, battle.deploy.length, "출진 칸 겹침");
    assert.ok(battle.maxDeploy <= battle.deploy.length);
    for (const p of battle.deploy) {
      const tile = map.tiles[p.y * map.width + p.x];
      assert.ok(tile && TERRAIN[tile.terrain].cost.foot !== null && !blockedByDecor(map, p), `${entry.id} 출진 칸 ${key(p)} 못 섬`);
    }
    const seen = new Set<string>();
    for (const u of battle.units) {
      const tile = map.tiles[u.y * map.width + u.x];
      const move = CLASSES[u.classKey].move;
      assert.ok(tile, `${u.id} 판 밖`);
      assert.ok(TERRAIN[tile.terrain].cost[move] !== null || tile.terrain === "rampart" || tile.terrain === "gate", `${entry.id} ${u.id} ${tile.terrain} 위`);
      assert.ok(!blockedByDecor(map, u), `${entry.id} ${u.id} 장식 위`);
      assert.ok(!seen.has(key(u)) && !deploy.has(key(u)), `${entry.id} ${u.id} 자리 겹침`);
      seen.add(key(u));
    }
    const ships = map.tiles.flatMap((t, i) => (t.terrain === "ship" ? [`${i % map.width},${Math.floor(i / map.width)}`] : []));
    const covered = map.decor.filter((d) => d.kind === "ship").flatMap((d) => [key(d), key({ x: d.x, y: d.y + (d.rot === 0 ? 1 : d.rot === 2 ? -1 : 0) })]);
    assert.deepEqual(new Set(ships), new Set(covered), `${entry.id} 배 칸과 배 장식이 어긋남`);
  });

  test(`${entry.id} 장면·장수 참조`, () => {
    const scenes = new Set(["intro", "outro", ...story.ko.scenes.map((s) => s.id)]);
    const en = new Set(["intro", "outro", ...story.en.scenes.map((s) => s.id)]);
    for (const e of battle.events) {
      for (const a of e.actions) {
        if (a.do !== "scene") continue;
        assert.ok(scenes.has(a.sceneId) && en.has(a.sceneId), `${entry.id} 장면 없음: ${a.sceneId}`);
      }
    }
    assert.ok(battle.forced.every((slug) => battle.available.includes(slug)), "forced ⊄ available");
    assert.ok(battle.available.every((slug) => HEROES.some((h) => h.slug === slug)), "명단에 없는 영웅");
    const ids = new Set([...spawnsOf(entry).map((u) => u.id), ...battle.available]);
    const refs = [
      ...(battle.objective.kind === "defeat" || battle.objective.kind === "reach" ? battle.objective.unitIds : []),
      ...battle.loss.flatMap((r) => (r.kind === "unitFalls" ? r.unitIds : [])),
      ...battle.events.flatMap((e) => ("unitId" in e.when ? [e.when.unitId] : e.when.on === "adjacent" ? [e.when.a, e.when.b] : e.when.on === "reach" ? e.when.unitIds : [])),
    ];
    for (const id of refs) assert.ok(ids.has(id), `${entry.id} 없는 장수 ${id}`);
  });
}
