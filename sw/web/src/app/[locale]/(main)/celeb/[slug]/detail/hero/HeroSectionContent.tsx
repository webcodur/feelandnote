/* ─────────────────────────────────────────────
 * [celeb 상세] hero — 히어로 조립(배너·사진·신원·액션·인용)
 * - 목차 위치: 머리말(본문 앞, 목차 밖)
 * - 데이터: CelebHeroSectionProps 전체(Profile/slug/shareTitle/greeting/locale/world)
 * - 함께 보기: HeroIdentity.tsx, HeroPhoto.tsx, useHeroVoice.ts
 * ───────────────────────────────────────────── */
"use client";

import type { CSSProperties, ReactNode } from "react";
import { useTranslations } from "next-intl";
import { CELEB_HERO_PHOTO_SPEC } from "@feelandnote/shared/constants/celeb-hero-photo";

import type { CelebBySlugProfile } from "@/actions/user/getCelebBySlug";
import CelebWorldBannerView from "@/components/features/celeb/CelebWorldBannerView";
import { FormattedText } from "@/components/ui";
import ShareButtons from "@/components/ui/ShareButtons";
import { getWorldStyle } from "@/lib/celeb/worldStyle";
import type { WorldBannerImages } from "@/lib/celeb/worldImages";
import type { Locale } from "@/types/locale";

import CelebSectionHeading from "../../CelebSectionHeading";
import styles from "../../CelebPageContent.module.css";
import CelebViewCounter from "../../CelebViewCounter";
import type { ServiceItem } from "../../celebServiceItems";
import { navigateToCelebSection } from "../useCelebSectionNavigation";
import HeroIdentity from "./HeroIdentity";
import HeroPhoto from "./HeroPhoto";
import { useHeroVoice } from "./useHeroVoice";

interface CelebHeroSectionProps {
  profile: CelebBySlugProfile;
  slug: string;
  shareTitle: string;
  greeting?: string[] | null;
  locale: Locale;
  worldId: string;
  worldBannerImages: WorldBannerImages | null;
  serviceItems: ServiceItem[];
  /** 전 구획 통틀어 가장 긴 제목. 3열 너비 고정용 */
  widestLabel: string;
  externalLinksSlot: ReactNode;
}

export default function CelebHeroSection({
  profile,
  slug,
  shareTitle,
  greeting,
  locale,
  worldId,
  worldBannerImages,
  serviceItems,
  widestLabel,
  externalLinksSlot,
}: CelebHeroSectionProps) {
  const t = useTranslations("celebPage");

  /* ── 1. 음성 인터랙션 + 월드 파생값 ── */
  const {
    hasVoice,
    canGreet,
    hasGreetingAudio,
    isVoiceActive,
    isQuoteActive,
    handleGreetingPlay,
    handleQuotePlay,
  } = useHeroVoice({ profile, greeting, nickname: profile.nickname, locale });
  const worldStyle = getWorldStyle(worldId);
  // 소개는 언제나 첫 구획이다. 다음 화살표는 실제로 남아 있는 그다음 구획을 가리켜야 한다.
  // ← 맛보기 뒤 3초 안 재누름은 맨 뒤로 간다.
  const introductionItem = serviceItems[0];
  const nextItem = serviceItems[1];
  const loopTarget = serviceItems.length > 1
    ? serviceItems[serviceItems.length - 1]?.target
    : undefined;

  return (
    <section id="introduction" tabIndex={-1} className={styles.opening}>
      {/* ── 2. 구획 제목 + 월드 배너 ── */}
      {/* 머리말 제목은 전폭 구획에 서 있어 본문 기둥폭으로 묶는다. 스티키로 붙어도 같은 폭이다.
          폭 규격(모바일 전폭 포함)은 CSS가 쥔다 */}
      <CelebSectionHeading
        item={introductionItem}
        nextItem={nextItem}
        onNavigate={navigateToCelebSection}
        widestLabel={widestLabel}
        className={styles.heroHeading}
        loopTarget={loopTarget}
      />
      <div className={styles.openingFrame}>
        <div className={styles.bannerStage}>
          <CelebWorldBannerView worldId={worldId} images={worldBannerImages} />
        </div>

        <div
          className={styles.identityPanel}
          style={{
            "--celeb-hero-photo-width": `${CELEB_HERO_PHOTO_SPEC.desktopWidthPx}px`,
          } as CSSProperties}
        >
          {/* ── 3. 사진 + 신원 + 액션 ── */}
          <div
            className={`${styles.heroColumn} ${
              profile.photo_url ? "" : styles.avatarHeroColumn
            }`}
          >
            <HeroPhoto
              profile={profile}
              nickname={profile.nickname}
              locale={locale}
              frame={worldStyle.frame}
              hasGreetingAudio={hasGreetingAudio}
              isVoiceActive={isVoiceActive}
              onGreet={canGreet ? handleGreetingPlay : undefined}
            />
          </div>

          <div className={styles.identityCopy}>
            <HeroIdentity profile={profile} locale={locale} />

            <div className={styles.actions}>
              <CelebViewCounter
                celebId={profile.id}
                nickname={profile.nickname}
                initialCount={profile.view_count ?? 0}
                iconClassName={styles.viewCounterIcon}
                buttonClassName={styles.viewCounterButton}
              />
              {externalLinksSlot}
              <ShareButtons
                title={shareTitle}
                path={`/celeb/${slug}`}
                align="center"
                comfortable
                iconOnly
                showLabel={false}
              />
            </div>

            {/* ── 4. 내러티브(bio·인용) ── */}
            <div className={styles.identityNarrative}>
              {profile.bio ? <p className={styles.bio}>{profile.bio}</p> : null}
              {profile.quotes ? (
                <div className={styles.quote}>
                  {hasVoice ? (
                    <button
                      type="button"
                      onClick={handleQuotePlay}
                      className={`${styles.quoteButton} ${
                        isQuoteActive ? styles.quoteButtonPlaying : ""
                      }`}
                      aria-label={isVoiceActive ? t("stopAudio") : t("playQuoteVoice")}
                      aria-pressed={isQuoteActive}
                      title={isVoiceActive ? t("stopAudio") : t("playQuoteVoice")}
                    >
                      &ldquo;
                      <FormattedText text={profile.quotes} />
                      &rdquo;
                    </button>
                  ) : (
                    <p>
                      &ldquo;
                      <FormattedText text={profile.quotes} />
                      &rdquo;
                    </p>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
