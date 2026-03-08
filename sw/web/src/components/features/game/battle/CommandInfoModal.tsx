/*
  파일명: components/features/game/battle/CommandInfoModal.tsx
  기능: 명령 상세 정보 모달
  책임: 각 명령의 효과, 공식, 전략 팁을 상세히 표시한다.
*/
"use client";

import { Fragment } from "react";
import { X, Swords, ScrollText, Landmark } from "lucide-react";
import { useLocale } from "next-intl";
import type { Command } from "@/lib/game/types";
import { COMMANDS } from "@/lib/game/types";
import { getCounterResult } from "@/lib/game/gameEngine";
import { getBattleCommandInfo, getBattleCommandLabel, getBattleCounterLabel, getBattleText } from "./i18n";

const CMD_ICON: Record<Command, React.ReactNode> = {
  assault: <Swords size={18} />,
  stratagem: <ScrollText size={18} />,
  govern: <Landmark size={18} />,
};

const CMD_COLOR: Record<Command, { text: string; border: string; bg: string; accent: string }> = {
  assault:   { text: "text-red-400",     border: "border-red-500/30",     bg: "bg-red-500/5",     accent: "text-red-300" },
  stratagem: { text: "text-purple-400",  border: "border-purple-500/30",  bg: "bg-purple-500/5",  accent: "text-purple-300" },
  govern:    { text: "text-amber-400",   border: "border-amber-500/30",   bg: "bg-amber-500/5",   accent: "text-amber-300" },
};

interface Props {
  command: Command;
  onClose: () => void;
  zIndex?: number;
}

export default function CommandInfoModal({ command, onClose, zIndex = 9999 }: Props) {
  const locale = useLocale();
  const c = CMD_COLOR[command];
  const d = getBattleCommandInfo(command, locale);
  const text = getBattleText(locale);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex }}
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-md rounded-xl border border-white/[0.08] bg-[#111115] shadow-2xl overflow-hidden animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className={`flex items-center gap-3 px-5 py-4 border-b ${c.border} ${c.bg}`}>
          <span className={c.text}>{CMD_ICON[command]}</span>
          <div className="flex-1">
            <h2 className={`text-lg font-bold ${c.text}`}>{getBattleCommandLabel(command, locale)}</h2>
            <p className="text-[11px] text-white/40 mt-0.5">{d.summary}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-white/30 hover:text-white/60 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* body */}
        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* 적성 공식 */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider w-10 shrink-0">{text.commandInfo.aptitude}</span>
            <span className={`text-xs font-mono ${c.accent}`}>{d.aptFormula}</span>
          </div>

          <div className="w-full h-px bg-white/[0.04]" />

          {/* 상세 섹션 */}
          <div className="space-y-3">
            {d.sections.map((s) => (
              <div key={s.label}>
                <h4 className={`text-[11px] font-bold ${c.text} mb-1`}>{s.label}</h4>
                <p className="text-[11px] text-white/50 leading-relaxed">{s.content}</p>
              </div>
            ))}
          </div>

          <div className="w-full h-px bg-white/[0.04]" />

          {/* 전략 팁 */}
          <div className={`rounded-lg border ${c.border} ${c.bg} p-3`}>
            <h4 className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1.5">{text.commandInfo.strategy}</h4>
            <p className={`text-[11px] ${c.accent} leading-relaxed`}>{d.tip}</p>
          </div>

          <div className="w-full h-px bg-white/[0.04]" />

          {/* 상성표 */}
          <CounterTable current={command} />
        </div>
      </div>
    </div>
  );
}

const COUNTER_COLOR = {
  win: "text-amber-300 bg-amber-500/10",
  lose: "text-red-400 bg-red-500/10",
  draw: "text-yellow-300 bg-yellow-500/10",
} as const;

function CounterTable({ current }: { current: Command }) {
  const locale = useLocale();
  const text = getBattleText(locale);
  return (
    <div>
      <h4 className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2">{text.commandInfo.counterTable}</h4>
      <p className="text-[9px] text-white/25 mb-2">{text.commandInfo.counterFlow}</p>
      {/* 헤더 */}
      <div className="grid gap-px" style={{ gridTemplateColumns: `56px repeat(${COMMANDS.length}, 1fr)` }}>
        <div />
        {COMMANDS.map(cmd => (
          <div key={cmd} className="flex items-center justify-center py-1">
            <span className={`text-[10px] font-bold ${CMD_COLOR[cmd].text}`}>{getBattleCommandLabel(cmd, locale)}</span>
          </div>
        ))}
        {/* 행 */}
        {COMMANDS.map(row => (
          <Fragment key={row}>
            <div className={`flex items-center px-1.5 py-1.5 ${row === current ? "bg-white/[0.04] rounded-l" : ""}`}>
              <span className={`text-[10px] font-bold ${CMD_COLOR[row].text}`}>{getBattleCommandLabel(row, locale)}</span>
            </div>
            {COMMANDS.map(col => {
              const result = getCounterResult(row, col);
              const isCurrent = row === current || col === current;
              return (
                <div key={`${row}-${col}`}
                  className={`flex items-center justify-center py-1.5 ${
                    isCurrent ? "bg-white/[0.03]" : ""
                  }`}
                >
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${COUNTER_COLOR[result]}`}>
                    {getBattleCounterLabel(result, locale)}
                  </span>
                </div>
              );
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
