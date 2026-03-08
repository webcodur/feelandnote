/*
  파일명: components/features/game/dawn/DawnResult.tsx
  기능: Dawn 게임 결과 - 수직 연대기
  책임: 배치된 셀럽들의 감상 콘텐츠를 시간순으로 표시
*/
"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  getDawnCelebContents,
  type DawnContent,
} from "@/actions/game/getDawnCelebContents";
import type { CelebProfile } from "@/types/home";
import { cn } from "@/lib/utils";
import { Z_INDEX } from "@/constants/zIndex";
import { getCategoryByDbType } from "@/constants/categories";
import CelebContentTimeline from "../shared/CelebContentTimeline";
import type { TimelineContent } from "../shared/CelebContentTimeline";
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

export default function DawnResult({
  board,
  currentCard,
  streak,
  lives,
  isNewRecord,
  onReplay,
  onLobby,
}: DawnResultProps) {
  const t = useTranslations("rest.arena.dawn.game.result");
  const isCleared = lives > 0;
  const [contentsMap, setContentsMap] = useState<
    Record<string, DawnContent[]>
  >({});
  const [isLoading, setIsLoading] = useState(true);

  // 리뷰 모달 호이스팅 (모달 1개로 통합)
  const [reviewContent, setReviewContent] = useState<{ content: TimelineContent; ownerNickname: string } | null>(null);

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
        {t("replay")}
      </button>
      <button
        onClick={onLobby}
        className={cn(
          "min-w-[140px] h-13 rounded-xl text-base font-serif font-bold",
          "bg-white/10 text-white/80 hover:bg-white/15 border border-white/20 active:scale-95"
        )}
      >
        {t("lobby")}
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
          {isCleared ? t("clear") : t("exhausted")}
        </p>
        <p className="text-xl font-bold text-white">{streak} <span className="text-base font-normal text-text-secondary">{t("streak")}</span></p>
        {isNewRecord && (
          <p className="text-base font-bold text-accent animate-in zoom-in-95">
            {t("newRecord")}
          </p>
        )}
        <div className="pt-3">
          <ActionButtons />
        </div>
      </div>

      {/* 수직 연대기 */}
      <div className="space-y-1">
        <h4 className="text-sm text-text-tertiary font-cinzel uppercase tracking-wider text-center mb-5">
          {t("timelineTitle")}
        </h4>

        <CelebContentTimeline
          celebs={allCelebs}
          contentsMap={contentsMap}
          isLoading={isLoading}
          highlightCelebId={currentCard?.id}
          onReviewClick={(c, ownerNickname) =>
            setReviewContent({ content: c, ownerNickname })
          }
        />
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
