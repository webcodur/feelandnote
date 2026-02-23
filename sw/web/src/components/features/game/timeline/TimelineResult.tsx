/*
  파일명: components/features/game/timeline/TimelineResult.tsx
  기능: Dawn 게임 결과 - 수직 타임라인
  책임: 배치된 셀럽들의 감상 콘텐츠를 시간순 타임라인으로 표시
*/
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { getCelebProfessionLabel } from "@/constants/celebProfessions";
import {
  getTimelineCelebContents,
  type TimelineContent,
} from "@/actions/game/getTimelineCelebContents";
import type { CelebProfile } from "@/types/home";
import { cn } from "@/lib/utils";
import GameContentItem from "../shared/GameContentItem";

interface TimelineCeleb extends CelebProfile {
  birthYear: number;
}

interface TimelineResultProps {
  timeline: TimelineCeleb[];
  currentCard: TimelineCeleb | null;
  streak: number;
  isNewRecord: boolean;
  onReplay: () => void;
}

function formatYear(year: number): string {
  if (year < 0) return `기원전 ${Math.abs(year)}년`;
  return `${year}년`;
}

export default function TimelineResult({
  timeline,
  currentCard,
  streak,
  isNewRecord,
  onReplay,
}: TimelineResultProps) {
  const [contentsMap, setContentsMap] = useState<
    Record<string, TimelineContent[]>
  >({});
  const [isLoading, setIsLoading] = useState(true);

  // 모든 셀럽 = 타임라인 + 마지막 카드 (시간순 정렬)
  const allCelebs = [...timeline, ...(currentCard ? [currentCard] : [])].sort(
    (a, b) => a.birthYear - b.birthYear
  );

  useEffect(() => {
    const celebIds = allCelebs.map((c) => c.id);
    getTimelineCelebContents(celebIds).then((data) => {
      setContentsMap(data);
      setIsLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ReplayButton = () => (
    <button
      onClick={onReplay}
      className={cn(
        "min-w-[160px] h-12 rounded-xl text-sm font-serif font-bold",
        "bg-white/10 text-white hover:bg-white/20 border border-white/20 active:scale-95",
        "shadow-[0_0_20px_rgba(255,255,255,0.15),0_0_40px_rgba(212,175,55,0.1)]"
      )}
    >
      다시 하기
    </button>
  );

  return (
    <div className="max-w-lg mx-auto space-y-6 py-4 animate-in fade-in duration-500">
      {/* 결과 요약 */}
      <div className="text-center space-y-2">
        <p className="text-3xl font-black font-serif text-accent">{streak}</p>
        <p className="text-sm text-text-secondary">연속 정답</p>
        {isNewRecord && (
          <p className="text-sm font-bold text-accent animate-in zoom-in-95">
            신기록 달성!
          </p>
        )}
        <div className="pt-2">
          <ReplayButton />
        </div>
      </div>

      {/* 수직 타임라인 */}
      <div className="space-y-1">
        <h4 className="text-xs text-text-tertiary font-cinzel uppercase tracking-wider text-center mb-4">
          인물들의 감상 기록
        </h4>

        <div className="relative pl-6">
          {/* 수직선 */}
          <div className="absolute left-[5px] top-2 bottom-2 w-[2px] bg-accent/30" />

          {allCelebs.map((celeb) => {
            const contents = contentsMap[celeb.id];
            const isLastCard = currentCard?.id === celeb.id;

            return (
              <div key={celeb.id} className="relative pb-6 last:pb-0">
                {/* 노드 */}
                <div
                  className={cn(
                    "absolute left-[-21px] top-1 w-3 h-3 rounded-full",
                    isLastCard ? "bg-red-400" : "bg-accent"
                  )}
                />

                {/* 연도 */}
                <p className="text-xs font-cinzel text-accent/80 mb-1">
                  {formatYear(celeb.birthYear)}
                </p>

                {/* 셀럽 정보 */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="relative w-9 h-9 rounded-full overflow-hidden border border-white/20 bg-bg-secondary shrink-0">
                    {celeb.avatar_url ? (
                      <Image
                        src={celeb.avatar_url}
                        alt={celeb.nickname}
                        fill
                        sizes="36px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs font-serif text-text-secondary">
                        {celeb.nickname.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p
                      className={cn(
                        "text-sm font-bold truncate",
                        isLastCard ? "text-red-400" : "text-white"
                      )}
                    >
                      {celeb.nickname}
                    </p>
                    {celeb.profession && (
                      <p className="text-[10px] text-text-tertiary">
                        {getCelebProfessionLabel(celeb.profession)}
                      </p>
                    )}
                  </div>
                </div>

                {/* 콘텐츠 목록 */}
                {isLoading ? (
                  <div className="space-y-1.5 ml-1">
                    {[1, 2].map((i) => (
                      <div
                        key={i}
                        className="h-8 rounded bg-white/5 animate-pulse"
                      />
                    ))}
                  </div>
                ) : contents && contents.length > 0 ? (
                  <div className="space-y-1 ml-1">
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
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-text-tertiary ml-1">
                    등록된 감상 기록 없음
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 하단 다시하기 */}
      <div className="text-center pt-2">
        <ReplayButton />
      </div>
    </div>
  );
}
