"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { SpectrumPerson } from "@/actions/spectrum/getSpectrumDistribution";
import type { TendencyKey } from "@/lib/spectrum/constants";
import { AXIS_BOTTOM, AXIS_POLE_COLORS, BAR_AREA, BAR_STEP, GAP_Y, MAX_STACK, SPECTRUM_CHART_CLASS, SPECTRUM_CHART_STYLE, lerpColor } from "./constants";
import FadeAvatar from "./FadeAvatar";

interface Props {
  axis: TendencyKey;
  dot: number;
  step: number;
  placed: { p: SpectrumPerson; v: number; stack: number }[];
  overflow: { key: number; extra: number }[];
  barBuckets: Map<number, { p: SpectrumPerson; v: number }[]>;
  maxBar: number;
  activeKey: number | null;
  setSelKey: (key: number) => void;
  select: (person: SpectrumPerson) => void;
}

export default function SpectrumPlot({ axis, dot, step, placed, overflow, barBuckets, maxBar, activeKey, setSelKey, select }: Props) {
  const locale = useLocale();
  const t = useTranslations("explore.ui.spectrumDistribution");
  const [hovered, setHovered] = useState<string | null>(null);
  const displayName = (person: SpectrumPerson) => locale === "en" ? (person.nickname_en || person.nickname) : person.nickname;
  const neg = t(`axes.${axis}.negative`);
  const pos = t(`axes.${axis}.positive`);
  const colors = AXIS_POLE_COLORS[axis];

  return (
      <div
        className={SPECTRUM_CHART_CLASS}
        style={SPECTRUM_CHART_STYLE}
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
        {[...barBuckets]
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
                  aria-label={`${key * BAR_STEP > 0 ? pos : neg} ${Math.abs(key * BAR_STEP)} · ${t("bucketCount", { count: arr.length })}`}
                  aria-pressed={active}
                  className={"absolute z-10 flex -translate-x-1/2 items-end justify-center hover:bg-white/10 @min-[640px]:hidden " + (active ? "bg-white/5" : "")}
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
              aria-label={displayName(p)}
              className="absolute hidden -translate-x-1/2 cursor-pointer @min-[640px]:block"
              style={{ left: `${left}%`, bottom: `${bottom}px`, zIndex: isHover ? 20 : 10 }}
            >
              <div
                className={
                  "overflow-hidden rounded-full border-2 bg-bg-card " +
                  (isHover ? "shadow-lg ring-2 ring-accent/60" : "")
                }
                style={{
                  width: dot,
                  height: dot,
                  borderColor: lerpColor(colors.neg, colors.pos, (v + 50) / 100),
                }}
              >
                <FadeAvatar src={p.avatar_url} name={displayName(p)} blurDissolve />
              </div>
              {isHover && (
                <div className="absolute bottom-full left-1/2 z-30 mb-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-bg-card px-2 py-1 text-xs shadow-lg">
                  <span className="font-bold text-text-primary">{displayName(p)}</span>
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
              className="pointer-events-none absolute hidden -translate-x-1/2 rounded-full border border-border/60 bg-bg-card px-1.5 py-0.5 text-[10px] font-bold text-text-secondary @min-[640px]:block"
              style={{ left: `${left}%`, bottom: `${bottom}px` }}
            >
              +{extra}
            </div>
          );
        })}
      </div>
  );
}
