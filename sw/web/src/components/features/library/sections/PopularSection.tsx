/*
  파일명: /components/features/library/sections/PopularSection.tsx
  기능: 인기 작품 — 지금 주목받는 주간 베스트셀러 및 불후의 고전
  책임: 실시간 주간 베스트셀러(KO: 알라딘 / EN: OpenLibrary)와 전 시대/직군별 불후의 고전을 2-Track 탭으로 제공하며, 접속자의 locale에 맞추어 국내/글로벌 차트를 분기 제공한다.
*/ // ------------------------------

"use client";

import { useState, useTransition } from "react";
import { ContentCard } from "@/components/ui/cards";
import { CategoryTabFilter, type CategoryTabOption } from "@/components/ui/CategoryTabFilter";
import { Pagination } from "@/components/ui/Pagination";
import { useLocale, useTranslations } from "next-intl";
import { getCategoryByDbType } from "@/constants/categories";
import { getBestsellers, getChosenLibrary, getEraContents, getLibraryByProfession } from "@/actions/library";
import type { BestsellerItem } from "@/actions/library/types";
import { BESTSELLER_CATEGORIES, type BestsellerCategoryKey } from "@/constants/library";
import type { LibraryResult } from "@/actions/library";
import type { ContentType } from "@/types/database";

const ITEMS_PER_PAGE = 12;
const ERAS = ["ancient", "medieval", "modern", "contemporary"] as const;

type Mode = "bestseller" | "classics";
type ClassicsBasis = "all" | "era" | "profession";
type MediaCategory = "ALL" | ContentType;

interface Props {
  initialBestsellers: {
    updatedAt: string;
    items: BestsellerItem[];
  };
  initialClassicsData: LibraryResult;
  professions: { profession: string; count: number }[];
}

