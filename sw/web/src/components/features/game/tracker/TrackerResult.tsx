/*
  파일명: components/features/game/tracker/TrackerResult.tsx
  기능: 결과 화면
  책임: 등용 대상 셀럽 공개, 콘텐츠 목록, 프로필 링크 표시
*/
"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { Book, Film, Gamepad2, Music, MessageSquare } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { TrackerContent, TrackerOption } from "@/actions/game/getTrackerRound";
import type { DialogueType, SpeechTone } from "@/lib/game/voice/types";
import { getCelebProfessionLabel } from "@/constants/celebProfessions";
import { getCategoryByDbType } from "@/constants/categories";
import { cn } from "@/lib/utils";
import { Z_INDEX } from "@/constants/zIndex";
import CelebDetailModal from "@/components/features/celeb/modals/CelebDetailModal";
import ContentReviewModal from "@/components/features/game/shared/ContentReviewModal";
import type { CelebProfile } from "@/types/home";

const TYPE_ICONS: Record<string, typeof Book> = {
  BOOK: Book,
  VIDEO: Film,
  GAME: Gamepad2,
  MUSIC: Music,
};

interface TrackerResultProps {
  celebId: string;
  celebSlug: string | null;
  nickname: string;
  profession: string;
  avatarUrl: string | null;
  correct: boolean;
  contents: TrackerContent[];
  options: TrackerOption[];
  onNext: () => void;
  onQuit: () => void;
  showDialogue?: (celebId: string, tone: SpeechTone, type: DialogueType, meta?: { nickname: string, avatarUrl: string | null }) => void;
}

