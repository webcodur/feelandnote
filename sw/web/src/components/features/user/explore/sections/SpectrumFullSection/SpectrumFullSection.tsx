/*
  파일명: /components/features/user/explore/sections/SpectrumFullSection/SpectrumFullSection.tsx
  기능: 비범한 기록가 전체 보기
  책임: 고른 범주·축을 기억하고, 그 축의 극단값과 기질의 서재를 인물 순위판(FigureRankingBoard)의
        content로 바꾼다. 화면 배치는 순위판이 쥔다 — 여기는 선택 상태와 변환만 한다.
        덕목·능력 축은 시상대, 성향 축은 양극 매치업으로 넘긴다(반대 극 자료가 없으면 시상대).
*/ // ------------------------------

"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { SpectrumExtremeEntry } from "@/actions/home/getSpectrumExtremes";
import type { AxisLibraryWork, SpectrumAxisLibrary } from "@/actions/spectrum/getSpectrumAxisLibraries";
import DeveloperCommerceFallback from "@/components/features/commerce/DeveloperCommerceFallback";
import { getCelebProfileUrl } from "@/lib/url";
import FigureRankingBoard, { type FigureRankingBoardContent } from "../../figureRankingBoard/FigureRankingBoard";
import type { RankingShelfGroup } from "../../figureRankingBoard/RankingShelf";
import { GROUPS, AXIS_COLORS, AXIS_SHORT_LABELS, getAxisSides } from "../../spectrumAxis";
import { buildSpectrumNavRows } from "./navRows";

interface SpectrumFullSectionProps {
  entries: SpectrumExtremeEntry[];
  libraries?: SpectrumAxisLibrary[];
}

const DISPOSITION_TAB = 3;

export default function SpectrumFullSection({ entries, libraries = [] }: SpectrumFullSectionProps) {
  const locale = useLocale();
  const t = useTranslations("explore.spectrum");
  const td = useTranslations("explore.ui.spectrumDistribution");
  const [activeTab, setActiveTab] = useState(0);
  const [activeAxis, setActiveAxis] = useState<string | null>(null);

  if (entries.length === 0) return null;

  const isEn = locale === "en";
  const entryMap = new Map(entries.map((e) => [e.axis as string, e]));
  const groupKeys: readonly string[] = GROUPS[activeTab].keys;
  /* 고른 축이 이 범주에 없으면(범주를 막 바꿨으면) 범주의 첫 축을 편다 */
  const entry = (activeAxis && groupKeys.includes(activeAxis) ? entryMap.get(activeAxis) : undefined)
    ?? groupKeys.map((key) => entryMap.get(key)).find(Boolean);
  if (!entry) return null;

  const color = AXIS_COLORS[entry.axis] ?? "#d4af37";
  const isDisposition = activeTab === DISPOSITION_TAB;
  const shortLabel = AXIS_SHORT_LABELS[entry.axis];
  const chip = shortLabel ? (isEn ? shortLabel.en : shortLabel.ko) : undefined;
  const [positivePole, negativePole] = getAxisSides(entry.label, locale);
  const topPercent = (percentile: number) => td("topPercent", { percentile: percentile < 0.1 ? "<0.1" : percentile });

  const runnersUp = entry.runnersUp.map((r) => ({
    href: getCelebProfileUrl(r),
    nickname: r.nickname,
    nickname_en: r.nickname_en,
    avatarUrl: r.avatar_url,
    value: r.score,
  }));
  const champion = {
    href: getCelebProfileUrl(entry.celeb),
    nickname: entry.celeb.nickname,
    nickname_en: entry.celeb.nickname_en,
    avatarUrl: entry.celeb.avatar_url,
    value: entry.score,
    sub: topPercent(entry.percentile),
    note: isEn ? entry.reason.en : entry.reason.ko,
  };

  const library = libraries.find((axisLibrary) => axisLibrary.axis === entry.axis);
  const toWorks = (works: AxisLibraryWork[]) => works.map((work) => ({
    contentId: work.content_id,
    type: work.type,
    title: isEn && work.title_en ? work.title_en : work.title,
    creator: isEn && work.creator_en ? work.creator_en : work.creator,
    thumbnail: isEn && work.thumbnail_en ? work.thumbnail_en : work.thumbnail_url,
  }));
  const shelfGroups: RankingShelfGroup[] = library ? [
    {
      id: "high",
      title: t("shelfPole", { pole: positivePole }),
      accented: true,
      works: toWorks(library.high),
    },
    {
      id: "low",
      title: t("shelfPole", { pole: negativePole }),
      works: toWorks(library.low),
    },
  ].filter((group) => group.works.length > 0) : [];

  const content: FigureRankingBoardContent = {
    head: {
      chip,
      title: isEn ? entry.label.en : entry.label.ko,
      description: isDisposition
        ? t("rankDescPoles", { positive: positivePole, negative: negativePole })
        : t("rankDesc", { label: chip ?? (isEn ? entry.label.en : entry.label.ko) }),
    },
    ranking: isDisposition && entry.opposing
      ? {
          kind: "versus",
          /* 왼쪽이 음극, 오른쪽이 양극. 음극 percentile은 「위에 있는 사람 비율」(극단자≈100)이라 표시용 상위%로 뒤집는다 */
          left: {
            chip: negativePole,
            nickname: entry.opposing.celeb.nickname,
            nickname_en: entry.opposing.celeb.nickname_en,
            avatarUrl: entry.opposing.celeb.avatar_url,
            value: entry.opposing.score,
            sub: topPercent(Math.max(0, Math.min(100, 100 - entry.opposing.percentile))),
            note: isEn ? entry.opposing.reason.en : entry.opposing.reason.ko,
            href: getCelebProfileUrl(entry.opposing.celeb),
          },
          right: { chip: positivePole, ...champion },
          restLabel: `${positivePole} ${td("runnersUp")}`,
          rest: runnersUp,
        }
      : {
          kind: "podium",
          /* 시상대는 1위만 상위%·호칭을 담는다 */
          items: [
            { ...champion, subtitle: isEn ? (entry.celeb.title_en || entry.celeb.profession) : (entry.celeb.title || entry.celeb.profession) },
            ...runnersUp,
          ],
        },
    /* 서가의 제목·부제는 순위판이 정한다. 여러 매체가 섞여 매체 이름은 넘기지 않는다 */
    shelf: shelfGroups.length > 0 ? { groups: shelfGroups } : undefined,
    shelfFallback: (
      <DeveloperCommerceFallback target={{ title: entry.label.ko.replace(" vs ", " "), type: "TOPIC" }} placement="spectrum-axis" />
    ),
  };

  const navRows = buildSpectrumNavRows({
    isEn,
    labels: { group: t("groupNav"), axis: t("axisNav") },
    activeTab,
    activeAxis: entry.axis,
    axisLabels: new Map(entries.map((e) => [e.axis as string, e.label])),
    onSelectGroup: (tab) => { setActiveTab(tab); setActiveAxis(null); },
    onSelectAxis: setActiveAxis,
  });

  return <FigureRankingBoard navRows={navRows} accent={color} stageKey={entry.axis} content={content} />;
}
