// 신화마다 자기 주소를 갖는다 — /explore/myth/<slug>. 옛 바로가기 주소(/explore/myth?myth=<slug>)는 미들웨어가 308로 옮긴다(26.09.29).
// 신화 78편이 한 주소(/explore/myth)를 정본으로 공유하던 때는 검색에서 신화마다의 페이지가 없었다.
export const MYTH_PARAM = "myth";

/* 처음 여는 신화의 차례 — 주소의 신화 → 마지막으로 보던 신화(쿠키) → 기본 신화 → 첫 공개 신화(faction_lv2.sort_order).
   닫혔거나 없는 slug는 건너뛰고 다음 차례로 넘어간다. 신화 주소(/explore/myth/<slug>)는 늘 그 신화를 연다 */
export const MYTH_OPENING_SLUG = "homer-odyssey";

/** 첫 오디세이아 감상과 이후 선택을 기억한다. 서버가 첫 화면을 마지막 신화로 그린다 */
export const MYTH_LAST_COOKIE = "fn-last-myth";
export const MYTH_LAST_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Ignore malformed cookie text instead of breaking the picker. */
export function lastMythFromCookies(cookies: string): string | null {
  const value = cookies.split(/;\s*/).find(cookie => cookie.startsWith(`${MYTH_LAST_COOKIE}=`))?.slice(MYTH_LAST_COOKIE.length + 1);
  if (!value) return null;
  try { return decodeURIComponent(value); } catch { return null; }
}

export const MYTH_BASE_PATH = "/explore/myth";

export const mythHref = (slug: string) => `${MYTH_BASE_PATH}/${encodeURIComponent(slug)}`;

/** 로케일을 뗀 경로에서 신화 slug를 읽는다. 신화의 세계 첫 화면이면 null */
export function mythSlugFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/explore\/myth\/([^/?#]+)\/?$/);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

/**
 * 신화·세력 한 편의 주소인가 — 그 주소에서는 신화·세력 이름이 페이지의 큰 제목(h1)이고, 탐색 배너는 제목 요소를 내려놓는다.
 * 첫 화면(/explore/myth, /explore/faction)은 배너의 「신화의 세계」「세력도감」이 h1이다.
 * @param pathname 로케일을 뗀 경로(@/i18n/navigation의 usePathname)
 */
export function atlasPageOwnsTitle(pathname: string): boolean {
  return /^\/explore\/(myth|faction)\/[^/]+\/?$/.test(pathname);
}
