/*
  파일명: components/features/game/myth/troy/campaign/ch04.ts
  기능: 트로이 전쟁 4장 「파트로클로스」 싸움판
  책임: 배까지 밀고 들어온 트로이군을 몰아내는 판의 지도·배치·사건을 쥔다. 맨 위가 트로이 성벽, 그 앞 두 줄이 금지 구역이다.
        파트로클로스가 그 구역에 들어서면 아폴론이 내려와 무구를 벗긴다(『일리아스』 16권). 들어서지 않고 이기면 호메로스와 다른 길이다.
*/ // ------------------------------
import type { ChapterBattle } from "../engine/battleTypes";
import type { Point } from "../engine/types";
import { parseMap } from "./mapText";
import { squad, unit } from "./foes";

// x:   01234567890123
const ROWS = [
  "######GG######", // 0 트로이 성벽
  "......rr......", // 1 금지 구역
  "..f...rr...f..", // 2 금지 구역
  "......rr......", // 3
  ".h....rr....h.", // 4
  "..f...rr...f..", // 5
  "......rr......", // 6
  "tttttt..tttttt", // 7
  "pp.pp....pp.pp", // 8 3장에 무너진 벽
  "cccccc..cccccc", // 9
  "ccc.cc..cc.ccc", // 10
  "ssssssssssssss", // 11
  "sSssSssSssSsSs", // 12
  "~S~~S~~S~~S~S~", // 13
];
const HEIGHTS = ["33333300333333", ...Array.from({ length: 3 }, () => "00000000000000"), "01000000000010", ...Array.from({ length: 9 }, () => "00000000000000")];
const SHIP_X = [1, 4, 7, 10, 12];
const WALLS: Point[] = [1, 2].flatMap((y) => Array.from({ length: 14 }, (_, x) => ({ x, y })));
const APPROACH: Point[] = Array.from({ length: 14 }, (_, x) => ({ x, y: 3 }));

export const CH04_BATTLE: ChapterBattle = {
  id: "ch04",
  map: parseMap({
    rows: ROWS,
    heights: HEIGHTS,
    mood: "day",
    decor: [
      ...SHIP_X.map((x) => ({ kind: "ship" as const, x, y: 12, rot: 0 as const })),
      { kind: "hut", x: 0, y: 9, rot: 2 }, { kind: "hut", x: 1, y: 9, rot: 2 }, { kind: "tent", x: 13, y: 9, rot: 2 },
      { kind: "tower", x: 0, y: 0, rot: 0 }, { kind: "tower", x: 13, y: 0, rot: 0 }, { kind: "brazier", x: 5, y: 10, rot: 0 },
    ],
  }),
  deploy: [{ x: 2, y: 10 }, { x: 1, y: 10 }, { x: 0, y: 10 }, { x: 2, y: 9 }, { x: 3, y: 9 }, { x: 4, y: 10 }, { x: 5, y: 9 }],
  forced: ["patroclus"],
  available: ["patroclus", "ajax-the-great", "ajax-the-lesser", "teucer", "menelaus", "idomeneus", "meriones", "machaon"],
  maxDeploy: 6,
  units: [
    unit("sarpedon", "sarpedon", 8, 10, 5, { ai: { mode: "guard", radius: 4 } }),
    unit("glaucus", "glaucus", 7, 11, 4, { ai: { mode: "guard", radius: 4 } }),
    ...squad("lycian", "lycian", 5, [[9, 5], [11, 6], [10, 4]], { ai: { mode: "guard", radius: 3 } }),
    unit("hector", "hector", 8, 7, 2, { ai: { mode: "guard", radius: 3 } }),
    ...squad("trojan-soldier", "raider", 4, [[6, 9], [8, 10], [9, 11], [11, 10], [7, 11]]),
    ...squad("trojan-archer", "archer", 4, [[1, 4], [12, 4]], { ai: { mode: "hold" } }),
    ...squad("trojan-chariot", "chariot", 5, [[3, 3], [10, 2]], { ai: { mode: "guard", radius: 4 } }),
  ],
  objective: { kind: "defeat", unitIds: ["sarpedon"] },
  loss: [{ kind: "turnLimit", turns: 14 }],
  rules: [{ kind: "zone", unitId: "patroclus", tiles: WALLS, flag: "patroclus-at-walls" }],
  interactables: [],
  events: [
    {
      id: "borrowed-armor", when: { on: "start" },
      actions: [
        { do: "spawn", units: squad("myrmidon", "myrmidon", 7, [[0, 11], [1, 11], [2, 11], [3, 11]]) },
        { do: "status", unitIds: ["patroclus"], status: { key: "borrowedArmor", turns: 3 } },
        { do: "scene", sceneId: "borrowed-armor" },
      ],
    },
    { id: "achilles-warning", when: { on: "reach", unitIds: ["patroclus"], tiles: APPROACH }, actions: [{ do: "scene", sceneId: "achilles-warning" }] },
    {
      id: "apollo-strikes", when: { on: "flag", flag: "patroclus-at-walls" },
      actions: [
        { do: "spawn", units: [unit("apollo", "apollo", 1, 7, 1, { ai: { mode: "idle" } })] },
        { do: "scene", sceneId: "apollo-strikes" },
        { do: "status", unitIds: ["patroclus"], status: { key: "stripped", turns: -1 } },
        { do: "clearStatus", unitIds: ["patroclus"], key: "borrowedArmor" },
        { do: "ai", unitIds: ["hector"], ai: { mode: "charge", targetIds: ["patroclus"] } },
        { do: "status", unitIds: ["hector"], status: { key: "blessed", turns: 3 } },
      ],
    },
    { id: "patroclus-falls", when: { on: "defeated", unitId: "patroclus" }, actions: [{ do: "scene", sceneId: "patroclus-falls" }] },
    { id: "sarpedon-falls", when: { on: "defeated", unitId: "sarpedon" }, actions: [{ do: "scene", sceneId: "sarpedon-falls" }] },
  ],
};
