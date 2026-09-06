/*
  파일명: /components/features/user/explore/spectrumAnalysis/SpectrumDistribution.tsx
  기능: 성향 분포 화면 (정규분포 느낌의 비즈웜)
  책임: 성향 항목을 가로축으로 펼치고 영향력 높은 인물을 값 위치에 쌓아 종 모양으로 표시.
        폭 640px 미만에서는 아바타 대신 구간 막대로 그리고, 선택 구간의 인물 목록을 차트 아래 상시 표시한다.
        검색·근거 모달·구간 목록은 하위 컴포넌트에 위임.
*/ // ------------------------------

"use client";

import { useEffect, useRef, useState } from "react";
import { TENDENCY_KEYS } from "@/lib/spectrum/constants";
import type { SpectrumPerson } from "@/actions/spectrum/getSpectrumDistribution";
import { getSpectrumReason } from "@/actions/spectrum/getSpectrumReason";
import { AXIS_POLE_COLORS, BAR_STEP, COMPACT_DOT, DOT, MAX_STACK, STEP, SPECTRUM_GUIDE_CLASS } from "./constants";
import SpectrumPlot from "./SpectrumPlot";
import SpectrumTabs from "./SpectrumTabs";
import SpectrumSearch from "./SpectrumSearch";
import SpectrumReasonModal from "./SpectrumReasonModal";
import SpectrumBucketPanel from "./SpectrumBucketPanel";
import { useTranslations } from "next-intl";

interface SpectrumDistributionProps {
  people: SpectrumPerson[];
  /** 분포에 표시할 최소 영향력. 전체 인물 검색은 필요할 때 서버에서 별도로 수행한다. */
  minInfluence?: number;
}

