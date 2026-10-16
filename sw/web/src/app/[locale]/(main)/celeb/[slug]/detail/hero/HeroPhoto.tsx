/* ─────────────────────────────────────────────
 * [celeb 상세] hero — 줌·사진 영역
 * - 목차 위치: 머리말(본문 앞, 목차 밖)
 * - 데이터: profile/nickname/locale + 음성 상태(onGreet/isVoiceActive)
 * - 함께 보기: HeroSectionContent.tsx, useCelebVoice.ts, HeroIdentity.tsx
 * ───────────────────────────────────────────── */
"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";

import CelebWorldFrame from "@/components/features/celeb/CelebWorldFrame";
import type { WorldFrame } from "@/lib/celeb/worldStyle";
import type { CelebBySlugProfile } from "@/actions/user/getCelebBySlug";
import type { Locale } from "@/types/locale";

import CelebPortrait from "@/components/shared/CelebPortrait";
import ImageViewerModal from "@/components/ui/ImageViewerModal";
import { BREAKPOINT_MD } from "@/constants/breakpoints";
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
  profile: Pick<CelebBySlugProfile, 'photo_url' | 'avatar_url' | 'photo_caption' | 'photo_caption_en'>;
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
  const [photoOpen, setPhotoOpen] = useState(false);

  /* ── 2. 줌 대상 파생값 ── */
  const zoomImageUrl = profile.photo_url ?? profile.avatar_url ?? null;
  const zoomCaption = profile.photo_url
    ? (locale === "en"
        ? profile.photo_caption_en ?? profile.photo_caption
        : profile.photo_caption) ?? null
    : null;

  const greetLabel = hasGreetingAudio
    ? t("playGreetingVoice")
    : t("dialogue_greeting");

  return (
    <>
      {/* ── 3. 데스크톱 사진 · 모바일 아바타 ── */}
      <div className={styles.desktopHeroPhoto}>
        <MaybeWorldFrame frame={frame} framed={Boolean(profile.photo_url)}>
          <CelebPortrait
            photoUrl={profile.photo_url}
            avatarUrl={profile.avatar_url}
            nickname={nickname}
            zoomSrc={zoomImageUrl}
            zoomCaption={zoomCaption}
            zoomLabel={t("enlargePhoto")}
            hasVoice={hasGreetingAudio}
            isVoicePlaying={isVoiceActive}
            onGreet={onGreet}
            greetLabel={greetLabel}
            avatarSize="h-36 w-36 md:h-44 md:w-44"
            imageSizes={`(min-width: ${BREAKPOINT_MD}px) 176px, 144px`}
            initialSize="text-2xl md:text-3xl"
          />
        </MaybeWorldFrame>
      </div>

      <div className={styles.mobileHeroAvatar}>
        <CelebPortrait
          photoUrl={null}
          avatarUrl={profile.avatar_url}
          nickname={nickname}
          zoomSrc={profile.avatar_url}
          zoomLabel={t("enlargeAvatar")}
          hasVoice={hasGreetingAudio}
          isVoicePlaying={isVoiceActive}
          onGreet={onGreet}
          greetLabel={greetLabel}
          avatarSize="h-28 w-28"
          imageSizes="112px"
          initialSize="text-2xl"
        />
        {profile.photo_url && (
          <button type="button" onClick={() => setPhotoOpen(true)} aria-haspopup="dialog"
            className="mt-5 inline-flex min-h-9 items-center justify-center rounded-control border border-line-strong bg-bg-secondary px-3 text-sm text-text-secondary hover:border-accent hover:bg-accent/10 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
            {t("heroPhoto")}
          </button>
        )}
        {profile.photo_url && photoOpen && (
          <ImageViewerModal src={profile.photo_url} alt={nickname} caption={zoomCaption}
            isOpen={photoOpen} onClose={() => setPhotoOpen(false)} showImageShadow={false} closeOnImageClick />
        )}
      </div>
    </>
  );
}
