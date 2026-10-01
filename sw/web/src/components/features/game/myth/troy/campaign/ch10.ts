/*
  파일명: components/features/game/myth/troy/campaign/ch10.ts
  기능: 트로이 전쟁 10장 「목마」 싸움판
  책임: 잠든 트로이 성안(밤)의 지도·배치·사건을 쥔다. 맨 위 성채에 아테나 신전과 목마, 가운데로 돌길과 집, 맨 아래 성벽에 스카이아이 문.
        문 안쪽 칸에서 「성문 열기」를 하면 아가멤논의 군대가 들어온다. 데이포보스는 오른쪽 자기 집 앞을 지킨다.
*/ // ------------------------------
import type { ChapterBattle } from "../engine/battleTypes";
import type { Point } from "../engine/types";
import { parseMap } from "./mapText";
import { squad, unit } from "./foes";

// x:   0123456789012
const ROWS = [
  "bbbTTTTTbbbbb", // 0 아테나 신전
  "bkkTTTTTkkkbb", // 1
  "bkkkkkkkkkkkb", // 2 목마가 선 성채 마당
  "bkkkkkkkkkkkb", // 3
  "bbkkbbkbbkkbb", // 4
  "bkkkkkkkkkkkb", // 5
  "bkbbkkkkbbkkb", // 6
  "bkkkkkkkkkkkb", // 7 데이포보스의 집 앞(오른쪽)
  "bbkbbkkkbbkkb", // 8
  "bkkkkkkkkkkkb", // 9
  "bkkkkkkkkkkkb", // 10
  "######G######", // 11 스카이아이 문(닫힘)
  "......r......", // 12 성 밖
];
const HEIGHTS = [...Array.from({ length: 11 }, () => "0000000000000"), "3333330333333", "0000000000000"];
const TEMPLE: Point[] = [3, 4, 5, 6, 7].map((x) => ({ x, y: 1 }));
const OUTSIDE: [number, number][] = [[6, 12], [5, 12], [7, 12], [4, 12], [8, 12]];

export const CH10_BATTLE: ChapterBattle = {
  id: "ch10",
  map: parseMap({
    rows: ROWS,
    heights: HEIGHTS,
    mood: "night",
    decor: [
      { kind: "horse", x: 5, y: 2, rot: 0 }, { kind: "statue", x: 5, y: 1, rot: 0 },
      { kind: "brazier", x: 2, y: 5, rot: 0 }, { kind: "brazier", x: 10, y: 5, rot: 0 }, { kind: "brazier", x: 5, y: 9, rot: 0 }, { kind: "brazier", x: 11, y: 7, rot: 0 },
    ],
  }),
  deploy: [{ x: 4, y: 3 }, { x: 7, y: 3 }, { x: 4, y: 2 }, { x: 7, y: 2 }, { x: 3, y: 2 }, { x: 8, y: 2 }, { x: 3, y: 3 }, { x: 8, y: 3 }],
  forced: ["odysseus", "menelaus"],
  available: ["odysseus", "menelaus", "diomedes", "ajax-the-lesser", "teucer", "idomeneus", "meriones", "antilochus", "machaon", "calchas"],
  maxDeploy: 7,
  units: [
    unit("deiphobus", "deiphobus", 10, 10, 7, { ai: { mode: "hold" } }),
    unit("helenus", "helenus", 8, 11, 6, { ai: { mode: "hold" } }),
    unit("aeneas", "aeneas", 9, 2, 7, { ai: { mode: "guard", radius: 3 } }),
    ...squad("trojan-guard", "guard", 8, [[2, 5], [6, 5], [9, 5], [2, 9], [6, 9], [10, 9], [4, 7], [9, 7]], { ai: { mode: "guard", radius: 2 } }),
    ...squad("trojan-archer", "archer", 8, [[11, 2], [1, 10]], { ai: { mode: "guard", radius: 3 } }),
  ],
  objective: { kind: "defeat", unitIds: ["deiphobus"] },
  loss: [{ kind: "unitFalls", unitIds: ["odysseus", "menelaus"] }, { kind: "turnLimit", turns: 14 }],
  rules: [],
  interactables: [{ id: "gate", tiles: [{ x: 6, y: 10 }], labelKey: "openGate", flag: "gate-open", side: "player" }],
  events: [
    { id: "out-of-horse", when: { on: "start" }, actions: [{ do: "focus", tile: { x: 5, y: 3 } }, { do: "scene", sceneId: "out-of-horse" }] },
    {
      id: "gate-open", when: { on: "flag", flag: "gate-open" },
      actions: [
        { do: "focus", tile: { x: 6, y: 11 } },
        { do: "scene", sceneId: "gate-open" },
        { do: "spawn", units: [unit("agamemnon-host", "agamemnon-host", 14, 6, 12), ...squad("achaean-soldier", "host", 12, OUTSIDE.slice(1))] },
      ],
    },
    { id: "cassandra", when: { on: "reach", unitIds: ["ajax-the-lesser"], tiles: TEMPLE }, actions: [{ do: "scene", sceneId: "cassandra" }] },
    { id: "aeneas-leaves", when: { on: "turn", turn: 6 }, actions: [{ do: "retreat", unitId: "aeneas" }] },
    { id: "deiphobus-falls", when: { on: "defeated", unitId: "deiphobus" }, actions: [{ do: "scene", sceneId: "deiphobus-falls" }] },
  ],
};
