/*
  파일명: /components/features/library/sections/PopularSection.tsx
  기능: 인기 작품 — 현재 도서 판매 순위 및 불후의 고전
  책임: 판매처의 도서 순위와 전 시대/직군별 고전을 구분해 제공한다.
*/ // ------------------------------

"use client";

import { useState, useTransition } from "react";
import { CategoryTabFilter, type CategoryTabOption } from "@/components/ui/CategoryTabFilter";
import { Pagination } from "@/components/ui/Pagination";
import { useTranslations } from "next-intl";
import { getCategoryByDbType } from "@/constants/categories";
import { getChosenLibrary, getEraContents, getLibraryByProfession } from "@/actions/library";
import type { BestsellerItem } from "@/actions/library/types";
import type { LibraryResult } from "@/actions/library";
import type { ContentType } from "@/types/database";
import BestsellerFreshness, { type BestsellerFreshnessProps } from "../BestsellerFreshness";
import BookChartGrid from "../BookChartGrid";
import ClassicsGrid from "../ClassicsGrid";

const ITEMS_PER_PAGE = 12;
const ERAS = ["ancient", "medieval", "modern", "contemporary"] as const;

type Mode = "bestseller" | "classics";
type ClassicsBasis = "all" | "era" | "profession";
type MediaCategory = "ALL" | ContentType;

interface Props {
  initialBestsellers: BestsellerFreshnessProps & {
    items: BestsellerItem[];
  };
  initialClassicsData: LibraryResult;
  professions: { profession: string; count: number }[];
  /** 허브 미리보기의 더 보기처럼 모드를 골라 들어오는 길 (?mode=classics) */
  initialMode?: Mode;
}

