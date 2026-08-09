"use client";

import Image from "next/image";
import { Volume2 } from "lucide-react";
import { CELEB_HERO_PHOTO_SPEC } from "@feelandnote/shared/constants/celeb-hero-photo";
import BlurDissolve from "@/components/ui/BlurDissolve";

interface CelebHeroPhotoProps {
  /** 대표 화보(PC 세로형). 없으면 얼굴 사진으로 돌아간다 */
  photoUrl: string | null;
  avatarUrl: string | null;
  nickname: string;
  /** 그림을 누르면 전체 화면으로 크게 본다 */
  onZoom: () => void;
  zoomLabel: string;
  /** 인사말 재생. 넘기지 않으면 인사 배지를 그리지 않는다 */
  onGreet?: () => void;
  greetLabel?: string;
  /** 얼굴 사진으로 돌아갔을 때의 크기 */
  avatarSize: string;
  /** 얼굴 사진 자리의 첫 글자 크기 */
  initialSize: string;
}

/**
 * 인물 상세 첫 구획의 대표 이미지.
 * 화보가 있으면 PC에서 공용 상수의 세로 비율로 크게 걸고, 없으면 기존 원형 얼굴 사진을 그대로 쓴다.
 * 그림을 누르면 크게 보기가 열리고, 인사말은 오른쪽 아래 배지로 따로 듣는다.
 */
export default function CelebHeroPhoto({
  photoUrl,
  avatarUrl,
  nickname,
  onZoom,
  zoomLabel,
  onGreet,
  greetLabel,
  avatarSize,
  initialSize,
}: CelebHeroPhotoProps) {
  // 테두리 강조는 지연 없이 즉시, 확대는 애니메이션으로 (전 앱 공통 상호작용 원칙)
  const ringClass =
    "ring-1 ring-accent/20 hover:ring-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

  const greetBadge = onGreet ? (
    <button
      type="button"
      onClick={onGreet}
      aria-label={greetLabel}
      className="absolute bottom-1.5 end-1.5 z-[2] inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white/70 backdrop-blur-sm hover:border-accent/50 hover:text-accent active:scale-95"
    >
      <Volume2 size={16} />
    </button>
  ) : null;

  if (photoUrl) {
    return (
      <div
        className="relative flex-shrink-0 self-start"
        style={{
          width: CELEB_HERO_PHOTO_SPEC.desktopWidthPx,
          aspectRatio: CELEB_HERO_PHOTO_SPEC.aspectRatio,
        }}
      >
        <button
          type="button"
          onClick={onZoom}
          aria-label={zoomLabel}
          className={`group relative block h-full w-full overflow-hidden rounded-sm bg-bg-secondary ${ringClass} cursor-zoom-in active:scale-95`}
        >
          <Image
            src={photoUrl}
            alt={nickname}
            fill
            unoptimized
            sizes={`${CELEB_HERO_PHOTO_SPEC.desktopWidthPx}px`}
            className="object-cover"
            style={{ filter: "none" }}
          />
        </button>
        {greetBadge}
      </div>
    );
  }

  return (
    <div className={`relative flex-shrink-0 self-start ${avatarSize}`}>
      <button
        type="button"
        onClick={onZoom}
        aria-label={zoomLabel}
        disabled={!avatarUrl}
        className={`block h-full w-full overflow-hidden rounded-full bg-portrait-stage ${ringClass} ${
          avatarUrl ? "cursor-zoom-in active:scale-95" : "cursor-default"
        }`}
      >
        {avatarUrl ? (
          <BlurDissolve className="h-full w-full">
            <Image
              src={avatarUrl}
              alt={nickname}
              width={224}
              height={224}
              className="w-full h-full object-cover"
              style={{ filter: "none" }}
              unoptimized
            />
          </BlurDissolve>
        ) : (
          <div
            className={`w-full h-full flex items-center justify-center font-serif text-accent/30 ${initialSize}`}
          >
            {nickname.charAt(0)}
          </div>
        )}
      </button>
      {greetBadge}
    </div>
  );
}
