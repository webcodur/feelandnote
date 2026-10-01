/*
  파일명: components/features/game/myth/troy/campaign/heroes.ts
  기능: 트로이 전쟁 그리스 영웅 명단(원정 처음 값)
  책임: 원정에 나서는 영웅의 병과·모델·무기·기술·수준·능력치 첫 값과 합류하는 장을 쥔다(게임이 지은 값).
        능력치는 장이 끝날 때마다 저장값(HeroRecord)이 덮는다. mov는 날랜 발을 이미 더한 값이다.
*/ // ------------------------------
import type { RosterHero } from "../model";
import type { ClassKey, ModelKey, SkillKey, WeaponKey } from "../engine/types";

type Row = [slug: string, classKey: ClassKey, model: ModelKey, weapon: WeaponKey, skills: SkillKey[], level: number, stats: number[]];

const ROWS: Row[] = [
  ["achilles", "hoplite", "hero", "heroSpear", ["wrath", "swiftFeet"], 5, [30, 12, 11, 12, 9, 4, 6]],
  ["patroclus", "hoplite", "hero", "spear", ["shieldWall"], 4, [25, 9, 9, 9, 8, 3, 5]],
  ["ajax-the-great", "hoplite", "hero", "spear", ["sevenfoldShield", "shieldWall"], 5, [32, 11, 7, 5, 12, 2, 4]],
  ["teucer", "archer", "archer", "bow", ["shieldArcher", "aimedShot"], 4, [20, 8, 11, 9, 4, 3, 4]],
  ["odysseus", "skirmisher", "skirmisher", "javelin", ["cunning"], 5, [24, 9, 12, 10, 6, 5, 5]],
  ["diomedes", "hoplite", "hero", "heroSpear", ["athenaBlessing", "shieldWall"], 5, [28, 11, 10, 9, 9, 4, 5]],
  ["menelaus", "hoplite", "hero", "spear", ["warCry", "shieldWall"], 4, [26, 9, 8, 7, 9, 3, 4]],
  ["idomeneus", "hoplite", "hoplite", "spear", ["shieldWall"], 5, [26, 9, 8, 6, 9, 2, 4]],
  ["meriones", "archer", "archer", "bow", ["aimedShot"], 4, [20, 8, 10, 8, 4, 2, 4]],
  ["machaon", "healer", "healer", "sword", ["heal", "physician"], 4, [20, 5, 8, 6, 5, 7, 4]],
  ["calchas", "seer", "seer", "staff", ["prophecy", "blessing"], 5, [16, 1, 7, 6, 2, 10, 4]],
  ["agamemnon", "hoplite", "king", "spear", ["kingOfMen", "shieldWall"], 6, [28, 10, 9, 7, 10, 3, 4]],
  ["nestor", "chariot", "chariot", "spear", ["counsel"], 6, [24, 7, 9, 6, 7, 5, 6]],
  ["antilochus", "skirmisher", "skirmisher", "javelin", ["filialGuard"], 4, [22, 8, 9, 10, 5, 3, 5]],
  ["ajax-the-lesser", "skirmisher", "skirmisher", "javelin", ["swiftFeet"], 4, [22, 8, 8, 10, 5, 2, 6]],
];

export const HEROES: RosterHero[] = ROWS.map(([slug, classKey, model, weapon, skills, level, [hp, str, skl, spd, def, res, mov]]) => ({
  slug, classKey, model, weapon, skills, level, exp: 0, stats: { hp, str, skl, spd, def, res, mov },
}));

// 영웅이 처음 명단에 드는 장(1부터)
export const JOIN_CHAPTER: Record<string, number> = {
  achilles: 1, patroclus: 1, "ajax-the-great": 1, teucer: 1, odysseus: 1, diomedes: 1,
  menelaus: 2, idomeneus: 2, meriones: 2, machaon: 2, calchas: 2,
  agamemnon: 3, nestor: 3, antilochus: 3, "ajax-the-lesser": 3,
};

// 이야기상 떠난 영웅 — 이 표지가 켜지면 다음 장부터 명단에서 빠진다
export const GONE_FLAG: Record<string, string> = {
  patroclus: "dead:patroclus",
  antilochus: "dead:antilochus",
  achilles: "dead:achilles",
  "ajax-the-great": "dead:ajax-the-great",
};
