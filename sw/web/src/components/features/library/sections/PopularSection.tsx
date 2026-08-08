/*
  파일명: /components/features/library/sections/PopularSection.tsx
  기능: 인기 작품 — 인물들이 가장 많이 감상한 작품
  책임: 자르는 기준(전체·시대·직군)과 종류를 한 줄씩 고르게 하고, 아래 목록 하나를 갈아 끼운다.
        두 화면을 탭으로 붙이지 않고 필터 + 목록 한 벌로 둔다.
*/ // ------------------------------

"use client";

import { useState, useTransition } from "react";
import { ContentCard } from "@/components/ui/cards";
import ContentGrid from "@/components/ui/ContentGrid";
import { CategoryTabFilter, type CategoryTabOption } from "@/components/ui/CategoryTabFilter";
import { Pagination } from "@/components/ui/Pagination";
import { useTranslations } from "next-intl";
import { getCategoryByDbType } from "@/constants/categories";
import { getChosenLibrary, getEraContents, getLibraryByProfession } from "@/actions/library";
import type { LibraryResult } from "@/actions/library";
import type { ContentType } from "@/types/database";

const ITEMS_PER_PAGE = 12;
const ERAS = ["ancient", "medieval", "modern", "contemporary"] as const;

type Basis = "all" | "era" | "profession";
type Category = "ALL" | ContentType;

interface Props {
  initialData: LibraryResult;
  professions: { profession: string; count: number }[];
}

export default function PopularSection({ initialData, professions }: Props) {
  const t = useTranslations("library.popular");
  const te = useTranslations("library.page.eraPage.eraTabs");
  const tp = useTranslations("profession");
  const tc = useTranslations("content.category");

  const [basis, setBasis] = useState<Basis>("all");
  const [era, setEra] = useState<string>(ERAS[0]);
  const [profession, setProfession] = useState<string>(professions[0]?.profession ?? "");
  const [category, setCategory] = useState<Category>("ALL");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<LibraryResult>(initialData);
  const [isPending, startTransition] = useTransition();

  /** 고른 기준으로 목록을 다시 받는다. 세 조회 모두 같은 모양을 돌려준다 */
  const load = (next: { basis?: Basis; era?: string; profession?: string; category?: Category; page?: number }) => {
    const b = next.basis ?? basis;
    const e = next.era ?? era;
    const pf = next.profession ?? profession;
    const c = next.category ?? category;
    const p = next.page ?? 1;

    setBasis(b); setEra(e); setProfession(pf); setCategory(c); setPage(p);

    startTransition(async () => {
      const cat = c === "ALL" ? undefined : c;
      if (b === "era") {
        setData(await getEraContents({ era: e, category: cat, page: p, limit: ITEMS_PER_PAGE }));
      } else if (b === "profession") {
        const r = await getLibraryByProfession({ profession: pf, category: cat, page: p, limit: ITEMS_PER_PAGE });
        // 직군 조회는 총 개수만 돌려준다 — 쪽수는 여기서 센다
        setData(r
          ? { contents: r.contents, total: r.total, totalPages: Math.ceil(r.total / ITEMS_PER_PAGE), currentPage: p }
          : { contents: [], total: 0, totalPages: 0, currentPage: p });
      } else {
        setData(await getChosenLibrary({ category: cat, page: p, limit: ITEMS_PER_PAGE }));
      }
    });
  };

  const basisChips: CategoryTabOption[] = [
    { value: "all", label: t("basisAll") },
    { value: "era", label: t("basisEra") },
    { value: "profession", label: t("basisProfession") },
  ];
  const eraChips: CategoryTabOption[] = ERAS.map(e => ({ value: e, label: te(e) }));
  const categoryOptions: CategoryTabOption<Category>[] = [
    { value: "ALL", label: tc("all") },
    ...(["BOOK", "VIDEO", "GAME", "MUSIC"] as const).map(v => ({
      value: v as Category,
      label: tc(getCategoryByDbType(v)?.id ?? "book"),
    })),
  ];
  const professionChips: CategoryTabOption[] = professions.map(p => ({
    value: p.profession,
    label: tp(p.profession),
    count: p.count,
  }));

  return (
    <section className="space-y-6">
      <header className="text-center">
        <h1 className="font-serif text-2xl md:text-3xl text-text-primary">{t("title")}</h1>
        <p className="mt-2 text-sm text-text-secondary">{t("description")}</p>
      </header>

      <div className="space-y-3">
        <CategoryTabFilter options={basisChips} value={basis} onChange={(v) => load({ basis: v as Basis })} />
        {basis === "era" && (
          <CategoryTabFilter options={eraChips} value={era} onChange={(v) => load({ era: v })} subtle />
        )}
        {basis === "profession" && professionChips.length > 0 && (
          <CategoryTabFilter options={professionChips} value={profession} onChange={(v) => load({ profession: v })} subtle />
        )}
      </div>

      <CategoryTabFilter
        options={categoryOptions}
        value={category}
        onChange={(v) => load({ category: v })}
      />

      <div className={`min-h-[300px] ${isPending ? "opacity-50" : ""}`}>
        {data.contents.length > 0 ? (
          <ContentGrid>
            {data.contents.map((content) => (
              <ContentCard
                key={content.id}
                contentId={content.id}
                contentType={content.type as ContentType}
                title={content.title}
                creator={content.creator}
                thumbnail={content.thumbnail_url}
                celebCount={content.celeb_count}
                userCount={content.user_count}
                rating={content.avg_rating ?? undefined}
                href={`/content/${content.id}?category=${getCategoryByDbType(content.type)?.id || "book"}`}
                titleKo={content.title_ko}
                titleEn={content.title_en}
                creatorEn={content.creator_en}
                thumbnailEn={content.thumbnail_en}
                hasEnEdition={content.has_en_edition}
              />
            ))}
          </ContentGrid>
        ) : (
          <p className="py-16 text-center text-sm text-text-secondary">{t("empty")}</p>
        )}
      </div>

      {data.totalPages > 1 && (
        <Pagination currentPage={page} totalPages={data.totalPages} onPageChange={(p) => load({ page: p })} />
      )}
    </section>
  );
}
