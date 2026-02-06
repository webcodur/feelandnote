/*
  파일명: /components/features/scriptures/sections/SageSection.tsx
  기능: 오늘의 인물 섹션
  책임: 매일 새로운 인물의 서재를 보여준다.
*/ // ------------------------------

"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { DecorativeLabel } from "@/components/ui";
import { ContentCard } from "@/components/ui/cards";
import SectionHeader from "@/components/shared/SectionHeader";
import { getCategoryByDbType } from "@/constants/categories";
import { addContent } from "@/actions/contents/addContent";
import { checkContentSaved } from "@/actions/contents/getMyContentIds";
import type { ContentType } from "@/types/database";

// 인라인 래퍼: contentId 기반으로 인원 구성 뱃지 자동 조회
function ScriptureContentCard({
  id, title, creator, thumbnail, type, rating,
}: {
  id: string; title: string; creator?: string | null; thumbnail?: string | null;
  type: string; rating?: number | null;
}) {
  const [isAdded, setIsAdded] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isAdding, startAddTransition] = useTransition();
  const category = getCategoryByDbType(type);
  const href = `/content/${id}?category=${category?.id || "book"}`;

  useEffect(() => {
    checkContentSaved(id).then((result) => { setIsAdded(result.saved); setIsChecking(false); });
  }, [id]);

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isAdded || isAdding) return;
    startAddTransition(async () => {
      const result = await addContent({ id, type: type as ContentType, title, creator: creator ?? undefined, thumbnailUrl: thumbnail ?? undefined, status: "WANT" });
      if (result.success) setIsAdded(true);
    });
  };

  return (
    <ContentCard
      contentId={id}
      thumbnail={thumbnail} title={title} creator={creator}
      contentType={type as ContentType} href={href}
      rating={rating ?? undefined}
      saved={isAdded}
      addable={!isChecking && !isAdded && !isAdding}
      onAdd={handleAdd}
    />
  );
}
import SagePlaque from "../SagePlaque";
import { type TodaySageResult } from "@/actions/scriptures";

// #region Constants
const SAGE_MAX_DISPLAY = 11;
// #endregion

interface Props {
  initialData: TodaySageResult;
}

export default function SageSection({ initialData }: Props) {
  const sage = initialData?.sage;
  const allContents = initialData?.contents || [];
  const displayContents = allContents.slice(0, SAGE_MAX_DISPLAY);
  const remainingCount = allContents.length - SAGE_MAX_DISPLAY;

  return (
    <div>
      <SectionHeader
        title="오늘의 인물"
        label="TODAY'S SAGE"
        description={
          <>
            매일 새로운 인물의 서재를 탐방하세요.
            <br />
            <span className="text-text-tertiary text-xs sm:text-sm mt-1 block">
              한 인물의 독서 여정을 따라가 보세요. 그의 생각이 보이기 시작합니다.
            </span>
          </>
        }
      />

      {sage ? (
        <>
          {/* 인물 라벨 */}
          <div className="mb-4 flex justify-center">
            <DecorativeLabel label="오늘의 현인" />
          </div>

          {/* 현인 명판 (Sage Plaque) */}
          <SagePlaque
            id={sage.id}
            nickname={sage.nickname}
            avatarUrl={sage.avatar_url}
            bio={sage.bio}
            contentCount={sage.contentCount}
          />

          {/* 서재 라벨 */}
          <div className="mb-4 flex justify-center">
            <DecorativeLabel label="현인의 서재" />
          </div>

          {/* 콘텐츠 그리드 */}
          {displayContents.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-3 md:gap-4">
              {displayContents.map((content) => (
                <ScriptureContentCard
                  key={content.id}
                  id={content.id}
                  title={content.title}
                  creator={content.creator}
                  thumbnail={content.thumbnail_url}
                  type={content.type}
                  rating={content.avg_rating}
                />
              ))}
              
              {/* 더보기 카드 */}
              <Link
                href={`/${sage.id}`}
                className="group flex flex-col items-center justify-center aspect-[2/3] bg-bg-card/50 border border-border/30 rounded-xl hover:border-accent/50 hover:bg-accent/5"
              >
                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mb-3 group-hover:bg-accent/20">
                  <span className="text-2xl text-accent">→</span>
                </div>
                <span className="text-sm font-medium text-text-primary mb-1 text-center px-2">
                  {sage.nickname}의 기록관으로 가기
                </span>
                {remainingCount > 0 && (
                  <span className="text-xs text-text-tertiary">+{remainingCount}개 더</span>
                )}
              </Link>
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-text-tertiary text-sm font-serif italic opacity-60">
              아직 공개된 서재가 없습니다
            </div>
          )}
        </>
      ) : (
        <div className="flex items-center justify-center h-48 border border-white/5 rounded-xl bg-white/5">
          <p className="text-text-tertiary text-sm">오늘의 인물을 선정 중입니다...</p>
        </div>
      )}
    </div>
  );
}
