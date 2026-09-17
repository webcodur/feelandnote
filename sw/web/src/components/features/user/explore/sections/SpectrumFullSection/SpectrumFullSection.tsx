/*
  파일명: /components/features/user/explore/sections/SpectrumFullSection/SpectrumFullSection.tsx
  기능: 비범한 기록가 전체 보기
  책임: spectrum 4그룹 탭 전환 + 축 네비게이션 + 축별 시상대·순위 표시.
*/ // ------------------------------

"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { SpectrumExtremeEntry } from "@/actions/home/getSpectrumExtremes";
import type { SpectrumAxisLibrary } from "@/actions/spectrum/getSpectrumAxisLibraries";
import { GROUPS, AXIS_COLORS, AXIS_SHORT_LABELS } from "../../spectrumAxis";
import ExploreNav, { type ExploreNavRow } from "@/components/shared/ExploreNav";
import RankingStage from "@/components/shared/RankingStage";
import AxisCard from "./sections/AxisCard";
import AxisLibraryPanel from "./sections/AxisLibraryPanel";
import DispositionCard from "./sections/DispositionCard";

interface SpectrumFullSectionProps {
  entries: SpectrumExtremeEntry[];
  libraries?: SpectrumAxisLibrary[];
}

export default function SpectrumFullSection({ entries, libraries = [] }: SpectrumFullSectionProps) {
  const locale = useLocale();
  const t = useTranslations("explore.spectrum");
  const [activeTab, setActiveTab] = useState(0);
  const [activeAxisIdx, setActiveAxisIdx] = useState(0);

  if (entries.length === 0) return null;

  const entryMap = new Map(entries.map(e => [e.axis, e]));
  const currentGroup = GROUPS[activeTab];
  const currentEntries = currentGroup.keys
    .map(k => entryMap.get(k))
    .filter(Boolean) as SpectrumExtremeEntry[];

  const isDispositions = activeTab === 3;
  const activeEntry = currentEntries[activeAxisIdx];
  if (!activeEntry) return null;

  const isEn = locale === "en";
  const color = AXIS_COLORS[activeEntry.axis] ?? "#d4af37";

  /* 범주·축 두 줄 — 신화 탐색·세력도감과 같은 공용 선택기(ExploreNav)의 네모 칩으로 고른다.
     축 칩은 축 고유색을 물려받아 고른 칩이 그 색으로 그려진다 */
  const navRows: ExploreNavRow[] = [
    {
      id: "group",
      label: t("groupNav"),
      shape: "square",
      items: GROUPS.map((group, i) => ({ id: String(i), name: isEn ? group.en : group.ko })),
      activeId: String(activeTab),
      onSelect: (id) => { setActiveTab(Number(id)); setActiveAxisIdx(0); },
    },
    {
      id: "axis",
      label: t("axisNav"),
      shape: "square",
      items: currentGroup.keys.flatMap((k, idx) => {
        const e = entryMap.get(k);
        if (!e) return [];
        return [{
          id: String(idx),
          name: isEn ? (AXIS_SHORT_LABELS[k]?.en || e.label.en) : (AXIS_SHORT_LABELS[k]?.ko || e.label.ko),
          color: AXIS_COLORS[k] ?? "#d4af37",
        }];
      }),
      activeId: String((currentGroup.keys as readonly string[]).indexOf(activeEntry.axis)),
      onSelect: (id) => { setActiveAxisIdx(Number(id)); },
    },
  ];

  /* 축 머리 칩은 짧은 축 이름이 있는 축(덕목·능력)만 단다 — 성향은 전체 라벨이 이미 두 극을 말한다 */
  const shortLabel = AXIS_SHORT_LABELS[activeEntry.axis]
    ? (isEn ? AXIS_SHORT_LABELS[activeEntry.axis].en : AXIS_SHORT_LABELS[activeEntry.axis].ko)
    : null;

  return (
    <div className="space-y-8">
      <ExploreNav rows={navRows} />

      {/* 무대 — 축 머리·시상대·순위를 한 프레임에 묶는다(공용 RankingStage, 축색 accent).
          축이 바뀌면 무대를 새로 그린다 */}
      <RankingStage key={activeEntry.axis} accent={color} className="animate-hero-fade-in">
        <div className="relative px-4 py-6 sm:px-6 md:px-10 md:py-10">
          {/* 축 머리 */}
          <header className="flex flex-wrap items-baseline justify-center gap-x-3 gap-y-1.5 text-center">
            {shortLabel && (
              <span
                className="self-center rounded border px-1.5 py-0.5 text-[10px] font-black uppercase tracking-widest"
                style={{ borderColor: `${color}55`, color }}
              >
                {shortLabel}
              </span>
            )}
            <h2 className="font-serif text-2xl font-bold text-text-primary md:text-3xl">
              {isEn ? activeEntry.label.en : activeEntry.label.ko}
            </h2>
          </header>

          {/* 순위 — 덕목·능력은 시상대+순위 행, 성향은 양극 매치업+순위 행 */}
          <div className="mt-8 md:mt-10">
            {isDispositions
              ? <DispositionCard entry={activeEntry} locale={locale} color={color} />
              : <AxisCard entry={activeEntry} locale={locale} color={color} />
            }
          </div>
        </div>
      </RankingStage>

      {/* 기질의 서재 — 이 축의 극단 집단이 공통으로 감상한 작품 */}
      <AxisLibraryPanel
        library={libraries.find((axisLibrary) => axisLibrary.axis === activeEntry.axis)}
        entry={activeEntry}
        isDisposition={isDispositions}
        locale={locale}
        color={color}
      />
    </div>
  );
}
