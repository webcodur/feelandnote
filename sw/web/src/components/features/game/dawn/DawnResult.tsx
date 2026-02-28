/*
  파일명: components/features/game/dawn/DawnResult.tsx
  기능: Dawn 게임 결과 - 수직 연대기
  책임: 배치된 셀럽들의 감상 콘텐츠를 시간순으로 표시
*/
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { getCelebProfessionLabel } from "@/constants/celebProfessions";
import {
  getDawnCelebContents,
  type DawnContent,
} from "@/actions/game/getDawnCelebContents";
import type { CelebProfile } from "@/types/home";
import { cn } from "@/lib/utils";
import { Z_INDEX } from "@/constants/zIndex";
import { getCategoryByDbType } from "@/constants/categories";
import GameContentItem from "../shared/GameContentItem";
import ContentReviewModal from "../shared/ContentReviewModal";

interface DawnCeleb extends CelebProfile {
  birthYear: number;
}

interface DawnResultProps {
  board: DawnCeleb[];
  currentCard: DawnCeleb | null;
  streak: number;
  lives: number;
  isNewRecord: boolean;
  onReplay: () => void;
  onLobby: () => void;
}

function formatYear(year: number): string {
  if (year < 0) return `BC ${Math.abs(year)}`;
  return `AD ${year}`;
}

export default function DawnResult({
  board,
  currentCard,
  streak,
  lives,
  isNewRecord,
  onReplay,
  onLobby,
}: DawnResultProps) {
  const isCleared = lives > 0;
  const [contentsMap, setContentsMap] = useState<
    Record<string, DawnContent[]>
  >({});
  const [isLoading, setIsLoading] = useState(true);

  // 리뷰 모달 호이스팅 (모달 1개로 통합)
  const [reviewContent, setReviewContent] = useState<{ content: DawnContent; ownerNickname: string } | null>(null);

  // 모든 셀럽 = 배치판 + 마지막 카드 (시간순 정렬)
  const allCelebs = [...board, ...(currentCard ? [currentCard] : [])].sort(
    (a, b) => a.birthYear - b.birthYear
  );

  useEffect(() => {
    const celebIds = allCelebs.map((c) => c.id);
    getDawnCelebContents(celebIds).then((data) => {
      setContentsMap(data);
      setIsLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ActionButtons = () => (
    <div className="flex items-center justify-center gap-3">
      <button
        onClick={onReplay}
        className={cn(
          "min-w-[140px] h-13 rounded-xl text-base font-serif font-bold",
          "bg-accent/20 text-accent hover:bg-accent/30 border border-accent/40 active:scale-95",
          "shadow-[0_0_20px_rgba(212,175,55,0.2)]"
        )}
      >
        다시 하기
      </button>
      <button
        onClick={onLobby}
        className={cn(
          "min-w-[140px] h-13 rounded-xl text-base font-serif font-bold",
          "bg-white/10 text-white/80 hover:bg-white/15 border border-white/20 active:scale-95"
        )}
      >
        로비로
      </button>
    </div>
  );

  return (
    <div className="absolute inset-0 z-50 overflow-y-auto bg-black/90 backdrop-blur-md">
    <div className="max-w-lg mx-auto space-y-7 py-8 px-4 animate-in fade-in duration-500">
      {/* 결과 요약 */}
      <div className="text-center space-y-3">
        <p className={cn(
          "text-4xl font-black font-serif",
          isCleared ? "text-accent" : "text-red-400"
        )}>
          {isCleared ? "전체 클리어!" : "체력 소진"}
        </p>
        <p className="text-xl font-bold text-white">{streak} <span className="text-base font-normal text-text-secondary">연속 정답</span></p>
        {isNewRecord && (
          <p className="text-base font-bold text-accent animate-in zoom-in-95">
            신기록 달성!
          </p>
        )}
        <div className="pt-3">
          <ActionButtons />
        </div>
      </div>

      {/* 수직 연대기 */}
      <div className="space-y-1">
        <h4 className="text-sm text-text-tertiary font-cinzel uppercase tracking-wider text-center mb-5">
          인물들의 감상 기록
        </h4>

        <div className="relative pl-7">
          {/* 수직선 */}
          <div className="absolute left-[6px] top-2 bottom-2 w-[2px] bg-accent/30" />

          {allCelebs.map((celeb) => {
            const contents = contentsMap[celeb.id];
            const isLastCard = currentCard?.id === celeb.id;

            return (
              <div key={celeb.id} className="relative pb-7 last:pb-0">
                {/* 노드 */}
                <div
                  className={cn(
                    "absolute left-[-24px] top-1.5 w-3.5 h-3.5 rounded-full",
                    isLastCard ? "bg-red-400" : "bg-accent"
                  )}
                />

                {/* 연도 */}
                <p className="text-sm font-cinzel text-accent/80 mb-1.5">
                  {formatYear(celeb.birthYear)}
                </p>

                {/* 셀럽 정보 */}
                <div className="flex items-center gap-2.5 mb-2.5">
                  <div className="relative w-11 h-11 rounded-full overflow-hidden border border-white/20 bg-bg-secondary shrink-0">
                    {celeb.avatar_url ? (
                      <Image
                        src={celeb.avatar_url}
                        alt={celeb.nickname}
                        fill
                        sizes="44px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm font-serif text-text-secondary">
                        {celeb.nickname.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p
                      className={cn(
                        "text-base font-bold truncate",
                        isLastCard ? "text-red-400" : "text-white"
                      )}
                    >
                      {celeb.nickname}
                    </p>
                    {celeb.profession && (
                      <p className="text-xs text-text-tertiary">
                        {getCelebProfessionLabel(celeb.profession)}
                      </p>
                    )}
                  </div>
                </div>

                {/* 콘텐츠 목록 */}
                {isLoading ? (
                  <div className="space-y-2 ml-1">
                    {[1, 2].map((i) => (
                      <div
                        key={i}
                        className="h-9 rounded bg-white/5 animate-pulse"
                      />
                    ))}
                  </div>
                ) : contents && contents.length > 0 ? (
                  <div className="space-y-1.5 ml-1">
                    {contents.map((c) => (
                      <GameContentItem
                        key={c.contentId}
                        contentId={c.contentId}
                        title={c.title}
                        creator={c.creator}
                        thumbnailUrl={c.thumbnailUrl}
                        type={c.type}
                        review={c.review}
                        sourceUrl={c.sourceUrl}
                        ownerNickname={celeb.nickname}
                        size="sm"
                        onClickOverride={
                          c.review
                            ? () => setReviewContent({ content: c, ownerNickname: celeb.nickname })
                            : undefined
                        }
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-text-tertiary ml-1">
                    등록된 감상 기록 없음
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 하단 버튼 */}
      <div className="pt-3 pb-8">
        <ActionButtons />
      </div>
    </div>

    {/* 리뷰 모달 (호이스팅, 게임 전체화면 위에 표시) */}
    <ContentReviewModal
      isOpen={!!reviewContent}
      onClose={() => setReviewContent(null)}
      title={reviewContent?.content.title ?? ""}
      creator={reviewContent?.content.creator}
      review={reviewContent?.content.review}
      sourceUrl={reviewContent?.content.sourceUrl}
      ownerNickname={reviewContent?.ownerNickname}
      contentDetailUrl={reviewContent ? `/content/${reviewContent.content.contentId}?category=${getCategoryByDbType(reviewContent.content.type)?.id || "book"}` : undefined}
      zIndex={Z_INDEX.gameModal}
    />
    </div>
  );
}
