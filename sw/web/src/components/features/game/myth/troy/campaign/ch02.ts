/*
  파일명: components/features/game/myth/troy/campaign/ch02.ts
  기능: 트로이 전쟁 2장 「깨진 휴전」 싸움판
  책임: 휴전이 깨진 들판의 지도·배치·사건을 쥔다. 가운데를 가르는 강(시모에이스)은 여울 셋과 양 끝 들로만 건넌다.
        판다로스는 왼쪽 위 언덕에서 멀리 쏜다. 3차례에 아프로디테, 5차례에 아레스가 내려오고, 디오메데스만 신을 벨 수 있다.
        아레스는 창(heroSpear)으로 붙어 싸워, 디오메데스가 되받아치면 다쳐 물러난다.
*/ // ------------------------------
import type { ChapterBattle } from "../engine/battleTypes";
import { parseMap } from "./mapText";
import { squad, unit } from "./foes";

// x:   01234567890123
const ROWS = [
  "hh..f.rr.f..hh", // 0
  "h.ff..rr..ff.h", // 1
  "..ff..rr..f...", // 2
  "......rr......", // 3
  "..w~~~ww~~~w..", // 4
  "..w~~~ww~~~w..", // 5
  "....f.rr.f....", // 6
  "..h...rr...h..", // 7
  "......rr......", // 8
  ".ff...rr...ff.", // 9
  "cccc..rr..cccc", // 10
  "cccc..rr..cccc", // 11
];
const HEIGHTS = [
  "21000000000012",
  "10000000000001",
  ...Array.from({ length: 5 }, () => "00000000000000"),
  "00100000000100",
  ...Array.from({ length: 4 }, () => "00000000000000"),
];

export const CH02_BATTLE: ChapterBattle = {
  id: "ch02",
  map: parseMap({
    rows: ROWS,
    heights: HEIGHTS,
    mood: "day",
    decor: [
      { kind: "tent", x: 0, y: 11, rot: 2 }, { kind: "hut", x: 13, y: 11, rot: 2 },
      { kind: "brazier", x: 3, y: 10, rot: 0 }, { kind: "brazier", x: 10, y: 10, rot: 0 },
    ],
  }),
  deploy: [{ x: 6, y: 10 }, { x: 7, y: 10 }, { x: 5, y: 10 }, { x: 8, y: 10 }, { x: 6, y: 9 }, { x: 7, y: 9 }, { x: 4, y: 10 }, { x: 9, y: 10 }],
  forced: ["diomedes", "menelaus"],
  available: ["diomedes", "menelaus", "odysseus", "ajax-the-great", "teucer", "idomeneus", "meriones", "machaon", "calchas"],
  maxDeploy: 7,
  units: [
    unit("pandarus", "pandarus", 5, 0, 0, { ai: { mode: "hold" } }),
    unit("aeneas", "aeneas", 6, 7, 2, { ai: { mode: "guard", radius: 3 } }),
    unit("glaucus", "glaucus", 5, 11, 2, { ai: { mode: "guard", radius: 3 } }),
    ...squad("trojan-soldier", "soldier", 2, [[4, 3], [9, 3], [12, 3]]),
    ...squad("trojan-soldier", "guard", 2, [[5, 2], [8, 2]], { ai: { mode: "guard", radius: 3 } }),
    ...squad("trojan-archer", "archer", 2, [[2, 1], [11, 1], [13, 1]], { ai: { mode: "hold" } }),
    ...squad("trojan-chariot", "chariot", 2, [[6, 3], [7, 3]], { ai: { mode: "guard", radius: 4 } }),
  ],
  objective: { kind: "defeat", unitIds: ["pandarus"] },
  loss: [{ kind: "unitFalls", unitIds: ["diomedes", "menelaus"] }],
  rules: [{ kind: "truce", pairs: [["diomedes", "glaucus"]] }],
  interactables: [],
  events: [
    { id: "athena-diomedes", when: { on: "start" }, actions: [{ do: "hp", unitIds: ["menelaus"], ratio: 0.7 }, { do: "scene", sceneId: "athena-diomedes" }] },
    {
      id: "aphrodite-arrives", when: { on: "turn", turn: 3 },
      actions: [
        // 아프로디테는 싸우는 신이 아니다(5권 348~351). 아이네이아스를 감싸 안을 뿐 되받아치지 않는다
        { do: "spawn", units: [unit("aphrodite", "aphrodite", 1, 7, 1, { ai: { mode: "idle" }, tags: ["noCounter"] })] },
        { do: "focus", tile: { x: 7, y: 1 } },
        { do: "scene", sceneId: "aphrodite-arrives" },
      ],
    },
    { id: "aphrodite-wounded", when: { on: "hpBelow", unitId: "aphrodite", ratio: 0.99 }, actions: [{ do: "scene", sceneId: "aphrodite-wounded" }, { do: "retreat", unitId: "aphrodite" }] },
    {
      id: "ares-arrives", when: { on: "turn", turn: 5 },
      actions: [
        // 아레스는 창을 들고 곧장 디오메데스에게 달려든다(5권 850~859). 붙어 찔러야 하니 디오메데스의 되받아치기가 닿는다
        { do: "spawn", units: [{ ...unit("ares", "ares", 1, 6, 3, { stats: { res: 4, spd: 7 }, ai: { mode: "charge", targetIds: ["diomedes"] } }), weapon: "heroSpear" }] },
        { do: "focus", tile: { x: 6, y: 3 } },
        { do: "scene", sceneId: "ares-arrives" },
        // 아테나가 디오메데스의 전차에 함께 오른다(『일리아스』 5권 835~841)
        { do: "status", unitIds: ["diomedes"], status: { key: "divineStrike", turns: 3 } },
        { do: "status", unitIds: ["diomedes"], status: { key: "blessed", turns: 3 } },
      ],
    },
    { id: "ares-wounded", when: { on: "hpBelow", unitId: "ares", ratio: 0.99 }, actions: [{ do: "scene", sceneId: "ares-wounded" }, { do: "retreat", unitId: "ares" }] },
    { id: "glaucus-truce", when: { on: "adjacent", a: "diomedes", b: "glaucus" }, actions: [{ do: "scene", sceneId: "glaucus-truce" }, { do: "retreat", unitId: "glaucus" }] },
    { id: "aeneas-rescued", when: { on: "retreated", unitId: "aeneas" }, actions: [{ do: "scene", sceneId: "aeneas-rescued" }] },
    { id: "pandarus-falls", when: { on: "defeated", unitId: "pandarus" }, actions: [{ do: "scene", sceneId: "pandarus-falls" }] },
  ],
};
