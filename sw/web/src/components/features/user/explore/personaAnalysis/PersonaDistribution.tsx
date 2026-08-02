/*
  파일명: /components/features/user/explore/personaAnalysis/PersonaDistribution.tsx
  기능: 성향 분포 화면 (정규분포 느낌의 비즈웜)
  책임: 성향 항목을 가로축으로 펼치고 영향력 높은 인물을 값 위치에 쌓아 종 모양으로 표시.
        폭 640px 미만에서는 아바타 대신 구간 막대로 그리고, 선택 구간의 인물 목록을 차트 아래 상시 표시한다.
        검색·근거 모달·구간 목록은 하위 컴포넌트에 위임.
*/ // ------------------------------

"use client";

import { useEffect, useRef, useState } from "react";
import { TENDENCY_KEYS } from "@/lib/persona/constants";
import type { PersonaPerson } from "@/actions/persona/getPersonaDistribution";
import { getPersonaReason } from "@/actions/persona/getPersonaReason";
import { AXIS_BOTTOM, AXIS_POLE_COLORS, BAR_AREA, BAR_STEP, DOT, GAP_Y, MAX_STACK, STEP, lerpColor } from "./constants";
import FadeAvatar from "./FadeAvatar";
import PersonaSearch from "./PersonaSearch";
import PersonaReasonModal from "./PersonaReasonModal";
import PersonaBucketPanel from "./PersonaBucketPanel";
import { useTranslations } from "next-intl";

interface PersonaDistributionProps {
  people: PersonaPerson[];
  /** 분포에 표시할 최소 영향력 (검색은 이 값과 무관하게 전체) */
  minInfluence?: number;
}

