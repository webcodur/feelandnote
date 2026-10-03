/* ─────────────────────────────────────────────
 * [celeb 상세] hero — 히어로 조립(배너·사진·신원·액션·인용)
 * - 목차 위치: 머리말(본문 앞, 목차 밖)
 * - 데이터: CelebHeroSectionProps 전체(Profile/slug/shareTitle/greeting/locale/world)
 * - 함께 보기: HeroIdentity.tsx, HeroPhoto.tsx, useCelebVoice.ts
 * ───────────────────────────────────────────── */
"use client";

import { getCelebProfileUrl } from "@/lib/url";
import { useCallback, useState, type CSSProperties, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { Clock3 } from "lucide-react";
import { CELEB_HERO_PHOTO_SPEC } from "@feelandnote/shared/constants/celeb-hero-photo";

import type { CelebBySlugProfile } from "@/actions/user/getCelebBySlug";
import type { CelebTimelineEvent } from "@/actions/celebs/getCelebTimelineEvents";
import CelebWorldBannerView from "@/components/features/celeb/CelebWorldBannerView";
import CelebQuote from "@/components/shared/CelebQuote";
import ShareButtons from "@/components/ui/ShareButtons";
import { getWorldStyle } from "@/lib/celeb/worldStyle";
import type { WorldBannerImages } from "@/lib/celeb/worldImages";
import type { Locale } from "@/types/locale";

import HubSection from "@/components/shared/HubSection";
import styles from "../../CelebPageContent.module.css";
import CelebViewCounter from "../../CelebViewCounter";
import type { ServiceItem } from "../../celebServiceItems";
import HeroIdentity from "./HeroIdentity";
import HeroFactionsButton from "./HeroFactionsButton";
import HeroPhoto from "./HeroPhoto";
import { useCelebVoice } from "@/hooks/useCelebVoice";

const JourneyTimelineModal = dynamic(() => import("../../JourneyTimelineModal"), {
  ssr: false,
});

interface CelebHeroSectionProps {
  profile: CelebBySlugProfile;
  slug: string;
  shareTitle: string;
  greeting?: string[] | null;
  locale: Locale;
  worldId: string;
  worldBannerImages: WorldBannerImages | null;
  serviceItems: ServiceItem[];
  externalLinksSlot: ReactNode;
  timelineEvents: CelebTimelineEvent[];
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
  externalLinksSlot,
  timelineEvents,
}: CelebHeroSectionProps) {
  const t = useTranslations("celebPage");
  const [timelineOpen, setTimelineOpen] = useState(false);
  const closeTimeline = useCallback(() => setTimelineOpen(false), []);
  const timelineLabel = t(profile.celeb_reality === "FICTION" ? "fictionTimeline" : "timeline");

  /* ── 1. 음성 인터랙션 + 월드 파생값 ── */
  const {
    hasVoice,
    canGreet,
    hasGreetingAudio,
    isVoiceActive,
    isQuoteActive,
    handleGreetingPlay,
    handleQuotePlay,
  } = useCelebVoice({ profile, greeting, nickname: profile.nickname, locale });
  const worldStyle = getWorldStyle(worldId);
  return (
    <HubSection id="introduction" title={serviceItems[0]?.label ?? t("serviceIntroduction")} index={0} total={serviceItems.length} hideDivider tabIndex={-1} className={styles.opening}>
      {/* ── 2. 월드 배너 ── */}
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
              <HeroFactionsButton factions={profile.factions} locale={locale} />
              {timelineEvents.length > 0 && (
                <button
                  type="button"
                  aria-label={timelineLabel}
                  aria-haspopup="dialog"
                  title={timelineLabel}
                  onClick={() => setTimelineOpen(true)}
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-white/12 bg-transparent text-text-secondary outline-none hover:border-accent/50 hover:bg-white/[0.04] hover:text-accent active:bg-white/[0.07] focus-visible:ring-2 focus-visible:ring-accent/60"
                >
                  <Clock3 size={16} aria-hidden="true" />
                </button>
              )}
              <ShareButtons
                title={shareTitle}
                path={getCelebProfileUrl({ slug })}
                align="center"
                comfortable
                iconOnly
                showLabel={false}
              />
            </div>

            {/* ── 4. 내러티브(bio·인용) ── */}
            <div className={styles.identityNarrative}>
              {profile.bio ? <p className={styles.bio}>{profile.bio}</p> : null}
              <CelebQuote
                text={profile.quotes}
                hasVoice={hasVoice}
                isQuoteActive={isQuoteActive}
                onPlay={handleQuotePlay}
                playLabel={t("playQuoteVoice")}
                className={locale === "ko" ? styles.koreanQuote : undefined}
              />
            </div>
          </div>
        </div>
      </div>
      {timelineOpen && (
        <JourneyTimelineModal
          open
          events={timelineEvents}
          title={timelineLabel}
          closeLabel={t("timelineClose")}
          onClose={closeTimeline}
        />
      )}
    </HubSection>
  );
}