export default function SpectrumDistribution({ people, minInfluence = 40 }: SpectrumDistributionProps) {
  const t = useTranslations("explore.ui.spectrumDistribution");
  const [tab, setTab] = useState(0);
  const [selected, setSelected] = useState<{ person: SpectrumPerson; axis: (typeof TENDENCY_KEYS)[number] } | null>(null);
  const [reason, setReason] = useState<{ ko: string; en: string } | null>(null);
  const [reasonLoading, setReasonLoading] = useState(false);
  const [selKey, setSelKey] = useState<number | null>(null); // 모바일에서 선택된 구간 (null이면 최다 인원 구간)

  // 차트 형태·높이는 CSS가 첫 페인트부터 정하고 실측은 점을 배치할 때만 쓴다.
  const chartRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number | null>(null);
  useEffect(() => {
    const el = chartRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 아바타 수백 개는 640px 미만에서 물리적으로 안 들어간다 → 막대 분포 + 터치 목록
  const mobile = width !== null && width < 640;
  const dot = width !== null && width < 768 ? COMPACT_DOT : DOT;
  // 칸 픽셀 폭이 점 지름의 80% 이상이 되는 최소 값 폭 (비즈웜 특유의 살짝 겹침은 유지)
  const step = Math.max(STEP, Math.ceil((dot * 80) / Math.max(width ?? 1024, 1)));

  const axis = TENDENCY_KEYS[tab];
  const neg = t(`axes.${axis}.negative`);
  const pos = t(`axes.${axis}.positive`);
  const colors = AXIS_POLE_COLORS[axis];

  // 클릭 시점에 보고 있던 성향 항목 기준으로 모달을 띄우고, 그 항목 근거를 따로 불러온다
  const select = (person: SpectrumPerson) => {
    setSelected({ person, axis });
    setReason(null);
    setReasonLoading(true);
    getSpectrumReason(person.id, axis)
      .then((r) => setReason(r))
      .catch((err) => console.error("[SpectrumDistribution] 근거 로딩 실패:", err))
      .finally(() => setReasonLoading(false));
  };

  // 분포: 영향력 임계 이상만, 값 작은 순으로 쌓기 (비즈웜)
  const visible = people.filter((p) => p.influence >= minInfluence);
  const stackByBucket = new Map<number, number>();
  const placed = (mobile ? [] : visible)
    .map((p) => ({ p, v: p.stats[axis] ?? 0 }))
    .sort((a, b) => a.v - b.v)
    .map(({ p, v }) => {
      const key = Math.round(v / step);
      const stack = stackByBucket.get(key) ?? 0;
      stackByBucket.set(key, stack + 1);
      return { p, v, stack };
    });

  // 칸별 초과 인원 (+N 배지용)
  const overflow = [...stackByBucket]
    .filter(([, total]) => total > MAX_STACK)
    .map(([key, total]) => ({ key, extra: total - MAX_STACK }));

  // 모바일: 구간(BAR_STEP)별 인원 막대
  const barBuckets = new Map<number, { p: SpectrumPerson; v: number }[]>();
  visible.forEach((p) => {
    const v = p.stats[axis] ?? 0;
    const key = Math.round(v / BAR_STEP);
    const arr = barBuckets.get(key) ?? [];
    arr.push({ p, v });
    barBuckets.set(key, arr);
  });
  let maxBar = 0;
  let tallestKey: number | null = null;
  barBuckets.forEach((arr, key) => {
    if (arr.length > maxBar) {
      maxBar = arr.length;
      tallestKey = key;
    }
  });

  // 선택 구간 — 지정이 없거나(축 전환 직후) 그 구간이 비면 최다 인원 구간으로
  const activeKey = selKey !== null && barBuckets.has(selKey) ? selKey : tallestKey;
  const bucketKeys = [...barBuckets.keys()].sort((a, b) => a - b);
  const activeIdx = activeKey === null ? -1 : bucketKeys.indexOf(activeKey);

  // 패널 헤더 라벨 — 구간 중심값 기준 쪽 이름 + 값 범위
  const fmt = (n: number) => (n > 0 ? `+${n}` : `${n}`);
  const bucketCenter = (activeKey ?? 0) * BAR_STEP;
  const bucketLabel = `${bucketCenter > 0 ? pos : bucketCenter < 0 ? neg : t("middle")} ${fmt(Math.max(-50, bucketCenter - 2))} ~ ${fmt(Math.min(50, bucketCenter + 2))}`;
  const bucketColor = bucketCenter > 0 ? colors.pos : bucketCenter < 0 ? colors.neg : undefined;

  return (
    <div ref={chartRef} className="@container space-y-6">
      <SpectrumSearch onSelect={select} />

      {/* 성향 항목 탭 — 모바일 2×2 격자, 넓은 화면 한 줄 */}
      <SpectrumTabs activeIndex={tab} onChange={(index) => { setTab(index); setSelKey(null); }} />

      <SpectrumPlot axis={axis} dot={dot} step={step} placed={placed} overflow={overflow} barBuckets={barBuckets} maxBar={maxBar} activeKey={activeKey} setSelKey={setSelKey} select={select} />

      {/* 모바일: 선택 구간 인물 목록 — 차트 아래 상시 표시, ◀▶로 이웃 구간 이동 */}
      <div className="@min-[640px]:hidden">
        <SpectrumBucketPanel
          items={activeKey === null ? [] : barBuckets.get(activeKey) ?? []}
          label={bucketLabel}
          labelColor={bucketColor}
          negLabel={neg}
          posLabel={pos}
          colors={colors}
          hasPrev={activeIdx > 0}
          hasNext={activeIdx >= 0 && activeIdx < bucketKeys.length - 1}
          onPrev={() => setSelKey(bucketKeys[activeIdx - 1])}
          onNext={() => setSelKey(bucketKeys[activeIdx + 1])}
          onSelect={select}
        />
      </div>

      <p className={SPECTRUM_GUIDE_CLASS}>
        {t("guide", { influence: minInfluence, count: visible.length })}
      </p>

      {selected && (
        <SpectrumReasonModal
          person={selected.person}
          axis={selected.axis}
          reason={reason}
          loading={reasonLoading}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
