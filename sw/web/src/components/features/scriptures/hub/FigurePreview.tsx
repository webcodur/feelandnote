/*
  파일명: /components/features/scriptures/hub/FigurePreview.tsx
  기능: 오늘의 인물 허브 프리뷰 카드
  책임: 아바타→대사, 콘텐츠→리뷰 오버레이, 인사 건네기, 서재 둘러보기 인터랙션 제공
*/ // ------------------------------

"use client";

import { useState, useCallback, useRef } from "react";
import { Calendar, ArrowRight, MessageCircle } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Avatar } from "@/components/ui";
import { useTranslations, useLocale } from "next-intl";
import { useGlobalDialogue } from "@/components/features/game/shared/providers/GlobalDialogueProvider";
import { stripEmotionTag } from "@/components/features/game/shared/hooks/useDialogue";
import ContentReviewModal from "@/components/features/game/shared/ContentReviewModal";
import { getVoiceUrl } from "@/lib/game/voice/voiceUrl";
import { getCategoryByDbType } from "@/constants/categories";
import type { Locale } from "@/types/locale";
import type { SpeechTone } from "@/lib/game/voice/types";
import type { TodayFigure, ScriptureContent } from "@/actions/scriptures";

interface FigurePreviewProps {
  figure: TodayFigure;
  contents: ScriptureContent[];
}

