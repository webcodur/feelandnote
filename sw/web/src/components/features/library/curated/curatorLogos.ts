const SQUARE_LOGOS = new Set([
  "the-guardian", "korea-university", "munhaksasang", "academy-awards",
  "american-film-institute", "mystery-writers-of-america", "venice-film-festival",
  "sogang-university", "university-of-seoul", "yonsei-university", "inha-university",
  "chosun-ilbo", "chung-ang-university", "postech", "kaist", "hanyang-university",
  "sight-and-sound", "seoul-national-university", "st-johns-college",
  "academy-of-interactive-arts-and-sciences", "golden-joystick-awards",
  "blue-dragon-film-awards", "cannes-film-festival", "hankook-ilbo",
]);

/** Versioned local assets keep the grid, preview and institution detail in sync. */
export function getCuratorLogoUrl(slug: string, fallback?: string | null) {
  // 새로 등록한 정사각형 로고를 기존 로컬 이미지보다 우선한다.
  if (fallback?.includes(`/curators/${slug}/logo-square-`)) return fallback;
  return SQUARE_LOGOS.has(slug) ? `/images/curated/${slug}-square-v2.webp` : fallback;
}
