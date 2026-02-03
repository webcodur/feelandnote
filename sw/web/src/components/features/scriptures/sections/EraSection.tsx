/*
  파일명: /components/features/scriptures/sections/EraSection.tsx
  기능: 세대의 경전 섹션
  책임: 시대별 인물들의 선택을 보여준다.
*/ // ------------------------------

"use client";

import { useState } from "react";
import { Clock } from "lucide-react";
import { ContentCard } from "@/components/ui/cards";
import ScriptureCelebModal from "../ScriptureCelebModal";
import RepresentativeCelebs from "../RepresentativeCelebs";
import { getCategoryByDbType } from "@/constants/categories";
import type { ContentType } from "@/types/database";

// 인라인 래퍼
function ScriptureContentCard({
  id, title, creator, thumbnail, type, celebCount, userCount = 0, avgRating, index,
}: {
  id: string; title: string; creator?: string | null; thumbnail?: string | null;
  type: string; celebCount: number; userCount?: number; avgRating?: number | null; index?: number;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const category = getCategoryByDbType(type);
  const href = `/content/${id}?category=${category?.id || "book"}`;

  return (
    <>
      <ContentCard
        thumbnail={thumbnail} title={title} creator={creator}
        contentType={type as ContentType} href={href} index={index}
        celebCount={celebCount} userCount={userCount} avgRating={avgRating ?? undefined}
        onStatsClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsModalOpen(true); }}
      />
      <ScriptureCelebModal
        isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}
        contentId={id} contentTitle={title} celebCount={celebCount} userCount={userCount}
      />
    </>
  );
}
import SectionHeader from "@/components/shared/SectionHeader";
import { DecorativeLabel } from "@/components/ui";
import { type EraScriptures } from "@/actions/scriptures";

interface Props {
  initialData: EraScriptures[];
}

// 시대 콘텐츠 그리드
function EraContentsGrid({ era }: { era: EraScriptures }) {
  return era.contents.length > 0 ? (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-3 md:gap-4">
      {era.contents.map((content, idx) => (
        <ScriptureContentCard
          key={content.id}
          id={content.id}
          title={content.title}
          creator={content.creator}
          thumbnail={content.thumbnail_url}
          type={content.type}
          celebCount={content.celeb_count}
          userCount={content.user_count}
          avgRating={content.avg_rating}
          index={idx + 1}
        />
      ))}
    </div>
  ) : (
    <div className="flex items-center justify-center h-24 bg-bg-card/50 rounded-xl border border-border/30">
      <p className="text-text-tertiary text-sm">해당 시대의 경전이 없습니다</p>
    </div>
  );
}

