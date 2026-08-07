/*
  파일명: /components/ui/CelebAvatarImage.tsx
  기능: 인물 얼굴 이미지
  책임: next/image를 그대로 대신하되, 얼굴이 작게 나오는 자리(48px 이하)는
        800px 원본 대신 96px 작은 판을 받는다. 작은 판이 없는 인물만 원본으로 되돌린다.
        테두리·폴백·등장 연출은 부르는 쪽이 그대로 쥔다 — 이 부품은 <Image> 한 장만 대신한다.
        부모를 채우는 자리는 `sizes`를, 크기를 직접 준 자리는 `boxPx`를 쓴다.
*/ // ------------------------------

"use client";

import Image from "next/image";
import { useCelebAvatarSrc } from "@/hooks/useCelebAvatarSrc";

interface CelebAvatarImageProps {
  src: string;
  alt: string;
  /** 부모를 채우는 자리에서 화면에 나오는 크기. `"24px"`처럼 고정 한 값이어야 작은 판 대상이 된다 */
  sizes?: string;
  /** 크기를 직접 주는 자리의 한 변(px). 주면 부모를 채우지 않고 이 크기로 그린다 */
  boxPx?: number;
  className?: string;
  /** 도착 전 자리를 채울 흐린 그림. 쓰던 자리에서 그대로 넘겨받는다 */
  blurDataURL?: string;
}

export default function CelebAvatarImage({
  src,
  alt,
  sizes,
  boxPx,
  className = "object-cover",
  blurDataURL,
}: CelebAvatarImageProps) {
  const displaySizes = boxPx ? `${boxPx}px` : sizes;
  const { src: shownSrc, onError } = useCelebAvatarSrc(src, displaySizes);

  const common = {
    src: shownSrc ?? src,
    alt,
    className,
    unoptimized: true,
    loading: "lazy" as const,
    onError,
    ...(blurDataURL ? { placeholder: "blur" as const, blurDataURL } : {}),
  };

  return boxPx ? (
    <Image {...common} width={boxPx} height={boxPx} />
  ) : (
    <Image {...common} fill sizes={displaySizes} />
  );
}