export default function PopularSection({ initialBestsellers, initialClassicsData, professions, initialMode }: Props) {
  const t = useTranslations("library.popular");
  const te = useTranslations("library.page.eraPage.eraTabs");
  const tp = useTranslations("profession");
  const tc = useTranslations("content.category");

  const [mode, setMode] = useState<Mode>(initialMode ?? "bestseller");
  
  const bestsellers = initialBestsellers.items;

  // Classics state
  const [basis, setBasis] = useState<ClassicsBasis>("all");
  const [era, setEra] = useState<string>(ERAS[0]);
  const [profession, setProfession] = useState<string>(professions[0]?.profession ?? "");
  const [classicsCategory, setClassicsCategory] = useState<MediaCategory>("ALL");
  const [page, setPage] = useState(1);
  const [classicsData, setClassicsData] = useState<LibraryResult>(initialClassicsData);

  const [isPending, startTransition] = useTransition();

  // Classics load
  const loadClassics = (next: { basis?: ClassicsBasis; era?: string; profession?: string; category?: MediaCategory; page?: number }) => {
    const b = next.basis ?? basis;
    const e = next.era ?? era;
    const pf = next.profession ?? profession;
    const c = next.category ?? classicsCategory;
    const p = next.page ?? 1;

    setBasis(b); setEra(e); setProfession(pf); setClassicsCategory(c); setPage(p);

    startTransition(async () => {
      const cat = c === "ALL" ? undefined : c;
      if (b === "era") {
        setClassicsData(await getEraContents({ era: e, category: cat, page: p, limit: ITEMS_PER_PAGE }));
      } else if (b === "profession") {
        const r = await getLibraryByProfession({ profession: pf, category: cat, page: p, limit: ITEMS_PER_PAGE });
        setClassicsData(r
          ? { contents: r.contents, total: r.total, totalPages: Math.ceil(r.total / ITEMS_PER_PAGE), currentPage: p }
          : { contents: [], total: 0, totalPages: 0, currentPage: p });
      } else {
        setClassicsData(await getChosenLibrary({ category: cat, page: p, limit: ITEMS_PER_PAGE }));
      }
    });
  };

  const modeChips: CategoryTabOption[] = [
    { value: "bestseller", label: t("tabBestseller") },
    { value: "classics", label: t("tabClassics") },
  ];

  const mediaCategoryOptions: CategoryTabOption<MediaCategory>[] = [
    { value: "ALL", label: tc("all") },
    ...(["BOOK", "VIDEO", "GAME", "MUSIC"] as const).map(v => ({
      value: v as MediaCategory,
      label: tc(getCategoryByDbType(v)?.id ?? "book"),
    })),
  ];

  const classicsBasisChips: CategoryTabOption[] = [
    { value: "all", label: t("basisAll") },
    { value: "era", label: t("basisEra") },
    { value: "profession", label: t("basisProfession") },
  ];
  const eraChips: CategoryTabOption[] = ERAS.map(e => ({ value: e, label: te(e) }));
  const professionChips: CategoryTabOption[] = professions.map((p) => ({
    value: p.profession,
    label: tp(p.profession),
  }));

  return (
    <section className="space-y-6">
      {/* 1. 상단 헤더: 전체 모드 개요 설명 */}
      <header className="text-center">
        <h2 className="font-serif text-2xl md:text-3xl text-text-primary">
          {mode === "bestseller" ? t("chartTitle") : t("title")}
        </h2>
        <p className="mt-2 text-sm md:text-base text-text-secondary max-w-2xl mx-auto">
          {mode === "bestseller" ? t("descBestseller") : t("description")}
        </p>
      </header>

      {/* 2. 베스트셀러 vs 불후의 고전 모드 전환 (1단 메인) */}
      <div className="flex justify-center">
        <CategoryTabFilter
          options={modeChips}
          value={mode}
          onChange={(v) => setMode(v as Mode)}
          size="md"
        />
      </div>

      {/* 3. 불후의 고전 필터 */}
      {mode === "classics" && (
        <div className="space-y-3">
          <div className="flex justify-center">
            <CategoryTabFilter
              options={mediaCategoryOptions}
              value={classicsCategory}
              onChange={(v) => loadClassics({ category: v })}
              subtle
              size="sm"
            />
          </div>
          <div className="flex justify-center">
            <CategoryTabFilter
              options={classicsBasisChips}
              value={basis}
              onChange={(v) => loadClassics({ basis: v as ClassicsBasis })}
              subtle
              size="sm"
            />
          </div>
          {basis === "era" && (
            <div className="flex justify-center">
              <CategoryTabFilter options={eraChips} value={era} onChange={(v) => loadClassics({ era: v })} subtle size="sm" />
            </div>
          )}
          {basis === "profession" && professions.length > 0 && (
            <CategoryTabFilter
              options={professionChips}
              value={profession}
              onChange={(v) => loadClassics({ profession: v })}
              subtle
              size="sm"
              gridCols={3}
              className="max-w-md mx-auto"
            />
          )}
        </div>
      )}

      {/* 4. 카드 그리드 */}
      <div className={`min-h-[300px] ${isPending ? "opacity-50" : ""}`}>
        {mode === "bestseller" && (
          <div className="mb-5">
            {bestsellers.length > 0 && <BestsellerFreshness {...initialBestsellers} />}
          </div>
        )}
        {mode === "bestseller" ? (
          bestsellers.length > 0 ? (
            <BookChartGrid items={bestsellers} />
          ) : (
            <p className="py-16 text-center text-sm text-text-secondary">{t("chartEmpty")}</p>
          )
        ) : (
          classicsData.contents.length > 0 ? (
            <ClassicsGrid contents={classicsData.contents} />
          ) : (
            <p className="py-16 text-center text-sm text-text-secondary">{t("empty")}</p>
          )
        )}
      </div>

      {mode === "classics" && classicsData.totalPages > 1 && (
        <Pagination currentPage={page} totalPages={classicsData.totalPages} onPageChange={(p) => loadClassics({ page: p })} />
      )}
    </section>
  );
}
