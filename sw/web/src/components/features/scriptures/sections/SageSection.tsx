/*
  파일명: /components/features/scriptures/sections/SageSection.tsx
  기능: 오늘의 인물 섹션
  책임: 매일 새로운 인물의 서재를 보여준다.
*/ // ------------------------------

"use client";

import Image from "next/image";
import Link from "next/link";
import { User } from "lucide-react";
import ScriptureCard from "../ScriptureCard";
import { type TodaySageResult } from "@/actions/scriptures";

// #region Constants
const SAGE_MAX_DISPLAY = 11;

const PROFESSION_LABELS: Record<string, string> = {
  entrepreneur: "기업인",
  scholar: "학자",
  artist: "예술가",
  politician: "정치인",
  author: "작가",
  commander: "지휘관",
  leader: "지도자",
  investor: "투자자",
  athlete: "운동선수",
  actor: "배우",
};
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
      {/* 섹션 헤더 */}
      <div className="flex items-center gap-2 mb-2">
        <User size={20} className="text-accent" />
        <h2 className="text-lg md:text-xl font-serif font-bold text-text-primary">오늘의 인물</h2>
      </div>
      <p className="text-sm text-text-secondary mb-6">매일 새로운 인물의 서재를 탐방하세요</p>

      {sage ? (
        <>
          {/* 인물 프로필 */}
          <Link
            href={`/${sage.id}`}
            className="flex items-start gap-4 p-4 mb-6 bg-bg-card/50 rounded-xl border border-border/30 hover:border-accent/30"
          >
            {sage.avatar_url ? (
              <Image
                src={sage.avatar_url}
                alt={sage.nickname}
                width={64}
                height={64}
                className="rounded-full object-cover shrink-0"
                unoptimized
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center text-xl text-accent font-bold shrink-0">
                {sage.nickname[0]}
              </div>
            )}
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-text-primary mb-1">{sage.nickname}</h3>
              {sage.profession && (
                <p className="text-xs text-accent mb-2">
                  {PROFESSION_LABELS[sage.profession] || sage.profession}
                </p>
              )}
              {sage.bio && <p className="text-sm text-text-secondary line-clamp-2">{sage.bio}</p>}
              <p className="text-xs text-text-tertiary mt-2">감상 기록 {sage.contentCount}개</p>
            </div>
          </Link>

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
                  avgRating={content.avg_rating}
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
                <span className="text-sm font-medium text-text-primary mb-1">서재 전체 보기</span>
                {remainingCount > 0 && (
                  <span className="text-xs text-text-tertiary">+{remainingCount}개 더</span>
                )}
              </Link>
            </div>
          ) : (
            <div className="flex items-center justify-center h-40 bg-bg-card rounded-xl border border-border/30">
              <p className="text-text-tertiary text-sm">감상 기록이 없습니다</p>
            </div>
          )}
        </>
      ) : (
        <div className="flex items-center justify-center h-40 bg-bg-card rounded-xl border border-border/30">
          <p className="text-text-tertiary text-sm">오늘의 인물이 없습니다</p>
        </div>
      )}
    </div>
  );
}
