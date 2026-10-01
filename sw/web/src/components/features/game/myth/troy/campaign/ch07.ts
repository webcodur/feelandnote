/*
  파일명: components/features/game/myth/troy/campaign/ch07.ts
  기능: 트로이 전쟁 7장 「아마존의 여왕」 싸움판
  책임: 트로이 앞 넓은 들판(기병이 달리기 좋은 길과 풀밭, 언덕 몇)의 지도·배치·사건을 쥔다.
        펜테실레이아가 아마존 기병을 몰고 곧장 달려든다. 파리스는 왼쪽 언덕에서 쏜다.
*/ // ------------------------------
import type { ChapterBattle } from "../engine/battleTypes";
import { parseMap } from "./mapText";
import { squad, unit } from "./foes";

// x:   0123456789012
const ROWS = [
  "####=GG=####.", // 0 트로이 성벽(가운데 성문)
  "h....rr....hh", // 1
  "hh...rr....h.", // 2
  ".....rr......", // 3
  "..f..rrr...f.", // 4
  ".......r.....", // 5
  "...h...rr....", // 6
  "..........h..", // 7
  ".f.....rr....", // 8
  "........r..f.", // 9
  "........r....", // 10
  "cccc....rcccc", // 11
];
const HEIGHTS = [
  "3333300333330", "2100000000011", "1100000000010", ...Array.from({ length: 3 }, () => "0000000000000"),
  "0001000000000", "0000000000100", ...Array.from({ length: 4 }, () => "0000000000000"),
];

export const CH07_BATTLE: ChapterBattle = {
  id: "ch07",
  map: parseMap({
    rows: ROWS,
    heights: HEIGHTS,
    mood: "day",
    decor: [{ kind: "tent", x: 0, y: 11, rot: 2 }, { kind: "hut", x: 12, y: 11, rot: 2 }, { kind: "tumulus", x: 12, y: 3, rot: 0 }, { kind: "tower", x: 0, y: 0, rot: 0 }],
  }),
  deploy: [{ x: 5, y: 11 }, { x: 6, y: 11 }, { x: 7, y: 11 }, { x: 4, y: 10 }, { x: 5, y: 10 }, { x: 6, y: 10 }, { x: 7, y: 10 }, { x: 9, y: 10 }],
  forced: ["achilles"],
  available: ["achilles", "patroclus", "ajax-the-great", "odysseus", "diomedes", "menelaus", "teucer", "ajax-the-lesser", "antilochus", "nestor", "machaon", "idomeneus", "meriones", "agamemnon", "calchas"],
  maxDeploy: 7,
  units: [
    unit("penthesilea", "penthesilea", 9, 6, 2, { ai: { mode: "charge", targetIds: ["achilles"] } }),
    ...squad("amazon", "amazon", 6, [[4, 2], [8, 2], [3, 3], [9, 3], [5, 4]]),
    unit("paris", "paris", 8, 0, 1, { ai: { mode: "hold" } }),
    unit("aeneas", "aeneas", 9, 7, 1, { ai: { mode: "guard", radius: 4 } }),
    ...squad("trojan-soldier", "soldier", 7, [[5, 1], [11, 2]], { ai: { mode: "guard", radius: 3 } }),
    ...squad("trojan-archer", "archer", 7, [[4, 0], [7, 0]], { ai: { mode: "hold" } }),
  ],
  objective: { kind: "defeat", unitIds: ["penthesilea"] },
  loss: [{ kind: "unitFalls", unitIds: ["achilles"] }],
  rules: [],
  interactables: [],
  events: [
    { id: "penthesilea-charge", when: { on: "turn", turn: 1 }, actions: [{ do: "focus", tile: { x: 6, y: 2 } }, { do: "scene", sceneId: "penthesilea-charge" }] },
    { id: "penthesilea-falls", when: { on: "defeated", unitId: "penthesilea" }, actions: [{ do: "scene", sceneId: "penthesilea-falls" }] },
  ],
};