export default function PopularSection({ initialBestsellers, initialClassicsData, professions }: Props) {
  const locale = useLocale();
  const t = useTranslations("library.popular");
  const te = useTranslations("library.page.eraPage.eraTabs");
  const tp = useTranslations("profession");
  const tc = useTranslations("content.category");

  const [mode, setMode] = useState<Mode>("bestseller");
  
  // Bestseller state
  const [bestsellerMedia, setBestsellerMedia] = useState<MediaCategory>("BOOK");
  const [bestsellerBookCat, setBestsellerBookCat] = useState<BestsellerCategoryKey>("ALL");
  const [bestsellers, setBestsellers] = useState<BestsellerItem[]>(initialBestsellers.items);

  // Classics state
  const [basis, setBasis] = useState<ClassicsBasis>("all");
  const [era, setEra] = useState<string>(ERAS[0]);
  const [profession, setProfession] = useState<string>(professions[0]?.profession ?? "");
  const [classicsCategory, setClassicsCategory] = useState<MediaCategory>("ALL");
  const [page, setPage] = useState(1);
  const [classicsData, setClassicsData] = useState<LibraryResult>(initialClassicsData);

  const [isPending, startTransition] = useTransition();

  // Bestseller media switcher
  const handleBestsellerMediaChange = (nextMedia: MediaCategory) => {
    setBestsellerMedia(nextMedia);
    startTransition(async () => {
      let key: string = "ALL";
      if (nextMedia === "ALL") key = "MEDIA_ALL";
      else if (nextMedia === "BOOK") key = bestsellerBookCat;
      else if (nextMedia === "VIDEO") key = "VIDEO";
      else if (nextMedia === "GAME") key = "GAME";
      else if (nextMedia === "MUSIC") key = "MUSIC";

      const res = await getBestsellers(key, locale);
      setBestsellers(res.items);
    });
  };

  // Bestseller book sub-category switcher
  const handleBestsellerBookCatChange = (nextCat: BestsellerCategoryKey) => {
    setBestsellerBookCat(nextCat);
    startTransition(async () => {
      const res = await getBestsellers(nextCat, locale);
      setBestsellers(res.items);
    });
  };

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

  const getBestsellerCriteria = () => {
    if (bestsellerMedia === "ALL") return t("criteriaMediaAll");
    if (bestsellerMedia === "VIDEO") return t("criteriaVideo");
    if (bestsellerMedia === "GAME") return t("criteriaGame");
    if (bestsellerMedia === "MUSIC") return t("criteriaMusic");

    switch (bestsellerBookCat) {
      case "ALL": return t("criteriaCatAll");
      case "HUMANITIES": return t("criteriaCatHumanities");
      case "BUSINESS": return t("criteriaCatBusiness");
      case "FICTION": return t("criteriaCatFiction");
      case "STEADY": return t("criteriaCatSteady");
      default: return t("criteriaCatAll");
    }
  };

  const modeChips: CategoryTabOption[] = [
    { value: "bestseller", label: t("tabBestseller") || "주간 베스트" },
    { value: "classics", label: t("tabClassics") || "불후의 명작" },
  ];

  const bestsellerBookChips: CategoryTabOption[] = BESTSELLER_CATEGORIES.map(c => ({
    value: c.key,
    label: t(`chips.${c.key}`),
  }));

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
        <h2 className="font-serif text-2xl md:text-3xl text-text-primary">{t("title")}</h2>
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

      {/* 3. 세부 필터 (주간 베스트 / 불후의 고전) — 카테고리는 모드 바로 아래 공통 상단에 둔다 */}
      {mode === "bestseller" ? (
        <div className="space-y-3">
          <div className="flex justify-center">
            <CategoryTabFilter
              options={mediaCategoryOptions}
              value={bestsellerMedia}
              onChange={(v) => handleBestsellerMediaChange(v as MediaCategory)}
              subtle
              size="sm"
            />
          </div>
          {bestsellerMedia === "BOOK" && (
            <div className="flex justify-center pt-1">
              <CategoryTabFilter
                options={bestsellerBookChips}
                value={bestsellerBookCat}
                onChange={(v) => handleBestsellerBookCatChange(v as BestsellerCategoryKey)}
                subtle
                size="sm"
              />
            </div>
          )}
          <p className="text-center text-sm md:text-[15px] text-text-secondary font-medium pt-1">
            <span className="text-accent mr-1.5 font-bold">✦</span>
            {getBestsellerCriteria()}
          </p>
        </div>
      ) : (
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
        {mode === "bestseller" ? (
          bestsellers.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4 justify-center max-w-6xl mx-auto">
              {bestsellers.map((item) => {
                const cleanIsbn = item.isbn ? item.isbn.trim().split(/\s+/).pop() : null;
                const itemType = (item.type || "BOOK") as ContentType;
                const categoryParam = getCategoryByDbType(itemType)?.id || "book";

                const href = itemType === "BOOK"
                  ? (cleanIsbn ? `/content/${cleanIsbn}?category=book` : `/search?q=${encodeURIComponent(item.title)}`)
                  : `/content/${item.id}?category=${categoryParam}`;

                return (
                  <ContentCard
                    key={item.id}
                    contentId={cleanIsbn || item.id}
                    contentType={itemType}
                    title={item.title}
                    creator={item.creator}
                    thumbnail={item.thumbnail_url}
                    thumbnailEn={item.thumbnail_en || item.thumbnail_url}
                    href={href}
                    titleKo={item.title_ko || (locale === "ko" ? item.title : undefined)}
                    titleEn={item.title_en || (locale === "en" ? item.title : undefined)}
                    creatorEn={item.creator_en || (locale === "en" ? item.creator : undefined)}
                    hasEnEdition={!!item.title_en}
                    fallbackDescription={item.description ?? null}
                    fallbackMetadata={{
                      publisher: item.publisher ?? undefined,
                      publishDate: item.published_date ?? undefined,
                      isbn: cleanIsbn ?? undefined,
                    }}
                  />
                );
              })}
            </div>
          ) : (
            <p className="py-16 text-center text-sm text-text-secondary">{t("empty")}</p>
          )
        ) : (
          classicsData.contents.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4 justify-center max-w-6xl mx-auto">
              {classicsData.contents.map((content) => (
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
                  fallbackDescription={locale === "en" ? (content.review_en || content.review || null) : (content.review || content.review_en || null)}
                />
              ))}
            </div>
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
