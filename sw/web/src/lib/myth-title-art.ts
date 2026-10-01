/*
  파일명: /lib/myth-title-art.ts
  기능: 신화 타이틀 그림 경로
  책임: 신화(faction_lv2) 하나에 붙는 정적 타이틀 그림을 신화 화면과 신화 게임이 같은 표로 찾게 한다.
*/ // ------------------------------
import manifest from "@/generated/myth-title-images.json";

const TITLE_ART_BY_SLUG: Record<string, string> = {
  "myth-china-fengshen": "myth-china-fengshen.png",
  "myth-china-xiyou": "myth-china-xiyou.png",
  "myth-egypt": "myth-egypt.png",
  "myth-hindu-mahabharata": "myth-hindu-mahabharata.png",
  "myth-hindu-ramayana": "myth-hindu-ramayana.png",
  "myth-japan": "myth-japan.png",
  "myth-korea-buyeo-goguryeo": "myth-korea-buyeo-goguryeo.png",
  "myth-korea-gojoseon": "myth-korea-gojoseon.png",
  "myth-korea-jeju-bonpuri": "myth-korea-jeju-bonpuri.png",
  "myth-mesopotamia": "myth-mesopotamia.png",
  "myth-norse": "myth-norse.png",
};

const TITLE_ART_BY_NAME: Record<string, string> = {
  "아르고 원정대": "argonauts.png",
  "아트레우스 가문": "house-of-atreus.png",
  "아서왕과 원탁의 기사들": "arthur-round-table.png",
  "그리스 신화": "myth-greek-roman.png",
  "일리아스": "homer-iliad.png",
  "오디세이아": "homer-odyssey.png",
  "아이네이스": "virgil-aeneid.png",
  "헤라클레스의 열두 과제": "heracles.png",
};

// 이름 표는 한국어 신화 이름(faction_lv2.name)으로 찾는다
export function titleArtForMyth(slug: string, koreanName: string): string | null {
  const fileName = TITLE_ART_BY_SLUG[slug] ?? TITLE_ART_BY_NAME[koreanName];
  return fileName ? `/images/myth-atlas/title-art/${fileName}` : null;
}

// 작은 자리(카드·배경)에는 빌드가 만든 가장 작은 WebP 판을 쓴다. 판이 없으면 원본 경로 그대로다
export function titleArtThumb(path: string | null): string | null {
  if (!path) return null;
  const variants = (manifest as Record<string, Array<{ src: string; width: number }>>)[path];
  return variants?.[0]?.src ?? path;
}