export default function FigurePreview({ figure, contents }: FigurePreviewProps) {
  const t = useTranslations("todayFigure");
  const tProfession = useTranslations("profession");
  const locale = useLocale() as Locale;
  const { handleSubtitle, voiceMuted } = useGlobalDialogue();
  const [selectedContent, setSelectedContent] = useState<ScriptureContent | null>(null);
  const greetingIndexRef = useRef(0);

  if (!figure) return null;

  const displayName = locale === "en" && figure.nickname_en ? figure.nickname_en : figure.nickname;
  const displayBio = locale === "en" && figure.bio_en ? figure.bio_en : figure.bio;
  const professionLabel = figure.profession ? tProfession(figure.profession as any) : "";

  const today = new Date();
  const dateStr = t("dateLabel", { month: today.getMonth() + 1, day: today.getDate() });

  // 대사 발사
  const fireGreeting = useCallback(() => {
    const lines = figure.greetingLines;
    const fallbackQuote = figure.quote;

    // greeting 대사가 있으면 순환, 없으면 quote 폴백
    let text: string;
    let audioUrl: string | null = null;

    if (lines.length > 0) {
      const idx = greetingIndexRef.current % lines.length;
      greetingIndexRef.current = idx + 1;
      text = stripEmotionTag(lines[idx]);
      if (figure.voiceV > 0) {
        audioUrl = voiceMuted ? null : getVoiceUrl(figure.id, locale, "greeting", idx + 1, figure.voiceV);
      }
    } else if (fallbackQuote) {
      text = fallbackQuote;
    } else {
      return; // 대사가 전혀 없으면 아무것도 안 함
    }

    handleSubtitle({
      key: Date.now(),
      tone: (figure.speechTone as SpeechTone) || "composed",
      text,
      nickname: displayName,
      avatarUrl: figure.avatar_url,
      audioUrl,
      label: "greeting",
    });
  }, [figure, displayName, locale, handleSubtitle, voiceMuted]);

  const thumbnailContents = contents.filter(c => c.thumbnail_url).slice(0, 3);

  return (
    <div className="relative group overflow-hidden md:rounded-3xl bg-transparent md:bg-neutral-900 border-0 md:border md:border-white/5 hover:border-accent/40 transition-all duration-700 md:shadow-2xl">
      {/* 배경 장식 */}
      <div className="absolute inset-0 bg-gradient-to-br from-neutral-800/80 via-neutral-900/95 to-black z-0 pointer-events-none hidden md:block" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.08),transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-1000 z-0 pointer-events-none" />

      <div className="relative z-10 py-8 md:p-8 sm:p-10 flex flex-col items-center text-center gap-5">
        {/* 날짜 뱃지 */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 text-accent/90 text-[11px] font-semibold tracking-wider border border-accent/20">
          <Calendar size={12} className="opacity-80" />
          <span>{dateStr}</span>
        </div>

        {/* 아바타 — 클릭 시 greeting 대사 */}
        <button onClick={fireGreeting} className="relative group/avatar cursor-pointer">
          <Avatar
            url={figure.avatar_url}
            name={displayName}
            size="4xl"
            className="ring-4 ring-transparent group-hover/avatar:ring-accent/30 shadow-[0_4px_40px_rgba(0,0,0,0.4)] group-hover/avatar:shadow-[0_0_50px_rgba(212,175,55,0.25)] transition-all duration-500 transform group-hover/avatar:scale-[1.02]"
          />
          <div className="absolute -top-1 -right-1 z-20 min-w-[28px] h-[28px] px-1.5 flex items-center justify-center bg-gradient-to-br from-accent to-[#b89530] text-[#121212] rounded-lg border border-white/20 shadow-xl">
            <span className="text-[13px] font-black leading-none">{contents.length}</span>
          </div>
          <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-black/90 backdrop-blur-sm border border-white/10 rounded-full shadow-lg">
            <span className="text-[10px] font-bold text-accent tracking-widest uppercase">Today</span>
          </div>
        </button>

        {/* 이름 + 직업 — 이름 클릭은 프로필 이동 */}
        <div className="space-y-2">
          <Link href={`/${figure.id}`} className="block">
            <h3 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-amber-100 group-hover:via-[#d4af37] group-hover:to-accent transition-all duration-700 tracking-tight">
              {displayName}
            </h3>
          </Link>
          <span className="inline-block font-medium px-2.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-text-secondary text-sm backdrop-blur-md">
            {professionLabel}
          </span>
        </div>

        {/* 소개 */}
        {displayBio && (
          <p className="text-sm text-text-tertiary leading-relaxed max-w-lg break-keep">
            {displayBio}
          </p>
        )}

        {/* 대표 콘텐츠 썸네일 — 클릭 시 리뷰 오버레이 */}
        {thumbnailContents.length > 0 && (
          <div className="flex items-center gap-2 mt-1">
            {thumbnailContents.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedContent(selectedContent?.id === c.id ? null : c)}
                className="w-12 h-16 md:w-14 md:h-[76px] rounded-lg overflow-hidden bg-white/5 border border-white/10 shadow-md flex-shrink-0 transition-all duration-200 hover:scale-105 hover:border-accent/40 focus:outline-none focus:ring-2 focus:ring-accent/50"
              >
                <img src={c.thumbnail_url!} alt={c.title ?? ""} className="w-full h-full object-cover" />
              </button>
            ))}
            {contents.length > 3 && (
              <span className="text-xs text-text-tertiary font-medium ml-1">+{contents.length - 3}</span>
            )}
          </div>
        )}

        {/* 리뷰 모달 */}
        {selectedContent && (
          <ContentReviewModal
            isOpen={!!selectedContent}
            onClose={() => setSelectedContent(null)}
            title={selectedContent.title}
            creator={selectedContent.creator}
            review={(locale === "en" && selectedContent.review_en) ? selectedContent.review_en : (selectedContent.review ?? null)}
            isSpoiler={selectedContent.is_spoiler}
            sourceUrl={selectedContent.source_url ?? null}
            ownerNickname={displayName}
            contentDetailUrl={`/content/${selectedContent.id}?category=${getCategoryByDbType(selectedContent.type)?.id || "book"}`}
          />
        )}

        {/* CTA 영역 */}
        <div className="flex items-center gap-3 mt-1">
          {/* 인사 건네기 */}
          <button
            onClick={fireGreeting}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 text-sm font-semibold text-text-secondary hover:text-white transition-all duration-300 group/btn"
          >
            <MessageCircle size={15} className="text-text-tertiary group-hover/btn:text-accent transition-colors" />
            {t("greet")}
          </button>

          {/* 서재 둘러보기 */}
          <Link
            href="/explore/today"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-accent/10 hover:bg-accent/20 border border-accent/20 hover:border-accent/40 text-sm font-semibold text-accent transition-all duration-300 group/btn"
          >
            {t("browseLibrary")} <ArrowRight size={16} className="group-hover/btn:translate-x-1 transition-transform duration-300" />
          </Link>
        </div>
      </div>
    </div>
  );
}
