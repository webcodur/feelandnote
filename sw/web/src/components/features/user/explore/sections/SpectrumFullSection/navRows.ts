/*
  파일명: /components/features/user/explore/sections/SpectrumFullSection/navRows.ts
  기능: 스펙트럼 선택기 줄(범주·축)
  책임: 범주 줄과 축 줄을 만든다. 본문(클라이언트)과 대기 화면(서버)이 같은 줄을 그리도록 훅 없이 둔다.
        대기 화면은 선택 함수 없이 부른다 — 자료가 오면 본문이 같은 자리에 같은 줄을 다시 세운다.
*/ // ------------------------------

import type { RankingNavRow } from "../../figureRankingBoard/FigureRankingBoard";
import { GROUPS, AXIS_COLORS, AXIS_SHORT_LABELS } from "../../spectrumAxis";

interface SpectrumNavOptions {
  isEn: boolean;
  labels: { group: string; axis: string };
  activeTab: number;
  activeAxis: string;
  /** 짧은 이름이 없는 축(성향)의 전체 라벨. 넘기면 여기 없는 축은 줄에서 뺀다 */
  axisLabels?: Map<string, { ko: string; en: string }>;
  onSelectGroup?: (tab: number) => void;
  onSelectAxis?: (axis: string) => void;
}

export function buildSpectrumNavRows({
  isEn, labels, activeTab, activeAxis, axisLabels, onSelectGroup, onSelectAxis,
}: SpectrumNavOptions): RankingNavRow[] {
  const keys: readonly string[] = GROUPS[activeTab].keys;
  return [
    {
      id: "group",
      label: labels.group,
      items: GROUPS.map((group, i) => ({ id: String(i), name: isEn ? group.en : group.ko })),
      activeId: String(activeTab),
      onSelect: onSelectGroup && ((id) => onSelectGroup(Number(id))),
    },
    {
      id: "axis",
      label: labels.axis,
      /* 축 칩은 축 고유색을 물려받아 고른 칩이 그 색으로 그려진다 */
      items: keys.flatMap((key) => {
        const label = AXIS_SHORT_LABELS[key] ?? axisLabels?.get(key);
        if (!label || (axisLabels && !axisLabels.has(key))) return [];
        return [{ id: key, name: isEn ? label.en : label.ko, color: AXIS_COLORS[key] ?? "#d4af37" }];
      }),
      activeId: activeAxis,
      onSelect: onSelectAxis,
    },
  ];
}
