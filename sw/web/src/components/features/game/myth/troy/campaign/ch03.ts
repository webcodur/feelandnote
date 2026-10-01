/*
  파일명: components/features/game/myth/troy/campaign/ch03.ts
  기능: 트로이 전쟁 3장 「함선 앞에서」 싸움판
  책임: 배 앞 방벽을 지키는 버티기 판의 지도·배치·원군·사건을 쥔다. 아래가 바다와 배 다섯, 그 위 진영·말뚝 벽·도랑, 위가 트로이군이 오는 들판.
        말뚝 벽은 틈 셋(왼쪽·가운데·오른쪽)으로만 지난다. 적이 배 곁에서 차례를 마치면 배가 탄다. 7차례에 아폴론이 벽을 허문다.
*/ // ------------------------------
import type { ChapterBattle } from "../engine/battleTypes";
import type { Point } from "../engine/types";
import { parseMap } from "./mapText";
import { squad, unit } from "./foes";

// x:   01234567890123
const ROWS = [
  "hh..f.rr.f..hh", // 0
  "h...f.rr.f...h", // 1
  "......rr......", // 2
  "..f...rr...f..", // 3
  "......rr......", // 4
  "tttttt..tttttt", // 5
  "pp.ppp..ppp.pp", // 6
  "cc.ccc..ccc.cc", // 7
  "cccccc..cccccc", // 8
  "ssssssssssssss", // 9
  "sSsSssSsssSsSs", // 10
  "~S~S~~S~~~S~S~", // 11
  "~~~~~~~~~~~~~~", // 12
];
const HEIGHTS = ["21000000000012", "10000000000001", ...Array.from({ length: 11 }, () => "00000000000000")];
const SHIP_X = [1, 3, 6, 10, 12];
const SHIPS = SHIP_X.map((x, i) => ({ id: `ship-${i + 1}`, tiles: [{ x, y: 10 }, { x, y: 11 }] }));
// 배 곁 모래 — 트로이군이 노리는 칸
const SHORE: Point[] = SHIP_X.map((x) => ({ x, y: 9 }));
const SEEK_SHIPS = { mode: "seek" as const, goal: SHORE };
// 아폴론이 허무는 벽(가운데 틈 양옆 말뚝 벽과 도랑)
const BREACH: Point[] = [3, 4, 5, 8, 9, 10].map((x) => ({ x, y: 6 }));
const FILLED: Point[] = [4, 5, 8, 9].map((x) => ({ x, y: 5 }));

