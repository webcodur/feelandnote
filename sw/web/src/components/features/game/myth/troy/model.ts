/*
  파일명: components/features/game/myth/troy/model.ts
  기능: 트로이 전쟁 화면 층의 자료형
  책임: 서버(pool)가 넘기는 인물 값, 명단(roster)의 장수 값, 원정 저장 값의 모양을 정한다.
        화면 컴포넌트는 이 모양만 받는다. 규칙 자료형은 engine/types.ts·battleTypes.ts가 쥔다.
*/ // ------------------------------
import type { BattleState } from "./engine/battleTypes";
import type { ClassKey, ModelKey, SkillKey, Stats, WeaponKey } from "./engine/types";

// #region 서버가 넘기는 값(요청 언어로 푼 값)
export interface TroyFigure {
  // DB 인물 id(고유 대사를 부를 때 쓴다)
  id: string;
  slug: string;
  name: string;
  title: string | null;
  avatarUrl: string | null;
  portraitUrl: string | null;
}

// 표준 방향 — b가 a의 type이다(예: a=아킬레우스, b=테티스, type=mother). 대칭 관계는 한 번만 담는다
export interface TroyRelation {
  a: string;
  b: string;
  type: string;
  note: string | null;
}

export interface TroyPool {
  figures: TroyFigure[];
  relations: TroyRelation[];
  musicUrl: string | null;
  isFixture: boolean;
}
// #endregion

// #region 명단 — 원정에 나서는 장수. 장이 끝날 때마다 수준·능력치가 쌓인다
export interface RosterHero {
  slug: string;
  classKey: ClassKey;
  model: ModelKey;
  weapon: WeaponKey;
  skills: SkillKey[];
  level: number;
  exp: number;
  stats: Stats;
}

// 판마다 쌓이는 장수 기록(쓰러짐은 다음 장에 돌아오는 부상이라 따로 남기지 않는다)
export interface HeroRecord {
  slug: string;
  level: number;
  exp: number;
  stats: Stats;
  battles: number;
  defeats: number;
}
// #endregion

// #region 저장 — 브라우저 localStorage에만 둔다
// 적의 세기(campaign/difficulty.ts가 능력치를 고친다)
export type Difficulty = "easy" | "normal" | "hard";

export interface CampaignSave {
  version: 1;
  difficulty: Difficulty;
  // 이긴 장 id
  cleared: string[];
  // 장 id별 가장 적은 차례
  bestTurns: Record<string, number>;
  heroes: Record<string, HeroRecord>;
  // 이야기 표지(dead:patroclus, alt:patroclus-saved 등)
  flags: string[];
  // 싸우던 판(이어 하기). 없으면 null
  battle: BattleState | null;
  updatedAt: number;
}
// #endregion
