// 신화 화면을 특정 신화를 고른 채 여는 주소. 신화 화면은 이 이름으로 신화를 읽고, 화면에서 고른 신화도 같은 이름으로 주소에 남긴다.
export const MYTH_PARAM = "myth";

/* 처음 여는 신화의 차례 — 주소의 신화 → 마지막으로 보던 신화(쿠키) → 기본 신화 → 첫 공개 신화(faction_lv2.sort_order).
   닫혔거나 없는 slug는 건너뛰고 다음 차례로 넘어간다 */
export const MYTH_OPENING_SLUG = "homer-odyssey";

/** 바로가기로 오거나 화면에서 고른 신화를 기억하는 쿠키. 서버가 읽어 첫 화면부터 그 신화를 그린다 */
export const MYTH_LAST_COOKIE = "fn-last-myth";
export const MYTH_LAST_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const mythHref = (slug: string) => `/explore/myth?${MYTH_PARAM}=${encodeURIComponent(slug)}`;
