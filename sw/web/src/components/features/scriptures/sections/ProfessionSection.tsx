/*
  파일명: /components/features/scriptures/sections/ProfessionSection.tsx
  기능: 길의 갈래 섹션
  책임: 분야별 인물들의 필독서를 보여준다.
*/ // ------------------------------

"use client";

import { useState, useEffect, useTransition } from "react";
import { Route } from "lucide-react";
import { Tabs, Tab } from "@/components/ui/Tab";
import { Pagination } from "@/components/ui/Pagination";
import ScriptureCard from "../ScriptureCard";
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

export default function ProfessionSection({ professionCounts }: Props) {
  const [data, setData] = useState<ProfessionData | null>(null);
  const [activeProfession, setActiveProfession] = useState(professionCounts[0]?.profession || "");
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
      {/* 섹션 헤더 */}
      <div className="flex items-center gap-2 mb-2">
        <Route size={20} className="text-accent" />
        <h2 className="text-lg md:text-xl font-serif font-bold text-text-primary">길의 갈래</h2>
      </div>
      <p className="text-sm text-text-secondary mb-6">분야별 인물들의 필독서</p>

      {/* 분야 탭 */}
      <div className="mb-6 overflow-x-auto scrollbar-hidden">
        <Tabs className="border-b border-border/30">
          {professionCounts.map((item) => (
            <Tab
              key={item.profession}
              active={activeProfession === item.profession}
              onClick={() => handleProfessionChange(item.profession)}
              label={
                <span className="flex items-center gap-1.5">
                  {item.label}
                  <span className="text-xs text-text-tertiary">({item.count})</span>
                </span>
              }
              className="whitespace-nowrap"
            />
          ))}
        </Tabs>
      </div>

      {/* 카드 그리드 */}
      <div className={`min-h-[300px] ${isPending ? "opacity-50" : ""}`}>
        {data && data.contents.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
            {data.contents.map((content, index) => (
              <ScriptureCard
                key={content.id}
                id={content.id}
                title={content.title}
                creator={content.creator}
                thumbnail={content.thumbnail_url}
                type={content.type}
                celebCount={content.celeb_count}
                avgRating={content.avg_rating}
                rank={(page - 1) * ITEMS_PER_PAGE + index + 1}
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

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="mt-6">
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={handlePageChange} />
        </div>
      )}
    </div>
  );
}
