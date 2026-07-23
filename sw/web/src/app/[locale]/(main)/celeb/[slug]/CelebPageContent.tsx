"use client";

import { type ReactNode, useCallback } from "react";
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
import { type SpotlightTagPreview } from "@/actions/home/getFeaturedTags";
import { type CelebInfluenceDetail } from "@/actions/home/getCelebInfluence";
import { type GetUserContentsResponse } from "@/actions/contents/getUserContents";
import { type GuestbookEntryWithAuthor } from "@/types/database";
import { FormattedText } from "@/components/ui";
import ClassicalBox from "@/components/ui/ClassicalBox";
import ShareButtons from "@/components/ui/ShareButtons";
import NationalityText from "@/components/ui/NationalityText";
import GuestbookContent from "@/components/features/profile/GuestbookContent";

import LibraryTabs from "./LibraryTabs";
import CelebServiceNavigator, {
  type CelebServiceAvailability,
  type ServiceTarget,
} from "./CelebServiceNavigator";
import { CELEB_SERVICE_ICONS } from "./celebServiceIcons";
import { CelebTierBadge, CelebTierNotice } from "./CelebTierNotice";
import PersonaSection from "./PersonaSection";
import ContemporariesSection from "./ContemporariesSection";
import DialogueSection from "./DialogueSection";
import SpotlightSection from "./SpotlightSection";
import VideosSection, { type CelebVideoItem } from "./VideosSection";
import VirtualMonologueSection from "./VirtualMonologueSection";
import RelationGraphSection from "./RelationGraphSection";
import CelebInfluenceSection from "./CelebInfluenceSection";
import CelebSectionHeading from "./CelebSectionHeading";
import { CELEB_SERVICE_CHAPTERS } from "./celebSectionChapters";

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
  spotlightPreviews: SpotlightTagPreview[];
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
  "animate-fade-in max-w-3xl mx-auto space-y-4 scroll-mt-24 md:scroll-mt-28 focus:outline-none";

/* ── 공통 래퍼: 모바일 HR / PC ClassicalBox ──
   주의: 이 컴포넌트는 반드시 모듈 최상위에 둔다. 부모 함수 본문 안에서
   정의하면 부모가 리렌더될 때마다 새 컴포넌트 타입이 되어 내부 자식
   (서가·동시대 인물 등)이 통째로 언마운트→재마운트된다. */
