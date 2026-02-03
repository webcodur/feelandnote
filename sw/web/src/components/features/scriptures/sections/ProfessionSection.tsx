/*
  파일명: /components/features/scriptures/sections/ProfessionSection.tsx
  기능: 길의 갈래 섹션
  책임: 분야별 인물들의 필독서를 보여준다.
*/ // ------------------------------

"use client";

import { useState, useEffect, useTransition } from "react";
import { Pagination } from "@/components/ui/Pagination";
import { DecorativeLabel } from "@/components/ui";
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
import {
  getScripturesByProfession,
  type ScripturesByProfession as ProfessionData,
} from "@/actions/scriptures";

// #region Types
interface ProfessionCount {
  profession: string;
  label: string;
  count: number;
}

interface Props {
  professionCounts: ProfessionCount[];
}
// #endregion

const ITEMS_PER_PAGE = 12;

// 3행 구조: 3글자 중요도 순 (기업가 1등)
const PROFESSION_ROWS = [
  ['entrepreneur', 'investor', 'politician', 'author', 'actor'],
  ['leader', 'scientist', 'athlete', 'social_scientist'],
  ['commander', 'artist', 'humanities_scholar', 'influencer'],
] as const;

export default function ProfessionSection({ professionCounts }: Props) {
  const [data, setData] = useState<ProfessionData | null>(null);
  const [activeProfession, setActiveProfession] = useState(
    professionCounts.find(p => p.profession === 'entrepreneur')?.profession || professionCounts[0]?.profession || ""
  );
  const [page, setPage] = useState(1);
  const [isPending, startTransition] = useTransition();

  // 초기 로드
  useEffect(() => {
    if (activeProfession) {
      loadData(activeProfession, 1);
    }
  }, []);

  const loadData = (profession: string, pageNum: number) => {
    startTransition(async () => {
      const result = await getScripturesByProfession({ profession, page: pageNum, limit: ITEMS_PER_PAGE });
      setData(result);
    });
  };

  const handleProfessionChange = (profession: string) => {
    setActiveProfession(profession);
    setPage(1);
    loadData(profession, 1);
  };

  const handlePageChange = (pageNum: number) => {
    setPage(pageNum);
    loadData(activeProfession, pageNum);
  };

  const totalPages = data ? Math.ceil(data.total / ITEMS_PER_PAGE) : 0;

  if (professionCounts.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 bg-bg-card rounded-xl border border-border/30">
        <p className="text-text-tertiary text-sm">분야별 데이터가 없습니다</p>
      </div>
    );
  }

  return (
    <div>
      <SectionHeader
        title="길의 갈래"
        label="MASTERS OF THE FIELD"
        description={
          <>
            분야별 인물들의 필독서.
            <br />
            <span className="text-text-tertiary text-xs sm:text-sm mt-1 block">
              당신이 가고자 하는 길의 선배들은 무엇을 읽었을까요?
            </span>
          </>
        }
      />

      {/* 분야 선택 */}
      <div className="-mt-2 mb-4 flex justify-center">
        <DecorativeLabel label="직군 선택" />
      </div>
      <div className="mb-10 flex justify-center">
        <div className="inline-flex flex-col items-center gap-1.5 p-2.5 bg-neutral-900/80 backdrop-blur-md rounded-xl border border-white/10 shadow-inner">
          {PROFESSION_ROWS.map((rowKeys, rowIndex) => {
            const rowItems = rowKeys
              .map(key => professionCounts.find(p => p.profession === key))
              .filter((item): item is ProfessionCount => !!item);

            if (rowItems.length === 0) return null;

            return (
              <div key={rowIndex} className="inline-flex gap-1">
                {rowItems.map((item) => {
                  const isActive = activeProfession === item.profession;
                  return (
                    <button
                      key={item.profession}
                      onClick={() => handleProfessionChange(item.profession)}
                      className={`
                        px-3 py-1.5 rounded-lg text-sm font-bold
                        ${isActive
                          ? "text-neutral-900 bg-gradient-to-br from-accent via-yellow-200 to-accent shadow-[0_0_15px_rgba(212,175,55,0.4)]"
                          : "text-text-secondary hover:text-white hover:bg-white/5"
                        }
                      `}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      <div className={`min-h-[300px] transition-opacity duration-300 ${isPending ? "opacity-50" : "opacity-100"}`}>
        {/* 대표 인물 */}
        {data?.topCelebs && data.topCelebs.length > 0 && (
          <div className="mb-10 sm:mb-14">
            <RepresentativeCelebs
              celebs={data.topCelebs}
              title="대표 인물"
              centered
            />
          </div>
        )}

        {/* 카드 그리드 */}
        <div>
          <div className="flex justify-center mb-6">
            <DecorativeLabel label="추천 경전" />
          </div>
          
          {data && data.contents.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
              {data.contents.map((content, index) => (
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
                  index={(page - 1) * ITEMS_PER_PAGE + index + 1}
                />
              ))}
            </div>
          ) : !data ? (
            <div className="animate-pulse grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="aspect-[2/3] bg-bg-card rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-40 bg-bg-card rounded-xl border border-border/30">
              <p className="text-text-tertiary text-sm">해당 분야의 경전이 없습니다</p>
            </div>
          )}
        </div>
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="mt-8 flex justify-center">
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={handlePageChange} />
        </div>
      )}
    </div>
  );
}
