/*
  파일명: /components/features/user/explore/personaAnalysis/PersonaBucketPanel.tsx
  기능: 성향 분포 선택 구간 인물 목록 패널 (모바일, 차트 아래 상시 표시)
  책임: 선택된 구간의 인물을 영향력 순으로 나열, ◀▶로 이웃 구간 이동, 선택 시 콜백.
*/ // ------------------------------

"use client";

import { useLocale, useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { lerpColor } from "./constants";
import FadeAvatar from "./FadeAvatar";
import type { PersonaPerson } from "@/actions/persona/getPersonaDistribution";

interface PersonaBucketPanelProps {
  items: { p: PersonaPerson; v: number }[];
  label: string;
  labelColor?: string;
  negLabel: string;
  posLabel: string;
  colors: { neg: string; pos: string };
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onSelect: (person: PersonaPerson) => void;
}

export default function PersonaBucketPanel({ items, label, labelColor, negLabel, posLabel, colors, hasPrev, hasNext, onPrev, onNext, onSelect }: PersonaBucketPanelProps) {
  const locale = useLocale();
  const t = useTranslations("explore.ui.personaDistribution");
  const sorted = [...items].sort((a, b) => b.p.influence - a.p.influence);

  return (
    <div className="overflow-hidden rounded-2xl border border-border/50 bg-bg-card/30">
      {/* 헤더: 이웃 구간 이동 + 현재 구간 라벨 */}
      <div className="flex items-center justify-between border-b border-border/40 px-1 py-1">
        <button
          type="button"
          onClick={onPrev}
          disabled={!hasPrev}
          className="p-2 text-text-secondary hover:text-text-primary disabled:opacity-25"
          aria-label="prev"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="flex min-w-0 items-baseline gap-2">
          <span className="truncate text-sm font-bold text-text-primary" style={labelColor ? { color: labelColor } : undefined}>
            {label}
          </span>
          <span className="shrink-0 text-xs text-text-secondary">{t("bucketCount", { count: items.length })}</span>
        </div>
        <button
          type="button"
          onClick={onNext}
          disabled={!hasNext}
          className="p-2 text-text-secondary hover:text-text-primary disabled:opacity-25"
          aria-label="next"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* 인물 목록 (영향력 순) */}
      <ul className="max-h-60 space-y-0.5 overflow-y-auto scrollbar-thin p-2">
        {sorted.map(({ p, v }) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => onSelect(p)}
              className="flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-bg-card-hover"
            >
              <div
                className="size-9 shrink-0 overflow-hidden rounded-full border-2 bg-bg-card"
                style={{ borderColor: lerpColor(colors.neg, colors.pos, (v + 50) / 100) }}
              >
                <FadeAvatar src={p.avatar_url} name={p.nickname} blurDissolve />
              </div>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-text-primary">
                {locale === "en" ? (p.nickname_en || p.nickname) : p.nickname}
              </span>
              <span className="shrink-0 text-xs font-bold tabular-nums" style={{ color: v >= 0 ? colors.pos : colors.neg }}>
                {v >= 0 ? posLabel : negLabel} {Math.abs(Math.round(v))}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
