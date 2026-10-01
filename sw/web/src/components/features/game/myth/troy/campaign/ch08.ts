/*
  파일명: components/features/game/myth/troy/campaign/ch08.ts
  기능: 트로이 전쟁 8장 「새벽의 아들」 싸움판
  책임: 동트는 들판(가운데 언덕과 숲)의 지도·배치·사건을 쥔다. 멤논은 늙은 네스토르를 노리고 달려든다.
        2차례에 파리스의 화살이 네스토르의 말을 맞혀 네스토르가 발이 묶인다(핀다로스 『피티아 송가』 6). 안틸로코스가 살면 다른 길이다.
*/ // ------------------------------
import type { ChapterBattle } from "../engine/battleTypes";
import { parseMap } from "./mapText";
import { squad, unit } from "./foes";

// x:   0123456789012
const ROWS = [
  "ff...rr...ff.", // 0
  "f....rr....f.", // 1
  "..h..rr..h...", // 2
  ".....rr......", // 3
  "...f.rr.f....", // 4
  "....hhh......", // 5 가운데 언덕
  "....hhh..f...", // 6
  ".f...rr......", // 7
  ".....rr...h..", // 8
  "..f..rr......", // 9
  ".....rr......", // 10
  "cccccrrcccccc", // 11
];
const HEIGHTS = [
  "0000000000000", "0000000000000", "0010000001000", "0000000000000", "0000000000000",
  "0000121000000", "0000111000000", "0000000000000", "0000000000100", "0000000000000", "0000000000000", "0000000000000",
];

export const CH08_BATTLE: ChapterBattle = {
  id: "ch08",
  map: parseMap({
    rows: ROWS,
    heights: HEIGHTS,
    mood: "dawn",
    decor: [{ kind: "tent", x: 0, y: 11, rot: 2 }, { kind: "hut", x: 12, y: 11, rot: 2 }, { kind: "altar", x: 12, y: 0, rot: 0 }],
  }),
  deploy: [{ x: 5, y: 10 }, { x: 6, y: 10 }, { x: 4, y: 10 }, { x: 7, y: 10 }, { x: 5, y: 11 }, { x: 6, y: 11 }, { x: 3, y: 10 }, { x: 8, y: 10 }],
  forced: ["achilles", "nestor", "antilochus"],
  available: ["achilles", "nestor", "antilochus", "patroclus", "ajax-the-great", "odysseus", "diomedes", "menelaus", "teucer", "ajax-the-lesser", "machaon", "idomeneus", "meriones", "agamemnon", "calchas"],
  maxDeploy: 7,
  units: [
    unit("memnon", "memnon", 9, 5, 1, { ai: { mode: "charge", targetIds: ["nestor"] } }),
    ...squad("aethiopian", "aethiopian", 7, [[2, 1], [4, 2], [8, 2], [10, 1], [3, 3], [10, 3]]),
    unit("paris", "paris", 8, 9, 2, { ai: { mode: "hold" } }),
    ...squad("trojan-soldier", "soldier", 7, [[6, 0], [1, 2]], { ai: { mode: "guard", radius: 4 } }),
  ],
  objective: { kind: "defeat", unitIds: ["memnon"] },
  loss: [{ kind: "unitFalls", unitIds: ["achilles", "nestor"] }],
  rules: [],
  interactables: [],
  events: [
    { id: "thetis-warns", when: { on: "start" }, actions: [{ do: "focus", tile: { x: 5, y: 1 } }, { do: "scene", sceneId: "thetis-warns" }] },
    { id: "nestor-horse", when: { on: "turn", turn: 2 }, actions: [{ do: "scene", sceneId: "nestor-horse" }, { do: "status", unitIds: ["nestor"], status: { key: "rooted", turns: 2 } }] },
    { id: "antilochus-falls", when: { on: "defeated", unitId: "antilochus" }, actions: [{ do: "scene", sceneId: "antilochus-falls" }] },
    { id: "memnon-falls", when: { on: "defeated", unitId: "memnon" }, actions: [{ do: "scene", sceneId: "memnon-falls" }] },
  ],
};
