/*
  파일명: components/features/game/myth/troy/campaign/ch06.ts
  기능: 트로이 전쟁 6장 「헥토르」 싸움판
  책임: 아킬레우스와 헥토르 둘만의 판. 가운데 성벽 덩어리 둘레로 수레길이 돌고, 한쪽에 두 샘과 무화과나무가 있다(『일리아스』 22권).
        헥토르는 처음 세 차례 달아나고, 4차례에 아테나가 데이포보스 모습으로 속이자 돌아서 싸운다.
*/ // ------------------------------
import type { ChapterBattle } from "../engine/battleTypes";
import { parseMap } from "./mapText";
import { unit } from "./foes";

// x:   0123456789
const ROWS = [
  "..........", // 0
  ".rrrrrrrr.", // 1
  ".r######r.", // 2
  ".r######r.", // 3
  "fr######r.", // 4
  ".r######r.", // 5
  ".r##G###r.", // 6 스카이아이 문(닫힘)
  ".rrrrrrrr.", // 7
  "..........", // 8
  "..........", // 9
];
const HEIGHTS = ["0000000000", "0000000000", "0033333300", "0033333300", "0033333300", "0033333300", "0033033300", "0000000000", "0000000000", "0000000000"];

export const CH06_BATTLE: ChapterBattle = {
  id: "ch06",
  map: parseMap({
    rows: ROWS,
    heights: HEIGHTS,
    mood: "dusk",
    decor: [{ kind: "spring", x: 9, y: 3, rot: 3 }, { kind: "spring", x: 9, y: 5, rot: 3 }, { kind: "tower", x: 2, y: 2, rot: 0 }, { kind: "tower", x: 7, y: 2, rot: 0 }],
  }),
  deploy: [{ x: 4, y: 9 }],
  forced: ["achilles"],
  available: ["achilles"],
  maxDeploy: 1,
  units: [
    unit("hector", "hector", 10, 4, 7, { stats: { hp: 34, str: 12, def: 11 }, ai: { mode: "flee" } }),
  ],
  objective: { kind: "defeat", unitIds: ["hector"] },
  loss: [{ kind: "unitFalls", unitIds: ["achilles"] }],
  rules: [],
  interactables: [],
  events: [
    { id: "chase", when: { on: "turn", turn: 1 }, actions: [{ do: "focus", tile: { x: 4, y: 7 } }, { do: "scene", sceneId: "chase" }] },
    { id: "scales", when: { on: "turn", turn: 3 }, actions: [{ do: "scene", sceneId: "scales" }] },
    {
      id: "athena-deceives", when: { on: "turn", turn: 4 },
      actions: [
        { do: "scene", sceneId: "athena-deceives" },
        { do: "ai", unitIds: ["hector"], ai: { mode: "charge" } },
        { do: "status", unitIds: ["hector"], status: { key: "shaken", turns: 3 } },
      ],
    },
    { id: "hector-falls", when: { on: "defeated", unitId: "hector" }, actions: [{ do: "scene", sceneId: "hector-falls" }] },
  ],
};
