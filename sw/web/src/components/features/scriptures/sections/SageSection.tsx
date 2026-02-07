/*
  파일명: /components/features/scriptures/sections/SageSection.tsx
  기능: 오늘의 인물 섹션
  책임: 매일 새로운 인물의 서재를 보여준다.
*/ // ------------------------------

"use client";

import Link from "next/link";
import { DecorativeLabel } from "@/components/ui";
import { SavedContentCard } from "@/components/ui/cards";
import ContentGrid from "@/components/ui/ContentGrid";
import SectionHeader from "@/components/shared/SectionHeader";
import { getCategoryByDbType } from "@/constants/categories";
import type { ContentType } from "@/types/database";
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
            매일 자정, 한 명의 인물이 새롭게 선정됩니다.
            <br />
            <span className="text-text-tertiary text-xs sm:text-sm mt-1 block">
              그가 읽고, 보고, 들은 것들을 따라가 보세요.
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
            <ContentGrid>
              {displayContents.map((content) => (
                <SavedContentCard
                  key={content.id}
                  contentId={content.id}
                  contentType={content.type as ContentType}
                  title={content.title}
                  creator={content.creator}
                  thumbnail={content.thumbnail_url}
                  rating={content.avg_rating ?? undefined}
                  href={`/content/${content.id}?category=${getCategoryByDbType(content.type)?.id || "book"}`}
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
            </ContentGrid>
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
