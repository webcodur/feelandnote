/*
  파일명: components/features/game/myth/shared/types.ts
  기능: 신화 게임 공용 자료형
  책임: 실제 조회와 체험 표본이 같은 모양으로 게임에 넘어가게 한다.
        원천(Source*)은 두 언어를 함께 담아 캐시하고, 화면은 요청 언어로 푼 값(Myth*)만 받는다.
*/ // ------------------------------

export type MythGender = "male" | "female";

// #region 원천 — 캐시·표본에 그대로 담기는 두 언어 값
export interface Bilingual {
  ko: string | null;
  en: string | null;
}

export interface MythSourceRole {
  mythId: string;
  group: string | null;
  summary: Bilingual;
  imageUrl: string | null;
  order: number;
}

export interface MythSourceFigure {
  id: string;
  slug: string;
  name: Bilingual;
  title: Bilingual;
  headline: Bilingual;
  gender: MythGender | null;
  avatarUrl: string | null;
  portraitUrl: string | null;
  roles: MythSourceRole[];
}

export interface MythSourceGroup {
  key: string;
  name: Bilingual;
  description: Bilingual;
  position: number;
}

export interface MythSourceMyth {
  id: string;
  slug: string;
  name: Bilingual;
  region: Bilingual;
  musicUrl: string | null;
  leadIds: string[];
  groups: MythSourceGroup[];
}

// 저장 방향 그대로다 — to가 from의 type이다(예: from=아폴론, to=제우스, type=father)
export interface MythSourceRelation {
  from: string;
  to: string;
  type: string;
  group: string;
  note: Bilingual;
}

export interface MythSourceCatalog {
  myths: MythSourceMyth[];
  figures: MythSourceFigure[];
}
// #endregion

// #region 화면 값 — 요청 언어로 푼 모양
export interface MythRole {
  mythId: string;
  groupKey: string | null;
  summary: string | null;
  imageUrl: string | null;
}

export interface MythFigure {
  id: string;
  slug: string;
  name: string;
  title: string | null;
  headline: string | null;
  gender: MythGender | null;
  avatarUrl: string | null;
  portraitUrl: string | null;
  roles: MythRole[];
}

export interface MythGroup {
  key: string;
  // 요청 언어 이름이 비면 null — 이름을 보여 줘야 하는 게임은 그 그룹을 쓰지 않는다
  name: string | null;
  description: string | null;
  figureIds: string[];
}

export interface MythInfo {
  id: string;
  slug: string;
  name: string;
  region: string | null;
  titleArt: string | null;
  musicUrl: string | null;
  leadIds: string[];
  groups: MythGroup[];
  figureIds: string[];
}

// 표준 방향으로 맞춘 관계 — to가 from의 type이다. 대칭 관계는 id 순으로 한 번만 담는다
export interface MythRelation {
  fromId: string;
  toId: string;
  type: string;
  note: string | null;
}

export interface MythWorld {
  myths: MythInfo[];
  figures: MythFigure[];
  relations: MythRelation[];
  isFixture: boolean;
}

// 인물 고유 대사(celeb_dialogues) — 상황마다 세 가지. 서비스가 인물별로 써 둔 게임 대사다
export const MYTH_LINE_SITUATIONS = ["greeting", "roll_call", "deploy", "clash_attack", "battle_win", "battle_draw", "battle_lose"] as const;
export type MythLineSituation = (typeof MYTH_LINE_SITUATIONS)[number];
export interface MythLines {
  quote: string | null;
  lines: Record<MythLineSituation, string[]>;
}

// 성향 수치(celeb_persona)가 있는 인물만 담긴다. 신화 인물 대부분은 없다
export interface MythPersona {
  command: number;
  martial: number;
  intellect: number;
  charm: number;
}
// #endregion
