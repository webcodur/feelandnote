"use client";

import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Volume2 } from "lucide-react";
import type { Locale } from "@/types/locale";

import {
  useDialogueSubtitle,
} from "@/components/features/game/shared/hooks/useDialogue";
import { useCelebGreeting } from "@/hooks/useCelebGreeting";
import { type CelebBySlugProfile } from "@/actions/user/getCelebBySlug";
import { type SimilarByCelebResult } from "@/actions/persona/getSimilarByCelebId";
import { type ContemporaryCeleb } from "@/actions/celebs/getContemporaries";
import { type FactionTagPreview } from "@/actions/home/getFeaturedTags";
import { type CelebInfluenceDetail } from "@/actions/home/getCelebInfluence";
import { type GetUserContentsResponse } from "@/actions/contents/getUserContents";
import { type CelebTimelineEvent } from "@/actions/celebs/getCelebTimelineEvents";
import { type GuestbookEntryWithAuthor } from "@/types/database";
import { trackEvent, useSectionViewTracking } from "@/lib/analytics/track";
import { FormattedText } from "@/components/ui";
import ClassicalBox from "@/components/ui/ClassicalBox";
import ShareButtons from "@/components/ui/ShareButtons";
import NationalityText from "@/components/ui/NationalityText";
import GuestbookContent from "@/components/features/profile/GuestbookContent";

import LibraryTabs from "./LibraryTabs";
import CelebServiceNavigator, {
  type CelebServiceAvailability,
  type ServiceTarget,
  useCelebServiceItems,
} from "./CelebServiceNavigator";
import { CelebAtlasNavigation } from "./CelebAtlasRails";
import { CelebTierBadge, CelebTierNotice } from "./CelebTierNotice";
import { type CelebVideoItem } from "./VideosSection";
import JourneySection from "./JourneySection";
import CelebSectionHeading from "./CelebSectionHeading";
import CelebViewCounter from "./CelebViewCounter";
import FigureAnalysisTabs from "./FigureAnalysisTabs";
import FigureMediaTabs from "./FigureMediaTabs";
import PeopleAndEraTabs from "./PeopleAndEraTabs";
import UnavailableSectionGuide from "./UnavailableSectionGuide";
import { getCelebAge } from "./celebAge";

interface CelebPageContentProps {
  profile: CelebBySlugProfile;
  slug: string;
  shareTitle: string;
  userId: string;
  influenceData: CelebInfluenceDetail | null;
  personaData: SimilarByCelebResult | null;
  guestbookEntries: GuestbookEntryWithAuthor[];
  guestbookTotal: number;
  greeting?: string[] | null;
  dialogueLines?: Record<string, string[]> | null;
  contemporaries: ContemporaryCeleb[];
  /** 타임라인 사건. 좌표를 가진 항목만 활동반경 지도에 오른다 */
  timelineEvents: CelebTimelineEvent[];
  factionPreviews: FactionTagPreview[];
  /** 서버에서 미리 조회한 서가 첫 화면 — 초기 HTML에 책 목록·감상문을 싣기 위함 */
  initialContents: GetUserContentsResponse;
}

const formatYear = (year: string | null | undefined) => {
  if (!year) return "";
  const num = parseInt(year);
  if (isNaN(num)) return year;
  return num < 0 ? `BC ${Math.abs(num)}` : `${num}`;
};

const SECTION_CLASS_NAME =
  "animate-fade-in w-full max-w-3xl xl:max-w-none mx-auto space-y-2 md:space-y-4 scroll-mt-24 md:scroll-mt-28 focus:outline-none";

/* ── 공통 래퍼: 모바일 얇은 상자 / PC ClassicalBox ──
   모바일은 제목을 상자 밖 위에 두고 본문만 감싼다. 상자를 되살린 대신
   좌우·안쪽 여백은 최소로 잡아 가로선 시절의 공간 절약을 유지한다.

   주의: 이 컴포넌트는 반드시 모듈 최상위에 둔다. 부모 함수 본문 안에서
   정의하면 부모가 리렌더될 때마다 새 컴포넌트 타입이 되어 내부 자식
   (서가·동시대 인물 등)이 통째로 언마운트→재마운트된다. */