export default function PersonaDistribution({ people, minInfluence = 40 }: PersonaDistributionProps) {
  const t = useTranslations("explore.ui.personaDistribution");
  const [tab, setTab] = useState(0);
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<{ person: PersonaPerson; axis: (typeof TENDENCY_KEYS)[number] } | null>(null);
  const [reason, setReason] = useState<{ ko: string; en: string } | null>(null);
  const [reasonLoading, setReasonLoading] = useState(false);
  const [selKey, setSelKey] = useState<number | null>(null); // 모바일에서 선택된 구간 (null이면 최다 인원 구간)

  // 컨테이너 실제 폭 실측 — 좁은 화면에서는 아바타 나열 대신 구간 막대로 전환한다
  const chartRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(1024);
  useEffect(() => {
    const el = chartRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 아바타 수백 개는 640px 미만에서 물리적으로 안 들어간다 → 막대 분포 + 터치 목록
  const mobile = width < 640;
  const dot = width < 768 ? 32 : DOT;
  // 칸 픽셀 폭이 점 지름의 80% 이상이 되는 최소 값 폭 (비즈웜 특유의 살짝 겹침은 유지)
  const step = Math.max(STEP, Math.ceil((dot * 80) / Math.max(width, 1)));

  const axis = TENDENCY_KEYS[tab];
  const neg = t(`axes.${axis}.negative`);
  const pos = t(`axes.${axis}.positive`);
  const colors = AXIS_POLE_COLORS[axis];

  // 클릭 시점에 보고 있던 성향 항목 기준으로 모달을 띄우고, 그 항목 근거를 따로 불러온다
  const select = (person: PersonaPerson) => {
    setSelected({ person, axis });
    setReason(null);
    setReasonLoading(true);
    getPersonaReason(person.id, axis)
      .then((r) => setReason(r))
      .catch((err) => console.error("[PersonaDistribution] 근거 로딩 실패:", err))
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

  let maxStack = 0;
  stackByBucket.forEach((c) => (maxStack = Math.max(maxStack, c)));
  const visibleStack = Math.min(maxStack, MAX_STACK);

  // 칸별 초과 인원 (+N 배지용)
  const overflow = [...stackByBucket]
    .filter(([, total]) => total > MAX_STACK)
    .map(([key, total]) => ({ key, extra: total - MAX_STACK }));

  // 모바일: 구간(BAR_STEP)별 인원 막대
  const barBuckets = new Map<number, { p: PersonaPerson; v: number }[]>();
  if (mobile) {
    visible.forEach((p) => {
      const v = p.stats[axis] ?? 0;
      const key = Math.round(v / BAR_STEP);
      const arr = barBuckets.get(key) ?? [];
      arr.push({ p, v });
      barBuckets.set(key, arr);
    });
  }
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

  const height = mobile
    ? BAR_AREA + AXIS_BOTTOM + 16
    : visibleStack * (dot + GAP_Y) + AXIS_BOTTOM + 28;

  // 패널 헤더 라벨 — 구간 중심값 기준 쪽 이름 + 값 범위
  const fmt = (n: number) => (n > 0 ? `+${n}` : `${n}`);
  const bucketCenter = (activeKey ?? 0) * BAR_STEP;
  const bucketLabel = `${bucketCenter > 0 ? pos : bucketCenter < 0 ? neg : t("middle")} ${fmt(Math.max(-50, bucketCenter - 2))} ~ ${fmt(Math.min(50, bucketCenter + 2))}`;
  const bucketColor = bucketCenter > 0 ? colors.pos : bucketCenter < 0 ? colors.neg : undefined;

  return (
    <div className="space-y-6">
      <PersonaSearch people={people} onSelect={select} />

      {/* 성향 항목 탭 — 모바일 2×2 격자, 넓은 화면 한 줄 */}
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-center">
        {TENDENCY_KEYS.map((k, i) => {
          const n = t(`axes.${k}.negative`);
          const p = t(`axes.${k}.positive`);
          const active = i === tab;
          return (
            <button
              key={k}
              type="button"
              onClick={() => {
                setTab(i);
                setSelKey(null);
              }}
              className={
                "px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all duration-300 " +
                (active
                  ? "bg-accent/15 text-accent border border-accent/40"
                  : "bg-bg-card/40 text-text-secondary hover:text-text-primary hover:bg-bg-card border border-border/40 hover:border-border")
              }
            >
              {n} ↔ {p}
            </button>
          );
        })}
      </div>

      {/* 분포 */}
      <div
        ref={chartRef}
        className="relative w-full overflow-hidden rounded-2xl border border-border/50 bg-bg-card/30"
        style={{ height }}
      >
        {/* 좌→우 양극 색 그라디언트 배경 */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: `linear-gradient(to right, ${colors.neg}1f, transparent 38%, transparent 62%, ${colors.pos}1f)` }}
        />

        {/* 바닥 축선 */}
        <div className="pointer-events-none absolute inset-x-0 h-px bg-border/50" style={{ bottom: AXIS_BOTTOM }} />
        {/* 중앙 기준선 */}
        <div className="pointer-events-none absolute left-1/2 top-3 w-px -translate-x-1/2 bg-border/40" style={{ bottom: AXIS_BOTTOM }} />

        {/* 수치 눈금 */}
        {[-50, -25, 25, 50].map((tick) => (
          <span
            key={tick}
            className="pointer-events-none absolute -translate-x-1/2 text-[10px] tabular-nums text-text-secondary/40"
            style={{ left: `${tick + 50}%`, bottom: AXIS_BOTTOM - 18 }}
          >
            {tick > 0 ? `+${tick}` : tick}
          </span>
        ))}

        {/* 축 끝 라벨 — 양극 색 강조 */}
        <span className="pointer-events-none absolute bottom-2 left-3 text-sm font-extrabold tracking-tight sm:text-base" style={{ color: colors.neg }}>{neg}</span>
        <span className="pointer-events-none absolute bottom-2 right-3 text-sm font-extrabold tracking-tight sm:text-base" style={{ color: colors.pos }}>{pos}</span>
        <span className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-text-secondary/50">{t("middle")}</span>

        {/* 모바일: 구간 막대 — 터치하면 아래 목록이 그 구간으로 바뀐다 (탭 영역은 기둥 전체) */}
        {mobile &&
          [...barBuckets]
            .sort((a, b) => a[0] - b[0])
            .map(([key, arr]) => {
              // 양 끝 구간은 중심을 반 칸 안쪽으로 물려 막대가 영역 밖으로 나가지 않게 한다
              const half = BAR_STEP / 2;
              const left = Math.max(half, Math.min(100 - half, key * BAR_STEP + 50));
              const barH = Math.max(8, Math.round((arr.length / Math.max(maxBar, 1)) * BAR_AREA));
              const color = lerpColor(colors.neg, colors.pos, left / 100);
              const active = key === activeKey;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelKey(key)}
                  className={"absolute z-10 flex -translate-x-1/2 items-end justify-center " + (active ? "bg-white/5" : "")}
                  style={{ left: `${left}%`, bottom: AXIS_BOTTOM + 1, width: `${BAR_STEP}%`, height: BAR_AREA }}
                >
                  <div
                    className="w-[70%] rounded-t"
                    style={{
                      height: barH,
                      background: color,
                      opacity: active ? 1 : 0.45,
                      boxShadow: active ? `0 0 12px ${color}` : undefined,
                    }}
                  />
                </button>
              );
            })}

        {/* 인물 점 (칸당 MAX_STACK까지만) */}
        {placed.filter((d) => d.stack < MAX_STACK).map(({ p, v, stack }) => {
          const left = v + 50; // -50~50 → 0~100%
          const bottom = AXIS_BOTTOM + 2 + stack * (dot + GAP_Y);
          const isHover = hovered === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => select(p)}
              onMouseEnter={() => setHovered(p.id)}
              onMouseLeave={() => setHovered(null)}
              className="absolute -translate-x-1/2 cursor-pointer"
              style={{ left: `${left}%`, bottom: `${bottom}px`, zIndex: isHover ? 20 : 10 }}
            >
              <div
                className={
                  "overflow-hidden rounded-full border-2 bg-bg-card transition-all duration-200 " +
                  (isHover ? "scale-110 shadow-lg ring-2 ring-accent/60" : "")
                }
                style={{
                  width: dot,
                  height: dot,
                  borderColor: lerpColor(colors.neg, colors.pos, (v + 50) / 100),
                }}
              >
                <FadeAvatar src={p.avatar_url} name={p.nickname} blurDissolve />
              </div>
              {isHover && (
                <div className="absolute bottom-full left-1/2 z-30 mb-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-bg-card px-2 py-1 text-xs shadow-lg">
                  <span className="font-bold text-text-primary">{p.nickname}</span>
                  <span className="ml-1.5 text-text-secondary">
                    {v >= 0 ? pos : neg} {Math.abs(Math.round(v))}
                  </span>
                </div>
              )}
            </button>
          );
        })}

        {/* 초과 인원 +N 배지 */}
        {overflow.map(({ key, extra }) => {
          const left = Math.max(0, Math.min(100, key * step + 50));
          const bottom = AXIS_BOTTOM + 2 + MAX_STACK * (dot + GAP_Y);
          return (
            <div
              key={`ov-${key}`}
              className="pointer-events-none absolute -translate-x-1/2 rounded-full border border-border/60 bg-bg-card px-1.5 py-0.5 text-[10px] font-bold text-text-secondary"
              style={{ left: `${left}%`, bottom: `${bottom}px` }}
            >
              +{extra}
            </div>
          );
        })}
      </div>

      {/* 모바일: 선택 구간 인물 목록 — 차트 아래 상시 표시, ◀▶로 이웃 구간 이동 */}
      {mobile && activeKey !== null && (
        <PersonaBucketPanel
          items={barBuckets.get(activeKey) ?? []}
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
      )}

      <p className="text-center text-xs text-text-secondary/60">
        {t("guide", { influence: minInfluence, count: visible.length })}
      </p>

      {selected && (
        <PersonaReasonModal
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
