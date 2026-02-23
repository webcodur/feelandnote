"use client";

import { useState, useCallback } from "react";
import Image from "next/image";

import { getCelebForModal } from "@/actions/celebs/getCelebForModal";
import CelebDetailModal from "@/components/features/home/celeb-card-drafts/CelebDetailModal";
import type { CelebProfile } from "@/types/home";
import { type PublicUserProfile } from "@/actions/user";
import { type SimilarByCelebResult } from "@/actions/persona/getSimilarByCelebId";
import { type GuestbookEntryWithAuthor } from "@/types/database";
import { DecorativeLabel, FormattedText } from "@/components/ui";
import ClassicalBox from "@/components/ui/ClassicalBox";
import NationalityText from "@/components/ui/NationalityText";
import GuestbookContent from "@/components/features/profile/GuestbookContent";
import ContentLibrary from "@/components/features/user/contentLibrary/ContentLibrary";
import { getCelebProfessionLabel } from "@/constants/celebProfessions";


import {
  INNER_VIRTUE_KEYS,
  OUTER_VIRTUE_KEYS,
  VIRTUE_LABELS,
  TENDENCY_KEYS,
  TENDENCY_LABELS,
} from "@/lib/persona/constants";
import { distanceToMatchPercent, type SimilarCeleb } from "@/lib/persona/utils";
import { cn } from "@/lib/utils";

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
}: CelebPageContentProps) {
  const professionLabel = getCelebProfessionLabel(profile.profession);
  const birthYear = formatYear(profile.birth_date);
  const deathYear = profile.death_date ? formatYear(profile.death_date) : null;
  const periodStr = birthYear
    ? deathYear
      ? `${birthYear} — ${deathYear}`
      : `${birthYear} —`
    : "";

  return (
    <div className="space-y-16">

            {/* 인물 프로필 + 명언 */}
            <section className="animate-fade-in max-w-3xl mx-auto space-y-4">
              <DecorativeLabel label="인물 소개" />
              <ClassicalBox hover={false} className="px-5 py-5">
                <div className="grid grid-cols-[auto_1fr] gap-6">
                  {/* 1열: 이미지 */}
                  <div className="w-24 h-24 md:w-28 md:h-28 flex-shrink-0 rounded-full overflow-hidden ring-1 ring-accent/20 bg-bg-secondary self-start">
                    {profile.avatar_url ? (
                      <Image
                        src={profile.avatar_url}
                        alt={profile.nickname}
                        width={112}
                        height={112}
                        className="w-full h-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl font-serif text-accent/30">
                        {profile.nickname.charAt(0)}
                      </div>
                    )}
                  </div>
                  {/* 2열: 정보 */}
                  <div className="space-y-2 min-w-0">
                    <p className="font-serif text-xl md:text-2xl text-text-primary tracking-tight">{profile.nickname}</p>
                    <div className="flex items-center gap-2 text-xs text-text-tertiary flex-wrap">
                      {professionLabel && <span className="text-accent font-medium">{professionLabel}</span>}
                      {profile.nationality && (
                        <span className="grayscale opacity-70"><NationalityText code={profile.nationality} /></span>
                      )}
                      {periodStr && <span className="font-mono">{periodStr}</span>}
                    </div>
                    {profile.bio && (
                      <p className="text-xs text-text-tertiary/80 leading-relaxed break-keep">{profile.bio}</p>
                    )}
                    {profile.quotes && (
                      <p className="font-serif text-[13px] text-text-secondary/60 leading-relaxed break-keep pt-1">
                        "<FormattedText text={profile.quotes} />"
                      </p>
                    )}
                  </div>
                </div>
              </ClassicalBox>
            </section>

            {/* 감상 철학 */}
            {profile.consumption_philosophy && (
              <section className="animate-fade-in max-w-3xl mx-auto">
                <PhilosophyBlock text={profile.consumption_philosophy} />
              </section>
            )}

            {/* 콘텐츠 라이브러리 (기록 서고) */}
            <section className="animate-fade-in max-w-3xl mx-auto space-y-4">
              <DecorativeLabel label="기록 서고" />
              <ClassicalBox hover={false} className="p-6">
                <ContentLibrary
                  mode="viewer"
                  targetUserId={userId}
                  emptyMessage="아직 공개된 기록의 서고가 비어있습니다."
                  showPagination
                  ownerNickname={profile.nickname}
                  defaultViewMode="list"
                />
              </ClassicalBox>
            </section>

            {/* 인물 분석 */}
            {personaData?.targetPersona && (
              <section className="animate-fade-in max-w-3xl mx-auto space-y-4">
                <DecorativeLabel label="인물 분석" />
                <ClassicalBox hover={false} className="p-6">
                  <PersonaBlock
                    persona={personaData.targetPersona}
                    similarCelebs={personaData.similarCelebs}
                  />
                </ClassicalBox>
              </section>
            )}

            {/* 방명록 */}
            <section className="animate-fade-in max-w-3xl mx-auto space-y-4">
              <DecorativeLabel label="방명록" />
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




// ─── 감상 철학 ────────────────────────────────────
function PhilosophyBlock({ text }: { text: string }) {
  return (
    <div className="space-y-3">
      <DecorativeLabel label="감상 철학" />
      <ClassicalBox hover={false} className="px-5 py-4">
        <div className="font-serif text-[14px] md:text-[15px] text-text-secondary leading-[1.9] break-keep opacity-90">
          <FormattedText text={text} />
        </div>
      </ClassicalBox>
    </div>
  );
}

// ─── 인물 분석 (덕목 + 성향 + 유사 인물) ───────────────────
function PersonaSectionHeader({ title }: { title: string }) {
  return (
    <div className="flex justify-center text-center w-full mb-4">
      <p className="text-xs md:text-sm text-accent font-cinzel tracking-[0.3em] uppercase font-bold opacity-70">
        {title}
      </p>
    </div>
  );
}

function getTendencyLabel(value: number, neg: string, pos: string): string {
  const abs = Math.abs(value);
  if (abs <= 10) return "중립";
  const direction = value < 0 ? neg : pos;
  if (abs <= 30) return direction;
  return `강한 ${direction}`;
}

function VirtueBar({ label, value }: { label: string; value: number }) {
  const pct = Math.min(100, Math.max(0, value));

  return (
    <div className="group flex items-center gap-3 py-1">
      <span className="w-10 text-xs text-text-secondary/60 group-hover:text-accent transition-colors font-medium tracking-tight shrink-0">
        {label}
      </span>

      <div className="relative flex-1 h-1.5 bg-white/[0.03] rounded-full ring-1 ring-white/5 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-accent/60 via-accent to-accent-dim transition-all duration-1000 ease-out relative shadow-[0_0_15px_rgba(212,175,55,0.15)]"
          style={{ width: `${pct}%` }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent opacity-30" />
        </div>
      </div>

      <span className="w-8 text-right text-xs text-accent font-serif tabular-nums font-bold shrink-0">
        {value}
      </span>
    </div>
  );
}

function PersonaBlock({
  persona,
  similarCelebs,
}: {
  persona: NonNullable<SimilarByCelebResult["targetPersona"]>;
  similarCelebs: SimilarCeleb[];
}) {
  const [modalCeleb, setModalCeleb] = useState<CelebProfile | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleCelebClick = useCallback(async (celebId: string) => {
    setLoadingId(celebId);
    const data = await getCelebForModal(celebId);
    setLoadingId(null);
    if (data) setModalCeleb(data);
  }, []);

  return (
    <div className="space-y-6" style={{ animationDelay: "400ms", animationFillMode: "forwards" }}>

      {/* Virtues Grid: 2 Column Split */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
        <div className="space-y-2">
          <PersonaSectionHeader title="내적 미덕" />
          {INNER_VIRTUE_KEYS.map((key) => (
            <VirtueBar key={key} label={VIRTUE_LABELS[key]} value={persona[key]} />
          ))}
        </div>
        <div className="space-y-2">
          <PersonaSectionHeader title="외적 미덕" />
          {OUTER_VIRTUE_KEYS.map((key) => (
            <VirtueBar key={key} label={VIRTUE_LABELS[key]} value={persona[key]} />
          ))}
        </div>
      </div>

      {/* 성향 스펙트럼 */}
      <div className="space-y-4 pt-6 border-t border-white/5">
        <PersonaSectionHeader title="핵심 성향" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-2">
          {TENDENCY_KEYS.map((key) => {
            const [neg, pos] = TENDENCY_LABELS[key];
            const value = persona[key];
            const position = ((value + 50) / 100) * 100;

            return (
              <div key={key} className="flex items-center gap-3 py-1">
                <span className={cn("w-10 text-right text-xs tracking-tight opacity-40 shrink-0", value < -10 && "text-blue-400 opacity-90 font-bold")}>{neg}</span>
                <div className="relative flex-1 h-1.5 bg-white/10 overflow-hidden rounded-full ring-1 ring-white/5">
                  <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-white/20 z-20" />
                  <div
                    className={cn(
                      "absolute top-0 bottom-0 transition-all duration-1000 ease-out",
                      value < 0 ? "bg-blue-500/30" : "bg-orange-500/30"
                    )}
                    style={
                      value < 0
                        ? { left: `${position}%`, right: "50%" }
                        : { left: "50%", width: `${position - 50}%` }
                    }
                  />
                  <div
                    className="absolute top-1/2 w-2 h-2 -translate-y-1/2 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)] z-30 transition-all duration-1000 ease-out"
                    style={{ left: `${position}%` }}
                  />
                </div>
                <span className={cn("w-10 text-left text-xs tracking-tight opacity-40 shrink-0", value > 10 && "text-orange-400 opacity-90 font-bold")}>{pos}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 유사한 인물 */}
      {similarCelebs.length > 0 && (
        <div className="space-y-4 pt-6 border-t border-white/5">
          <PersonaSectionHeader title="닮은꼴 인물" />
          <div className="flex justify-center gap-5 md:gap-8 flex-wrap">
            {similarCelebs.map((celeb) => (
              <button
                key={celeb.celeb_id}
                type="button"
                onClick={() => handleCelebClick(celeb.celeb_id)}
                disabled={loadingId === celeb.celeb_id}
                className="group flex flex-col items-center gap-2 w-20 md:w-24 cursor-pointer"
              >
                <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden p-[2px] bg-gradient-to-b from-accent/20 to-transparent group-hover:from-accent/60 group-hover:to-accent/30 transition-all duration-500 shadow-lg">
                  <div className="w-full h-full rounded-full overflow-hidden bg-bg-secondary relative border border-white/10">
                    {loadingId === celeb.celeb_id ? (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : celeb.avatar_url ? (
                      <Image
                        src={celeb.avatar_url}
                        alt={celeb.nickname}
                        width={80}
                        height={80}
                        className="object-cover w-full h-full transition-all duration-700 group-hover:scale-110"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-lg text-text-tertiary font-serif">
                        {celeb.nickname.charAt(0)}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-center space-y-0.5">
                  <span className="block text-xs text-text-primary group-hover:text-accent transition-colors font-serif font-bold">
                    {celeb.nickname}
                  </span>
                  <span className="block text-[10px] font-mono text-accent/60 tracking-wider">
                    {distanceToMatchPercent(celeb.distance)}%
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {modalCeleb && (
        <CelebDetailModal
          celeb={modalCeleb}
          isOpen
          onClose={() => setModalCeleb(null)}
        />
      )}
    </div>
  );
}
