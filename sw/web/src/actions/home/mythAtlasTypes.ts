import type { FactionQuoteMedia } from "@feelandnote/shared/lib/faction-quote-media";

/** 그룹 없는 인물을 모은 「그 외」 묶음의 id */
export const MYTH_OTHER_GROUP_ID = "__other__";

export interface MythGroup {
  /** 묶음 이름(한국어 원문)을 id로 쓴다. 「그 외」 묶음은 MYTH_OTHER_GROUP_ID */
  id: string;
  /** 화면에 보일 이름. 「그 외」 묶음과 영문 이름이 빈 묶음은 null — 화면이 번역 문구를 붙인다 */
  name: string | null;
  /** 그룹 개요 본문 — 이 무리가 누구이고 작품에서 어떤 구실을 하는지. 없으면 null */
  description: string | null;
  personIds: string[];
}

export interface MythTradition {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  isPublished: boolean;
  regionId: string;
  images: Array<{ url: string; label: string | null }>;
  personIds: string[];
  /** 인물 묶음. 묶음이 둘 미만이면 빈 배열 — 화면이 그룹 줄을 숨긴다 */
  groups: MythGroup[];
}

export interface MythRegion {
  id: string;
  name: string;
  traditionIds: string[];
}

export interface MythPerson {
  id: string;
  slug: string;
  name: string;
  title: string | null;
  headline: string | null;
  bio: string | null;
  reading: { guide: string } | null;
  summary: string | null;
  /* 대사는 전승마다 다르다. quoteMedia는 출간된 음성·화보 전환 묶음이며 없으면 손으로 넘긴다 */
  appearances: Array<{
    traditionId: string;
    summary: string | null;
    quote: string | null;
    quoteMedia: FactionQuoteMedia | null;
    /** 이 전승 전용 개인샷(백오피스 「신화 편집」). 없으면 null — 화면이 인물 대표 사진을 쓴다 */
    imageUrl: string | null;
  }>;
  avatarUrl: string | null;
  imageUrl: string | null;
  portraitUrl: string | null;
  images: Array<{ url: string; focus?: { x: number; y: number } }>;
  traditionIds: string[];
  sourceIds: string[];
}

export interface MythWork {
  id: string;
  title: string;
  creator: string | null;
  thumbnailUrl: string | null;
  category: "book" | "video" | "game" | "music";
  coupangUrl: string | null;
  personIds: string[];
}

export interface MythAtlasData {
  regions: MythRegion[];
  traditions: MythTradition[];
  people: MythPerson[];
  works: MythWork[];
  openingPersonId: string | null;
}
