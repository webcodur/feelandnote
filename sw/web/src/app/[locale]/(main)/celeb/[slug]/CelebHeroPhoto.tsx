"use client";

import { useState } from "react";
import Image from "next/image";
import { Maximize2 } from "lucide-react";
import { CELEB_HERO_PHOTO_SPEC } from "@feelandnote/shared/constants/celeb-hero-photo";
import BlurDissolve from "@/components/ui/BlurDissolve";
import VoiceBadge from "@/components/ui/VoiceBadge";

interface CelebHeroPhotoProps {
  /** 대표 화보(PC 세로형). 없으면 얼굴 사진으로 돌아간다 */
  photoUrl: string | null;
  avatarUrl: string | null;
  nickname: string;
  /** 별도 확대 아이콘을 누르면 전체 화면으로 크게 본다 */
  onZoom: () => void;
  zoomLabel: string;
  hasVoice: boolean;
  /** 사진·아바타 기본 클릭으로 인사 대사를 출력한다 */
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
 * 사진·아바타를 누르면 인사 대사가 나오고, 오른쪽 위 확대 아이콘으로 크게 본다.
 */
export default function CelebHeroPhoto({
  photoUrl,
  avatarUrl,
  nickname,
  onZoom,
  zoomLabel,
  hasVoice,
  onGreet,
  greetLabel,
  avatarSize,
  initialSize,
}: CelebHeroPhotoProps) {
  const [voicePulse, setVoicePulse] = useState(0);
  const canShowGreeting = Boolean(onGreet);

  // 테두리 강조는 지연 없이 즉시 반응한다 (전 앱 공통 상호작용 원칙)
  const ringClass =
    "ring-1 ring-accent/20 hover:ring-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

  const handleGreetingClick = () => {
    if (hasVoice) setVoicePulse((pulse) => pulse + 1);
    onGreet?.();
  };

  const voiceBadge = (
    <div className="pointer-events-none absolute bottom-2 end-2 z-[2]" aria-hidden="true">
      <VoiceBadge size="lg" active={hasVoice} pulse={voicePulse} />
    </div>
  );

  const zoomButton = (
    <button
      type="button"
      onClick={onZoom}
      aria-label={zoomLabel}
      className="absolute top-2 end-2 z-[3] inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/65 text-white/80 backdrop-blur-sm hover:border-accent/60 hover:bg-black/85 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent active:scale-95"
    >
      <Maximize2 size={19} aria-hidden="true" />
    </button>
  );

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
          onClick={handleGreetingClick}
          aria-label={greetLabel}
          disabled={!canShowGreeting}
          className={`group relative block h-full w-full overflow-hidden rounded-sm bg-bg-secondary ${ringClass} ${canShowGreeting ? "cursor-pointer active:scale-95" : "cursor-default"}`}
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
        {voiceBadge}
        {zoomButton}
      </div>
    );
  }

  return (
    <div className={`relative flex-shrink-0 self-start ${avatarSize}`}>
      <button
        type="button"
        onClick={handleGreetingClick}
        aria-label={greetLabel}
        disabled={!canShowGreeting}
        className={`block h-full w-full overflow-hidden rounded-full bg-portrait-stage ${ringClass} ${
          canShowGreeting ? "cursor-pointer active:scale-95" : "cursor-default"
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
      {voiceBadge}
      {avatarUrl ? zoomButton : null}
    </div>
  );
}
