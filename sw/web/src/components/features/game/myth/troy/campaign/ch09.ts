/*
  파일명: components/features/game/myth/troy/campaign/ch09.ts
  기능: 트로이 전쟁 9장 「스카이아이 문」 싸움판
  책임: 스카이아이 문 앞에서 쓰러진 아킬레우스의 주검을 대 아이아스가 메고 배까지 옮기는 판의 지도·배치·원군·사건을 쥔다.
        맨 위가 열린 성문과 성벽 위 궁수, 맨 아래가 진영과 배. 주검을 멘 아이아스는 느리고 치지 못한다 — 다른 장수가 길을 연다.
*/ // ------------------------------
import type { ChapterBattle } from "../engine/battleTypes";
import type { Point } from "../engine/types";
import { parseMap } from "./mapText";
import { squad, unit } from "./foes";

// x:   0123456789012
const ROWS = [
  "=====GG======", // 0 성벽 위 길과 열린 스카이아이 문
  ".....rr......", // 1
  "..f..rr..f...", // 2
  ".....rr......", // 3
  "..h..rr...h..", // 4
  ".....rr......", // 5
  ".f...rr...f..", // 6
  "......r......", // 7
  "..h...r..h...", // 8
  "......r......", // 9
  ".f....r....f.", // 10
  "cccc..r..cccc", // 11
  "ccccccrcccccc", // 12 배 곁 진영(목표)
  "sSsssSssssSss", // 13
  "~S~~~S~~~~S~~", // 14
];
const HEIGHTS = ["3333300333333", ...Array.from({ length: 3 }, () => "0000000000000"), "0010000000100", ...Array.from({ length: 3 }, () => "0000000000000"), "0010000001000", ...Array.from({ length: 6 }, () => "0000000000000")];
const CAMP: Point[] = Array.from({ length: 13 }, (_, x) => ({ x, y: 12 }));
const GATE_OUT: [number, number][] = [[5, 1], [6, 1], [4, 1], [7, 1]];

export const CH09_BATTLE: ChapterBattle = {
  id: "ch09",
  map: parseMap({
    rows: ROWS,
    heights: HEIGHTS,
    mood: "dusk",
    decor: [
      { kind: "ship", x: 1, y: 13, rot: 0 }, { kind: "ship", x: 5, y: 13, rot: 0 }, { kind: "ship", x: 10, y: 13, rot: 0 },
      { kind: "tower", x: 2, y: 0, rot: 0 }, { kind: "tower", x: 10, y: 0, rot: 0 }, { kind: "tent", x: 0, y: 11, rot: 2 }, { kind: "hut", x: 12, y: 11, rot: 2 },
    ],
  }),
  deploy: [{ x: 5, y: 3 }, { x: 6, y: 3 }, { x: 5, y: 4 }, { x: 6, y: 4 }, { x: 4, y: 3 }, { x: 7, y: 3 }, { x: 4, y: 5 }, { x: 7, y: 5 }],
  forced: ["achilles", "ajax-the-great", "odysseus"],
  available: ["achilles", "ajax-the-great", "odysseus", "diomedes", "menelaus", "teucer", "ajax-the-lesser", "antilochus", "patroclus", "idomeneus", "meriones", "machaon", "nestor", "agamemnon", "calchas"],
  maxDeploy: 7,
  units: [
    unit("paris", "paris", 11, 4, 0, { ai: { mode: "hold" } }),
    ...squad("trojan-archer", "archer", 9, [[1, 0], [8, 0], [11, 0]], { ai: { mode: "hold" } }),
    unit("aeneas", "aeneas", 11, 5, 1),
    unit("glaucus", "glaucus", 10, 7, 1),
    unit("deiphobus", "deiphobus", 10, 3, 1),
    ...squad("trojan-soldier", "soldier", 9, [[2, 1], [9, 1], [1, 2], [11, 2]]),
  ],
  objective: { kind: "reach", unitIds: ["ajax-the-great"], tiles: CAMP },
  loss: [{ kind: "unitFalls", unitIds: ["ajax-the-great"] }],
  rules: [],
  interactables: [],
  events: [
    {
      id: "achilles-falls", when: { on: "start" },
      actions: [
        { do: "flag", flag: "gate-open" },
        { do: "focus", tile: { x: 5, y: 2 } },
        { do: "scene", sceneId: "achilles-falls" },
        { do: "kill", unitId: "achilles" },
        { do: "status", unitIds: ["ajax-the-great"], status: { key: "carrying", turns: -1 } },
      ],
    },
    { id: "odysseus-rear", when: { on: "turn", turn: 1 }, actions: [{ do: "scene", sceneId: "odysseus-rear" }] },
    { id: "glaucus-falls", when: { on: "defeated", unitId: "glaucus" }, actions: [{ do: "scene", sceneId: "glaucus-falls" }] },
    { id: "wave-2", when: { on: "turn", turn: 2, phase: "enemy" }, actions: [{ do: "spawn", units: squad("trojan-soldier", "wave2", 9, GATE_OUT) }] },
    { id: "wave-4", when: { on: "turn", turn: 4, phase: "enemy" }, actions: [{ do: "spawn", units: [...squad("trojan-soldier", "wave4", 10, GATE_OUT.slice(0, 2)), ...squad("trojan-chariot", "wave4-chariot", 10, GATE_OUT.slice(2))] }] },
  ],
};