const SectionWrap = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <ClassicalBox
    hover={false}
    mobilePlain
    className={`px-2 py-5 md:p-6 ${className}`}
  >
    {children}
  </ClassicalBox>
);

export default function CelebPageContent({
  profile,
  slug,
  shareTitle,
  userId,
  influenceData,
  personaData,
  guestbookEntries,
  guestbookTotal,
  greeting,
  dialogueLines,
  contemporaries,
  timelineEvents,
  factionPreviews,
  initialContents,
}: CelebPageContentProps) {
  const t = useTranslations("celebPage");
  const tp = useTranslations("profession");
  const locale = useLocale() as Locale;
  const { handleSubtitle: setSubtitle } = useDialogueSubtitle();
  const { fireGreeting, fireQuote } = useCelebGreeting({ onSubtitle: setSubtitle, locale });

  // 어느 칸까지 실제로 내려보는지 집계한다 — 인물 화면이 한 장에서 끝나는 원인 판별용
  const contentRef = useRef<HTMLDivElement>(null);
  useSectionViewTracking(contentRef);

  const professionLabel = profile.profession ? tp(profile.profession) : null;
  const birthYear = formatYear(profile.birth_date);
  const deathYear = profile.death_date ? formatYear(profile.death_date) : null;
  const periodStr = birthYear
    ? deathYear
      ? `${birthYear} — ${deathYear}`
      : `${birthYear} —`
    : "";
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
  const hasVoice = profile.has_voice ?? false;
  const nickname = profile.nickname;
  const wikidataQid = profile.wikidata_qid ?? null;
  const celebTier = profile.celeb_tier ?? 'full';
  // full 등급만 감상·창작 기록물을 제공한다.
  const showLibrary = celebTier === 'full';

  /* ── 유튜브 영상: 현재 locale에 맞춰 longform/shorts 분리 ── */
  const youtubeVideos = profile.youtube_videos ?? {};
  const longformKey = `${locale}-longform`;
  const longform: CelebVideoItem[] = youtubeVideos[longformKey]
    ? [{ videoId: youtubeVideos[longformKey].videoId }]
    : [];
  const shortsPrefix = `${locale}-shorts-`;
  const shorts: CelebVideoItem[] = Object.entries(youtubeVideos)
    .filter(([k]) => k.startsWith(shortsPrefix))
    .sort(([a], [b]) => {
      const ai = parseInt(a.slice(shortsPrefix.length), 10) || 0;
      const bi = parseInt(b.slice(shortsPrefix.length), 10) || 0;
      return ai - bi;
    })
    .map(([, v]) => ({ videoId: v.videoId }));
  const hasAnyVideo = longform.length > 0 || shorts.length > 0;
  const hasDialogues = !!dialogueLines && Object.keys(dialogueLines).length > 0;
  const serviceAvailability: CelebServiceAvailability = {
    relations: profile.relations.length > 0,
    timeline: timelineEvents.length > 0,
    contemporaries: contemporaries.length > 0,
    faction: profile.factionTags.length > 0,
    videos: hasAnyVideo,
    virtualMonologue: !!profile.virtual_monologue,
    dialogues: hasDialogues,
    dialogueVoice: hasDialogues && hasVoice,
    // 기존 monologue.mp3는 고유 대사의 짧은 독백이며 가상 독백 전문 낭독이 아니다.
    virtualMonologueVoice: false,
    influence: !!influenceData,
    persona: !!personaData?.targetPersona,
  };
  const serviceItems = useCelebServiceItems({
    tier: celebTier,
    showLibrary,
    availability: serviceAvailability,
  });
  const serviceItemsByKey = new Map(serviceItems.map((item) => [item.key, item]));
  const serviceItemIndexByKey = new Map(
    serviceItems.map((item, index) => [item.key, index]),
  );
  const sectionKey = serviceItems
    .map((item) => item.target.sectionId)
    .join("|");
  const [activeSectionId, setActiveSectionId] = useState("introduction");

  // 넓은 화면의 고정 탐구도와 맥락석이 현재 읽는 장을 함께 가리키게 한다.
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;

    const sectionIds = sectionKey.split("|").filter(Boolean);
    const sections = sectionIds
      .map((sectionId) => document.getElementById(sectionId))
      .filter((section): section is HTMLElement => section !== null);
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (a, b) =>
              Math.abs(a.boundingClientRect.top - window.innerHeight * 0.24)
              - Math.abs(b.boundingClientRect.top - window.innerHeight * 0.24),
          )[0];

        if (visibleEntry) setActiveSectionId(visibleEntry.target.id);
      },
      {
        rootMargin: "-18% 0px -68% 0px",
        threshold: 0.01,
      },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [sectionKey]);

  const handleAvatarClick = useCallback(() => {
    trackEvent("celeb_voice_play", { kind: "greeting" });
    fireGreeting({ ...profile, greeting, nickname });
  }, [fireGreeting, greeting, nickname, profile]);

  const handleQuotePlay = useCallback(() => {
    trackEvent("celeb_voice_play", { kind: "quote" });
    fireQuote({ ...profile, greeting, nickname });
  }, [fireQuote, greeting, nickname, profile]);

  const handleServiceNavigate = useCallback((target: ServiceTarget) => {
    trackEvent("celeb_guide_click", { section: target.sectionId });
    setActiveSectionId(target.sectionId);
    window.history.replaceState(null, "", `#${target.sectionId}`);
    window.requestAnimationFrame(() => {
      const section = document.getElementById(target.sectionId);
      if (!section) return;

      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      section.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "start",
      });
      section.focus({ preventScroll: true });
    });
  }, []);

  const renderSectionHeading = (key: string) => {
    const index = serviceItemIndexByKey.get(key);
    if (index === undefined) return null;

    return (
      <CelebSectionHeading
        item={serviceItems[index]}
        previousItem={serviceItems[index - 1]}
        nextItem={serviceItems[index + 1]}
        onNavigate={handleServiceNavigate}
      />
    );
  };

  return (
    <div
      ref={contentRef}
      className="xl:grid xl:grid-cols-[360px_minmax(0,1fr)] xl:items-start xl:gap-6 2xl:gap-8"
    >
      <CelebAtlasNavigation
        items={serviceItems}
        activeSectionId={activeSectionId}
        onNavigate={handleServiceNavigate}
        avatarUrl={profile.avatar_url ?? null}
        nickname={nickname}
        title={profile.title ?? null}
        professionLabel={professionLabel}
      />

      <div className="min-w-0 space-y-14 md:space-y-16">
      {/* 인물 프로필 + 명언 */}
      <section
        id="introduction"
        tabIndex={-1}
        className={SECTION_CLASS_NAME}
      >
        {renderSectionHeading("introduction")}

        {/* 모바일: 세로 스택 */}
        <div className="rounded-sm border border-accent-dim/40 bg-bg-card/40 px-2 py-5 md:hidden">
          <div className="flex flex-col items-center gap-4">
            <button
              type="button"
              onClick={handleAvatarClick}
              className="w-28 h-28 flex-shrink-0 rounded-full overflow-hidden ring-1 ring-accent/20 hover:ring-accent/60 bg-bg-secondary transition-all duration-300 cursor-pointer active:scale-95"
            >
              {profile.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt={nickname}
                  width={112}
                  height={112}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl font-serif text-accent/30">
                  {nickname.charAt(0)}
                </div>
              )}
            </button>

            <div className="space-y-2 w-full text-center">
              <p className="font-serif text-xl text-text-primary tracking-tight">
                {profile.title && <span className="text-accent/70">{profile.title}{' '}</span>}
                {nickname}
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-text-tertiary flex-wrap">
                {professionLabel && (
                  <span className="text-accent font-medium">{professionLabel}</span>
                )}
                {profile.nationality && (
                  <span className="grayscale">
                    <NationalityText code={profile.nationality} />
                  </span>
                )}
                {periodStr && <span className="font-mono">{periodStr}</span>}
                {ageLabel && (
                  <span className="rounded-md border border-accent-dim/25 bg-accent/[0.04] px-3 py-1.5 text-base font-medium leading-tight text-text-secondary sm:text-lg">
                    {ageLabel}
                  </span>
                )}
                <CelebTierBadge tier={celebTier} />
                <CelebViewCounter celebId={profile.id} nickname={nickname} initialCount={profile.view_count ?? 0} />
              </div>
              {locale === "en" && profile.translationFallbacks.length > 0 && (
                <p className="text-xs leading-relaxed text-amber-200/70">
                  {t("originalKoreanNotice")}
                </p>
              )}
              {profile.bio && (
                <p className="text-sm text-text-secondary leading-relaxed break-keep text-left">
                  {profile.bio}
                </p>
              )}
              <CelebTierNotice tier={celebTier} />
              {profile.quotes && (
                <div className="flex items-start justify-center gap-1.5 pt-1">
                  <p className="font-serif text-[15px] text-accent/80 leading-relaxed break-keep italic text-left">
                    &ldquo;
                    <FormattedText text={profile.quotes} />
                    &rdquo;
                  </p>
                  {hasVoice && (
                    <button
                      type="button"
                      onClick={handleQuotePlay}
                      className="flex-shrink-0 mt-0.5 p-1 rounded-full transition-colors text-text-tertiary hover:text-accent"
                      aria-label={t("playQuoteVoice")}
                    >
                      <Volume2 size={14} />
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="flex w-full justify-end border-t border-white/10 pt-3">
              <ShareButtons
                title={shareTitle}
                path={`/celeb/${slug}`}
                comfortable
              />
            </div>
          </div>
        </div>

        {/* PC: 기존 2열 레이아웃 */}
        <ClassicalBox hover={false} className="px-5 py-5 hidden md:block">
          <div className="grid grid-cols-[auto_1fr] gap-6">
            <button
              type="button"
              onClick={handleAvatarClick}
              className="w-44 h-44 flex-shrink-0 rounded-full overflow-hidden ring-1 ring-accent/20 hover:ring-accent/60 bg-bg-secondary self-start transition-all duration-300 cursor-pointer active:scale-95"
            >
              {profile.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt={nickname}
                  width={176}
                  height={176}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl font-serif text-accent/30">
                  {nickname.charAt(0)}
                </div>
              )}
            </button>

            <div className="space-y-2 min-w-0">
              <p className="font-serif text-2xl text-text-primary tracking-tight">
                {profile.title && <span className="text-accent/70">{profile.title}{' '}</span>}
                {nickname}
              </p>
              <div className="flex items-center gap-2 text-sm text-text-tertiary flex-wrap">
                {professionLabel && (
                  <span className="text-accent font-medium">{professionLabel}</span>
                )}
                {profile.nationality && (
                  <span className="grayscale">
                    <NationalityText code={profile.nationality} />
                  </span>
                )}
                {periodStr && <span className="font-mono">{periodStr}</span>}
                {ageLabel && (
                  <span className="rounded-md border border-accent-dim/25 bg-accent/[0.04] px-3 py-1.5 text-base font-medium leading-tight text-text-secondary sm:text-lg">
                    {ageLabel}
                  </span>
                )}
                <CelebTierBadge tier={celebTier} />
                <CelebViewCounter celebId={profile.id} nickname={nickname} initialCount={profile.view_count ?? 0} />
              </div>
              {locale === "en" && profile.translationFallbacks.length > 0 && (
                <p className="text-xs leading-relaxed text-amber-200/70">
                  {t("originalKoreanNotice")}
                </p>
              )}
              {profile.bio && (
                <p className="text-sm text-text-secondary leading-relaxed break-keep">
                  {profile.bio}
                </p>
              )}
              <CelebTierNotice tier={celebTier} />
              {profile.quotes && (
                <div className="flex items-start gap-1.5 pt-1">
                  <p className="font-serif text-[15px] text-accent/80 leading-relaxed break-keep italic">
                    &ldquo;
                    <FormattedText text={profile.quotes} />
                    &rdquo;
                  </p>
                  {hasVoice && (
                    <button
                      type="button"
                      onClick={handleQuotePlay}
                      className="flex-shrink-0 mt-0.5 p-1 rounded-full transition-colors text-text-tertiary hover:text-accent"
                      aria-label={t("playQuoteVoice")}
                    >
                      <Volume2 size={14} />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 flex justify-end border-t border-white/10 pt-3">
            <ShareButtons
              title={shareTitle}
              path={`/celeb/${slug}`}
              comfortable
            />
          </div>
        </ClassicalBox>

        <CelebServiceNavigator
          tier={celebTier}
          showLibrary={showLibrary}
          availability={serviceAvailability}
          onNavigate={handleServiceNavigate}
          className="hidden md:block xl:hidden"
        />
      </section>

      {/* 기록물 (감상 / 창작) */}
      <section id="library" tabIndex={-1} className={SECTION_CLASS_NAME}>
        {renderSectionHeading("library")}
        {showLibrary ? (
          <SectionWrap>
            <LibraryTabs
              userId={userId}
              nickname={nickname}
              emptyMessage={t("libraryEmpty")}
              wikidataQid={wikidataQid}
              initialContents={initialContents}
            />
          </SectionWrap>
        ) : (
          <UnavailableSectionGuide item={serviceItemsByKey.get("library")!} />
        )}
      </section>

      {/* 타임라인 — 연도순 사건과 활동반경 지도 */}
      <section id="timeline" tabIndex={-1} className={SECTION_CLASS_NAME}>
        {renderSectionHeading("timeline")}
        {timelineEvents.length > 0 ? (
          <SectionWrap>
            <JourneySection events={timelineEvents} />
          </SectionWrap>
        ) : (
          <UnavailableSectionGuide item={serviceItemsByKey.get("timeline")!} />
        )}
      </section>

      {/* 인물과 시대 — 직접 관계·동시대 인물·세력도감을 한 장 안에서 연다 */}
      <section id="connections" tabIndex={-1} className={SECTION_CLASS_NAME}>
        {renderSectionHeading("connections")}
        <SectionWrap>
          <PeopleAndEraTabs
            item={serviceItemsByKey.get("connections")!}
            centerName={nickname}
            centerAvatarUrl={profile.avatar_url}
            relations={profile.relations}
            contemporaries={contemporaries}
            factionTags={profile.factionTags}
            factionPreviews={factionPreviews}
            currentCelebId={profile.id}
          />
        </SectionWrap>
      </section>

      {/* 인물 지표 — 16축 지표와 영향력을 한 장 안에서 연다 */}
      <section id="analysis" tabIndex={-1} className={SECTION_CLASS_NAME}>
        {renderSectionHeading("analysis")}
        <SectionWrap>
          <FigureAnalysisTabs
            item={serviceItemsByKey.get("analysis")!}
            personaData={personaData}
            influenceData={influenceData}
          />
        </SectionWrap>
      </section>

      {/* 미디어 — 이 인물의 독백·대사·영상을 한 장 안에서 연다 */}
      <section id="media" tabIndex={-1} className={SECTION_CLASS_NAME}>
        {renderSectionHeading("media")}
        <SectionWrap>
          <FigureMediaTabs
            item={serviceItemsByKey.get("media")!}
            monologueText={profile.virtual_monologue}
            showTranslate={locale === "en"}
            dialogueLines={dialogueLines}
            nickname={nickname}
            avatarUrl={profile.avatar_url}
            hasVoice={hasVoice}
            celebId={userId}
            voiceV={profile.voice_v}
            voiceSpeed={profile.voice_speed}
            longform={longform}
            shorts={shorts}
          />
        </SectionWrap>
      </section>

      {/* 방명록 */}
      <section id="guestbook" tabIndex={-1} className={SECTION_CLASS_NAME}>
        {renderSectionHeading("guestbook")}
        <SectionWrap>
          <GuestbookContent
            profileId={userId}
            isOwner={false}
            initialEntries={guestbookEntries}
            initialTotal={guestbookTotal}
            hideEmptyState
          />
        </SectionWrap>
      </section>
      </div>

    </div>
  );
}
