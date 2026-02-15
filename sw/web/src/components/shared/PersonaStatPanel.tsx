/*
  파일명: components/shared/PersonaStatPanel.tsx
  기능: 페르소나 스탯 탭 패널 (능력/품성/성향)
  책임: 스탯 바 + 성향 바를 탭으로 전환 표시하는 재사용 컴포넌트
*/
"use client";

import { useState, useMemo } from "react";
import {
  ABILITY_KEYS,
  INNER_VIRTUE_KEYS,
  OUTER_VIRTUE_KEYS,
  STAT_LABELS,
  TENDENCY_KEYS,
  TENDENCY_LABELS,
} from "@/lib/persona/constants";

type TabType = "ability" | "virtue" | "tendency";

const TABS: { key: TabType; label: string }[] = [
  { key: "ability", label: "능력" },
  { key: "virtue", label: "품성" },
  { key: "tendency", label: "성향" },
];

const clamp0100 = (v: number) => Math.max(0, Math.min(100, v));

// region: 스탯 바
function StatRow({ label, value }: { label: string; value: number }) {
  const score = clamp0100(value);
  return (
    <div className="grid grid-cols-[58px_1fr_56px] items-center gap-2">
      <span className="text-xs text-text-secondary">{label}</span>
      <div className="grid grid-cols-10 gap-0.5 rounded-sm bg-black/30 p-1 border border-white/10">
        {Array.from({ length: 10 }, (_, i) => {
          const segStart = i * 10;
          const fill = Math.max(0, Math.min(10, score - segStart)) / 10;
          return (
            <span key={i} className="h-2 rounded-[1px] bg-white/10 overflow-hidden">
              <span
                className="block h-full rounded-[1px] bg-[#5caeff]"
                style={{ width: `${fill * 100}%` }}
              />
            </span>
          );
        })}
      </div>
      <span className="text-xs font-mono text-right text-text-primary tabular-nums">
        {Math.round(score)}
      </span>
    </div>
  );
}

// region: 성향 바
function TendencyRow({ labels, value }: { labels: [string, string]; value: number }) {
  const clamped = Math.max(-50, Math.min(50, value));
  const point = ((clamped + 50) / 100) * 100;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[11px] text-text-secondary">
        <span>{labels[0]}</span>
        <span className="font-mono tabular-nums text-text-primary">{clamped.toFixed(1)}</span>
        <span>{labels[1]}</span>
      </div>
      <div className="relative h-2 rounded-sm border border-white/10 bg-black/30">
        <span className="absolute left-1/2 top-0 bottom-0 w-px bg-white/20" />
        <span
          className="absolute top-1/2 h-3 w-3 rounded-full border border-white/40 bg-[#5caeff]"
          style={{ left: `${point}%`, transform: "translate(-50%, -50%)" }}
        />
      </div>
    </div>
  );
}

// region: 스탯 데이터 인터페이스
export interface PersonaStats {
  command: number;
  martial: number;
  intellect: number;
  charisma: number;
  temperance: number;
  diligence: number;
  reflection: number;
  courage: number;
  loyalty: number;
  benevolence: number;
  fairness: number;
  humility: number;
  pessimism_optimism: number;
  conservative_progressive: number;
  individual_social: number;
  cautious_bold: number;
}

interface PersonaStatPanelProps {
  stats: PersonaStats | null;
}

export default function PersonaStatPanel({ stats }: PersonaStatPanelProps) {
  const [tab, setTab] = useState<TabType>("ability");

  const content = useMemo(() => {
    if (!stats) return null;
    return {
      ability: (
        <div className="space-y-3">
          {ABILITY_KEYS.map((key) => (
            <StatRow key={key} label={STAT_LABELS[key]} value={stats[key]} />
          ))}
        </div>
      ),
      virtue: (
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-3">
            {INNER_VIRTUE_KEYS.map((key) => (
              <StatRow key={key} label={STAT_LABELS[key]} value={stats[key]} />
            ))}
          </div>
          <div className="space-y-3">
            {OUTER_VIRTUE_KEYS.map((key) => (
              <StatRow key={key} label={STAT_LABELS[key]} value={stats[key]} />
            ))}
          </div>
        </div>
      ),
      tendency: (
        <div className="space-y-4">
          {TENDENCY_KEYS.map((key) => (
            <TendencyRow key={key} labels={TENDENCY_LABELS[key]} value={stats[key]} />
          ))}
        </div>
      ),
    };
  }, [stats]);

  return (
    <>
      {/* 탭 */}
      <div className="flex border-b border-white/10 bg-black/20 px-2 pt-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`rounded-t px-3 py-1.5 text-xs font-semibold ${
              tab === t.key
                ? "border border-b-0 border-white/20 bg-bg-card text-text-primary"
                : "text-text-secondary"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 탭 콘텐츠 */}
      <div className="p-3 sm:p-4">
        {content ? content[tab] : (
          <p className="text-sm text-text-secondary">데이터 없음</p>
        )}
      </div>
    </>
  );
}
