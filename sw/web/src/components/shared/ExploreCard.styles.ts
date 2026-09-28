// 탐색 인물·기관 카드가 같은 즉각 강조와 이미지 확대를 공유한다.
export const EXPLORE_CARD_FRAME_HOVER = "group-hover:border-accent/70 group-hover:bg-accent/[0.07] group-hover:shadow-[0_12px_30px_-14px_rgba(212,175,55,0.55)]";
export const EXPLORE_CARD_IMAGE_HOVER = "transition-transform duration-500 group-hover:scale-105";
export const EXPLORE_CARD_GLOW = "pointer-events-none absolute inset-0 z-[15] bg-[linear-gradient(to_top,rgba(212,175,55,0.24),rgba(212,175,55,0.06)_45%,transparent_70%)] opacity-0 group-hover:opacity-100";
export const EXPLORE_CARD_CAPTION_HOVER = "group-hover:bg-white/[0.06]";
/** 두 모드 아래 「관점별 보기」 구획 — 위 목록과 가르는 선, 선 아래 넉넉한 여백(code-rules.md 「구분선」),
 *  모드 탭 아래 「관점별 보기 ↓」로 내려왔을 때 고정 머리글에 제목이 가리지 않게 하는 여백 */
export const EXPLORE_QUICKNAV_SECTION_CLASS = "scroll-mt-[calc(var(--layer-header-h)+1rem)] border-t border-line pt-10 md:pt-14";
/** 두 모드 아래 「관점별 보기」 구획 제목 — 인물·작품이 같은 모양을 쓴다(서버 페이지가 import하므로 이 일반 모듈에 둔다).
 *  아래 여백은 제목과 되돌아가기 링크를 함께 담는 머리(ExploreLensHeading)가 쥔다 */
export const EXPLORE_QUICKNAV_HEADING_CLASS = "text-center text-lg font-semibold tracking-tight text-text-primary md:text-xl";
/** 안내 카드 묶음 제목(관계로 보기·순위·비교로 보기 …) — 구획 제목보다 한 단 작고 흐리게, 가운데 */
export const EXPLORE_LENS_GROUP_HEADING_CLASS = "mb-3 text-center text-sm font-semibold text-text-secondary md:mb-4 md:text-[15px]";
