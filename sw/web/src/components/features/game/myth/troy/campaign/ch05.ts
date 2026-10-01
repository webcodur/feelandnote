/*
  파일명: components/features/game/myth/troy/campaign/ch05.ts
  기능: 트로이 전쟁 5장 「강의 분노」 싸움판
  책임: 스카만드로스 강을 건너 스카이아이 문 앞 벌판(맨 위 두 줄)에 닿는 판의 지도·배치·사건을 쥔다.
        적 차례마다 물이 번져 여울이 닫힌다. 4차례에 헤파이스토스의 불이 강을 말려 길이 열리고 강의 신이 물러난다(『일리아스』 21권).
*/ // ------------------------------
import type { ChapterBattle } from "../engine/battleTypes";
import type { Point } from "../engine/types";
import { parseMap } from "./mapText";
import { squad, unit } from "./foes";

// x:   012345678901
const ROWS = [
  "....rrrr....", // 0 문 앞 벌판(목표)
  ".f..rrrr..f.", // 1 문 앞 벌판(목표)
  "..f..rr..f..", // 2
  "......r.....", // 3
  ".w..w.r.w..w", // 4
  "~~~ww~w~~~~~", // 5
  "~~~~~~w~~ww~", // 6 가운데 여울은 강의 신이 막고 있다
  "~~ww~~w~~~~~", // 7
  "w~~~~~w~~~ww", // 8
  ".w...w..w...", // 9
  "..f......f..", // 10
  "....h..h....", // 11
  ".....rr.....", // 12
  ".....rr.....", // 13
];
const HEIGHTS = [...Array.from({ length: 11 }, () => "000000000000"), "000010010000", "000000000000", "000000000000"];
const GOAL: Point[] = [0, 1].flatMap((y) => Array.from({ length: 12 }, (_, x) => ({ x, y })));
// 헤파이스토스의 불: 가운데 강바닥은 모래로, 나머지 강은 여울로
const DRY: Point[] = [5, 6, 7, 8].flatMap((y) => [4, 5, 6, 7].map((x) => ({ x, y })));
const WADE: Point[] = [5, 6, 7, 8].flatMap((y) => [0, 1, 2, 3, 8, 9, 10, 11].map((x) => ({ x, y })));

export const CH05_BATTLE: ChapterBattle = {
  id: "ch05",
  map: parseMap({ rows: ROWS, heights: HEIGHTS, mood: "dusk", decor: [{ kind: "tumulus", x: 0, y: 12, rot: 0 }, { kind: "altar", x: 11, y: 13, rot: 2 }] }),
  deploy: [{ x: 5, y: 12 }, { x: 6, y: 12 }, { x: 5, y: 13 }, { x: 6, y: 13 }],
  forced: ["achilles"],
  available: ["achilles", "patroclus", "ajax-the-great", "diomedes", "odysseus", "teucer", "menelaus", "ajax-the-lesser", "antilochus", "idomeneus", "meriones", "machaon", "calchas", "agamemnon", "nestor"],
  maxDeploy: 4,
  units: [
    unit("scamander", "scamander", 1, 6, 6, { stats: { res: 9 }, ai: { mode: "hold" } }),
    ...squad("trojan-soldier", "fleeing", 6, [[3, 4], [8, 4], [1, 9], [9, 9]], { ai: { mode: "flee" } }),
    ...squad("trojan-soldier", "rear", 6, [[5, 9], [7, 10]]),
    ...squad("trojan-archer", "archer", 6, [[2, 2], [9, 2], [6, 3]], { ai: { mode: "hold" } }),
  ],
  objective: { kind: "reach", unitIds: ["achilles"], tiles: GOAL },
  loss: [{ kind: "unitFalls", unitIds: ["achilles"] }, { kind: "turnLimit", turns: 12 }],
  rules: [{ kind: "flood", stopFlag: "fire" }],
  interactables: [],
  events: [
    { id: "scamander-speaks", when: { on: "start" }, actions: [{ do: "focus", tile: { x: 6, y: 6 } }, { do: "scene", sceneId: "scamander-speaks" }] },
    { id: "achilles-prays", when: { on: "turn", turn: 3 }, actions: [{ do: "scene", sceneId: "achilles-prays" }, { do: "status", unitIds: ["achilles"], status: { key: "blessed", turns: 2 } }] },
    {
      id: "hephaestus-fire", when: { on: "turn", turn: 4 },
      actions: [
        { do: "scene", sceneId: "hephaestus-fire" },
        { do: "flag", flag: "fire" },
        { do: "terrain", tiles: DRY, terrain: "sand" },
        { do: "terrain", tiles: WADE, terrain: "shallow" },
        { do: "retreat", unitId: "scamander" },
      ],
    },
  ],
};
