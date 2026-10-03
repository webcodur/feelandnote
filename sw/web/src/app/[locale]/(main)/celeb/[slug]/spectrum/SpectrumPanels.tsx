/* ─────────────────────────────────────────────
 * [celeb 상세] spectrum — 수치 패널 뼈대와 비교 묶음 진입 단추
 * - 목차 위치: spectrum(분석 구획, service key `spectrum` / sectionId `analysis`)
 * - 데이터: 제목·클릭 동작·패널 자식·비교 버튼 props
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

export function MetricHeading({ title, onClick, ariaLabel }: { title: string; onClick?: () => void; ariaLabel?: string }) {
  return (
    <h4 className="mb-2 text-center text-sm font-semibold text-text-primary sm:text-sm">
      {onClick ? (
        <button type="button" aria-label={ariaLabel} aria-haspopup="dialog" onClick={onClick} className="min-h-8 w-full rounded-control hover:bg-bg-raised hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">{title}</button>
      ) : title}
    </h4>
  );
}

export function ComparisonGroup({ title, columns, children }: { title: string; columns: 2 | 4 | 6; children: ReactNode }) {
  return (
    <section aria-label={title} className="pt-1">
      <div className={cn("grid grid-cols-2 gap-2", columns === 4 && "sm:grid-cols-4", columns === 6 && "sm:grid-cols-3 lg:grid-cols-6")}>{children}</div>
    </section>
  );
}

export function MetricPanel({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <section className="flex min-w-0 flex-col">
      <div className="flex flex-1 flex-col">{children}</div>
    </section>
  );
}

/* ── 3. 비교 묶음 겹창 진입 단추 ── */

export function MatchGroupsButton({
  label,
  onClick,
  className,
  disabled = false,
}: {
  label: string;
  onClick: () => void;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-haspopup="dialog"
      className={cn(
        "relative mt-3 flex min-h-11 w-full items-center justify-center rounded-control border border-line px-8 py-2 text-center text-sm text-text-secondary enabled:hover:border-line-strong enabled:hover:bg-bg-raised enabled:hover:text-text-primary enabled:active:bg-bg-raised disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        className,
      )}
    >
      <span className="min-w-0 truncate">{label}</span>
      <ArrowRight size={14} aria-hidden className="absolute end-3 top-1/2 -translate-y-1/2 opacity-70" />
    </button>
  );
}
