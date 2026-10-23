import { CURATOR_LOGO_PALETTES } from "./curatorLogoPalettes";

const SQUARE_LOGOS = new Set([
  "the-guardian", "korea-university", "munhaksasang", "academy-awards",
  "american-film-institute", "mystery-writers-of-america", "venice-film-festival",
  "sogang-university", "university-of-seoul", "yonsei-university", "inha-university",
  "chosun-ilbo", "chung-ang-university", "postech", "kaist", "hanyang-university",
  "sight-and-sound", "seoul-national-university", "st-johns-college",
  "academy-of-interactive-arts-and-sciences", "golden-joystick-awards",
  "blue-dragon-film-awards", "cannes-film-festival", "hankook-ilbo",
]);

/** 추출한 대표색을 낮은 비중으로 섞어 다크 전시 면의 재질감만 구분한다. */
export function getCuratorLogoSurface(slug?: string) {
  const primary = (slug && CURATOR_LOGO_PALETTES[slug]?.colors[0]?.hex) || "#bdb6a8";
  return {
    background: `linear-gradient(145deg, color-mix(in srgb, ${primary} 10%, #242422), #151514 80%)`,
    ink: "#d4cec2",
  };
}

/** Versioned local assets keep the grid, preview and institution detail in sync. */
export function getCuratorLogoUrl(slug: string, fallback?: string | null) {
  // 새로 등록한 정사각형 로고를 기존 로컬 이미지보다 우선한다.
  if (fallback?.includes(`/curators/${slug}/logo-square-`)) return fallback;
  // 공식 사이트 icon: https://assets.thegameawards.com/2026/08/7aa3d3dd-image-21.png
  if (slug === "the-game-awards") return "/images/curated/the-game-awards-official.png";
  return SQUARE_LOGOS.has(slug) ? `/images/curated/${slug}-square-v2.webp` : fallback;
}
