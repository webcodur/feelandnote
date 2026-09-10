"use client";

import Image from "next/image";
import { Maximize2 } from "lucide-react";
import { CELEB_HERO_PHOTO_SPEC } from "@feelandnote/shared/constants/celeb-hero-photo";
import BlurDissolve from "@/components/ui/BlurDissolve";
import VoiceBadge from "@/components/ui/VoiceBadge";

export interface CelebProfileMediaProps {
  photoUrl: string | null;
  avatarUrl: string | null;
  nickname: string;
  onZoom: () => void;
  zoomLabel: string;
  hasVoice: boolean;
  isVoicePlaying?: boolean;
  onGreet?: () => void;
  greetLabel?: string;
  avatarSize: string;
  initialSize: string;
  containerClassName?: string;
  avatarAlignment?: "start" | "center";
}

/**
 * 셀럽 프로필 이미지와 공통 액션을 함께 표시한다.
 * 상세 페이지와 인물 상세 모달이 같은 크게 보기·대사 버튼 동작을 사용한다.
 */
export default function CelebProfileMedia({
  photoUrl,
  avatarUrl,
  nickname,
  onZoom,
  zoomLabel,
  hasVoice,
  isVoicePlaying = false,
  onGreet,
  greetLabel,
  avatarSize,
  initialSize,
  containerClassName = "",
  avatarAlignment = "start",
}: CelebProfileMediaProps) {
  const canShowGreeting = Boolean(onGreet);
  const ringClass =
    "ring-1 ring-accent/20 hover:ring-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";
  const badgeY = "bottom-2";
  const badgeEnd = "end-2";
  const badgeStart = "start-2";
  const badgePlace = `absolute ${badgeY} ${badgeEnd} z-[4]`;
  const actionBaseClass =
    "inline-flex h-8 items-center justify-center rounded-md border border-white/15 bg-black/60 text-text-secondary shadow-none hover:border-accent hover:bg-accent/10 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 active:bg-accent/20 active:scale-95";
  const voiceActionClass = `${actionBaseClass} w-8`;
  const zoomActionClass = `${actionBaseClass} w-8`;

  const handleGreetingClick = () => {
    onGreet?.();
  };

  const voiceBadge = canShowGreeting ? (
    <button
      type="button"
      onClick={handleGreetingClick}
      aria-label={greetLabel}
      aria-pressed={hasVoice ? isVoicePlaying : undefined}
      style={{ minWidth: 32, minHeight: 32 }}
      className={`${badgePlace} ${voiceActionClass} cursor-pointer`}
    >
      <VoiceBadge size="lg" active={hasVoice} playing={isVoicePlaying} bare />
    </button>
  ) : (
    <div className={`pointer-events-none ${badgePlace} ${voiceActionClass}`} aria-hidden="true">
      <VoiceBadge size="lg" active={hasVoice} playing={isVoicePlaying} bare />
    </div>
  );

  const zoomButton = (
    <button
      type="button"
      onClick={onZoom}
      aria-label={zoomLabel}
      style={{ minWidth: 32, minHeight: 32 }}
      className={`absolute ${badgeY} ${badgeStart} z-[3] ${zoomActionClass}`}
    >
      <Maximize2 size={16} aria-hidden="true" />
    </button>
  );

  if (photoUrl) {
    return (
      <div
        className={`relative flex-shrink-0 self-start ${containerClassName}`}
        style={{
          width: CELEB_HERO_PHOTO_SPEC.desktopWidthPx,
          aspectRatio: CELEB_HERO_PHOTO_SPEC.aspectRatio,
        }}
      >
        <button
          type="button"
          onClick={handleGreetingClick}
          aria-label={greetLabel}
          aria-pressed={hasVoice ? isVoicePlaying : undefined}
          disabled={!canShowGreeting}
          className={`group relative block h-full w-full overflow-hidden rounded-sm bg-bg-secondary ${ringClass} ${
            isVoicePlaying
              ? "ring-2 ring-emerald-400/80 shadow-[0_0_20px_rgba(52,211,153,0.22)]"
              : ""
          } ${canShowGreeting ? "cursor-pointer" : "cursor-default"}`}
        >
          <Image
            src={photoUrl}
            alt={nickname}
            fill
            unoptimized
            priority
            fetchPriority="high"
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
    <div
      className={`relative flex-shrink-0 ${avatarAlignment === "center" ? "self-center" : "self-start"} ${avatarSize} ${containerClassName}`}
    >
      <button
        type="button"
        onClick={handleGreetingClick}
        aria-label={greetLabel}
        aria-pressed={hasVoice ? isVoicePlaying : undefined}
        disabled={!canShowGreeting}
        className={`block h-full w-full overflow-hidden rounded-full bg-portrait-stage ${ringClass} ${
          isVoicePlaying
            ? "ring-2 ring-emerald-400/80 shadow-[0_0_20px_rgba(52,211,153,0.22)]"
            : ""
        } ${canShowGreeting ? "cursor-pointer" : "cursor-default"}`}
      >
        {avatarUrl ? (
          <BlurDissolve className="h-full w-full">
            <Image
              src={avatarUrl}
              alt={nickname}
              width={224}
              height={224}
              className="h-full w-full object-cover"
              style={{ filter: "none" }}
              unoptimized
            />
          </BlurDissolve>
        ) : (
          <div
            className={`flex h-full w-full items-center justify-center font-serif text-accent/30 ${initialSize}`}
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
