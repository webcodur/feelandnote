/*
  파일명: components/features/game/battle/CommandInfoModal.tsx
  기능: 명령 상세 정보 모달
  책임: 각 명령의 효과, 공식, 전략 팁을 상세히 표시한다.
*/
"use client";

import { Fragment } from "react";
import { X, Swords, ScrollText, Landmark } from "lucide-react";
import type { Command } from "@/lib/game/types";
import { COMMAND_LABELS, COMMANDS } from "@/lib/game/types";
import { getCounterResult } from "@/lib/game/gameEngine";

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

interface InfoSection {
  label: string;
  content: string;
}

export const CMD_DETAILS: Record<Command, { summary: string; sections: InfoSection[]; aptFormula: string; tip: string }> = {
  assault: {
    summary: "군사력으로 상대 국력을 직접 타격한다.",
    sections: [
      { label: "기본 효과", content: "상대 국력 -round(적성/2). 자국 민심 -3 (전쟁 피로, 상성과 무관하게 항상 차감)." },
      { label: "상성 승리 (vs 내정)", content: "타격 피해 ×1.5. 상대 내정의 회복 효과 차단." },
      { label: "상성 패배 (vs 책략)", content: "타격 피해 불발. 민심 -3과 카드 소모는 그대로 지불." },
      { label: "접전 (전투 vs 전투)", content: "적성이 높은 쪽만 타격 성공, 낮은 쪽은 불발. 동률 시 양쪽 ×0.5." },
    ],
    aptFormula: "(전략 + 사회) / 2 × (1 + 무력/100)",
    tip: "가장 직접적인 승리 수단. 민심 -3 비용이 매턴 누적되므로 내정과 병행 필수. 책략에 약하다.",
  },
  stratagem: {
    summary: "책략으로 상대 민심을 공격한다.",
    sections: [
      { label: "기본 효과", content: "상대 민심 -round(적성/2)." },
      { label: "상성 승리 (vs 전투)", content: "민심 피해 ×1.5. 상대 전투의 타격 피해 차단." },
      { label: "상성 패배 (vs 내정)", content: "민심 피해 불발. 카드만 소모." },
      { label: "접전 (책략 vs 책략)", content: "적성이 높은 쪽만 피해 성공, 낮은 쪽은 불발. 동률 시 양쪽 ×0.5." },
    ],
    aptFormula: "(정치 + 기술) / 2 × (1 + 지력/100)",
    tip: "민심 0 이하 시 반란(국력 -5, 민심 10 리셋)을 유발. 전투를 카운터한다. 내정에 약하다.",
  },
  govern: {
    summary: "내정으로 국력과 민심을 회복하고 버린패를 회수한다.",
    sections: [
      { label: "국력 회복", content: "round(적성/3). 소량이지만 유일한 국력 회복 수단." },
      { label: "민심 회복", content: "round(적성/2). 적성 10이면 민심 +5." },
      { label: "버린패 회수", content: "사용한 카드 중 1장을 손패로 회수. 선택 가능." },
      { label: "카드 유지", content: "다른 명령과 달리 사용한 카드가 소모되지 않고 손패에 남는다." },
      { label: "상성 승리 (vs 책략)", content: "회복량 ×1.5. 상대 책략의 민심 피해 차단." },
      { label: "상성 패배 (vs 전투)", content: "회복 불발. 단, 카드 유지와 버린패 회수는 상성과 무관하게 유지." },
    ],
    aptFormula: "(경제 + 문화) / 2 × (1 + 통솔/100)",
    tip: "공격 안 하는 턴이므로 상대에게 자유턴을 준다. 책략을 카운터한다. 전투에 약하다.",
  },
};

interface Props {
  command: Command;
  onClose: () => void;
  zIndex?: number;
}

export default function CommandInfoModal({ command, onClose, zIndex = 9999 }: Props) {
  const c = CMD_COLOR[command];
  const d = CMD_DETAILS[command];

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
            <h2 className={`text-lg font-bold ${c.text}`}>{COMMAND_LABELS[command]}</h2>
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
            <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider w-10 shrink-0">적성</span>
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
            <h4 className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1.5">전략</h4>
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

const COUNTER_LABEL = { win: "승", lose: "패", draw: "무" } as const;
const COUNTER_COLOR = {
  win: "text-amber-300 bg-amber-500/10",
  lose: "text-red-400 bg-red-500/10",
  draw: "text-yellow-300 bg-yellow-500/10",
} as const;

function CounterTable({ current }: { current: Command }) {
  return (
    <div>
      <h4 className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2">상성표</h4>
      <p className="text-[9px] text-white/25 mb-2">전투 &gt; 내정 &gt; 책략 &gt; 전투</p>
      {/* 헤더 */}
      <div className="grid gap-px" style={{ gridTemplateColumns: `56px repeat(${COMMANDS.length}, 1fr)` }}>
        <div />
        {COMMANDS.map(cmd => (
          <div key={cmd} className="flex items-center justify-center py-1">
            <span className={`text-[10px] font-bold ${CMD_COLOR[cmd].text}`}>{COMMAND_LABELS[cmd]}</span>
          </div>
        ))}
        {/* 행 */}
        {COMMANDS.map(row => (
          <Fragment key={row}>
            <div className={`flex items-center px-1.5 py-1.5 ${row === current ? "bg-white/[0.04] rounded-l" : ""}`}>
              <span className={`text-[10px] font-bold ${CMD_COLOR[row].text}`}>{COMMAND_LABELS[row]}</span>
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
                    {COUNTER_LABEL[result]}
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
