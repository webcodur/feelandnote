/*
  파일명: /constants/exploreLenses.ts
  기능: 탐색의 「관점별 보기」 입구 — 그림과 묶음
  책임: 두 모드 아래 안내 카드의 그림·묶음·순서를 한 곳에서 쥔다.
        주소와 이름은 navigation.tsx(NAV_ITEMS·WORKS_LINKS)가 쥐고, 여기는 그 key로 그림과 묶음만 붙인다.
*/ // ------------------------------

/** 안내 구획의 id — 모드 탭 아래 「관점별 보기 ↓」가 이 자리로 내려온다 */
export const EXPLORE_LENS_SECTION_ID = "explore-lenses";
/** 모드 탭의 id — 안내 구획의 「인물별 보기 ↑ / 기관별 보기 ↑」가 이 자리(탭·검색·목록 머리)로 돌아간다 */
export const EXPLORE_LIST_TOP_ID = "explore-list";

/** art: 청동 소품 그림(FNN-흑동주조, 칸을 채워 자른다) · icon: 작은 선 아이콘(가운데 둔다) */
export interface ExploreLensImage {
  src: string;
  kind: "art" | "icon";
}

const QUICKNAV = "/images/explore/quicknav";

export const EXPLORE_LENS_IMAGES: Record<string, ExploreLensImage> = {
  // 인물 모드
  faction: { src: `${QUICKNAV}/faction-square.webp`, kind: "art" },
  myth: { src: `${QUICKNAV}/myth-square.webp`, kind: "art" },
  ranking: { src: `${QUICKNAV}/ranking-square.webp`, kind: "art" },
  spectrum: { src: `${QUICKNAV}/spectrum.webp`, kind: "art" },
  monologue: { src: `${QUICKNAV}/monologue-right-square.webp`, kind: "art" },
  timeline: { src: `${QUICKNAV}/timeline-flag.svg`, kind: "icon" },
  directory: { src: `${QUICKNAV}/directory-scroll.svg`, kind: "icon" },
  // 작품 모드 — 베스트셀러가 첫 화면으로 올라가 안내 카드에서 빠졌다. 기관 선정은 「골라 세운 책 몇 권 + 인증 인장」 청동상
  // (원본·발주서: output/imagegen/explore-works/curated-v2.png·prompts-v2.json)
  curated: { src: `${QUICKNAV}/curated-v2-square.webp`, kind: "art" },
  classics: { src: `${QUICKNAV}/classics-v2-square.webp`, kind: "art" },
  museum: { src: `${QUICKNAV}/museum-v2-square.webp`, kind: "art" },
  academy: { src: `${QUICKNAV}/academy-v2-square.webp`, kind: "art" },
};

/*
  인물 모드 안내 카드의 묶음 — 쓰임새로 나눈다. size는 카드 크기 두 단계뿐이다(큰 카드 | 낮은 줄 카드).
  이름은 explore.hub.lensGroups.<key>
*/
export const FIGURE_LENS_GROUPS = [
  { key: "relation", size: "large", items: ["faction", "myth"] },
  { key: "ranking", size: "large", items: ["ranking", "spectrum"] },
  { key: "more", size: "compact", items: ["monologue", "timeline", "directory"] },
] as const;

/** 작품 모드에서 재편 중인 화면 — 카드와 진입 화면에 「재편 중」을 표시하고 낮은 줄 카드로 둔다(library.md) */
export const REORGANIZING_WORK_LENSES: ReadonlySet<string> = new Set(["museum", "academy"]);
