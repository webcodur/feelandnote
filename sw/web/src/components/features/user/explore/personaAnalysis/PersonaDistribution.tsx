/*
  파일명: /components/features/user/explore/personaAnalysis/PersonaDistribution.tsx
  기능: 성향 분포 화면 (정규분포 느낌의 비즈웜)
  책임: 성향 항목을 가로축으로 펼치고 영향력 높은 인물을 값 위치에 쌓아 종 모양으로 표시.
        검색·근거 모달은 하위 컴포넌트에 위임.
*/ // ------------------------------

"use client";

import { useState } from "react";
import { TENDENCY_KEYS, TENDENCY_LABELS } from "@/lib/persona/constants";
import type { PersonaPerson } from "@/actions/persona/getPersonaDistribution";
import { getPersonaReason } from "@/actions/persona/getPersonaReason";
import { AXIS_BOTTOM, AXIS_POLE_COLORS, DOT, GAP_Y, MAX_STACK, STEP, initials, lerpColor } from "./constants";
import PersonaSearch from "./PersonaSearch";
import PersonaReasonModal from "./PersonaReasonModal";

interface PersonaDistributionProps {
  people: PersonaPerson[];
  /** 분포에 표시할 최소 영향력 (검색은 이 값과 무관하게 전체) */
  minInfluence?: number;
}

export default function PersonaDistribution({ people, minInfluence = 40 }: PersonaDistributionProps) {
  const [tab, setTab] = useState(0);
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<{ person: PersonaPerson; axis: (typeof TENDENCY_KEYS)[number] } | null>(null);
  const [reason, setReason] = useState<{ ko: string; en: string } | null>(null);
  const [reasonLoading, setReasonLoading] = useState(false);

  const axis = TENDENCY_KEYS[tab];
  const [neg, pos] = TENDENCY_LABELS[axis];
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
  const placed = visible
    .map((p) => ({ p, v: p.stats[axis] ?? 0 }))
    .sort((a, b) => a.v - b.v)
    .map(({ p, v }) => {
      const key = Math.round(v / STEP);
      const stack = stackByBucket.get(key) ?? 0;
      stackByBucket.set(key, stack + 1);
      return { p, v, stack };
    });

  let maxStack = 0;
  stackByBucket.forEach((c) => (maxStack = Math.max(maxStack, c)));
  const visibleStack = Math.min(maxStack, MAX_STACK);
  const height = visibleStack * (DOT + GAP_Y) + AXIS_BOTTOM + 28;

  // 칸별 초과 인원 (+N 배지용)
  const overflow = [...stackByBucket]
    .filter(([, total]) => total > MAX_STACK)
    .map(([key, total]) => ({ key, extra: total - MAX_STACK }));

  return (
    <div className="space-y-6">
      <PersonaSearch people={people} onSelect={select} />

      {/* 성향 항목 탭 */}
      <div className="flex flex-wrap justify-center gap-2">
        {TENDENCY_KEYS.map((k, i) => {
          const [n, p] = TENDENCY_LABELS[k];
          const active = i === tab;
          return (
            <button
              key={k}
              type="button"
              onClick={() => setTab(i)}
              className={
                "px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 " +
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
        <span className="pointer-events-none absolute bottom-2 left-3 text-base font-extrabold tracking-tight" style={{ color: colors.neg }}>{neg}</span>
        <span className="pointer-events-none absolute bottom-2 right-3 text-base font-extrabold tracking-tight" style={{ color: colors.pos }}>{pos}</span>
        <span className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-text-secondary/50">중간</span>

        {/* 인물 점 (칸당 MAX_STACK까지만) */}
        {placed.filter((d) => d.stack < MAX_STACK).map(({ p, v, stack }) => {
          const left = v + 50; // -50~50 → 0~100%
          const bottom = AXIS_BOTTOM + 2 + stack * (DOT + GAP_Y);
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
                  width: DOT,
                  height: DOT,
                  borderColor: lerpColor(colors.neg, colors.pos, (v + 50) / 100),
                }}
              >
                {p.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.avatar_url} alt={p.nickname} className="size-full object-cover" />
                ) : (
                  <div className="flex size-full items-center justify-center text-[10px] font-bold text-text-secondary">
                    {initials(p.nickname)}
                  </div>
                )}
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
          const left = Math.max(0, Math.min(100, key * STEP + 50));
          const bottom = AXIS_BOTTOM + 2 + MAX_STACK * (DOT + GAP_Y);
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

      <p className="text-center text-xs text-text-secondary/60">
        영향력 {minInfluence} 이상 {visible.length}명 · 가운데가 두툼할수록 흔한 성향입니다 · 그 외 인물은 위에서 검색
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
