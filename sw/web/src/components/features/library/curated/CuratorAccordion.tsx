/*
  파일명: /components/features/library/curated/CuratorAccordion.tsx
  기능: 기관 1건을 나타내는 아코디언 아이템
  책임: 평소에는 단정한 서가 인덱스 바로 시각적 피로도를 최소화하고,
        탭하면 해당 기관의 브랜딩과 목록들을 집중도 있게 펼친다.
*/ // ------------------------------

"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { ChevronDown, ArrowRight, BookOpen } from "lucide-react";
import BlurDissolve from "@/components/ui/BlurDissolve";
import NationalityText from "@/components/ui/NationalityText";
import type { CuratedHub, CuratedListSummary } from "@/actions/library/types";
import CuratedListCard from "./CuratedListCard";
import { getCuratorBrand } from "./curatorBrandPalettes";

type Curator = CuratedHub["curators"][number];

export default function CuratorAccordion({
  curator,
  isOpen,
  onToggle,
  onSelectList,
}: {
  curator: Curator;
  isOpen: boolean;
  onToggle: () => void;
  onSelectList: (list: CuratedListSummary) => void;
}) {
  const t = useTranslations("library.curated");
  const brand = getCuratorBrand(curator.slug, curator.kind);
  const itemCount = curator.lists.reduce((sum, list) => sum + list.itemCount, 0);

  return (
    <div
      className={`overflow-hidden rounded-2xl border transition-colors ${
        isOpen
          ? "border-accent/40 bg-[#161616]"
          : "border-white/[0.08] bg-[#141414] hover:border-white/[0.2] hover:bg-[#181818]"
      }`}
      style={{
        background: isOpen
          ? `radial-gradient(130% 120% at 0% 0%, ${brand.primary}33 0%, ${brand.primary}10 40%, #161616 85%)`
          : undefined,
      }}
    >
      {/* ── 아코디언 헤더 바 (인덱스 서가 버튼) ── */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="group relative flex w-full items-center justify-between gap-3 p-4 text-left transition-colors sm:p-5"
      >
        {/* 상단 림 라이트 (열려있을 때 돋보임) */}
        {isOpen && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-[2px]"
            style={{
              background: `linear-gradient(90deg, transparent, ${brand.accent}, transparent)`,
            }}
          />
        )}

        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          {/* 기관 로고 또는 모노그램 */}
          {curator.logoUrl ? (
            <div className="relative size-10 shrink-0 overflow-hidden rounded-xl border border-white/20 bg-white/95 p-1 shadow-sm sm:size-12">
              <BlurDissolve className="absolute inset-0">
                <Image
                  src={curator.logoUrl}
                  alt={curator.name}
                  fill
                  className="object-contain p-0.5"
                  sizes="48px"
                />
              </BlurDissolve>
            </div>
          ) : (
            <div
              className="flex size-10 shrink-0 items-center justify-center rounded-xl border font-serif text-[13px] font-bold sm:size-12"
              style={{
                backgroundColor: `${brand.primary}66`,
                borderColor: `${brand.accent}55`,
                color: brand.accent,
              }}
            >
              {brand.monogram.slice(0, 3)}
            </div>
          )}

          {/* 기관 명칭 & 메타 정보 */}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-text-tertiary">
              <span className="font-semibold" style={{ color: brand.accent }}>
                {t(`kind.${curator.kind}`)}
              </span>
              {curator.country && (
                <>
                  <span aria-hidden="true" className="text-white/20">·</span>
                  <NationalityText code={curator.country} />
                </>
              )}
              {curator.foundedYear && (
                <>
                  <span aria-hidden="true" className="text-white/20">·</span>
                  <span>{t("since", { year: curator.foundedYear })}</span>
                </>
              )}
            </div>

            <div className="mt-0.5 truncate text-[16px] font-bold text-text-primary group-hover:text-accent sm:text-[18px]">
              {curator.name}
            </div>
          </div>
        </div>

        {/* 우측: 편수 요약 칩 & Chevron 아이콘 */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <div className="hidden text-right font-mono text-[12px] sm:block">
            <span className="font-semibold text-text-primary">
              {t("listCount", { count: curator.listCount })}
            </span>
            {itemCount > 0 && (
              <span className="text-text-tertiary"> · {t("itemCount", { count: itemCount })}</span>
            )}
          </div>

          <div
            className={`flex size-8 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-text-secondary transition-transform duration-200 group-hover:border-accent/40 group-hover:text-accent ${
              isOpen ? "rotate-180 border-accent/40 bg-accent/10 text-accent" : ""
            }`}
          >
            <ChevronDown size={17} />
          </div>
        </div>
      </button>

      {/* ── 아코디언 본문 (펼침 영역) ── */}
      {isOpen && (
        <div className="border-t border-white/[0.08] bg-black/40 p-4 sm:p-6 space-y-5" style={{ overflowAnchor: "none" }}>
          {/* 기관 상세 소개글 & 전용관 링크 */}
          <div className="flex flex-col justify-between gap-3 border-b border-white/[0.06] pb-4 sm:flex-row sm:items-end">
            {curator.description && (
              <p className="max-w-3xl text-[13.5px] leading-relaxed text-text-secondary">
                {curator.description}
              </p>
            )}

            <Link
              href={`/library/curated/${curator.slug}`}
              className="inline-flex shrink-0 items-center gap-1 text-[12px] font-semibold text-accent transition-colors hover:underline"
            >
              이 기관 전용관 바로가기
              <ArrowRight size={13} />
            </Link>
          </div>

          {/* 해당 기관의 선정 목록 카드 그리드 */}
          {curator.lists.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-[12px] font-semibold text-text-tertiary">
                <BookOpen size={14} className="text-accent" />
                선정 도서 및 작품 목록 (카드를 누르면 퀵 프리뷰가 열립니다)
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {curator.lists.map((list) => (
                  <CuratedListCard
                    key={list.slug}
                    list={{
                      ...list,
                      curatorName: list.curatorName ?? curator.name,
                      curatorLogoUrl: list.curatorLogoUrl ?? curator.logoUrl,
                      curatorKind: list.curatorKind ?? curator.kind,
                      curatorCountry: list.curatorCountry ?? curator.country,
                    }}
                    onSelect={onSelectList}
                  />
                ))}
              </div>
            </div>
          ) : (
            <p className="py-6 text-center text-[13px] text-text-tertiary">
              {t("emptyLists")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
