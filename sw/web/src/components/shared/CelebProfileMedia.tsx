"use client";

import CelebAvatarImage from "@/components/ui/CelebAvatarImage";
import ResponsivePortraitImage from "@/components/ui/ResponsivePortraitImage";
import { Maximize2 } from "lucide-react";
import { CELEB_HERO_PHOTO_SPEC } from "@feelandnote/shared/constants/celeb-hero-photo";
import BlurDissolve from "@/components/ui/BlurDissolve";
import VoiceBadge from "@/components/ui/VoiceBadge";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

export interface CelebProfileMediaProps {
  photoUrl: string | null;
  avatarUrl: string | null;
  nickname: string;
  onZoom: () => void;
  zoomLabel: string;
  imageAction?: "greet" | "zoom";
  hasVoice: boolean;
  isVoicePlaying?: boolean;
  onGreet?: () => void;
  greetLabel?: string;
  avatarSize: string;
  initialSize: string;
  containerClassName?: string;
  avatarAlignment?: "start" | "center";
  /** 요약 카드에서는 이미지 아래 한 줄로 조작을 모은다. */
  actionLayout?: "corners" | "toolbar";
  extraAction?: ReactNode;
  imageSizes?: string;
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
  imageAction = "greet",
  hasVoice,
  isVoicePlaying = false,
  onGreet,
  greetLabel,
  avatarSize,
  initialSize,
  containerClassName = "",
  avatarAlignment = "start",
  actionLayout = "corners",
  extraAction,
  imageSizes,
}: CelebProfileMediaProps) {
  const t = useTranslations("celebPage");
  const canShowGreeting = Boolean(onGreet);
  const zoomOnClick = imageAction === "zoom";
  const canClickImage = zoomOnClick || canShowGreeting;
  const toolbar = actionLayout === "toolbar";
  const ringClass =
    "ring-1 ring-accent/20 hover:ring-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";
  // 원형 아바타는 배지를 테두리 밖으로 반쯤 빼 얼굴을 덜 가린다. 사각 사진은 모서리 안에 둔다.
  const badgeY = photoUrl ? "bottom-2" : "-bottom-2";
  const badgeEnd = photoUrl ? "end-2" : "-end-2";
  const badgeStart = photoUrl ? "start-2" : "-start-2";
  const badgePlace = toolbar ? "" : `absolute ${badgeY} ${badgeEnd} z-[4]`;
  const actionBaseClass =
    "inline-flex h-8 items-center justify-center rounded-md border border-white/15 bg-black/60 text-text-secondary shadow-none hover:border-accent hover:bg-accent/10 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 active:bg-accent/20 active:scale-95";
  const toolbarActionClass = "inline-flex size-9 items-center justify-center rounded-control text-text-secondary hover:bg-white/10 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent active:bg-white/15";
  const voiceActionClass = toolbar ? toolbarActionClass : `${actionBaseClass} w-8`;
  const zoomActionClass = toolbar ? toolbarActionClass : `${actionBaseClass} w-8`;

  const handleGreetingClick = () => {
    onGreet?.();
  };

  // 같은 스피커를 유지하고, 실제 음원 유무는 아이콘 색으로 구분한다.
  const voiceStatus = `${t("serviceDialogueVoice")} · ${t(hasVoice ? "serviceAvailable" : "servicePreparing")}`;
  const voiceBadge = canShowGreeting ? (
    <button
      type="button"
      onClick={handleGreetingClick}
      aria-label={greetLabel}
      title={voiceStatus}
      data-celeb-voice={hasVoice ? "available" : "unavailable"}
      aria-pressed={hasVoice ? isVoicePlaying : undefined}
      style={{ minWidth: 32, minHeight: 32 }}
      className={`${badgePlace} ${voiceActionClass} cursor-pointer`}
    >
      <VoiceBadge size="lg" active={hasVoice} playing={isVoicePlaying} bare />
    </button>
  ) : (
    <div className={`${badgePlace} ${voiceActionClass}`} role="img" aria-label={voiceStatus} title={voiceStatus} data-celeb-voice={hasVoice ? "available" : "unavailable"}>
      <VoiceBadge size="lg" active={hasVoice} playing={isVoicePlaying} bare />
    </div>
  );

  const zoomButton = (
    <button
      type="button"
      onClick={onZoom}
      aria-label={zoomLabel}
      title={zoomLabel}
      style={{ minWidth: 32, minHeight: 32 }}
      className={`${toolbar ? "" : `absolute ${badgeY} ${badgeStart} z-[3]`} ${zoomActionClass}`}
    >
      <Maximize2 size={16} aria-hidden="true" />
    </button>
  );

  const actions = toolbar ? (
    <div data-celeb-portrait-toolbar className="absolute top-[calc(100%+12px)] start-1/2 z-[4] flex -translate-x-1/2 items-center gap-1 rounded-card border border-line bg-bg-secondary/50 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      {avatarUrl || photoUrl ? zoomButton : null}
      {voiceBadge}
      {extraAction}
    </div>
  ) : <>{voiceBadge}{avatarUrl || photoUrl ? zoomButton : null}</>;

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
          onClick={zoomOnClick ? onZoom : handleGreetingClick}
          aria-label={zoomOnClick ? zoomLabel : greetLabel}
          aria-haspopup={zoomOnClick ? "dialog" : undefined}
          aria-pressed={!zoomOnClick && hasVoice ? isVoicePlaying : undefined}
          disabled={!canClickImage}
          className={`group relative block h-full w-full overflow-hidden rounded-sm bg-bg-secondary ${ringClass} ${
            isVoicePlaying
              ? "ring-2 ring-emerald-400/80 shadow-[0_0_20px_rgba(52,211,153,0.22)]"
              : ""
          } ${zoomOnClick ? "cursor-zoom-in" : canShowGreeting ? "cursor-pointer" : "cursor-default"}`}
        >
          <BlurDissolve key={photoUrl} className="absolute inset-0">
            <ResponsivePortraitImage
              src={photoUrl}
              alt={nickname}
              priority
              sizes={imageSizes ? `${CELEB_HERO_PHOTO_SPEC.desktopHeightPx}px` : undefined}
              className="object-cover"
              style={{ filter: "none" }}
            />
          </BlurDissolve>
        </button>
        {actions}
      </div>
    );
  }

  return (
    <div
      className={`relative flex-shrink-0 ${avatarAlignment === "center" ? "self-center" : "self-start"} ${avatarSize} ${containerClassName}`}
    >
      <button
        type="button"
        onClick={zoomOnClick ? onZoom : handleGreetingClick}
        aria-label={zoomOnClick ? zoomLabel : greetLabel}
        aria-haspopup={zoomOnClick ? "dialog" : undefined}
        aria-pressed={!zoomOnClick && hasVoice ? isVoicePlaying : undefined}
        disabled={!canClickImage || (zoomOnClick && !avatarUrl)}
        className={`block h-full w-full overflow-hidden rounded-full bg-portrait-stage ${ringClass} ${
          isVoicePlaying
            ? "ring-2 ring-emerald-400/80 shadow-[0_0_20px_rgba(52,211,153,0.22)]"
            : ""
        } ${zoomOnClick ? "cursor-zoom-in" : canShowGreeting ? "cursor-pointer" : "cursor-default"}`}
      >
        {avatarUrl ? (
          <BlurDissolve className="h-full w-full">
            <CelebAvatarImage
              src={avatarUrl}
              alt={nickname}
              width={224}
              height={224}
              sizes={imageSizes}
              className="h-full w-full object-cover"
              style={{ filter: "none" }}
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
      {actions}
    </div>
  );
}
