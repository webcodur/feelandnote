/*
  파일명: /components/features/scriptures/sections/SageSection.tsx
  기능: 오늘의 인물 섹션
  책임: 매일 새로운 인물의 서재를 보여준다.
*/ // ------------------------------

"use client";

import Link from "next/link";
import MaterialFrame from "@/components/ui/MaterialFrame";
import { DecorativeLabel } from "@/components/ui";
import ScriptureCard from "../ScriptureCard";
import SectionHeader from "@/components/shared/SectionHeader";
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
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
              {displayContents.map((content) => (
                <ScriptureCard
                  key={content.id}
                  id={content.id}
                  title={content.title}
                  creator={content.creator}
                  thumbnail={content.thumbnail_url}
                  type={content.type}
                  celebCount={1}
                  userCount={content.user_count}
                  avgRating={content.avg_rating}
                />
              ))}
              
              {/* 더보기 카드 (Gate 스타일) */}
              <Link href={`/${sage.id}`} className="group block h-full">
                <MaterialFrame
                  material="stone"
                  className="h-full aspect-[2/3] rounded-xl transition-all hover:scale-[1.02]"
                  innerClassName="flex flex-col items-center justify-center bg-neutral-900/80 group-hover:bg-neutral-900"
                >
                  <div className="w-12 h-12 rounded-full border border-accent/30 flex items-center justify-center mb-3 group-hover:border-accent group-hover:shadow-[0_0_15px_rgba(212,175,55,0.3)] transition-all">
                    <span className="text-xl text-accent/70 group-hover:text-accent">→</span>
                  </div>
                  <span className="text-xs font-cinzel font-bold text-text-secondary mb-1">VIEW FULL</span>
                  <span className="text-xs font-serif text-text-tertiary">서재 전체 보기</span>
                  {remainingCount > 0 && (
                    <span className="text-[10px] text-accent/70 mt-2 px-2 py-0.5 rounded-full border border-accent/20">
                      +{remainingCount} MORE
                    </span>
                  )}
                </MaterialFrame>
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
