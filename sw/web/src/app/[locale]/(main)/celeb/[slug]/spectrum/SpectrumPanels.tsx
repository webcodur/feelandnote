/* ─────────────────────────────────────────────
 * [celeb 상세] spectrum — 수치 패널 뼈대와 모바일 진입 단추
 * - 목차 위치: spectrum(분석 구획, service key `spectrum` / sectionId `analysis`)
 * - 데이터: props 없음(SectionHeader 제목만, MetricPanel 자식만, MobileMatchButton 라벨·onClick만)
 * - 함께 보기: SpectrumMetricPanels.tsx, SpectrumSectionMain.tsx
 * ───────────────────────────────────────────── */
"use client";

import type { ReactNode } from "react";
import { useLocale } from "next-intl";
import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";

/* ── 1. 구획 eyebrow 제목 ── */

export function SectionHeader({ title }: { title: string }) {
  const locale = useLocale();
  return (
    <div className="flex justify-center text-center w-full mb-4">
      {/* 영문 대문자에는 넓은 자간이 어울리지만 한글은 같은 값에서 글자가 하나씩 떨어져 보인다 */}
      <p
        className={cn(
          "text-xs md:text-sm text-accent font-cinzel uppercase font-bold",
          locale === "en" ? "tracking-[0.3em]" : "tracking-[0.06em]", /* i18n-audit-ignore — 로케일별 자간 보정 */
        )}
      >
        {title}
      </p>
    </div>
  );
}

/* ── 2. 지표 패널 뼈대 ── */

export function MetricPanel({
  title,
  description,
  tone,
  children,
}: {
  title: string;
  description: string;
  tone: string;
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-[2px] border border-white/[0.08] border-t bg-white/[0.018] px-3 py-4 md:px-5 md:py-5",
        tone,
      )}
    >
      {/* 좁은 화면에서는 제목이 넘김 단추 줄에 이미 있어 설명만 남긴다 */}
      <header className="border-b border-white/[0.06] pb-3 text-center md:min-h-20">
        <h3 className="hidden font-serif text-base font-bold text-text-primary md:block">
          {title}
        </h3>
        <p className="text-balance break-keep text-sm leading-relaxed text-text-secondary md:mt-1">
          {description}
        </p>
      </header>
      {/* 넘길 때 아래 단추가 들썩이지 않도록 남는 높이를 본문이 먹는다 */}
      <div className="mt-4 flex flex-1 flex-col">{children}</div>
    </section>
  );
}

/* ── 3. 모바일 비교 진입 단추 ── */

export function MobileMatchButton({
  label,
  onClick,
  className,
}: {
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "mt-3 flex w-full items-center justify-center gap-1.5 rounded-md border border-accent/45 bg-accent/[0.1] px-3 py-2.5 text-center text-sm font-bold text-accent hover:border-accent hover:bg-accent/[0.18] active:bg-accent/[0.24] md:hidden",
        className,
      )}
    >
      <span className="min-w-0 truncate">{label}</span>
      <ArrowRight size={14} aria-hidden className="shrink-0 opacity-70" />
    </button>
  );
}