export default function EraSection({ initialData }: Props) {
  const [selectedEra, setSelectedEra] = useState(initialData[0]?.era ?? "");
  const selectedData = initialData.find((era) => era.era === selectedEra);

  if (initialData.length === 0) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Clock size={20} className="text-accent" />
          <h2 className="text-lg md:text-xl font-serif font-bold text-text-primary">세대의 경전</h2>
        </div>
        <div className="flex items-center justify-center h-40 bg-bg-card rounded-xl border border-border/30">
          <p className="text-text-tertiary text-sm">시대별 데이터가 없습니다</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <SectionHeader
        title="세대의 경전"
        label="TIMELESS LEGACY"
        description={
          <>
            시대별 인물들의 선택.
            <br />
            <span className="text-text-tertiary text-xs sm:text-sm mt-1 block">
              그 시대를 움직인 생각들, 지금 만나보세요.
            </span>
          </>
        }
      />

      {/* 모바일: 시대 선택 탭 */}
      <div className="md:hidden mb-10 overflow-x-auto scrollbar-hidden pb-2 mx-[-1rem] px-4 sm:mx-0 sm:px-0">
        <div className="flex justify-center mb-4">
          <DecorativeLabel label="시대 선택" />
        </div>
        <div className="flex justify-center min-w-max">
          <div className="inline-flex p-1 bg-neutral-900/80 backdrop-blur-md rounded-xl border border-white/10 shadow-inner gap-1">
            {initialData.map((era) => {
              const isActive = selectedEra === era.era;
              return (
                <button
                  key={era.era}
                  onClick={() => setSelectedEra(era.era)}
                  className={`
                    relative px-4 py-2 rounded-lg text-sm font-bold transition-all duration-300 flex flex-col items-center leading-tight
                    ${isActive 
                      ? "text-neutral-900 bg-gradient-to-br from-accent via-yellow-200 to-accent shadow-[0_0_15px_rgba(212,175,55,0.4)]" 
                      : "text-text-secondary hover:text-white hover:bg-white/5"
                    }
                  `}
                >
                  <span className={isActive ? "font-serif text-black" : "font-sans"}>{era.label}</span>
                  <span className={`text-[10px] ${isActive ? "text-neutral-800 font-medium" : "text-text-tertiary font-normal"}`}>
                    {era.period}
                  </span>
                </button>
              );
            })}
          </div>
        </div>


        {/* 모바일: 선택된 시대 콘텐츠 */}
        {selectedData && (
          <div className="mt-8 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* 대표 인물 */}
            {selectedData.topCelebs.length > 0 && (
              <div className="relative">
                 <div className="absolute -inset-4 bg-gradient-to-b from-accent/5 to-transparent rounded-3xl -z-10 blur-xl" />
                <RepresentativeCelebs
                  celebs={selectedData.topCelebs.slice(0, 3)}
                  title="시대의 상징"
                  type="classic"
                />
                {/* 시대 설명 */}
                <p className="mt-4 text-sm text-text-primary/80 font-serif text-center leading-relaxed px-4">
                  {selectedData.description}
                </p>
              </div>
            )}
            
            {/* 경전 목록 */}
            <div>
              <div className="flex justify-center mb-4">
                <DecorativeLabel label="시대의 경전" />
              </div>
              <EraContentsGrid era={selectedData} />
            </div>
          </div>
        )}
      </div>

      {/* 데스크탑: 전체 시대 표시 */}
      <div className="hidden md:block space-y-20 relative">
        {/* 전체 타임라인 라인 (배경) */}
        <div className="absolute left-8 top-8 bottom-8 w-[2px] bg-gradient-to-b from-accent via-white/20 to-accent/20 opacity-30" />

        {initialData.map((era, idx) => (
          <div key={era.era} className="relative pl-24 group/era">
            {/* 타임라인 노드 */}
            <div className={`
              absolute left-[29px] top-4 w-2.5 h-2.5 rounded-full border-2 border-accent bg-bg-main z-10 
              transition-all duration-500 group-hover/era:scale-150 group-hover/era:bg-accent group-hover/era:shadow-[0_0_15px_rgba(212,175,55,0.8)]
            `} />
            
            {/* 시대 헤더 */}
            <div className="mb-8 pb-4 border-b border-white/10">
              <div className="flex items-baseline gap-4">
                <h3 className="text-3xl font-serif font-black text-text-primary group-hover/era:text-transparent group-hover/era:bg-clip-text group-hover/era:bg-gradient-to-r group-hover/era:from-white group-hover/era:to-white/70 transition-all">
                  {era.label}
                </h3>
                <span className="text-lg font-cinzel text-accent/80">{era.period}</span>
                <div className="flex-1" />
                <span className="text-sm text-text-secondary">
                  <span className="text-accent font-semibold">{era.celebCount}</span>명의 위인 · <span className="text-accent font-semibold">{era.contents.length}</span>권의 기록
                </span>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-6">
              {/* 대표 인물 섹션 (좌측 3칸) */}
              {era.topCelebs.length > 0 && (
                  <div className="col-span-3 self-start sticky top-24 pt-4 space-y-6">
                    <RepresentativeCelebs
                      celebs={era.topCelebs.slice(0, 3)}
                      type="classic"
                    />
                    {/* 시대 설명 */}
                    <p className="text-sm text-text-primary/80 font-serif leading-relaxed border-l-2 border-accent/30 pl-4">
                      {era.description}
                    </p>
                  </div>
              )}

              {/* 경전 목록 섹션 (우측 9칸) */}
              <div className="col-span-9">
                <EraContentsGrid era={era} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
