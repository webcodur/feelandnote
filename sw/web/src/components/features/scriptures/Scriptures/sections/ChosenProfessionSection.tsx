/*
  파일명: /components/features/scriptures/Scriptures/sections/ChosenProfessionSection.tsx
  기능: 길의 갈래 섹션 (메인 서가 인라인 버전)
  책임: 분야별 인물들의 필독서를 탭과 페이지네이션으로 보여준다.
*/ // ------------------------------
"use client";

import { useState, useCallback, useTransition } from "react";
import { Route } from "lucide-react";
import { Tabs, Tab } from "@/components/ui/Tab";
import { Pagination } from "@/components/ui/Pagination";
import ContentGrid from "@/components/ui/ContentGrid";
import { ContentCard } from "@/components/ui/cards";
import { getCategoryByDbType } from "@/constants/categories";
import type { ContentType } from "@/types/database";
import { useTranslations } from "next-intl";
import {
  getScripturesByProfession,
  type ScripturesByProfession as ProfessionData,
} from "@/actions/scriptures";
import { useIntersectionObserver } from "../hooks";
import { SectionSkeleton, ScriptureSectionHeader } from "../shared";
import type { ProfessionCount } from "../types";
import { ITEMS_PER_PAGE } from "../types";

export default function ChosenProfessionSection({ professionCounts }: { professionCounts: ProfessionCount[] }) {
  const [professionData, setProfessionData] = useState<ProfessionData | null>(null);
  const [activeProfession, setActiveProfession] = useState(professionCounts[0]?.profession || "");
  const [professionPage, setProfessionPage] = useState(1);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPending, startTransition] = useTransition();
  const te = useTranslations("scriptures.page.empty");

  const loadData = useCallback(async (profession: string, page: number) => {
    startTransition(async () => {
      const result = await getScripturesByProfession({ profession, page, limit: ITEMS_PER_PAGE });
      setProfessionData(result);
      setIsLoaded(true);
    });
  }, []);

  const ref = useIntersectionObserver(() => {
    if (activeProfession) loadData(activeProfession, 1);
  });

  const handleProfessionChange = (profession: string) => {
    setActiveProfession(profession);
    setProfessionPage(1);
    loadData(profession, 1);
  };

  const handlePageChange = (page: number) => {
    setProfessionPage(page);
    loadData(activeProfession, page);
  };

  const totalPages = professionData ? Math.ceil(professionData.total / ITEMS_PER_PAGE) : 0;

  return (
    <section id="profession-section" ref={ref} className="py-12 md:py-16">
      <ScriptureSectionHeader sectionKey="profession" icon={Route} />

      {!isLoaded ? (
        <SectionSkeleton />
      ) : professionCounts.length > 0 ? (
        <>
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

          <div className={`min-h-[300px] ${isPending ? "opacity-50" : ""}`}>
            {professionData && professionData.contents.length > 0 ? (
              <ContentGrid>
                {professionData.contents.map((content) => (
                  <ContentCard
                    key={content.id}
                    contentId={content.id}
                    contentType={content.type as ContentType}
                    title={content.title}
                    creator={content.creator}
                    thumbnail={content.thumbnail_url}
                    rating={content.avg_rating ?? undefined}
                    href={`/content/${content.id}?category=${getCategoryByDbType(content.type)?.id || "book"}`}
                    titleKo={content.title_ko}
                    titleEn={content.title_en}
                    creatorEn={content.creator_en}
                    thumbnailEn={content.thumbnail_en}
                    hasEnEdition={content.has_en_edition}
                    mobileLayout="review"
                  />
                ))}
              </ContentGrid>
            ) : (
              <div className="flex items-center justify-center h-40 bg-bg-card rounded-xl border border-border/30">
                <p className="text-text-tertiary text-sm">{te("noProfession")}</p>
              </div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="mt-6">
              <Pagination currentPage={professionPage} totalPages={totalPages} onPageChange={handlePageChange} />
            </div>
          )}
        </>
      ) : (
        <div className="flex items-center justify-center h-40 bg-bg-card rounded-xl border border-border/30">
          <p className="text-text-tertiary text-sm">{te("noProfessionData")}</p>
        </div>
      )}
    </section>
  );
}
