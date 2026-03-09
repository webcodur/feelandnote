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
import ContentGrid from "@/components/ui/ContentGrid";
import RepresentativeCelebs from "../RepresentativeCelebs";
import { getCategoryByDbType } from "@/constants/categories";
import type { ContentType } from "@/types/database";
import SectionHeader from "@/components/shared/SectionHeader";
import {
  getScripturesByProfession,
  type ScripturesByProfession as ProfessionData,
} from "@/actions/scriptures";
import { PROFESSION_ROWS, PROFESSION_ROWS_EN } from "@/constants/scriptures";
import { useTranslations, useLocale } from "next-intl";

// #region Types
interface ProfessionCount {
  profession: string;
  label: string;
  count: number;
}

interface Props {
  professionCounts: ProfessionCount[];
  initialProfession?: string;
}
// #endregion

const ITEMS_PER_PAGE = 12;

export default function ProfessionSection({ professionCounts, initialProfession }: Props) {
  const [data, setData] = useState<ProfessionData | null>(null);
  const resolved = initialProfession && professionCounts.some(p => p.profession === initialProfession)
    ? initialProfession
    : professionCounts.find(p => p.profession === 'entrepreneur')?.profession || professionCounts[0]?.profession || "";
  const [activeProfession, setActiveProfession] = useState(resolved);
  const [page, setPage] = useState(1);
  const [isPending, startTransition] = useTransition();
  const locale = useLocale();
  const t = useTranslations("scriptures.page.professionPage");
  const tp = useTranslations("profession");
  const te = useTranslations("scriptures.page.empty");
  const rows = locale === "en" ? PROFESSION_ROWS_EN : PROFESSION_ROWS;

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
        <p className="text-text-tertiary text-sm">{te("noProfessionData")}</p>
      </div>
    );
  }

  return (
    <div>
      <SectionHeader
        title={t("title")}
        label="MASTERS OF THE FIELD"
        description={
          <>
            {t("description")}
            <br />
            <span className="text-text-tertiary text-sm mt-1 block">
              {t("descriptionSub")}
            </span>
          </>
        }
      />

      {/* 분야 선택 */}
      <div className="mb-6">
        <div className="flex justify-center mb-4">
          <DecorativeLabel label={t("selectProfession")} />
        </div>
        <div className="flex justify-center">
          <div className="inline-flex flex-col items-center gap-1.5 p-3 max-w-2xl bg-neutral-900/80 backdrop-blur-md rounded-xl border border-white/10 shadow-inner">
            {rows.map((row, ri) => (
              <div key={ri} className="flex justify-center gap-1.5">
                {row.map((key) => {
                  const item = professionCounts.find(p => p.profession === key);
                  if (!item) return null;

                  const isActive = activeProfession === item.profession;
                  return (
                    <button
                      key={item.profession}
                      onClick={() => handleProfessionChange(item.profession)}
                      className={`
                        inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all
                        ${isActive
                          ? "text-neutral-900 bg-gradient-to-br from-accent via-yellow-200 to-accent shadow-[0_0_15px_rgba(212,175,55,0.4)]"
                          : "text-text-secondary hover:text-white hover:bg-white/8"
                        }
                      `}
                    >
                      <span>{tp(item.profession as any)}</span>
                      <span
                        className={`
                          text-xs font-normal tabular-nums ml-0.5
                          ${isActive ? "text-neutral-900/60" : "text-text-tertiary"}
                        `}
                      >
                        {item.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={`min-h-[300px] transition-opacity duration-300 ${isPending ? "opacity-50" : "opacity-100"}`}>
        {/* 대표 인물 */}
        {data?.topCelebs && data.topCelebs.length > 0 && (
          <div className="mb-10 sm:mb-14">
            <RepresentativeCelebs
              celebs={data.topCelebs}
              title={`${t("representativePrefix")}${tp(activeProfession as any)}`}
              centered
            />
          </div>
        )}

        {/* 카드 그리드 */}
        <div>
          <div className="flex justify-center mb-6">
            <DecorativeLabel label={t("recommendedWorks")} />
          </div>
          
          {data && data.contents.length > 0 ? (
            <ContentGrid>
              {data.contents.map((content) => (
                <ContentCard
                  key={content.id}
                  contentId={content.id}
                  contentType={content.type as ContentType}
                  title={content.title}
                  creator={content.creator}
                  thumbnail={content.thumbnail_url}
                  rating={content.avg_rating ?? undefined}
                  href={`/content/${content.id}?category=${getCategoryByDbType(content.type)?.id || "book"}`}
                  addable={true}
                  titleKo={content.title_ko}
                  titleEn={content.title_en}
                  creatorEn={content.creator_en}
                  thumbnailEn={content.thumbnail_en}
                  hasEnEdition={content.has_en_edition}
                />
              ))}
            </ContentGrid>
          ) : !data ? (
            <ContentGrid className="animate-pulse">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="aspect-[2/3] bg-bg-card rounded-xl" />
              ))}
            </ContentGrid>
          ) : (
            <div className="flex items-center justify-center h-40 bg-bg-card rounded-xl border border-border/30">
              <p className="text-text-tertiary text-sm">{te("noProfession")}</p>
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
