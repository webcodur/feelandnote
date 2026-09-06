/* ─────────────────────────────────────────────
 * [celeb 상세] 머리말 — 대표 화보·얼굴 사진
 * - 목차 위치: 머리말 (introduction)
 * - 데이터: photoUrl/avatarUrl/nickname props
 * - 함께 보기: detail/CelebHeroSection.tsx
 * ───────────────────────────────────────────── */
"use client";

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
  isVoicePlaying?: boolean;
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
 * 사진·아바타를 누르면 인사 대사가 나오고, 왼쪽 아래 확대 아이콘으로 크게 본다.
 */
export default function CelebHeroPhoto({
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
}: CelebHeroPhotoProps) {
  const canShowGreeting = Boolean(onGreet);

  // 테두리 강조는 지연 없이 즉시 반응한다 (전 앱 공통 상호작용 원칙)
  const ringClass =
    "ring-1 ring-accent/20 hover:ring-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

  const handleGreetingClick = () => {
    onGreet?.();
  };

  /* 원형 아바타는 코너가 원 바깥이라, 사각 화보와 같은 안쪽 여백을 주면 배지가 얼굴을 덮는다.
     화보(사각)는 모서리 안쪽 8px, 아바타(원)는 경계 밖 6px에 건다. */
  const badgeY = photoUrl ? "bottom-2" : "bottom-[-6px]";
  const badgeEnd = photoUrl ? "end-2" : "end-[-6px]";
  const badgeStart = photoUrl ? "start-2" : "start-[-6px]";

  /* ── 1. 음성 뱃지·확대 단추 ── */
  // 뱃지 원은 VoiceBadge 하나만 둔다. 바깥에 불투명 원을 덧씌우면
  // 테두리·그림자가 겹쳐 스피커 아이콘이 두 겹으로 보인다.
  const badgePlace = `absolute ${badgeY} ${badgeEnd} z-[4] rounded-full`;
  // 스피커 배지도 아바타와 같은 인사 대사를 낸다. 모양은 그대로 두고 누를 수만 있게 한다.
  const voiceBadge = canShowGreeting ? (
    <button
      type="button"
      onClick={handleGreetingClick}
      aria-label={greetLabel}
      aria-pressed={hasVoice ? isVoicePlaying : undefined}
      className={`${badgePlace} cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent`}
    >
      <VoiceBadge size="lg" active={hasVoice} playing={isVoicePlaying} />
    </button>
  ) : (
    <div className={`pointer-events-none ${badgePlace}`} aria-hidden="true">
      <VoiceBadge size="lg" active={hasVoice} playing={isVoicePlaying} />
    </div>
  );

  // 상세 페이지 공통 CSS가 아이콘 단추에 최소 44px을 강제한다. 음성 뱃지와 같은 36px로 맞추려고 인라인으로 누른다
  const zoomButton = (
    <button
      type="button"
      onClick={onZoom}
      aria-label={zoomLabel}
      style={{ minWidth: 36, minHeight: 36 }}
      className={`absolute ${badgeY} ${badgeStart} z-[3] inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/70 text-white/70 shadow-sm hover:border-accent/60 hover:bg-black/85 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent active:scale-95`}
    >
      <Maximize2 size={16} aria-hidden="true" />
    </button>
  );

  /* ── 2. 화보 렌더 ── */
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

  /* ── 3. 아바타 대체 렌더 ── */
  return (
    <div className={`relative flex-shrink-0 self-start ${avatarSize}`}>
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
        } ${
          canShowGreeting ? "cursor-pointer" : "cursor-default"
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
