/*
  파일명: components/features/game/myth/troy/campaign/lineScene.ts
  기능: 장마다 인물 대사가 기댈 배경
  책임: 장의 배경 표지(배·성벽·성문·밤·트로이 함락…), 그 장에서 이야기대로 죽는 인물, 이긴 뒤 한마디가 불러도 되는 인물을 쥐고,
        원정 표지(dead:*)·함께 나선 우리 편과 합쳐 지금 장면(LineScene)을 만든다. 대사를 가리는 규칙은 lineRules.ts가 쥔다.
*/ // ------------------------------
import type { LineScene } from "./lineRules";

interface ChapterLines {
  tags: string[];
  // 이 장이 끝날 때 이야기대로 죽는 인물(파트로클로스·안틸로코스는 판 결과에 따라 표지로 남는다)
  slain: string[];
  echo: string[];
}

const LINES: Record<string, ChapterLines> = {
  ch01: { tags: ["ships", "myrmidons"], slain: [], echo: [] },
  ch02: { tags: ["oath", "goddess-wounded"], slain: ["pandarus"], echo: ["ares", "aphrodite", "pandarus", "aeneas", "glaucus", "paris"] },
  ch03: { tags: ["ships", "wall"], slain: [], echo: ["hector", "sarpedon-of-lycia", "poseidon"] },
  ch04: { tags: ["ships", "wall", "gate", "myrmidons", "borrowed-armor"], slain: ["sarpedon-of-lycia"], echo: ["sarpedon-of-lycia", "achilles", "apollo"] },
  ch05: { tags: ["returned", "myrmidons"], slain: [], echo: ["scamander", "hephaestus"] },
  ch06: { tags: ["wall", "gate", "returned"], slain: ["hector"], echo: ["hector", "athena"] },
  ch07: { tags: ["wall", "gate", "returned", "myrmidons"], slain: ["penthesilea"], echo: ["penthesilea"] },
  ch08: { tags: ["returned", "myrmidons"], slain: ["memnon"], echo: ["memnon", "antilochus"] },
  ch09: { tags: ["wall", "gate", "ships", "returned", "myrmidons"], slain: ["achilles", "glaucus", "paris", "ajax-the-great"], echo: ["achilles", "paris", "glaucus"] },
  ch10: { tags: ["wall", "gate", "night", "sack"], slain: ["deiphobus"], echo: ["deiphobus", "helen-of-troy"] },
};

const ORDER = Object.keys(LINES);

// 이 장면에서 이미 죽은 인물. 끝난 판(이긴 뒤 한마디)은 이 장에서 죽은 인물까지 넣는다
export function deadBy(chapterId: string, flags: string[], finished: boolean): string[] {
  const at = ORDER.indexOf(chapterId);
  const before = ORDER.slice(0, finished ? at + 1 : Math.max(0, at)).flatMap((id) => LINES[id]?.slain ?? []);
  const marked = flags.filter((f) => f.startsWith("dead:")).map((f) => f.slice(5));
  return [...new Set([...before, ...marked])];
}

export interface BoardNow {
  // 함께 나선(판 위의) 우리 편 인물 slug
  allies: string[];
  // 이번 판에 우리 편이 쓰러졌나(「동료의 몸에서 물러서라」)
  comradeFell?: boolean;
}

export function lineScene(chapterId: string, flags: string[], finished: boolean, board: BoardNow): LineScene {
  const lines = LINES[chapterId];
  const tags = [
    ...(lines?.tags ?? []),
    ...(board.allies.includes("ajax-the-great") ? ["ajax"] : []),
    ...(board.comradeFell ? ["fallen-comrade"] : []),
  ];
  return { tags, dead: deadBy(chapterId, flags, finished), echo: finished ? lines?.echo ?? [] : [], allies: board.allies };
}