export const CH03_BATTLE: ChapterBattle = {
  id: "ch03",
  map: parseMap({
    rows: ROWS,
    heights: HEIGHTS,
    mood: "dusk",
    decor: [
      ...SHIP_X.map((x) => ({ kind: "ship" as const, x, y: 10, rot: 0 as const })),
      { kind: "hut", x: 0, y: 8, rot: 2 }, { kind: "tent", x: 13, y: 8, rot: 2 }, { kind: "tent", x: 0, y: 7, rot: 2 }, { kind: "hut", x: 13, y: 7, rot: 2 },
      { kind: "brazier", x: 5, y: 8, rot: 0 }, { kind: "brazier", x: 8, y: 8, rot: 0 }, { kind: "shieldPile", x: 4, y: 9, rot: 0 },
    ],
  }),
  deploy: [{ x: 6, y: 8 }, { x: 7, y: 8 }, { x: 5, y: 8 }, { x: 8, y: 8 }, { x: 2, y: 7 }, { x: 11, y: 7 }, { x: 6, y: 9 }, { x: 7, y: 9 }],
  forced: ["ajax-the-great"],
  available: ["ajax-the-great", "teucer", "ajax-the-lesser", "idomeneus", "meriones", "nestor", "antilochus", "menelaus", "odysseus", "diomedes", "agamemnon", "machaon", "calchas"],
  maxDeploy: 8,
  units: [
    unit("hector", "hector", 5, 6, 4, { retreatBelow: 0.4, ai: SEEK_SHIPS }),
    unit("sarpedon", "sarpedon", 5, 3, 3),
    ...squad("lycian", "lycian", 4, [[2, 4], [4, 4]]),
    unit("glaucus", "glaucus", 4, 10, 3),
    unit("aeneas", "aeneas", 5, 11, 4),
    unit("paris", "paris", 5, 4, 1),
    ...squad("trojan-soldier", "soldier", 3, [[1, 4], [5, 4], [9, 4], [12, 4]], { ai: SEEK_SHIPS }),
    ...squad("trojan-archer", "archer", 3, [[0, 0], [13, 0]], { ai: { mode: "hold" } }),
  ],
  objective: { kind: "survive", turns: 8 },
  loss: [{ kind: "unitFalls", unitIds: ["ajax-the-great"] }],
  rules: [{ kind: "burnShips", ships: SHIPS, lossAt: 3 }],
  interactables: [],
  events: [
    {
      id: "wall-broken", when: { on: "start" },
      actions: [{ do: "hp", unitIds: ["odysseus", "diomedes", "agamemnon", "machaon"], ratio: 0.6 }, { do: "focus", tile: { x: 6, y: 4 } }, { do: "scene", sceneId: "wall-broken" }],
    },
    { id: "wave-2", when: { on: "turn", turn: 2, phase: "enemy" }, actions: [{ do: "spawn", units: [unit("polydamas", "polydamas", 5, 6, 0), ...squad("trojan-soldier", "wave2", 3, [[7, 0]], { ai: SEEK_SHIPS })] }] },
    {
      id: "poseidon-aid", when: { on: "turn", turn: 3 },
      actions: [
        { do: "spawn", units: [unit("poseidon", "poseidon", 1, 7, 9, { stats: { res: 10 }, ai: { mode: "charge" } })] },
        { do: "scene", sceneId: "poseidon-aid" },
        { do: "status", unitIds: ["@player"], status: { key: "blessed", turns: 2 } },
      ],
    },
    { id: "wave-4", when: { on: "turn", turn: 4, phase: "enemy" }, actions: [{ do: "spawn", units: [unit("deiphobus", "deiphobus", 5, 6, 0), ...squad("trojan-soldier", "wave4", 3, [[7, 0]]), unit("trojan-archer", "wave4-archer", 3, 4, 0, { ai: { mode: "hold" } })] }] },
    { id: "hera-zeus", when: { on: "turn", turn: 5 }, actions: [{ do: "scene", sceneId: "hera-zeus" }, { do: "status", unitIds: ["@player"], status: { key: "blessed", turns: 2 } }] },
    { id: "poseidon-leaves", when: { on: "turn", turn: 6 }, actions: [{ do: "retreat", unitId: "poseidon" }] },
    { id: "hector-struck", when: { on: "retreated", unitId: "hector" }, actions: [{ do: "flag", flag: "hector-down" }, { do: "scene", sceneId: "hector-struck" }] },
    { id: "hector-slain", when: { on: "defeated", unitId: "hector" }, actions: [{ do: "flag", flag: "hector-down" }] },
    { id: "wave-6", when: { on: "turn", turn: 6, phase: "enemy" }, actions: [{ do: "spawn", units: [...squad("lycian", "wave6-lycian", 4, [[2, 0], [11, 0]])] }] },
    {
      id: "apollo-revives", when: { on: "turn", turn: 7 },
      actions: [
        { do: "spawn", units: [unit("apollo", "apollo", 1, 7, 2, { ai: { mode: "idle" } })] },
        { do: "focus", tile: { x: 7, y: 5 } },
        { do: "scene", sceneId: "apollo-revives" },
        { do: "terrain", tiles: BREACH, terrain: "plain" },
        { do: "terrain", tiles: FILLED, terrain: "plain" },
      ],
    },
    { id: "hector-returns", when: { on: "turn", turn: 7 }, ifFlag: "hector-down", actions: [{ do: "spawn", units: [unit("hector", "hector-2", 6, 7, 1, { ai: SEEK_SHIPS, statuses: [{ key: "blessed", turns: 3 }] })] }] },
    { id: "wave-7", when: { on: "turn", turn: 7, phase: "enemy" }, actions: [{ do: "spawn", units: squad("trojan-soldier", "wave7", 4, [[5, 0], [6, 0], [7, 0]], { ai: SEEK_SHIPS }) }] },
    { id: "ship-fire", when: { on: "flag", flag: "ship-burned:*" }, actions: [{ do: "scene", sceneId: "ship-fire" }] },
  ],
};