export default function TrackerResult({
  celebId,
  celebSlug,
  nickname,
  profession,
  avatarUrl,
  correct,
  contents,
  options,
  onNext,
  onQuit,
  showDialogue,
}: TrackerResultProps) {
  const locale = useLocale();
  const tGame = useTranslations("rest.arena.labyrinth.game");
  const [showCelebModal, setShowCelebModal] = useState(false);
  const [reviewContent, setReviewContent] = useState<TrackerContent | null>(null);

  // 대사는 O 클릭 시점(handleChoiceSelect)에서 이미 재생됨. 결과 화면에서 중복 재생하지 않는다.

  const celebProfile = useMemo((): CelebProfile => ({
    id: celebId,
    slug: celebSlug,
    nickname,
    nickname_en: null,
    avatar_url: avatarUrl,
    profession,
    title: null,
    title_en: null,
    nationality: null,
    birth_date: null,
    death_date: null,
    bio: null,
    bio_en: null,
    quotes: null,
    quotes_en: null,
    is_verified: false,
    is_platform_managed: true,
    follower_count: 0,
    content_count: contents.length,
    is_following: false,
    is_follower: false,
    influence: null,
    tags: [],
  }), [celebId, celebSlug, nickname, avatarUrl, profession, contents.length]);

  return (
    <div className="w-full max-w-lg mx-auto space-y-8 animate-in fade-in duration-500 pb-8">
      {/* 등용 성공/종적 감춤 문구 */}
      <p className={cn(
        "text-center text-sm font-serif leading-relaxed animate-slide-up",
        correct ? "text-accent/90" : "text-red-400/80"
      )}>
        {correct
          ? tGame("recruited", { name: nickname })
          : tGame("escaped", { name: nickname })
        }
      </p>

      {/* 등용 대상 셀럽 (초상화 크기 확대 및 카드 스타일링 고급화) */}
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-white/10 bg-[#12100e] p-8 shadow-2xl relative overflow-hidden animate-slide-up" style={{ animationDelay: "100ms" }}>
        {/* 장식용 빛 */}
        {correct && (
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-accent/10 blur-[40px] rounded-full mix-blend-screen pointer-events-none" />
        )}
        
        <button
          type="button"
          onClick={() => {
            const opt = options.find(o => o.id === celebId);
            if (opt && showDialogue) {
              showDialogue(celebId, (opt.speechTone as SpeechTone) || "composed", "greeting", {
                nickname,
                avatarUrl,
              });
            }
            setShowCelebModal(true);
          }}
          className="relative h-28 w-28 sm:h-32 sm:w-32 rounded-full overflow-hidden border-2 border-accent/60 ring-2 ring-inset ring-accent/20 shadow-[0_0_30px_rgba(234,179,8,0.15)] cursor-pointer hover:ring-accent/50 hover:scale-105 transition-all duration-300 group"
          style={{ background: "radial-gradient(circle at 50% 0%, #302b27 0%, #171513 40%, #0a0908 100%)" }}
        >
          <div
            className="absolute inset-0 opacity-10 pointer-events-none mix-blend-overlay group-hover:opacity-20 transition-opacity"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.5' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
          />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] rounded-full bg-accent/20 blur-[25px] opacity-60 pointer-events-none mix-blend-screen animate-pulse" />
          {avatarUrl ? (
            <Image src={avatarUrl} alt={nickname} fill sizes="128px" className="object-cover relative z-10 drop-shadow-[0_15px_20px_rgba(0,0,0,0.9)]" />
          ) : (
            <div className="relative z-10 flex h-full w-full items-center justify-center text-4xl font-serif text-text-secondary">
              {nickname.charAt(0)}
            </div>
          )}
        </button>
        <div className="text-center relative z-10 space-y-1 mt-2">
          <span className="text-[13px] text-accent font-bold tracking-[0.2em] font-cinzel">
            {getCelebProfessionLabel(profession, locale)}
          </span>
          <h3 className="text-2xl sm:text-3xl font-serif font-black text-white drop-shadow-md tracking-wide">{nickname}</h3>
        </div>
      </div>

      {/* 콘텐츠 목록 (시각적 카드 분리 및 체인 애니메이션 적용) */}
      {contents.length > 0 && (
        <div className="space-y-4 pt-2">
          <h4 className="text-sm font-cinzel text-center font-bold tracking-[0.3em] mb-4 opacity-80">
            {tGame("contentListTitle")}
          </h4>
          <div className="space-y-2.5">
            {contents.map((c, idx) => {
              const Icon = TYPE_ICONS[c.type] ?? Book;
              const hasReview = !!c.review;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => hasReview && setReviewContent(c)}
                  className={cn(
                    "flex flex-col sm:flex-row sm:items-center gap-3 w-full px-5 py-3.5 rounded-xl border transition-all duration-300 animate-slide-up group text-left",
                    hasReview
                      ? "bg-[#181614] border-white/10 hover:border-accent/30 hover:bg-[#1f1c19] cursor-pointer shadow-lg"
                      : "bg-[#12100e] border-white/5 opacity-80 cursor-default"
                  )}
                  style={{ animationDelay: `${200 + idx * 80}ms`, animationFillMode: "both" }}
                >
                  <div className="flex items-center gap-3 w-full sm:w-auto flex-1 min-w-0">
                    <div className="relative w-9 h-12 shrink-0 rounded overflow-hidden bg-black/40 border border-white/5 group-hover:border-accent/20 transition-colors">
                      {c.thumbnailUrl ? (
                        <Image src={c.thumbnailUrl} alt={c.title} fill sizes="36px" className="object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Icon size={14} className="text-text-secondary group-hover:text-accent transition-colors" />
                        </div>
                      )}
                    </div>
                    <span className="flex-1 min-w-0 text-[15px] font-bold text-white/90 truncate group-hover:text-white transition-colors">{c.title}</span>
                  </div>
                  
                  <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pl-11 sm:pl-0 sm:shrink-0">
                    {c.creator && (
                      <span className="text-[13px] font-medium truncate max-w-[140px]">{c.creator}</span>
                    )}
                    {hasReview ? (
                      <MessageSquare size={14} className="shrink-0 text-accent/70 group-hover:text-accent group-hover:scale-110 transition-all" />
                    ) : (
                      <div className="w-3.5" /> // 아이콘 맞춰주기용 스페이서
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 액션 버튼 (명확한 강조, 후광 효과) */}
      <div className="flex gap-4 pt-4 animate-slide-up" style={{ animationDelay: `${200 + contents.length * 80 + 100}ms`, animationFillMode: "both" }}>
        <button
          onClick={onQuit}
          className={cn(
            "flex-1 h-14 rounded-xl text-[15px] font-bold font-serif tracking-widest",
            "bg-[#151515] text-text-secondary hover:text-white hover:bg-[#1f1f1f] border border-white/10 active:scale-95 transition-all shadow-md"
          )}
        >
          {tGame("quit")}
        </button>
        <button
          onClick={onNext}
          className={cn(
            "flex-1 h-14 rounded-xl text-[15px] font-bold font-serif tracking-widest relative overflow-hidden group",
            "bg-[#1f1a10] text-accent hover:bg-[#2a2315] border border-accent/40 active:scale-95 transition-all shadow-[0_0_15px_rgba(234,179,8,0.15)]"
          )}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-accent/10 to-transparent -translate-x-full group-hover:animate-shine" />
          {tGame("next")}
        </button>
      </div>

      {/* 셀럽 상세 모달 */}
      <CelebDetailModal
        celeb={celebProfile}
        isOpen={showCelebModal}
        onClose={() => setShowCelebModal(false)}
        zIndex={Z_INDEX.gameModal}
      />

      {/* 리뷰 모달 */}
      <ContentReviewModal
        isOpen={!!reviewContent}
        onClose={() => setReviewContent(null)}
        title={reviewContent?.title ?? ""}
        creator={reviewContent?.creator}
        review={reviewContent?.rawReview}
        sourceUrl={reviewContent?.sourceUrl}
        ownerNickname={nickname}
        contentDetailUrl={reviewContent ? `/content/${reviewContent.id}?category=${getCategoryByDbType(reviewContent.type)?.id || "book"}` : undefined}
        zIndex={Z_INDEX.gameModal}
      />
    </div>
  );
}
