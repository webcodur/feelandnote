import type { CuratorLogoPalette } from "@/actions/library/types";

/** 추출한 대표색을 낮은 비중으로 섞어 다크 전시 면의 재질감만 구분한다. */
export function getCuratorLogoSurface(palette?: CuratorLogoPalette | null) {
  const primary = palette?.colors[0]?.hex || "#bdb6a8";
  return {
    background: `linear-gradient(145deg, color-mix(in srgb, ${primary} 10%, #242422), #151514 80%)`,
    ink: "#d4cec2",
  };
}
