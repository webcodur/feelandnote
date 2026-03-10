"use client";

import { useCallback, useRef } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Volume2 } from "lucide-react";
import type { Locale } from "@/types/locale";

import {
  stripEmotionTag,
  useDialogueSubtitle,
} from "@/components/features/game/shared/hooks/useDialogue";
import { type PublicUserProfile } from "@/actions/user";
import { type SimilarByCelebResult } from "@/actions/persona/getSimilarByCelebId";
import { type GuestbookEntryWithAuthor } from "@/types/database";
import { DecorativeLabel, FormattedText } from "@/components/ui";
import ClassicalBox from "@/components/ui/ClassicalBox";
import NationalityText from "@/components/ui/NationalityText";
import GuestbookContent from "@/components/features/profile/GuestbookContent";
import { getQuoteVoiceUrl, getVoiceUrl } from "@/lib/game/voice/voiceUrl";

import LibraryTabs from "./LibraryTabs";
import PersonaSection from "./PersonaSection";

interface CelebPageContentProps {
  profile: PublicUserProfile;
  userId: string;
  personaData: SimilarByCelebResult | null;
  guestbookEntries: GuestbookEntryWithAuthor[];
  guestbookTotal: number;
  guestbookCurrentUser: {
    id: string;
    nickname: string | null;
    avatar_url: string | null;
  } | null;
  greeting?: string[] | null;
}

const formatYear = (year: string | null | undefined) => {
  if (!year) return "";
  const num = parseInt(year);
  if (isNaN(num)) return year;
  return num < 0 ? `BC ${Math.abs(num)}` : `${num}`;
};

export default function CelebPageContent({
  profile,
  userId,
  personaData,
  guestbookEntries,
  guestbookTotal,
  guestbookCurrentUser,
  greeting,
}: CelebPageContentProps) {
  const t = useTranslations("celebPage");
  const tp = useTranslations("profession");
  const locale = useLocale() as Locale;
  const { handleSubtitle: setSubtitle } = useDialogueSubtitle();
  const keyCounter = useRef(0);
  const lastGreetingIdx = useRef<number | null>(null);

  const professionLabel = profile.profession ? tp(profile.profession) : null;
  const birthYear = formatYear(profile.birth_date);
  const deathYear = profile.death_date ? formatYear(profile.death_date) : null;
  const periodStr = birthYear
    ? deathYear
      ? `${birthYear} — ${deathYear}`
      : `${birthYear} —`
    : "";
  const hasVoice = profile.has_voice ?? false;
  const voiceV = profile.voice_v ?? 0;
  const nickname = profile.nickname;
  const wikidataQid = profile.wikidata_qid ?? null;

  const handleAvatarClick = useCallback(() => {
    if (!greeting || greeting.length === 0) return;
    let idx: number;
    if (greeting.length <= 1) {
      idx = 0;
    } else {
      do {
        idx = Math.floor(Math.random() * greeting.length);
      } while (idx === lastGreetingIdx.current);
    }
    lastGreetingIdx.current = idx;
    const raw = greeting[idx];
    setSubtitle({
      key: ++keyCounter.current,
      tone: "composed",
      text: stripEmotionTag(raw),
      nickname: profile.nickname,
      avatarUrl: profile.avatar_url,
      audioUrl: hasVoice
        ? getVoiceUrl(profile.id, locale, "greeting", idx + 1, voiceV)
        : null,
    });
  }, [greeting, profile.nickname, profile.avatar_url, profile.id, hasVoice, locale, voiceV, setSubtitle]);

  const handleQuotePlay = useCallback(() => {
    setSubtitle({
      key: ++keyCounter.current,
      tone: "composed",
      text: profile.quotes ?? "",
      nickname: profile.nickname,
      avatarUrl: profile.avatar_url,
      audioUrl: getQuoteVoiceUrl(profile.id, locale, voiceV),
    });
  }, [profile.id, profile.nickname, profile.avatar_url, profile.quotes, locale, voiceV, setSubtitle]);

  return (
    <div className="space-y-16">
      {/* 인물 프로필 + 명언 */}
      <section className="animate-fade-in max-w-3xl mx-auto space-y-4">
        <DecorativeLabel label={t("intro")} />
        <ClassicalBox hover={false} className="px-5 py-5">
          <div className="grid grid-cols-[auto_1fr] gap-6">
            {/* 아바타 (클릭 시 greeting 대사) */}
            <button
              type="button"
              onClick={handleAvatarClick}
              className="w-32 h-32 md:w-44 md:h-44 flex-shrink-0 rounded-full overflow-hidden ring-1 ring-accent/20 hover:ring-accent/60 bg-bg-secondary self-start transition-all duration-300 cursor-pointer active:scale-95"
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

            {/* 정보 */}
            <div className="space-y-2 min-w-0">
              <p className="font-serif text-xl md:text-2xl text-text-primary tracking-tight">
                {nickname}
              </p>
              <div className="flex items-center gap-2 text-sm text-text-tertiary flex-wrap">
                {professionLabel && (
                  <span className="text-accent font-medium">
                    {professionLabel}
                  </span>
                )}
                {profile.nationality && (
                  <span className="grayscale">
                    <NationalityText code={profile.nationality} />
                  </span>
                )}
                {periodStr && (
                  <span className="font-mono">{periodStr}</span>
                )}
              </div>
              {profile.bio && (
                <p className="text-sm text-text-secondary leading-relaxed break-keep">
                  {profile.bio}
                </p>
              )}
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
      </section>

      {/* 감상 철학 */}
      {profile.consumption_philosophy && (
        <section className="animate-fade-in max-w-3xl mx-auto space-y-3">
          <DecorativeLabel label={t("philosophy")} />
          <ClassicalBox hover={false} className="px-5 py-4">
            <div className="font-serif text-sm md:text-[15px] text-text-secondary leading-[1.9] break-keep">
              <FormattedText text={profile.consumption_philosophy} />
            </div>
          </ClassicalBox>
        </section>
      )}

      {/* 서가 (감상 / 창작 탭) */}
      <section className="animate-fade-in max-w-3xl mx-auto space-y-4">
        <DecorativeLabel label={t("library")} />
        <ClassicalBox hover={false} className="p-6">
          <LibraryTabs
            userId={userId}
            nickname={nickname}
            emptyMessage={t("libraryEmpty")}
            wikidataQid={wikidataQid}
          />
        </ClassicalBox>
      </section>

      {/* 인물 분석 */}
      {personaData?.targetPersona && (
        <section className="animate-fade-in max-w-3xl mx-auto space-y-4">
          <DecorativeLabel label={t("analysis")} />
          <ClassicalBox hover={false} className="p-6">
            <PersonaSection
              persona={personaData.targetPersona}
              personaJsonb={personaData.targetPersonaJsonb}
              similarCelebs={personaData.similarCelebs}
            />
          </ClassicalBox>
        </section>
      )}

      {/* 방명록 */}
      <section className="animate-fade-in max-w-3xl mx-auto space-y-4">
        <DecorativeLabel label={t("guestbook")} />
        <ClassicalBox hover={false} className="p-6">
          <GuestbookContent
            profileId={userId}
            currentUser={guestbookCurrentUser}
            isOwner={false}
            initialEntries={guestbookEntries}
            initialTotal={guestbookTotal}
          />
        </ClassicalBox>
      </section>
    </div>
  );
}
