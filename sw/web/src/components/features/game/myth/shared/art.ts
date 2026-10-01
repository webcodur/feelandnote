/*
  파일명: components/features/game/myth/shared/art.ts
  기능: 신화 게임 그림 크기 고르기
  책임: 타이틀 그림 원본(2.5MB PNG) 대신 빌드가 만든 WebP 판을 자리 크기에 맞춰 고른다.
        원본 주소뿐 아니라 이미 고른 판 주소(예: 768 판)를 받아도 같은 그림의 다른 판을 찾는다.
        판이 없는 주소(인물 사진 등)는 그대로 돌려준다.
*/ // ------------------------------
import manifest from "@/generated/myth-title-images.json";

interface ArtVariant {
  src: string;
  width: number;
}

const VARIANTS = manifest as Record<string, ArtVariant[]>;

// 판 주소 → 같은 그림의 판 목록. 서버가 작은 판 주소만 넘겨도 큰 판을 고를 수 있게 한다
const FAMILY = new Map<string, ArtVariant[]>(
  Object.entries(VARIANTS).flatMap(([original, list]) => [[original, list] as const, ...list.map((variant) => [variant.src, list] as const)]),
);

function familyOf(path: string | null): ArtVariant[] | undefined {
  return path ? FAMILY.get(path) : undefined;
}

// 이 폭 이상인 가장 작은 판. 모두 작으면 가장 큰 판을 쓴다
export function artAt(path: string | null, width: number): string | null {
  if (!path) return null;
  const list = familyOf(path);
  if (!list || list.length === 0) return path;
  return (list.find((variant) => variant.width >= width) ?? list[list.length - 1]).src;
}

// 화면 폭에 따라 브라우저가 고르게 넘기는 srcset. 판이 없으면 비운다
export function artSrcSet(path: string | null): string | undefined {
  const list = familyOf(path);
  if (!list || list.length === 0) return undefined;
  return list.map((variant) => `${variant.src} ${variant.width}w`).join(", ");
}
