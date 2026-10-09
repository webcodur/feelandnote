/*
  파일명: /constants/exploreLenses.ts
  기능: 탐색의 「주제별 탐색」 입구 — 그림과 묶음
  책임: 두 모드 아래 안내 카드의 그림·묶음·순서를 한 곳에서 쥔다.
        주소와 이름은 navigation.tsx(NAV_ITEMS·WORKS_LINKS)가 쥐고, 여기는 그 key로 그림과 묶음만 붙인다.
*/ // ------------------------------

/**
 * 두 모드의 번호 구획 묶음 id — 목차(AtlasNavSections)와 구획(HubSection)이 같은 값을 써서 hub-<id>-<번호> 앵커를 맞춘다.
 * 두 모드 모두 「1 목록(인물 목록 | 베스트셀러) · 2 주제별 탐색」 두 구획이다(홈과 같은 목차 + 번호 구획 문법, 26.09.28)
 */
export const EXPLORE_HUB_GROUP = { figures: "explore-figures", works: "explore-works" } as const;

/** art: 청동 소품 그림(FNN-흑동주조, 칸을 채워 자른다) · icon: 작은 선 아이콘(가운데 둔다) */
export interface ExploreLensImage {
  src: string;
  kind: "art" | "icon";
  fit?: "cover" | "contain";
}

const QUICKNAV = "/images/explore/quicknav";

export const EXPLORE_LENS_IMAGES: Record<string, ExploreLensImage> = {
  // 인물 모드
  faction: { src: `${QUICKNAV}/faction-square.webp`, kind: "art" },
  myth: { src: `${QUICKNAV}/myth-square.webp`, kind: "art" },
  ranking: { src: `${QUICKNAV}/ranking-square.webp`, kind: "art" },
  monologue: { src: `${QUICKNAV}/monologue-right-square.webp`, kind: "art" },
  // 작품 모드 — 인장·월계관·디바이더·망원경의 실물 구조를 살린 흑동주조 소품.
  curated: { src: `${QUICKNAV}/curated-sculpture-v2-square.webp`, kind: "art", fit: "contain" },
  classics: { src: `${QUICKNAV}/classics-sculpture-v1-square.webp`, kind: "art", fit: "contain" },
  professionBooks: { src: `${QUICKNAV}/profession-books-sculpture-v2-square.webp`, kind: "art", fit: "contain" },
  topicExplore: { src: `${QUICKNAV}/topic-explore-sculpture-v1-square.webp`, kind: "art", fit: "contain" },
  museum: { src: `${QUICKNAV}/museum-v2-square.webp`, kind: "art" },
  academy: { src: `${QUICKNAV}/academy-v2-square.webp`, kind: "art" },
};

/*
  인물 모드 안내 카드의 묶음 — 쓰임새로 나눈다. size는 카드 크기 두 단계뿐이다(큰 카드 | 낮은 줄 카드).
  이름은 explore.hub.lensGroups.<key>
*/
export const FIGURE_LENS_GROUPS: readonly {
  key: string;
  size: "large" | "compact";
  items: readonly string[];
}[] = [
  { key: "relation", size: "large", items: ["faction", "myth"] },
  { key: "more", size: "large", items: ["monologue", "ranking"] },
] as const;

/** 영향력과 스펙트럼은 같은 크기의 한 줄 텍스트 입구로 둔다. */
export const FIGURE_AUXILIARY_LINKS = ["influence", "spectrum"] as const;

/** 작품 모드에서 재편 중인 화면 — 카드와 진입 화면에 「재편 중」을 표시하고 낮은 줄 카드로 둔다(service-02-library.md) */
export const REORGANIZING_WORK_LENSES: ReadonlySet<string> = new Set(["museum", "academy"]);
