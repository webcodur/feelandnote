/* ─────────────────────────────────────────────
 * [celeb 상세] hero — 줌·사진 영역
 * - 목차 위치: 머리말(본문 앞, 목차 밖)
 * - 데이터: profile/nickname/locale + 음성 상태(onGreet/isVoiceActive)
 * - 함께 보기: HeroSectionContent.tsx, useHeroVoice.ts, HeroIdentity.tsx
 * ───────────────────────────────────────────── */
"use client";

import { useCallback, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";

import CelebWorldFrame from "@/components/features/celeb/CelebWorldFrame";
import ImageViewerModal from "@/components/ui/ImageViewerModal";
import type { WorldFrame } from "@/lib/celeb/worldStyle";
import type { CelebBySlugProfile } from "@/actions/user/getCelebBySlug";
import type { Locale } from "@/types/locale";

import CelebHeroPhoto from "../../CelebHeroPhoto";
import styles from "../../CelebPageContent.module.css";

interface MaybeWorldFrameProps {
  frame: WorldFrame;
  framed: boolean;
  children: ReactNode;
}

/* ── 1. 월드 프레임 래퍼 ── */
function MaybeWorldFrame({ frame, framed, children }: MaybeWorldFrameProps) {
  if (!framed) return <>{children}</>;
  return <CelebWorldFrame frame={frame}>{children}</CelebWorldFrame>;
}

interface HeroPhotoProps {
  profile: CelebBySlugProfile;
  nickname: string;
  locale: Locale;
  frame: WorldFrame;
  hasGreetingAudio: boolean;
  isVoiceActive: boolean;
  onGreet: (() => void) | undefined;
}

export default function HeroPhoto({
  profile,
  nickname,
  locale,
  frame,
  hasGreetingAudio,
  isVoiceActive,
  onGreet,
}: HeroPhotoProps) {
  const t = useTranslations("celebPage");
  const [zoomOpen, setZoomOpen] = useState(false);

  /* ── 2. 줌 대상 파생값 ── */
  const zoomImageUrl = profile.photo_url ?? profile.avatar_url ?? null;
  const zoomCaption = profile.photo_url
    ? (locale === "en"
        ? profile.photo_caption_en ?? profile.photo_caption
        : profile.photo_caption) ?? null
    : null;

  const handleZoom = useCallback(() => {
    if (zoomImageUrl) setZoomOpen(true);
  }, [zoomImageUrl]);

  const greetLabel = isVoiceActive
    ? t("stopAudio")
    : hasGreetingAudio
      ? t("playGreetingVoice")
      : t("dialogue_greeting");

  return (
    <>
      {/* ── 3. 데스크톱 사진 · 모바일 아바타 ── */}
      <div className={styles.desktopHeroPhoto}>
        <MaybeWorldFrame frame={frame} framed={Boolean(profile.photo_url)}>
          <CelebHeroPhoto
            photoUrl={profile.photo_url}
            avatarUrl={profile.avatar_url}
            nickname={nickname}
            onZoom={handleZoom}
            zoomLabel={t("enlargePhoto")}
            hasVoice={hasGreetingAudio}
            isVoicePlaying={isVoiceActive}
            onGreet={onGreet}
            greetLabel={greetLabel}
            avatarSize="h-36 w-36 md:h-44 md:w-44"
            initialSize="text-2xl md:text-3xl"
          />
        </MaybeWorldFrame>
      </div>

      <div className={styles.mobileHeroAvatar}>
        <CelebHeroPhoto
          photoUrl={null}
          avatarUrl={profile.avatar_url}
          nickname={nickname}
          onZoom={handleZoom}
          zoomLabel={t("enlargePhoto")}
          hasVoice={hasGreetingAudio}
          isVoicePlaying={isVoiceActive}
          onGreet={onGreet}
          greetLabel={greetLabel}
          avatarSize="h-28 w-28"
          initialSize="text-2xl"
        />
      </div>

      {/* ── 4. 줌 모달 ── */}
      {zoomImageUrl ? (
        <ImageViewerModal
          src={zoomImageUrl}
          alt={nickname}
          caption={zoomCaption}
          isOpen={zoomOpen}
          onClose={() => setZoomOpen(false)}
        />
      ) : null}
    </>
  );
}
