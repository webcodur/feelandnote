/*
  파일명: components/features/game/tracker/TrackerResult.tsx
  기능: 결과 화면
  책임: 정답 셀럽 공개, 콘텐츠 목록, 프로필 링크 표시
*/
"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { CheckCircle, XCircle, Book, Film, Gamepad2, Music, MessageSquare } from "lucide-react";
import type { TrackerContent } from "@/actions/game/getTrackerRound";
import { getCelebProfessionLabel } from "@/constants/celebProfessions";
import { getCategoryByDbType } from "@/constants/categories";
import { cn } from "@/lib/utils";
import { Z_INDEX } from "@/constants/zIndex";
import CelebDetailModal from "@/components/features/home/celeb-card-drafts/CelebDetailModal";
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
  onNext: () => void;
  onQuit: () => void;
}

export default function TrackerResult({
  celebId,
  celebSlug,
  nickname,
  profession,
  avatarUrl,
  correct,
  contents,
  onNext,
  onQuit,
}: TrackerResultProps) {
  const [showCelebModal, setShowCelebModal] = useState(false);
  const [reviewContent, setReviewContent] = useState<TrackerContent | null>(null);

  const celebProfile = useMemo((): CelebProfile => ({
    id: celebId,
    slug: celebSlug,
    nickname,
    avatar_url: avatarUrl,
    profession,
    title: null,
    consumption_philosophy: null,
    nationality: null,
    birth_date: null,
    death_date: null,
    bio: null,
    quotes: null,
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
    <div className="w-full max-w-lg mx-auto space-y-6 animate-in fade-in">
      {/* 정답/오답 표시 */}
      <div className="text-center">
        <div className={cn(
          "inline-flex items-center gap-2 rounded-full px-4 py-1.5",
          correct ? "bg-[#1a1710] border border-accent/30" : "bg-[#1a0f0f] border border-red-500/30"
        )}>
          {correct ? <CheckCircle size={16} className="text-accent" /> : <XCircle size={16} className="text-red-400" />}
          <span className={cn("text-lg font-black font-serif", correct ? "text-accent" : "text-red-400")}>
            {correct ? "정답!" : "오답"}
          </span>
        </div>
      </div>

      {/* 정답 셀럽 */}
      <div className="flex flex-col items-center gap-3 rounded-xl border border-accent/30 bg-bg-main p-5">
        <button
          type="button"
          onClick={() => setShowCelebModal(true)}
          className="relative h-20 w-20 rounded-full overflow-hidden border-2 border-accent/50 ring-1 ring-inset ring-white/5 shadow-xl cursor-pointer hover:ring-accent/40 hover:scale-105 transition-all"
          style={{ background: "radial-gradient(circle at 50% 0%, #302b27 0%, #171513 40%, #0a0908 100%)" }}
        >
          <div
            className="absolute inset-0 opacity-[0.06] pointer-events-none mix-blend-overlay"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.5' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
          />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] h-[70%] rounded-full bg-accent/20 blur-[20px] opacity-40 pointer-events-none mix-blend-screen" />
          {avatarUrl ? (
            <Image src={avatarUrl} alt={nickname} fill sizes="80px" className="object-cover relative z-10 drop-shadow-[0_10px_15px_rgba(0,0,0,0.8)]" />
          ) : (
            <div className="relative z-10 flex h-full w-full items-center justify-center text-2xl font-serif text-text-secondary">
              {nickname.charAt(0)}
            </div>
          )}
        </button>
        <div className="text-center">
          <span className="text-xs text-accent font-bold">
            {getCelebProfessionLabel(profession)}
          </span>
          <h3 className="text-xl font-serif font-bold text-white">{nickname}</h3>
        </div>
      </div>

      {/* 콘텐츠 목록 */}
      {contents.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs text-text-tertiary font-cinzel uppercase tracking-wider text-center">
            이 인물이 감상한 작품
          </h4>
          <div className="space-y-1">
            {contents.map((c) => {
              const Icon = TYPE_ICONS[c.type] ?? Book;
              const hasReview = !!c.review;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => hasReview && setReviewContent(c)}
                  className={cn(
                    "flex items-center gap-2 w-full px-3 py-2 rounded-lg text-left transition-colors",
                    hasReview
                      ? "hover:bg-[#1a1a1a] cursor-pointer"
                      : "opacity-60 cursor-default"
                  )}
                >
                  <Icon size={14} className="shrink-0 text-text-tertiary" />
                  <span className="flex-1 min-w-0 text-sm text-white truncate">{c.title}</span>
                  {c.creator && (
                    <span className="hidden sm:block text-xs text-text-tertiary truncate max-w-[120px]">{c.creator}</span>
                  )}
                  {hasReview && (
                    <MessageSquare size={12} className="shrink-0 text-text-tertiary" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 액션 버튼 */}
      <div className="flex gap-3">
        <button
          onClick={onQuit}
          className={cn(
            "flex-1 h-11 rounded-xl text-sm font-bold font-serif",
            "bg-[#1a1a1a] text-white hover:bg-[#222] border border-white/20 active:scale-95"
          )}
        >
          그만하기
        </button>
        <button
          onClick={onNext}
          className={cn(
            "flex-1 h-11 rounded-xl text-sm font-bold font-serif",
            "bg-[#1a1710] text-accent hover:bg-[#231f15] border border-accent/30 active:scale-95"
          )}
        >
          다음 문제
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
        review={reviewContent?.review}
        sourceUrl={reviewContent?.sourceUrl}
        ownerNickname={nickname}
        contentDetailUrl={reviewContent ? `/content/${reviewContent.id}?category=${getCategoryByDbType(reviewContent.type)?.id || "book"}` : undefined}
        zIndex={Z_INDEX.gameModal}
      />
    </div>
  );
}
