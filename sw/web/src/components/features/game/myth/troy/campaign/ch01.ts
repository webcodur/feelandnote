/*
  파일명: components/features/game/myth/troy/campaign/ch01.ts
  기능: 트로이 전쟁 1장 「해변에 닿다」 싸움판
  책임: 상륙전의 지도·출진 칸·트로이군 배치·목표·사건을 쥔다. 이야기 글은 story/ch01.ts가 쥔다.
        아래(남)가 바다, 모래 해변에 배 넷, 위로 들판·올리브 숲·언덕. 헥토르는 반쯤 다치면 성으로 물러난다.
*/ // ------------------------------
import type { ChapterBattle } from "../engine/battleTypes";
import { parseMap } from "./mapText";
import { squad, unit } from "./foes";

// x:   0123456789012
const ROWS = [
  "hh..f...f..hh", // 0
  "h.fff.r.ff..h", // 1
  "....f.r......", // 2
  ".h....r...h..", // 3
  "......rr.....", // 4
  "..ff...r..ff.", // 5
  "..f....r.....", // 6
  "sssssssrsssss", // 7
  "sssssssssssss", // 8
  "sSssSssssSssS", // 9
  "~S~~S~~~~S~~S", // 10
  "~~~~~~~~~~~~~", // 11
];
const HEIGHTS = [
  "2100000000012",
  "1000000000001",
  "0000000000000",
  "0100000000100",
  ...Array.from({ length: 8 }, () => "0000000000000"),
];

export const CH01_BATTLE: ChapterBattle = {
  id: "ch01",
  map: parseMap({
    rows: ROWS,
    heights: HEIGHTS,
    mood: "day",
    decor: [
      { kind: "ship", x: 1, y: 9, rot: 0 }, { kind: "ship", x: 4, y: 9, rot: 0 },
      { kind: "ship", x: 9, y: 9, rot: 0 }, { kind: "ship", x: 12, y: 9, rot: 0 },
      { kind: "shieldPile", x: 7, y: 9, rot: 0 }, { kind: "spearRack", x: 2, y: 8, rot: 2 },
    ],
  }),
  deploy: [{ x: 5, y: 8 }, { x: 6, y: 8 }, { x: 4, y: 8 }, { x: 7, y: 8 }, { x: 3, y: 8 }, { x: 8, y: 8 }],
  forced: ["achilles"],
  available: ["achilles", "patroclus", "ajax-the-great", "teucer", "odysseus", "diomedes"],
  maxDeploy: 6,
  units: [
    unit("hector", "hector", 7, 6, 2, { retreatBelow: 0.5, ai: { mode: "guard", radius: 3 } }),
    unit("trojan-chariot", "chariot-1", 3, 6, 1, { ai: { mode: "guard", radius: 5 } }),
    ...squad("trojan-soldier", "soldier", 2, [[3, 5], [7, 5], [10, 6]], { ai: { mode: "guard", radius: 4 } }),
    ...squad("trojan-soldier", "guard", 2, [[4, 3], [8, 3], [5, 4], [9, 4]], { ai: { mode: "guard", radius: 3 } }),
    ...squad("trojan-archer", "archer", 2, [[1, 3], [10, 3], [4, 1]], { ai: { mode: "hold" } }),
  ],
  objective: { kind: "rout" },
  loss: [{ kind: "unitFalls", unitIds: ["achilles"] }],
  rules: [],
  interactables: [],
  events: [
    { id: "hector-appears", when: { on: "turn", turn: 1 }, actions: [{ do: "focus", tile: { x: 6, y: 2 } }, { do: "scene", sceneId: "hector-appears" }] },
    { id: "ajax-teucer", when: { on: "adjacent", a: "teucer", b: "ajax-the-great" }, actions: [{ do: "scene", sceneId: "ajax-teucer" }] },
    { id: "hector-retreat", when: { on: "retreated", unitId: "hector" }, actions: [{ do: "scene", sceneId: "hector-retreat" }] },
  ],
};
