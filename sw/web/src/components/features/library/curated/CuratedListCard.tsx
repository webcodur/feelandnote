/*
  파일명: /components/features/library/curated/CuratedListCard.tsx
  기능: 선정 목록 한 건을 나타내는 카드
  책임: 각 기관의 공식 시그니처 컬러, 앰비언트 그라데이션, 거대 엠블럼 워터마크를 통해
        기관 고유의 압도적인 아우라를 부여하고, 엄선된 도서/영상은 품격 있는
        서재 랙으로 진열한다.
*/ // ------------------------------

"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { ListOrdered, CalendarClock, ShieldCheck } from "lucide-react";
import BlurDissolve from "@/components/ui/BlurDissolve";
import NationalityText from "@/components/ui/NationalityText";
import type { CuratedListSummary } from "@/actions/library/types";
import FilmHoles from "./FilmHoles";
import { getCuratorBrand } from "./curatorBrandPalettes";

export default function CuratedListCard({
  list,
  onSelect,
}: {
  list: CuratedListSummary;
  onSelect?: (list: CuratedListSummary) => void;
}) {
  const t = useTranslations("library.curated");

  // 기관 고유의 브랜드 시그니처 팔레트 (다크 앰비언트 그라데이션, 엠블럼 모노그램, 액센트)
  const brand = getCuratorBrand(list.curatorSlug, list.curatorKind);
  const isVideo = list.contentType === "VIDEO";

  return (
    <Link
      href={`/library/curated/${list.curatorSlug}/${list.slug}`}
      onClick={(e) => {
        if (onSelect) {
          e.preventDefault();
          onSelect(list);
        }
      }}
      className="group relative flex flex-col justify-between gap-3.5 overflow-hidden rounded-2xl border border-white/[0.08] p-4 transition-colors hover:border-white/[0.2] sm:p-5"
      style={{
        background: brand.gradient,
        boxShadow: "inset 0 1px 0 0 rgba(255, 255, 255, 0.06)",
      }}
    >
      {/* ── 0. 상단 림 라이트 (Rim Light) ── */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] opacity-70 group-hover:opacity-100"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${brand.accent} 50%, transparent 100%)`,
        }}
      />

      {/* ── 0. 배경 거대 엠블럼 / 모노그램 워터마크 ── */}
      {list.curatorLogoUrl ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-6 -top-6 size-36 select-none overflow-hidden opacity-[0.06] grayscale contrast-200"
        >
          <Image
            src={list.curatorLogoUrl}
            alt=""
            fill
            className="object-contain"
            sizes="144px"
          />
        </div>
      ) : (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-2 -top-2 select-none font-serif text-[64px] font-black tracking-tighter opacity-[0.05]"
          style={{ color: brand.accent }}
        >
          {brand.monogram}
        </div>
      )}

      {/* ── 1. 카드 상단: 공식 아카이브 인덱스 & 기관 헤더 ── */}
      <div className="relative space-y-2.5">
        {/* 상단 마이크로 밴드: 영문 기관/학술명 + 편수 칩 */}
        <div className="flex items-center justify-between gap-2 text-[10px] tracking-wider text-text-tertiary">
          <div className="flex min-w-0 items-center gap-1.5 font-mono uppercase">
            <span
              className="inline-block size-1.5 rounded-full"
              style={{ backgroundColor: brand.accent }}
            />
            <span className="truncate font-semibold tracking-widest text-text-secondary">
              {brand.nameEn ?? (list.curatorKind ? t(`kind.${list.curatorKind}`) : "ARCHIVE")}
            </span>
          </div>

          <span
            className="shrink-0 rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold"
            style={{
              backgroundColor: `${brand.primary}55`,
              color: brand.accent,
              border: `1px solid ${brand.accent}40`,
            }}
          >
            {t("itemCount", { count: list.itemCount })}
          </span>
        </div>

        {/* 기관 로고 + 명칭 + 분류 */}
        <div className="flex items-center gap-2.5">
          {list.curatorLogoUrl ? (
            <div className="relative size-9 shrink-0 overflow-hidden rounded-lg border border-white/20 bg-white/95 p-1 shadow-sm">
              <BlurDissolve className="absolute inset-0">
                <Image
                  src={list.curatorLogoUrl}
                  alt={list.curatorName ?? ""}
                  fill
                  className="object-contain p-0.5"
                  sizes="36px"
                />
              </BlurDissolve>
            </div>
          ) : (
            <div
              className="flex size-9 shrink-0 items-center justify-center rounded-lg border font-serif text-[12px] font-bold shadow-inner"
              style={{
                backgroundColor: `${brand.primary}66`,
                borderColor: `${brand.accent}55`,
                color: brand.accent,
              }}
            >
              {brand.monogram.slice(0, 3)}
            </div>
          )}

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-[14px] font-bold text-text-primary group-hover:text-accent">
                {list.curatorName ?? brand.monogram}
              </span>
              <ShieldCheck size={13} className="shrink-0 text-accent/80" />
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-text-tertiary">
              {list.curatorKind && t.has(`kind.${list.curatorKind}`) && (
                <span className="font-medium" style={{ color: brand.accent }}>
                  {t(`kind.${list.curatorKind}`)}
                </span>
              )}
              {list.curatorCountry && (
                <>
                  <span aria-hidden="true" className="text-white/20">·</span>
                  <NationalityText code={list.curatorCountry} />
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. 중단: 목록 타이틀 & 선정 관점 ── */}
      <div className="relative space-y-1.5">
        <h3 className="font-serif text-[16.5px] font-bold leading-snug text-text-primary group-hover:text-accent">
          {list.title}
        </h3>

        {list.description && (
          <p className="line-clamp-2 text-[12.5px] leading-relaxed text-text-secondary">
            {list.description}
          </p>
        )}

        {list.topics.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-0.5">
            {list.topics.map((topic) => (
              <span
                key={topic}
                className="rounded bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-text-tertiary group-hover:text-text-secondary"
              >
                {t.has(`topicLabel.${topic}`) ? t(`topicLabel.${topic}`) : topic}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── 3. 하단: 인셋 서재 랙 쇼케이스 (조연으로서의 작품 표지) ── */}
      {list.covers.length >= 3 && (
        <div
          className={
            isVideo
              ? "overflow-hidden rounded-xl bg-black"
              : "relative rounded-xl border border-white/[0.06] bg-black/50 p-2 shadow-inner backdrop-blur-sm"
          }
        >
          {isVideo && <FilmHoles />}
          <div className={isVideo ? "flex gap-px" : "flex gap-1.5"}>
            {list.covers.slice(0, 5).map((src, i) => (
              <div
                key={`${src}-${i}`}
                className={
                  isVideo
                    ? "relative aspect-[3/4] flex-1 overflow-hidden bg-neutral-900"
                    : "relative aspect-[3/4] flex-1 overflow-hidden rounded-[3px] border border-white/[0.08] bg-neutral-900 shadow-md transition-transform duration-150 group-hover:-translate-y-1"
                }
              >
                <BlurDissolve className="absolute inset-0">
                  <Image src={src} alt="" fill className="object-cover" sizes="65px" />
                </BlurDissolve>
              </div>
            ))}
          </div>
          {isVideo && <FilmHoles />}
        </div>
      )}

      {/* ── 4. 최하단: 발표 연도 및 특성 메타 ── */}
      <div className="relative flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-white/[0.06] pt-2.5 text-[11px] text-text-tertiary">
        {list.publishedYear && <span>{t("published", { year: list.publishedYear })}</span>}
        {list.edition && <span>{list.edition}</span>}
        {list.isRanked && (
          <span className="inline-flex items-center gap-1">
            <ListOrdered size={11} />
            {t("ranked")}
          </span>
        )}
        {list.isAnnual && (
          <span className="inline-flex items-center gap-1">
            <CalendarClock size={11} />
            {t("annual")}
          </span>
        )}
      </div>
    </Link>
  );
}
