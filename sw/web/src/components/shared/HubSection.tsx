/*
  파일명: /components/shared/HubSection.tsx
  기능: 탐색 및 서가 허브 섹션 공통 래퍼
  책임: 제목 + 넘버링 + 섹션 간 네비게이션 + 선택적 더보기 링크 + children
*/ // ------------------------------

"use client";

import { useCallback } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { LinkPending } from "@/components/ui/pending";

import { hubSectionId } from "./hubSectionUtils";
import { useTranslations } from "next-intl";

interface HubSectionProps {
  title: string;
  subtitle?: string;
  moreHref?: string;
  moreLabel?: string;
  children: React.ReactNode;
  hideDivider?: boolean;
  /** 0-based 인덱스 (넘버링 · 네비게이션용) */
  index?: number;
  /** 전체 섹션 수 */
  total?: number;
  /** 그룹 ID — 한 페이지에 독립 넘버링 그룹이 여러 개일 때 사용 */
  groupId?: string;
}

export default function HubSection({
  title,
  subtitle,
  moreHref,
  moreLabel,
  children,
  hideDivider = false,
  index,
  total,
  groupId,
}: HubSectionProps) {
  const t = useTranslations("shared.hubSection");
  const resolvedMoreLabel = moreLabel ?? t("more");
  const hasNav = index !== undefined && total !== undefined && total > 1;
  const sectionId = index !== undefined ? hubSectionId(index, groupId) : undefined;

  const scrollTo = useCallback(
    (targetIndex: number) => {
      const el = document.getElementById(hubSectionId(targetIndex, groupId));
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    [groupId],
  );

  return (
    <section id={sectionId} className="w-full flex flex-col pt-6 md:pt-8 scroll-mt-20">
      {/* 장식적 상단 구분선 */}
      {!hideDivider && (
        <div className="w-full h-px bg-gradient-to-r from-white/10 via-white/5 to-transparent mb-8 md:mb-12" />
      )}

      {/* 헤더 — 중앙 정렬 */}
      <div className="flex flex-col items-center text-center mb-6 md:mb-10 px-1 gap-2 md:gap-3">
        {/* 엑센트 바 */}
        <div className="w-8 h-[2px] bg-[#d4af37] rounded-full shadow-[0_0_8px_rgba(212,175,55,0.3)]" />

        {/* 넘버링 (윗줄) */}
        {hasNav && (
          <span className="text-[11px] font-mono text-[#d4af37]/60 tabular-nums select-none">
            {index! + 1}/{total}
          </span>
        )}

        {/* 좌우 화살표 + 제목 (아랫줄) */}
        <div className="flex items-center gap-3">
          {hasNav && (
            index === 0 ? (
              <button
                type="button"
                onClick={() => scrollTo(total! - 1)}
                className="p-1.5 rounded-full text-[#d4af37]/50 hover:text-[#d4af37] hover:bg-[#d4af37]/10 transition-colors"
                aria-label={t("last")}
              >
                <ChevronsLeft size={16} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => scrollTo(index! - 1)}
                className="p-1.5 rounded-full text-white/30 hover:text-white hover:bg-white/10 transition-colors"
                aria-label={t("previous")}
              >
                <ChevronLeft size={16} />
              </button>
            )
          )}
          {/* 최소 폭 = 가장 긴 제목(오늘의 인물) 기준. 짧은 제목도 같은 폭을 차지해
              좌우 화살표가 모든 구획에서 동일한 자리에 선다 (em이라 글자 크기에 비례) */}
          <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight text-center min-w-[5.5em]">
            {title}
          </h2>
          {hasNav && (
            index === total! - 1 ? (
              <button
                type="button"
                onClick={() => scrollTo(0)}
                className="p-1.5 rounded-full text-[#d4af37]/50 hover:text-[#d4af37] hover:bg-[#d4af37]/10 transition-colors"
                aria-label={t("first")}
              >
                <ChevronsRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => scrollTo(index! + 1)}
                className="p-1.5 rounded-full text-white/30 hover:text-white hover:bg-white/10 transition-colors"
                aria-label={t("next")}
              >
                <ChevronRight size={16} />
              </button>
            )
          )}
        </div>

        {/* 서브타이틀 */}
        {subtitle && (
          <p className="text-sm md:text-base text-white/45 max-w-md break-keep font-medium leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>

      {/* 콘텐츠 */}
      <div className="w-full relative">
        {children}
      </div>

      {/* 더보기 — 콘텐츠 하단, 섹션 끝 직전 */}
      {moreHref && (
        <div className="flex justify-center mt-5 md:mt-8">
          <Link
            href={moreHref}
            className="flex items-center gap-1.5 text-xs text-white/50 hover:text-[#d4af37] font-medium transition-colors bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full border border-white/5 hover:border-white/10"
          >
            {resolvedMoreLabel}
            <LinkPending>
              <ArrowRight size={14} className="text-[#d4af37]/70" />
            </LinkPending>
          </Link>
        </div>
      )}
    </section>
  );
}