const SectionWrap = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <>
    {/* 모바일: HR + 여백 최소화 */}
    <div className={`md:hidden ${className}`}>
      <hr className="border-accent-dim/30 mb-5" />
      {children}
    </div>
    {/* PC: 기존 ClassicalBox */}
    <div className="hidden md:block">
      <ClassicalBox hover={false} className={`p-6 ${className}`}>
        {children}
      </ClassicalBox>
    </div>
  </>
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
  spotlightPreviews,
  initialContents,
}: CelebPageContentProps) {
  const t = useTranslations("celebPage");
  const tp = useTranslations("profession");
  const locale = useLocale() as Locale;
  const { handleSubtitle: setSubtitle } = useDialogueSubtitle();
  const { fireGreeting, fireQuote } = useCelebGreeting({ onSubtitle: setSubtitle, locale });

  const professionLabel = profile.profession ? tp(profile.profession) : null;
  const birthYear = formatYear(profile.birth_date);
  const deathYear = profile.death_date ? formatYear(profile.death_date) : null;
  const periodStr = birthYear
    ? deathYear
      ? `${birthYear} — ${deathYear}`
      : `${birthYear} —`
    : "";
  const hasVoice = profile.has_voice ?? false;
  const nickname = profile.nickname;
  const wikidataQid = profile.wikidata_qid ?? null;
  const celebTier = profile.celeb_tier ?? 'full';
  // full 등급만 감상 기록 기반 서가를 제공한다.
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
    contemporaries: contemporaries.length > 0,
    spotlight: profile.spotlightTags.length > 0,
    videos: hasAnyVideo,
    virtualMonologue: !!profile.virtual_monologue,
    dialogues: hasDialogues,
    dialogueVoice: hasDialogues && hasVoice,
    // 기존 monologue.mp3는 고유 대사의 짧은 독백이며 가상 독백 전문 낭독이 아니다.
    virtualMonologueVoice: false,
    influence: !!influenceData,
    persona: !!personaData?.targetPersona,
  };

  const handleAvatarClick = useCallback(() => {
    fireGreeting({ ...profile, greeting, nickname });
  }, [fireGreeting, greeting, nickname, profile]);

  const handleQuotePlay = useCallback(() => {
    fireQuote({ ...profile, greeting, nickname });
  }, [fireQuote, greeting, nickname, profile]);

  const handleServiceNavigate = useCallback((target: ServiceTarget) => {
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

  return (
    <div className="space-y-10 md:space-y-16">
      {/* 인물 프로필 + 명언 */}
      <section
        id="introduction"
        tabIndex={-1}
        className={SECTION_CLASS_NAME}
      >
        <CelebSectionHeading
          chapter={CELEB_SERVICE_CHAPTERS.introduction}
          label={t("intro")}
          icon={CELEB_SERVICE_ICONS.introduction}
        />

        {/* 모바일: 세로 스택 */}
        <div className="md:hidden">
          <hr className="border-accent-dim/30 mb-5" />
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
                <CelebTierBadge tier={celebTier} />
              </div>
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
                      aria-label="Play quote voice"
                    >
                      <Volume2 size={14} />
                    </button>
                  )}
                </div>
              )}
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
                <CelebTierBadge tier={celebTier} />
              </div>
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
                      aria-label="Play quote voice"
                    >
                      <Volume2 size={14} />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </ClassicalBox>

        <CelebServiceNavigator
          tier={celebTier}
          showLibrary={showLibrary}
          availability={serviceAvailability}
          onNavigate={handleServiceNavigate}
        />

        {/* SNS 공유 */}
        <div className="flex justify-end">
          <ShareButtons title={shareTitle} path={`/celeb/${slug}`} />
        </div>
      </section>

      {/* 기록 서가 (감상 기록 / 창작물) */}
      {showLibrary && (
        <section id="library" tabIndex={-1} className={SECTION_CLASS_NAME}>
          <CelebSectionHeading
            chapter={CELEB_SERVICE_CHAPTERS.library}
            label={t("library")}
            icon={CELEB_SERVICE_ICONS.library}
          />
          <SectionWrap>
            <LibraryTabs
              userId={userId}
              nickname={nickname}
              emptyMessage={t("libraryEmpty")}
              wikidataQid={wikidataQid}
              initialContents={initialContents}
            />
          </SectionWrap>
        </section>
      )}

      {/* 인물 관계망 — 위키데이터 사실 관계(혈연·사상·대립). 관계가 없으면 섹션 자체를 띄우지 않는다 */}
      {profile.relations.length > 0 && (
        <section id="relations" tabIndex={-1} className={SECTION_CLASS_NAME}>
          <CelebSectionHeading
            chapter={CELEB_SERVICE_CHAPTERS.relations}
            label={t("relationGraph")}
            icon={CELEB_SERVICE_ICONS.relations}
          />
          <SectionWrap>
            <RelationGraphSection
              centerName={nickname}
              centerAvatarUrl={profile.avatar_url}
              relations={profile.relations}
            />
          </SectionWrap>
        </section>
      )}

      {/* 동시대 인물 */}
      {contemporaries.length > 0 && (
        <section id="contemporaries" tabIndex={-1} className={SECTION_CLASS_NAME}>
          <CelebSectionHeading
            chapter={CELEB_SERVICE_CHAPTERS.contemporaries}
            label={t("contemporaries")}
            icon={CELEB_SERVICE_ICONS.contemporaries}
          />
          <SectionWrap>
            <ContemporariesSection contemporaries={contemporaries} />
          </SectionWrap>
        </section>
      )}

      {/* 영향력 */}
      {influenceData && (
        <section id="influence" tabIndex={-1} className={SECTION_CLASS_NAME}>
          <CelebSectionHeading
            chapter={CELEB_SERVICE_CHAPTERS.influence}
            label={t("influence")}
            icon={CELEB_SERVICE_ICONS.influence}
          />
          <SectionWrap>
            <CelebInfluenceSection data={influenceData} />
          </SectionWrap>
        </section>
      )}

      {/* 인물 분석 */}
      {personaData?.targetPersona && (
        <section id="persona" tabIndex={-1} className={SECTION_CLASS_NAME}>
          <CelebSectionHeading
            chapter={CELEB_SERVICE_CHAPTERS.persona}
            label={t("analysis")}
            icon={CELEB_SERVICE_ICONS.persona}
          />
          <SectionWrap>
            <PersonaSection
              persona={personaData.targetPersona}
              personaJsonb={personaData.targetPersonaJsonb}
              similarCelebs={personaData.similarCelebs}
            />
          </SectionWrap>
        </section>
      )}

      {/* 가상 독백 — 영어 화면에서는 영문본을 싣는다. 영문본이 아직 없는 인물만 브라우저 내장 번역 버튼을 곁들인다 */}
      {profile.virtual_monologue && (
        <section id="virtual-monologue" tabIndex={-1} className={SECTION_CLASS_NAME}>
          <CelebSectionHeading
            chapter={CELEB_SERVICE_CHAPTERS.virtualMonologue}
            label={t("virtualMonologue")}
            icon={CELEB_SERVICE_ICONS.virtualMonologue}
          />
          <SectionWrap>
            <VirtualMonologueSection
              text={profile.virtual_monologue}
              showTranslate={locale === "en"}
            />
          </SectionWrap>
        </section>
      )}

      {/* 고유 대사 */}
      {hasDialogues && dialogueLines && (
        <section id="dialogues" tabIndex={-1} className={SECTION_CLASS_NAME}>
          <CelebSectionHeading
            chapter={CELEB_SERVICE_CHAPTERS.dialogues}
            label={t("dialogues")}
            icon={CELEB_SERVICE_ICONS.dialogues}
          />
          <SectionWrap>
            <DialogueSection
              lines={dialogueLines}
              nickname={nickname}
              avatarUrl={profile.avatar_url}
              hasVoice={hasVoice}
              celebId={userId}
              voiceV={profile.voice_v}
              voiceSpeed={profile.voice_speed}
            />
          </SectionWrap>
        </section>
      )}

      {/* 영상 (롱폼 + 쇼츠) */}
      {hasAnyVideo && (
        <section id="videos" tabIndex={-1} className={SECTION_CLASS_NAME}>
          <CelebSectionHeading
            chapter={CELEB_SERVICE_CHAPTERS.videos}
            label={t("videos")}
            icon={CELEB_SERVICE_ICONS.videos}
          />
          <SectionWrap>
            <VideosSection longform={longform} shorts={shorts} />
          </SectionWrap>
        </section>
      )}

      {/* 소속 스포트라이트 */}
      {profile.spotlightTags.length > 0 && (
        <section id="spotlight" tabIndex={-1} className={SECTION_CLASS_NAME}>
          <CelebSectionHeading
            chapter={CELEB_SERVICE_CHAPTERS.spotlight}
            label={t("spotlight")}
            icon={CELEB_SERVICE_ICONS.spotlight}
          />
          <SectionWrap>
            <SpotlightSection
              tags={profile.spotlightTags}
              previews={spotlightPreviews}
              currentCelebId={profile.id}
            />
          </SectionWrap>
        </section>
      )}

      {/* 방명록 */}
      <section id="guestbook" tabIndex={-1} className={SECTION_CLASS_NAME}>
        <CelebSectionHeading
          chapter={CELEB_SERVICE_CHAPTERS.guestbook}
          label={t("guestbook")}
          icon={CELEB_SERVICE_ICONS.guestbook}
        />
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
  );
}
