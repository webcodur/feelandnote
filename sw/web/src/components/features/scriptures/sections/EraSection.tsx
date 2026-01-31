/*
  파일명: /components/features/scriptures/sections/EraSection.tsx
  기능: 세대의 경전 섹션
  책임: 시대별 인물들의 선택을 보여준다.
*/ // ------------------------------

"use client";

import { Clock } from "lucide-react";
import ScriptureCard from "../ScriptureCard";
import { type EraScriptures } from "@/actions/scriptures";

interface Props {
  initialData: EraScriptures[];
}

export default function EraSection({ initialData }: Props) {
  return (
    <div>
      {/* 섹션 헤더 */}
      <div className="flex items-center gap-2 mb-2">
        <Clock size={20} className="text-accent" />
        <h2 className="text-lg md:text-xl font-serif font-bold text-text-primary">세대의 경전</h2>
      </div>
      <p className="text-sm text-text-secondary mb-6">시대별 인물들의 선택</p>

      {initialData.length > 0 ? (
        <div className="space-y-8">
          {initialData.map((era) => (
            <div key={era.era}>
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-base font-semibold text-text-primary">{era.label}</h3>
                <span className="text-xs text-accent/70">{era.period}</span>
                <span className="text-xs text-text-tertiary">(인물 {era.celebCount}명)</span>
              </div>

              {era.contents.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
                  {era.contents.map((content, index) => (
                    <ScriptureCard
                      key={content.id}
                      id={content.id}
                      title={content.title}
                      creator={content.creator}
                      thumbnail={content.thumbnail_url}
                      type={content.type}
                      celebCount={content.celeb_count}
                      avgRating={content.avg_rating}
                      rank={index + 1}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-24 bg-bg-card/50 rounded-xl border border-border/30">
                  <p className="text-text-tertiary text-sm">해당 시대의 경전이 없습니다</p>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center h-40 bg-bg-card rounded-xl border border-border/30">
          <p className="text-text-tertiary text-sm">시대별 데이터가 없습니다</p>
        </div>
      )}
    </div>
  );
}
