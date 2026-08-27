"use client";

import Image from "next/image";
import { useCallback, useState, type CSSProperties, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Volume2 } from "lucide-react";
import { CELEB_HERO_PHOTO_SPEC } from "@feelandnote/shared/constants/celeb-hero-photo";

import type { CelebBySlugProfile } from "@/actions/user/getCelebBySlug";
import ProfessionInfoButton from "@/components/features/celeb/ProfessionInfoButton";
import CelebWorldBannerView from "@/components/features/celeb/CelebWorldBannerView";
import CelebWorldFrame from "@/components/features/celeb/CelebWorldFrame";
import { useDialogueSubtitle } from "@/components/features/game/shared/hooks/useDialogue";
import { FormattedText } from "@/components/ui";
import ImageViewerModal from "@/components/ui/ImageViewerModal";
import NationalityText from "@/components/ui/NationalityText";
import ShareButtons from "@/components/ui/ShareButtons";
import { useCelebGreeting } from "@/hooks/useCelebGreeting";
import { trackEvent } from "@/lib/analytics/track";
import { getCelebAge } from "@/lib/celeb/lifespan";
import type { WorldBannerImages } from "@/lib/celeb/worldImages";
import {
  formatSectionNumber,
  getWorldStyle,
  type WorldFrame,
} from "@/lib/celeb/worldStyle";
import type { Locale } from "@/types/locale";

import CelebSectionHeading from "../CelebSectionHeading";
import CelebHeroPhoto from "../CelebHeroPhoto";
import styles from "../CelebPageContent.module.css";
import { CelebTierBadge } from "../CelebTierBadge";
import CelebViewCounter from "../CelebViewCounter";
import type { ServiceItem } from "../celebServiceItems";
import { formatCelebPeriod } from "./celebDetailData";
import { navigateToCelebSection } from "./useCelebSectionNavigation";

interface MaybeWorldFrameProps {
  frame: WorldFrame;
  framed: boolean;
  children: ReactNode;
}

