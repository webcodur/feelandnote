/*
  파일명: /components/features/user/explore/sections/TimelineSection/sections/EraBanner.tsx
  기능: 시대 구분 배너
  책임: 시대 정보 + 인물 수 표시, 클릭 시 접기/펼치기 토글.
*/ // ------------------------------

"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import type { Locale } from "@/types/locale";
import type { EraInfo } from "../utils";
import { useTranslations } from "next-intl";

interface Props {
  era: EraInfo;
  count: number;
  isCollapsed: boolean;
  locale: Locale;
  onToggle: (eraKey: string) => void;
}

export default function EraBanner({ era, count, isCollapsed, onToggle }: Props) {
  const t = useTranslations("explore.ui.timeline");
  return (
    <button
      type="button"
      onClick={() => onToggle(era.key)}
      className="relative my-6 first:mt-2 w-full group/era"
    >
      <div className="w-full rounded-xl bg-gradient-to-r from-bg-card/90 via-bg-card/60 to-bg-card/90 border border-accent/15 group-hover/era:border-accent/35 transition-colors overflow-hidden">
        {/* 상단 그라데이션 라인 */}
        <div className="h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
        <div className="flex items-center justify-between px-5 py-3.5">
          {/* 왼쪽: 시대 정보 */}
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <span className="text-base md:text-lg font-bold text-accent tracking-wider">
                {era.label}
              </span>
              <span className="text-[11px] text-text-secondary/50 tracking-wide uppercase">
                {era.labelEn}
              </span>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <span className="text-sm text-text-secondary font-mono">
              {era.range}
            </span>
          </div>
          {/* 오른쪽: 인물 수 + 접기/펼치기 */}
          <div className="flex items-center gap-3">
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-semibold text-text-primary">
                {count}
              </span>
              <span className="text-xs text-text-secondary/50">
                {t("figureCount", { count })}
              </span>
            </div>
            {isCollapsed ? (
              <ChevronDown size={18} className="text-text-secondary group-hover/era:text-accent transition-colors" />
            ) : (
              <ChevronUp size={18} className="text-text-secondary group-hover/era:text-accent transition-colors" />
            )}
          </div>
        </div>
        {/* 하단 그라데이션 라인 */}
        <div className="h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
      </div>
    </button>
  );
}
