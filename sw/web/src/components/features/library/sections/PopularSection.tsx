/*
  파일명: /components/features/library/sections/PopularSection.tsx
  기능: 불후의 명작 — 전 시대·시대별·직군별 고전
  책임: 인물들이 거듭 선택한 작품을 매체·기준(전체/시대/직군)으로 나눠 보인다.
        베스트셀러는 작품 모드 첫 화면이 맡는다(BestsellerSection, 26.09.28 이전).
        화면 제목은 배너의 경로 줄(탐색 › 불후의 명작)이 쥐므로 여기서는 문서 구조용으로만 남기고 설명 한 줄만 보인다.
*/ // ------------------------------

"use client";

import { useState, useTransition } from "react";
import { CategoryTabFilter, type CategoryTabOption } from "@/components/ui/CategoryTabFilter";
import { Pagination } from "@/components/ui/Pagination";
import { useTranslations } from "next-intl";
import { getCategoryByDbType } from "@/constants/categories";
import { getChosenLibrary, getEraContents, getLibraryByProfession } from "@/actions/library";
import type { LibraryResult } from "@/actions/library";
import type { ContentType } from "@/types/database";
import ClassicsGrid from "../ClassicsGrid";

const ITEMS_PER_PAGE = 12;
const ERAS = ["ancient", "medieval", "modern", "contemporary"] as const;

type ClassicsBasis = "all" | "era" | "profession";
type MediaCategory = "ALL" | ContentType;

interface Props {
  initialClassicsData: LibraryResult;
  professions: { profession: string; count: number }[];
}

export default function PopularSection({ initialClassicsData, professions }: Props) {
  const t = useTranslations("library.popular");
  const tHub = useTranslations("library.hub");
  const te = useTranslations("library.page.eraPage.eraTabs");
  const tp = useTranslations("profession");
  const tc = useTranslations("content.category");

  const [basis, setBasis] = useState<ClassicsBasis>("all");
  const [era, setEra] = useState<string>(ERAS[0]);
  const [profession, setProfession] = useState<string>(professions[0]?.profession ?? "");
  const [classicsCategory, setClassicsCategory] = useState<MediaCategory>("ALL");
  const [page, setPage] = useState(1);
  const [classicsData, setClassicsData] = useState<LibraryResult>(initialClassicsData);

  const [isPending, startTransition] = useTransition();

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
    <section className="space-y-6" aria-labelledby="works-classics-heading">
      <header className="text-center">
        <h2 id="works-classics-heading" className="sr-only">{tHub("classicsLabel")}</h2>
        <p className="mx-auto max-w-2xl break-keep text-sm text-text-secondary">{t("description")}</p>
      </header>

      <div className="space-y-3">
        <div className="flex justify-center">
          <CategoryTabFilter options={mediaCategoryOptions} value={classicsCategory} onChange={(v) => loadClassics({ category: v })} subtle size="sm" />
        </div>
        <div className="flex justify-center">
          <CategoryTabFilter options={classicsBasisChips} value={basis} onChange={(v) => loadClassics({ basis: v as ClassicsBasis })} subtle size="sm" />
        </div>
        {basis === "era" && (
          <div className="flex justify-center">
            <CategoryTabFilter options={eraChips} value={era} onChange={(v) => loadClassics({ era: v })} subtle size="sm" />
          </div>
        )}
        {basis === "profession" && professions.length > 0 && (
          <CategoryTabFilter options={professionChips} value={profession} onChange={(v) => loadClassics({ profession: v })}
            subtle size="sm" gridCols={3} className="mx-auto max-w-md" />
        )}
      </div>

      <div className={`min-h-[300px] ${isPending ? "opacity-50" : ""}`}>
        {classicsData.contents.length > 0 && <ClassicsGrid contents={classicsData.contents} />}
        {classicsData.contents.length === 0 && <p className="py-16 text-center text-sm text-text-secondary">{t("empty")}</p>}
      </div>

      {classicsData.totalPages > 1 && (
        <Pagination currentPage={page} totalPages={classicsData.totalPages} onPageChange={(p) => loadClassics({ page: p })} />
      )}
    </section>
  );
}
