/*
  파일명: /components/features/library/sections/PopularSection.tsx
  기능: 불후의 명작 — 전 시대·시대별·직군별 고전
  책임: 인물들이 거듭 선택한 작품을 매체·기준(전체/시대/직군)으로 나눠 보인다.
        베스트셀러는 작품 모드 첫 화면이 맡는다(BestsellerSection, 26.09.28 이전).
        화면 제목은 배너의 경로 줄(탐색 › 불후의 명작)이 쥐므로 여기서는 문서 구조용으로만 남기고 설명 한 줄만 보인다.
*/ // ------------------------------

"use client";

import { Pagination } from "@/components/ui/Pagination";
import { useTranslations } from "next-intl";
import { getCategoryByDbType } from "@/constants/categories";
import type { LibraryResult } from "@/actions/library/types";
import ClassicsGrid from "../ClassicsGrid";
import PendingMark from "@/components/ui/pending/PendingMark";
import RetryBlock from "@/components/ui/pending/RetryBlock";
import ClassicsFilters from "./ClassicsFilters";
import { useClassicsData } from "./useClassicsData";

interface Props {
  initialClassicsData: LibraryResult;
  professions: string[];
}

export default function PopularSection({ initialClassicsData, professions }: Props) {
  const t = useTranslations("library.popular");
  const tHub = useTranslations("library.hub");
  const te = useTranslations("library.page.eraPage.eraTabs");
  const tp = useTranslations("profession");
  const tc = useTranslations("content.category");

  const { query, data: classicsData, pending: isPending, failed, isSlow, load, retry } = useClassicsData(initialClassicsData, professions[0] ?? "");
  const { basis, era, profession, category: classicsCategory, page } = query;
  const scope = [tc(classicsCategory === "ALL" ? "all" : getCategoryByDbType(classicsCategory)?.id ?? "book"),
    basis === "era" ? te(era) : basis === "profession" ? tp(profession) : null].filter(Boolean).join(" · ");

  return (
    <section className="space-y-6" aria-labelledby="works-classics-heading">
      <header className="text-center">
        <h2 id="works-classics-heading" className="sr-only">{tHub("classicsLabel")}</h2>
        <p className="mx-auto max-w-2xl break-keep text-sm text-text-secondary">{t("description")}</p>
      </header>

      <ClassicsFilters query={query} professions={professions} onChange={load} />

      <div className="min-h-[300px]" aria-busy={isPending}>
        <div role="status" aria-live="polite" className="flex min-h-12 items-center justify-center gap-2 text-center text-sm text-text-secondary">
          {isPending && <><PendingMark size="sm" /><p>{t(isSlow ? "loadingSlow" : "loading", { scope, page })}</p></>}
        </div>
        {failed ? <RetryBlock onRetry={retry} /> : (
          <div className={isPending ? "opacity-40" : ""} inert={isPending} aria-hidden={isPending || undefined}>
            {classicsData.contents.length > 0 && <ClassicsGrid contents={classicsData.contents} />}
            {!isPending && classicsData.contents.length === 0 && <p className="py-16 text-center text-sm text-text-secondary">{t("empty")}</p>}
          </div>
        )}
      </div>

      {!failed && classicsData.totalPages > 1 && (
        <Pagination currentPage={classicsData.currentPage} totalPages={classicsData.totalPages} isLoading={isPending} onPageChange={page => load({ page })} />
      )}
    </section>
  );
}