function MaybeWorldFrame({ frame, framed, children }: MaybeWorldFrameProps) {
  if (!framed) return <>{children}</>;
  return <CelebWorldFrame frame={frame}>{children}</CelebWorldFrame>;
}

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
}: CelebHeroSectionProps) {
  const t = useTranslations("celebPage");
  const tp = useTranslations("profession");
  const { handleSubtitle: setSubtitle } = useDialogueSubtitle();
  const { fireGreeting, fireQuote } = useCelebGreeting({
    onSubtitle: setSubtitle,
    locale,
  });
  const [zoomOpen, setZoomOpen] = useState(false);

  const nickname = profile.nickname;
  const hasVoice = profile.has_voice ?? false;
  const celebTier = profile.celeb_tier ?? "full";
  const worldStyle = getWorldStyle(worldId);
  const professionLabel = profile.profession
    ? tp.has(profile.profession)
      ? tp(profile.profession)
      : tp("uncategorized")
    : null;
  const period = formatCelebPeriod(profile.birth_date, profile.death_date);
  const ageInfo = getCelebAge(profile.birth_date, profile.death_date);
  const ageLabel = ageInfo
    ? t(
        ageInfo.deceased
          ? ageInfo.approximate
            ? "ageAtDeathApprox"
            : "ageAtDeath"
          : ageInfo.approximate
            ? "ageCurrentApprox"
            : "ageCurrent",
        { age: ageInfo.age },
      )
    : null;
  const zoomImageUrl = profile.photo_url ?? profile.avatar_url ?? null;
  const zoomCaption = profile.photo_url
    ? (locale === "en"
        ? profile.photo_caption_en ?? profile.photo_caption
        : profile.photo_caption) ?? null
    : null;
  const canGreet = (greeting?.length ?? 0) > 0;
  // 소개는 언제나 첫 구획이다. 다음 화살표는 실제로 남아 있는 그다음 구획을 가리켜야 한다
  const introductionItem = serviceItems[0];
  const nextItem = serviceItems[1];

  const handleGreetingPlay = useCallback(() => {
    trackEvent("celeb_voice_play", { kind: "greeting" });
    fireGreeting({ ...profile, greeting, nickname });
  }, [fireGreeting, greeting, nickname, profile]);

  const handleQuotePlay = useCallback(() => {
    trackEvent("celeb_voice_play", { kind: "quote" });
    fireQuote({ ...profile, greeting, nickname });
  }, [fireQuote, greeting, nickname, profile]);

  const handleZoom = useCallback(() => {
    if (zoomImageUrl) setZoomOpen(true);
  }, [zoomImageUrl]);

  return (
    <>
      <section id="introduction" tabIndex={-1} className={styles.opening}>
        <CelebSectionHeading
          item={introductionItem}
          nextItem={nextItem}
          onNavigate={navigateToCelebSection}
          chapterLabel={formatSectionNumber(
            Number(introductionItem.chapter),
            worldStyle.numerals,
          )}
          numerals={worldStyle.numerals}
          widestLabel={introductionItem.label}
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
            <div
              className={`${styles.heroColumn} ${
                profile.photo_url ? "" : styles.avatarHeroColumn
              }`}
            >
              <div className={styles.desktopHeroPhoto}>
                <MaybeWorldFrame
                  frame={worldStyle.frame}
                  framed={Boolean(profile.photo_url)}
                >
                  <CelebHeroPhoto
                    photoUrl={profile.photo_url}
                    avatarUrl={profile.avatar_url}
                    nickname={nickname}
                    onZoom={handleZoom}
                    zoomLabel={t("enlargePhoto")}
                    onGreet={canGreet ? handleGreetingPlay : undefined}
                    greetLabel={t("playGreetingVoice")}
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
                  onGreet={canGreet ? handleGreetingPlay : undefined}
                  greetLabel={t("playGreetingVoice")}
                  avatarSize="h-28 w-28"
                  initialSize="text-2xl"
                />
              </div>
            </div>

            <div className={styles.identityCopy}>
              <div className={styles.identityTop}>
                <div className={styles.identityPrimary}>
                <div
                  className={`${styles.identityHeading} ${
                    profile.photo_url && profile.avatar_url
                      ? styles.identityHeadingWithAvatar
                      : ""
                  }`}
                >
                  {profile.photo_url && profile.avatar_url ? (
                    <div className={styles.identityAvatar}>
                      <Image
                        src={profile.avatar_url}
                        alt=""
                        fill
                        unoptimized
                        sizes="(max-width: 767px) 52px, 64px"
                        className={styles.identityAvatarImage}
                      />
                    </div>
                  ) : null}

                  <div className={styles.identityHeadingCopy}>
                    {profile.title ? (
                      <p className={styles.title}>{profile.title}</p>
                    ) : null}
                    <h1 className={styles.name}>{nickname}</h1>
                  </div>
                </div>

                {profile.headline ? (
                  <p className={styles.headline}>{profile.headline}</p>
                ) : null}

                <div className={styles.meta}>
                  {professionLabel ? (
                    <span className={styles.profession}>
                      <ProfessionInfoButton
                        profession={profile.profession!}
                        label={professionLabel}
                      />
                    </span>
                  ) : null}
                  {profile.nationality ? (
                    <span className="grayscale">
                      <NationalityText code={profile.nationality} />
                    </span>
                  ) : null}
                  {period ? <span className="font-mono">{period}</span> : null}
                  {ageLabel ? (
                    <span className="rounded-md border border-accent-dim/25 bg-accent/[0.04] px-3 py-1.5 font-medium leading-tight text-text-secondary">
                      {ageLabel}
                    </span>
                  ) : null}
                  <CelebTierBadge tier={celebTier} />
                </div>

                {locale === "en" && profile.translationFallbacks.length > 0 ? (
                  <p className="mt-3 leading-relaxed text-amber-200/70">
                    {t("originalKoreanNotice")}
                  </p>
                ) : null}
              </div>

              <div className={styles.actions}>
                <CelebViewCounter
                  celebId={profile.id}
                  nickname={nickname}
                  initialCount={profile.view_count ?? 0}
                  iconClassName={styles.viewCounterIcon}
                  buttonClassName={styles.viewCounterButton}
                />
                <ShareButtons
                  title={shareTitle}
                  path={`/celeb/${slug}`}
                  align="center"
                  comfortable
                  iconOnly
                  showLabel={false}
                />
              </div>
              </div>

              <div className={styles.identityNarrative}>
                {profile.bio ? <p className={styles.bio}>{profile.bio}</p> : null}
                {profile.quotes ? (
                  <div className={styles.quote}>
                    <p>
                      &ldquo;
                      <FormattedText text={profile.quotes} />
                      &rdquo;
                    </p>
                    {hasVoice ? (
                      <button
                        type="button"
                        onClick={handleQuotePlay}
                        className="mt-0.5 flex-shrink-0 rounded-full p-1 hover:text-accent"
                        aria-label={t("playQuoteVoice")}
                      >
                        <Volume2 size={16} />
                      </button>
                    ) : null}
                  </div>
                ) : null}
                {externalLinksSlot}
              </div>
            </div>
          </div>
        </div>
      </section>

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
