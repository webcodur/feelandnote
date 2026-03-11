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
  TENDENCY_KEYS,
} from "@/lib/persona/constants";
import type { StatKey, TendencyKey } from "@/lib/persona/constants";
import type { PersonaStats, PersonaStatsWithReasons } from "@/lib/persona/types";
import { useTranslations, useLocale } from "next-intl";

type TabType = "ability" | "inner_virtue" | "outer_virtue" | "tendency";

const TAB_KEYS: TabType[] = ["ability", "inner_virtue", "outer_virtue", "tendency"];

const clamp0100 = (v: number) => Math.max(0, Math.min(100, v));

// region: 스탯 바
function StatRow({ label, value, rationale }: { label: string; value: number; rationale?: string }) {
  const score = clamp0100(value);

  return (
    <div className="flex flex-col">
      <div className="grid grid-cols-[80px_1fr_40px] items-center gap-2">
        <span className="text-xs font-medium text-accent truncate" title={label}>{label}</span>
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
      {rationale && (
        <p className="text-xs leading-relaxed text-text-tertiary mt-1 break-keep">
          {rationale}
        </p>
      )}
    </div>
  );
}

// region: 성향 바
function TendencyRow({ labels, value, rationale }: { labels: [string, string]; value: number; rationale?: string }) {
  const clamped = Math.max(-50, Math.min(50, value));
  const point = ((clamped + 50) / 100) * 100;

  const displayValue = Math.round(clamped);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-accent">{labels[0]}</span>
        <span className="text-xs font-mono text-text-primary tabular-nums">{displayValue}</span>
        <span className="text-xs font-medium text-accent">{labels[1]}</span>
      </div>
      <div className="relative h-2 rounded-sm border border-white/10 bg-black/30">
        <span className="absolute left-1/2 top-0 bottom-0 w-px bg-white/20" />
        <span
          className="absolute top-1/2 h-3 w-3 rounded-full border border-white/40 bg-[#5caeff]"
          style={{ left: `${point}%`, transform: "translate(-50%, -50%)" }}
        />
      </div>
      {rationale && (
        <p className="text-xs leading-relaxed text-text-tertiary mt-0.5 break-keep">
          {rationale}
        </p>
      )}
    </div>
  );
}

interface PersonaStatPanelProps {
  stats: PersonaStats | PersonaStatsWithReasons | null;
}

const TENDENCY_MAP: Record<TendencyKey, [string, string]> = {
  pessimism_optimism: ["pessimism", "optimism"],
  conservative_progressive: ["conservative", "progressive"],
  individual_social: ["individual", "social"],
  cautious_bold: ["cautious", "bold"],
};

export default function PersonaStatPanel({ stats }: PersonaStatPanelProps) {
  const t = useTranslations("shared.persona");
  const locale = useLocale();
  const [tab, setTab] = useState<TabType>("ability");

  const statLabel = (key: StatKey) => t(`stat.${key}`);
  const tendencyLabels = (key: TendencyKey): [string, string] => {
    const [a, b] = TENDENCY_MAP[key];
    return [t(`tendency_label.${a}`), t(`tendency_label.${b}`)];
  };

  const getVal = (key: string) => {
    if (!stats) return 0;
    const v = (stats as any)[key];
    return typeof v === 'number' ? v : (v?.score || 0);
  };

  const getRationale = (key: string) => {
    if (!stats) return undefined;
    const v = (stats as any)[key];
    if (typeof v === 'object' && v !== null) {
      return locale === "en" ? v.reason_en : v.reason_ko;
    }
    return undefined;
  };

  const content = useMemo(() => {
    if (!stats) return null;
    return {
      ability: (
        <div className="space-y-4">
          {ABILITY_KEYS.map((key) => (
            <StatRow key={key} label={statLabel(key)} value={getVal(key)} rationale={getRationale(key)} />
          ))}
        </div>
      ),
      inner_virtue: (
        <div className="space-y-4">
          {INNER_VIRTUE_KEYS.map((key) => (
            <StatRow key={key} label={statLabel(key)} value={getVal(key)} rationale={getRationale(key)} />
          ))}
        </div>
      ),
      outer_virtue: (
        <div className="space-y-4">
          {OUTER_VIRTUE_KEYS.map((key) => (
            <StatRow key={key} label={statLabel(key)} value={getVal(key)} rationale={getRationale(key)} />
          ))}
        </div>
      ),
      tendency: (
        <div className="space-y-4">
          {TENDENCY_KEYS.map((key) => (
            <TendencyRow key={key} labels={tendencyLabels(key)} value={getVal(key)} rationale={getRationale(key)} />
          ))}
        </div>
      ),
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats, t, locale]);

  return (
    <>
      {/* 탭 */}
      <div className="flex border-b border-white/10 bg-black/20 px-2 pt-2">
        {TAB_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`rounded-t px-3 py-1.5 text-xs font-semibold ${
              tab === key
                ? "border border-b-0 border-white/20 bg-bg-card text-text-primary"
                : "text-text-secondary"
            }`}
          >
            {t(key)}
          </button>
        ))}
      </div>

      {/* 탭 콘텐츠 */}
      <div className="p-3 sm:p-4">
        {content ? content[tab] : (
          <p className="text-sm text-text-secondary">{t("noData")}</p>
        )}
      </div>
    </>
  );
}
