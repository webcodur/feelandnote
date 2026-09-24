
import type { FactionMusic } from "@/lib/faction-music";
import type { TitleBadge } from "@/lib/utils/content-locale";

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

/** 신화 카드 한 장 — faction_lv2(is_myth) 행이 원천이다 */
export interface Myth {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  isPublished: boolean;
  /** 지역(faction_lv1) id. 어느 지역에도 못 걸리면 "other" */
  regionId: string;
  images: Array<{ url: string; label: string | null }>;
  /** 이 신화의 테마곡 */
  music: FactionMusic | null;
  personIds: string[];
  /** 타이틀 아트에 세우는 대표 인물 id — 차례가 곧 세우는 순서다. personIds 안의 id만 담는다 */
  leadPersonIds: string[];
  /** 인물 묶음. 묶음이 둘 미만이면 빈 배열 — 화면이 그룹 줄을 숨긴다 */
  groups: MythGroup[];
}

export interface MythRegion {
  id: string;
  slug: string;
  name: string;
  mythIds: string[];
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
  /* 한 인물이 여러 신화에 선다. 신화마다 줄거리와 사진이 다르다 */
  appearances: Array<{
    mythId: string;
    summary: string | null;
    /** 이 신화 전용 개인샷(백오피스 「신화 편집」). 없으면 null — 화면이 인물 대표 사진을 쓴다 */
    imageUrl: string | null;
  }>;
  avatarUrl: string | null;
  imageUrl: string | null;
  portraitUrl: string | null;
  images: Array<{ url: string; focus?: { x: number; y: number } }>;
  mythIds: string[];
  sourceIds: string[];
}

export interface MythWork {
  id: string;
  editionId?: number;
  title: string;
  titleBadge: TitleBadge | null;
  creator: string | null;
  thumbnailUrl: string | null;
  category: "book" | "video" | "game" | "music";
  coupangUrl: string | null;
  personIds: string[];
}

export interface MythData {
  regions: MythRegion[];
  myths: Myth[];
  people: MythPerson[];
  works: MythWork[];
  openingPersonId: string | null;
}
