/*
  파일명: components/features/game/battle/PlayPhase.tsx
  기능: v6 배틀 페이즈 UI (동시 행동)
  책임: 양측 손패 표시 + 카드/명령 선택 + 동시 공개 연출 + 상성 결과 표시
*/
"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import { Swords, ScrollText, Landmark, Check, HelpCircle, AlertTriangle, ScrollTextIcon } from "lucide-react";
import type { BattleCard as BattleCardType, Command, NationState, RoundRecord, Mandate, BattleSubPhase, RoundAction, Difficulty } from "@/lib/game/types";
import { COMMANDS, COMMAND_LABELS, MANDATE_BONUS, MAX_POWER, MAX_MORALE } from "@/lib/game/types";
import { calcAptitude, aptitudeToStars, getEscalation } from "@/lib/game/gameEngine";
import BattleCard from "./BattleCard";
import CommandInfoModal, { CMD_DETAILS } from "./CommandInfoModal";
import CaptainInfoModal from "./CaptainInfoModal";
import PhaseAnnounce, { type AnnounceData } from "./PhaseAnnounce";
import { Z_INDEX } from "@/constants/zIndex";

interface Props {
  playerHand: BattleCardType[];
  aiHand: BattleCardType[];
  playerNation: NationState;
  aiNation: NationState;
  playerDiscard: BattleCardType[];
  aiDiscard: BattleCardType[];
  currentRound: number;
  battleSubPhase: BattleSubPhase;
  roundRecords: RoundRecord[];
  pendingRound: { playerAction: RoundAction; aiAction: RoundAction } | null;
  mandate: Mandate | null;
  nextMandate: Mandate | null;
  playerCaptainId: string | null;
  aiCaptainId: string | null;
  difficulty?: Difficulty;
  onSubmit: (cardId: string, command: Command, recoverId?: string) => void;
  onAdvanceBattle: () => "blocked" | RoundRecord | null;
  onAdvance: () => void;
  playSfx: (name: string) => void;
  onCardInfo?: (celebId: string) => void;
}

const CMD_ICON: Record<Command, React.ReactNode> = {
  assault: <Swords size={20} />,
  stratagem: <ScrollText size={20} />,
  govern: <Landmark size={20} />,
};

const CMD_STYLE: Record<Command, { border: string; bg: string; text: string; selectedBg: string }> = {
  assault: { border: "border-red-500/20", bg: "bg-red-500/[0.03]", text: "text-red-400", selectedBg: "bg-red-500/15 border-red-500/40" },
  stratagem: { border: "border-purple-500/20", bg: "bg-purple-500/[0.03]", text: "text-purple-400", selectedBg: "bg-purple-500/15 border-purple-500/40" },
  govern: { border: "border-amber-500/20", bg: "bg-amber-500/[0.03]", text: "text-amber-400", selectedBg: "bg-amber-500/15 border-amber-500/40" },
};

/** 충돌 애니메이션 키프레임 */
const CLASH_KEYFRAMES = `
@keyframes clash-left {
  0% { transform: translateX(-120%); opacity: 0; }
  60% { transform: translateX(8%); opacity: 1; }
  80% { transform: translateX(-3%); }
  100% { transform: translateX(0); opacity: 1; }
}
@keyframes clash-right {
  0% { transform: translateX(120%); opacity: 0; }
  60% { transform: translateX(-8%); opacity: 1; }
  80% { transform: translateX(3%); }
  100% { transform: translateX(0); opacity: 1; }
}
@keyframes clash-flash {
  0% { opacity: 0; transform: scale(0.5); }
  50% { opacity: 1; transform: scale(1.3); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes clash-shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-4px); }
  40% { transform: translateX(4px); }
  60% { transform: translateX(-2px); }
  80% { transform: translateX(2px); }
}
@keyframes result-reveal {
  0% { opacity: 0; transform: translateY(8px); }
  100% { opacity: 1; transform: translateY(0); }
}
`;

/** 상성 결과 배지 (인라인 태그) */
function CounterBadge({ result }: { result: "win" | "lose" | "draw" }) {
  const config = {
    win: { text: "카운터!", cls: "text-amber-200 bg-amber-500/15 border-amber-400/30" },
    lose: { text: "역습!", cls: "text-red-300 bg-red-500/15 border-red-400/30" },
    draw: { text: "접전", cls: "text-yellow-200 bg-yellow-500/15 border-yellow-400/30" },
  };
  const c = config[result];
  return (
    <span className={`inline-block rounded border px-2.5 py-0.5 text-xs font-bold tracking-wide animate-score-pop ${c.cls}`}>
      {c.text}
    </span>
  );
}


/* ─── 충돌 결과 유틸리티 ─── */

type NarrativeSide = "player" | "ai" | "system";
type NarrativeType = "normal" | "rebellion" | "mandate";
interface ParsedNarrative {
  side: NarrativeSide;
  type: NarrativeType;
  text: string;
}

function parseNarratives(result: string): ParsedNarrative[] {
  return result.split(" / ").map((raw) => {
    const trimmed = raw.trim();
    if (!trimmed) return null;

    let side: NarrativeSide = "system";
    let text = trimmed;

    if (trimmed.startsWith("[아군] ")) {
      side = "player";
      text = trimmed.slice(5);
    } else if (trimmed.startsWith("[적군] ")) {
      side = "ai";
      text = trimmed.slice(5);
    } else if (trimmed.includes("아군")) {
      side = "player";
    } else if (trimmed.includes("적군") || trimmed.includes("AI")) {
      side = "ai";
    }

    let type: NarrativeType = "normal";
    if (/반란/.test(text)) type = "rebellion";
    else if (/\[천명/.test(text)) type = "mandate";

    return { side, type, text };
  }).filter(Boolean) as ParsedNarrative[];
}

const COUNTER_EXPLAIN: Record<string, string> = {
  "assault-govern": "전투가 내정을 압도",
  "govern-stratagem": "내정이 책략을 무력화",
  "stratagem-assault": "책략이 전투를 제압",
};

function getCounterExplain(pCmd: Command, aCmd: Command): string | null {
  return COUNTER_EXPLAIN[`${pCmd}-${aCmd}`] ?? COUNTER_EXPLAIN[`${aCmd}-${pCmd}`] ?? null;
}

const NARRATIVE_STYLE: Record<NarrativeType, { icon: React.ReactNode | null; cls: string; mobileCls: string }> = {
  rebellion: {
    icon: <AlertTriangle size={14} className="text-red-400 shrink-0" />,
    cls: "bg-red-500/15 border-red-400/30 text-red-300",
    mobileCls: "border-red-400/20 bg-red-500/10 text-red-300",
  },
  mandate: { icon: null, cls: "text-amber-300", mobileCls: "text-amber-300" },
  normal: { icon: null, cls: "text-white/50", mobileCls: "text-white/50" },
};

/** 에칭 구분선 */
function EtchedDivider({ className = "" }: { className?: string }) {
  return (
    <div className={`w-full flex items-center gap-3 ${className}`}>
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
      <div className="w-1 h-1 rounded-full bg-white/[0.08]" />
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
    </div>
  );
}

/** 충돌 결과 통합 패널 (모바일/데스크톱 공용) */
function RoundResultPanel({ record, compact, playSfx, onAdvance }: {
  record: RoundRecord;
  compact?: boolean;
  playSfx: (name: string) => void;
  onAdvance: () => void;
}) {
  const narratives = parseNarratives(record.result);
  const counterExplain = getCounterExplain(record.player.command, record.ai.command);
  const playerNarrs = narratives.filter(n => n.side === "player");
  const aiNarrs = narratives.filter(n => n.side === "ai");
  const systemNarrs = narratives.filter(n => n.side === "system");

  const stagger = (i: number) => ({ animation: `result-reveal 0.35s cubic-bezier(0.22,1,0.36,1) ${100 + i * 80}ms both` });

  /* ─── 모바일 (compact) ─── */
  if (compact) {
    return (
      <div className="animate-fade-in rounded-lg border border-white/[0.06] bg-[#0c0c10]/90 px-4 py-4 space-y-3">

        {/* ① VS 히어로 + 좌우 명령 */}
        <div className="flex items-center justify-center gap-3">
          {/* 플레이어 측 */}
          <div className="flex-1 flex flex-col items-end gap-0.5 min-w-0">
            <span className="text-accent font-bold text-sm truncate">{record.player.card.nickname}</span>
            <span className={`flex items-center gap-1 text-xs ${CMD_STYLE[record.player.command].text}`}>
              {CMD_ICON[record.player.command]}
              {COMMAND_LABELS[record.player.command]}
            </span>
            <span className={`text-[10px] tabular-nums ${record.player.effectiveAptitude > 0 ? "text-accent/70" : "text-accent/30"}`}>
              적성 {record.player.aptitude.toFixed(1)}{record.player.mandateBonus && " ★"}{record.player.effectiveAptitude === 0 && " (무효)"}
            </span>
          </div>
          {/* VS */}
          <span className="text-2xl font-cinzel font-bold text-white/70 tracking-widest shrink-0 px-1">VS</span>
          {/* AI 측 */}
          <div className="flex-1 flex flex-col items-start gap-0.5 min-w-0">
            <span className="text-red-400 font-bold text-sm truncate">{record.ai.card.nickname}</span>
            <span className={`flex items-center gap-1 text-xs ${CMD_STYLE[record.ai.command].text}`}>
              {COMMAND_LABELS[record.ai.command]}
              {CMD_ICON[record.ai.command]}
            </span>
            <span className={`text-[10px] tabular-nums ${record.ai.effectiveAptitude > 0 ? "text-red-400/70" : "text-red-400/30"}`}>
              적성 {record.ai.aptitude.toFixed(1)}{record.ai.mandateBonus && " ★"}{record.ai.effectiveAptitude === 0 && " (무효)"}
            </span>
          </div>
        </div>

        {/* ② 상성 태그 + 이벤트 로그 */}
        {(narratives.length > 0) && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <CounterBadge result={record.counterResult} />
              {counterExplain && <span className="text-[11px] text-white/20">{counterExplain}</span>}
              {record.counterResult === "draw" && (
                <span className="text-[11px] text-white/25">
                  적성 {record.player.aptitude.toFixed(1)} vs {record.ai.aptitude.toFixed(1)} → {
                    record.player.aptitude > record.ai.aptitude
                      ? `${record.player.card.nickname} 우세`
                      : record.ai.aptitude > record.player.aptitude
                        ? `${record.ai.card.nickname} 우세`
                        : "동률"
                  }
                </span>
              )}
            </div>
            {narratives.map((n, i) => {
              const style = NARRATIVE_STYLE[n.type];
              const isSpecial = n.type !== "normal";
              return (
                <div key={i} className={`flex items-start gap-1.5 text-xs rounded px-2 py-1 border ${
                  isSpecial ? style.mobileCls : "border-transparent text-white/45"
                }`}>
                  {style.icon}
                  <span className="text-white/25 shrink-0 w-5">
                    {n.side === "player" ? "아" : n.side === "ai" ? "적" : ""}
                  </span>
                  <span className="leading-relaxed">{n.text}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* 다음 버튼 */}
        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={() => { playSfx("sfx-round-draw.mp3"); onAdvance(); }}
            className="px-4 py-1.5 rounded-md bg-accent/15 border border-accent/25 text-accent text-xs font-bold hover:bg-accent/25 transition-colors shrink-0"
          >
            다음
          </button>
        </div>
      </div>
    );
  }

  /* ─── 데스크톱 ─── */
  return (
    <div className="pointer-events-auto rounded-2xl bg-black/70 backdrop-blur-xl border border-white/[0.06] shadow-[0_8px_60px_rgba(0,0,0,0.7)] px-10 py-8 max-w-lg mx-auto space-y-5" style={stagger(0)}>

      {/* ① VS 히어로 + 좌우 명령 */}
      <div className="flex items-center justify-center gap-6" style={stagger(0)}>
        {/* 플레이어 측 */}
        <div className="flex-1 flex flex-col items-end gap-1 min-w-0">
          <p className="text-base font-bold text-accent leading-tight truncate">{record.player.card.nickname}</p>
          <div className={`flex items-center gap-1.5 ${CMD_STYLE[record.player.command].text}`}>
            {CMD_ICON[record.player.command]}
            <span className="text-sm font-bold">{COMMAND_LABELS[record.player.command]}</span>
          </div>
          <span className={`text-[10px] tabular-nums ${record.player.effectiveAptitude > 0 ? "text-accent/70" : "text-accent/40"}`}>
            적성 {record.player.aptitude.toFixed(1)}{record.player.mandateBonus && " ★"}{record.player.effectiveAptitude === 0 && " (무효)"}
          </span>
        </div>
        {/* VS 중앙 */}
        <div className="flex flex-col items-center shrink-0">
          <span
            className="text-4xl font-cinzel font-bold text-white/80 tracking-[0.15em] drop-shadow-[0_0_20px_rgba(255,255,255,0.15)] select-none"
            style={{ animation: "clash-flash 0.5s ease-out forwards" }}
          >
            VS
          </span>
        </div>
        {/* AI 측 */}
        <div className="flex-1 flex flex-col items-start gap-1 min-w-0">
          <p className="text-base font-bold text-red-400 leading-tight truncate">{record.ai.card.nickname}</p>
          <div className={`flex items-center gap-1.5 ${CMD_STYLE[record.ai.command].text}`}>
            <span className="text-sm font-bold">{COMMAND_LABELS[record.ai.command]}</span>
            {CMD_ICON[record.ai.command]}
          </div>
          <span className={`text-[10px] tabular-nums ${record.ai.effectiveAptitude > 0 ? "text-red-400/70" : "text-red-400/40"}`}>
            적성 {record.ai.aptitude.toFixed(1)}{record.ai.mandateBonus && " ★"}{record.ai.effectiveAptitude === 0 && " (무효)"}
          </span>
        </div>
      </div>

      <EtchedDivider />

      {/* ② 상성 태그 + 이벤트 로그 */}
      <div className="space-y-2" style={stagger(1)}>
        {/* 상성 태그 (인라인, 작게) */}
        <div className="flex items-center gap-2">
          <CounterBadge result={record.counterResult} />
          {counterExplain && (
            <span className="text-xs text-white/20">
              {counterExplain}
            </span>
          )}
          {record.counterResult === "draw" && (
            <span className="text-xs text-white/25">
              적성 {record.player.aptitude.toFixed(1)} vs {record.ai.aptitude.toFixed(1)} → {
                record.player.aptitude > record.ai.aptitude
                  ? `${record.player.card.nickname} 우세`
                  : record.ai.aptitude > record.player.aptitude
                    ? `${record.ai.card.nickname} 우세`
                    : "동률"
              }
            </span>
          )}
        </div>
        {/* 이벤트 로그 */}
        {playerNarrs.length > 0 && (
          <div className="rounded-lg border border-accent/[0.08] bg-accent/[0.02] px-4 py-2.5">
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-accent/40" />
              <span className="text-[10px] font-bold text-accent/35 uppercase tracking-wider">아군</span>
            </div>
            <div className="space-y-1">
              {playerNarrs.map((n, i) => {
                const style = NARRATIVE_STYLE[n.type];
                const isSpecial = n.type !== "normal";
                return (
                  <div key={i} className={`flex items-center gap-2 text-xs leading-relaxed ${
                    isSpecial ? `${style.cls} rounded px-2 py-1 border` : "text-white/50"
                  }`}>
                    {style.icon}
                    <span>{n.text}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {aiNarrs.length > 0 && (
          <div className="rounded-lg border border-red-400/[0.08] bg-red-500/[0.02] px-4 py-2.5">
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-red-400/40" />
              <span className="text-[10px] font-bold text-red-400/35 uppercase tracking-wider">적군</span>
            </div>
            <div className="space-y-1">
              {aiNarrs.map((n, i) => {
                const style = NARRATIVE_STYLE[n.type];
                const isSpecial = n.type !== "normal";
                return (
                  <div key={i} className={`flex items-center gap-2 text-xs leading-relaxed ${
                    isSpecial ? `${style.cls} rounded px-2 py-1 border` : "text-white/50"
                  }`}>
                    {style.icon}
                    <span>{n.text}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {systemNarrs.map((n, i) => {
          const style = NARRATIVE_STYLE[n.type];
          return (
            <div key={i} className={`flex items-center gap-2 text-xs rounded-lg border px-4 py-2.5 ${style.cls}`}>
              {style.icon}
              <span className="leading-relaxed">{n.text}</span>
            </div>
          );
        })}
      </div>

      {/* 다음 라운드 */}
      <div className="flex justify-center pt-1" style={stagger(2)}>
        <button
          type="button"
          onClick={() => { playSfx("sfx-round-draw.mp3"); onAdvance(); }}
          className="group relative px-10 py-3 rounded-lg bg-accent/15 border border-accent/30 text-accent font-bold text-sm hover:bg-accent/25 transition-all shadow-[0_0_24px_rgba(212,175,55,0.15)] hover:shadow-[0_0_32px_rgba(212,175,55,0.25)]"
        >
          다음 라운드
        </button>
      </div>
    </div>
  );
}

/** 국력+민심 바 (델타 잔상 + 숫자 애니메이션) */
function NationStats({ power, maxPower, morale, accent, powerDelta, moraleDelta }: {
  power: number; maxPower: number; morale: number; accent: "player" | "ai";
  powerDelta?: number; moraleDelta?: number;
}) {
  const isPlayer = accent === "player";
  const powerBar = isPlayer ? "bg-accent" : "bg-red-500";
  const moraleBar = isPlayer ? "bg-accent/60" : "bg-red-500/60";
  const numColor = isPlayer ? "text-accent" : "text-red-400";
  const labelColor = isPlayer ? "text-accent/40" : "text-red-400/40";
  const pd = powerDelta ?? 0;
  const md = moraleDelta ?? 0;
  const prevPower = power - pd;
  const prevMorale = morale - md;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        <span className={`text-[10px] font-bold shrink-0 ${labelColor}`}>국력</span>
        <div className="flex-1 h-2 rounded-full bg-white/[0.06] overflow-hidden flex relative">
          {pd < 0 && (
            <div className="absolute inset-y-0 left-0 rounded-full bg-red-500/40" style={{ width: `${(prevPower / maxPower) * 100}%` }} />
          )}
          {pd > 0 && (
            <div className="absolute inset-y-0 left-0 rounded-full bg-emerald-500/30" style={{ width: `${(power / maxPower) * 100}%` }} />
          )}
          <div className={`absolute inset-y-0 left-0 rounded-full ${powerBar} transition-all duration-700 ease-out`} style={{ width: `${(power / maxPower) * 100}%` }} />
        </div>
        <div className="flex items-center gap-0.5 shrink-0 min-w-[40px] justify-end">
          <span className={`text-sm font-cinzel font-bold tabular-nums text-right ${numColor}`}>{power}</span>
          {pd !== 0 && (
            <span className={`text-[9px] font-bold tabular-nums ${pd > 0 ? "text-emerald-400" : "text-red-400"}`}>
              {pd > 0 ? `+${pd}` : pd}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <span className={`text-[10px] font-bold shrink-0 ${labelColor}`}>민심</span>
        <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden relative">
          {md < 0 && (
            <div className="absolute inset-y-0 left-0 rounded-full bg-red-500/40" style={{ width: `${(prevMorale / MAX_MORALE) * 100}%` }} />
          )}
          {md > 0 && (
            <div className="absolute inset-y-0 left-0 rounded-full bg-emerald-500/30" style={{ width: `${(morale / MAX_MORALE) * 100}%` }} />
          )}
          <div className={`absolute inset-y-0 left-0 rounded-full ${moraleBar} transition-all duration-700 ease-out`} style={{ width: `${(morale / MAX_MORALE) * 100}%` }} />
        </div>
        <div className="flex items-center gap-0.5 shrink-0 min-w-[30px] justify-end">
          <span className={`text-xs font-cinzel font-bold tabular-nums text-right ${numColor}`}>{morale}</span>
          {md !== 0 && (
            <span className={`text-[9px] font-bold tabular-nums ${md > 0 ? "text-emerald-400" : "text-red-400"}`}>
              {md > 0 ? `+${md}` : md}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/** 모바일 헤더용 국력/민심 패널 (delta 잔상 지원) */
function MobileNationPanel({ nation, accent, delta }: {
  nation: NationState; accent: "player" | "ai";
  delta?: { power: number; morale: number };
}) {
  const isPlayer = accent === "player";
  const powerBar = isPlayer ? "bg-accent" : "bg-red-500";
  const moraleBar = isPlayer ? "bg-accent/60" : "bg-red-500/60";
  const pd = delta?.power ?? 0;
  const md = delta?.morale ?? 0;
  const prevPower = nation.power - pd;
  const prevMorale = nation.morale - md;

  return (
    <div className="flex-1 flex flex-col gap-1.5 px-4 py-3 min-w-0">
      <span className={`text-xs font-bold ${isPlayer ? "text-accent/40" : "text-red-400/40"} tracking-wider uppercase mb-0.5`}>{isPlayer ? "Player" : "Enemy"}</span>
      <div className="flex items-center gap-2">
        <span className={`text-sm ${isPlayer ? "text-accent/60" : "text-red-400/60"} font-bold shrink-0`}>국력</span>
        <div className="flex-1 h-2.5 rounded-full bg-white/5 overflow-hidden relative">
          {pd < 0 && <div className="absolute inset-y-0 left-0 rounded-full bg-red-500/40" style={{ width: `${(prevPower / MAX_POWER) * 100}%` }} />}
          {pd > 0 && <div className="absolute inset-y-0 left-0 rounded-full bg-emerald-500/30" style={{ width: `${(nation.power / MAX_POWER) * 100}%` }} />}
          <div className={`absolute inset-y-0 left-0 rounded-full ${powerBar} transition-all duration-700 ease-out`} style={{ width: `${(nation.power / MAX_POWER) * 100}%` }} />
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <span className={`text-base font-bold tabular-nums ${isPlayer ? "text-accent/80" : "text-red-400/80"}`}>{nation.power}</span>
          {pd !== 0 && <span className={`text-[9px] font-bold tabular-nums ${pd > 0 ? "text-emerald-400" : "text-red-400"}`}>{pd > 0 ? `+${pd}` : pd}</span>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-xs ${isPlayer ? "text-accent/40" : "text-red-400/40"} font-bold shrink-0`}>민심</span>
        <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden relative">
          {md < 0 && <div className="absolute inset-y-0 left-0 rounded-full bg-red-500/40" style={{ width: `${(prevMorale / MAX_MORALE) * 100}%` }} />}
          {md > 0 && <div className="absolute inset-y-0 left-0 rounded-full bg-emerald-500/30" style={{ width: `${(nation.morale / MAX_MORALE) * 100}%` }} />}
          <div className={`absolute inset-y-0 left-0 rounded-full ${moraleBar} transition-all duration-700 ease-out`} style={{ width: `${(nation.morale / MAX_MORALE) * 100}%` }} />
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <span className={`text-sm font-bold tabular-nums ${isPlayer ? "text-accent/50" : "text-red-400/50"}`}>{nation.morale}</span>
          {md !== 0 && <span className={`text-[9px] font-bold tabular-nums ${md > 0 ? "text-emerald-400" : "text-red-400"}`}>{md > 0 ? `+${md}` : md}</span>}
        </div>
      </div>
    </div>
  );
}

/** 좌우 패널용 대형 카드 */
function FeaturedCard({ card, accent }: { card: BattleCardType; accent: "player" | "ai" }) {
  const border = accent === "player" ? "border-accent/20" : "border-red-500/20";
  const bg = accent === "player" ? "bg-accent/[0.03]" : "bg-red-500/[0.03]";
  const nameColor = accent === "player" ? "text-accent/90" : "text-red-400/90";
  const titleColor = accent === "player" ? "text-accent/40" : "text-red-400/40";
  const imgSrc = card.avatarUrl;
  const aspectClass = "aspect-square";

  return (
    <div className={`max-w-[280px] mx-auto rounded-xl border ${border} ${bg} overflow-hidden`}>
      {imgSrc ? (
        <div className={`relative w-full ${aspectClass}`}>
          <Image src={imgSrc} alt={card.nickname} fill className="object-cover" sizes="280px" />
        </div>
      ) : (
        <div className="w-full aspect-square bg-white/5 flex items-center justify-center">
          <span className="text-5xl text-white/15 font-bold">{card.nickname[0]}</span>
        </div>
      )}
      <div className="p-2.5 space-y-0.5">
        <p className={`text-base font-bold truncate ${nameColor}`}>{card.nickname}</p>
        {card.title && <p className={`text-xs truncate ${titleColor}`}>{card.title}</p>}
      </div>
    </div>
  );
}

/** 전황 로그 모달 */
function BattleLogModal({ records, mandate, onClose }: {
  records: RoundRecord[];
  mandate: Mandate | null;
  onClose: () => void;
}) {
  const reversed = useMemo(() => [...records].reverse(), [records]);

  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: Z_INDEX.gameModal }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md mx-4 rounded-2xl border border-white/[0.06] bg-[#0c0c10]/95 backdrop-blur-xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <ScrollTextIcon size={16} className="text-white/30" />
            <span className="text-sm font-bold text-white/50">전황 기록</span>
            {mandate && <span className="text-[10px] text-amber-400/50 font-bold">{mandate.label}</span>}
          </div>
          <button type="button" onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors p-1">
            <span className="text-lg leading-none">&times;</span>
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto px-4 py-3 space-y-1 scrollbar-thin scrollbar-thumb-white/10">
          {reversed.length === 0 && (
            <div className="text-center text-white/10 text-xs py-8">전황 기록 없음</div>
          )}
          {reversed.map((rec) => {
            const pDelta = rec.powerDelta.player;
            const counterLabel = rec.counterResult === "win" ? "카운터" : rec.counterResult === "lose" ? "역습" : "접전";
            const counterColor = rec.counterResult === "win" ? "text-amber-300" : rec.counterResult === "lose" ? "text-red-400" : "text-yellow-300";
            return (
              <div key={rec.round} className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-white/40 rounded-lg hover:bg-white/[0.02]">
                <span className="w-6 h-6 rounded-full bg-white/[0.06] flex items-center justify-center text-[10px] font-bold shrink-0">{rec.round}</span>
                <span className="text-accent/50 truncate">{rec.player.card.nickname}</span>
                <span className="text-white/15 text-[10px]">vs</span>
                <span className="text-red-400/50 truncate">{rec.ai.card.nickname}</span>
                <span className={`text-[10px] font-bold ${counterColor}`}>{counterLabel}</span>
                <span className={`text-[10px] font-bold ml-auto ${pDelta > 0 ? "text-emerald-400/60" : pDelta < 0 ? "text-red-400/60" : "text-white/15"}`}>
                  {pDelta > 0 ? `+${pDelta}` : `${pDelta}`}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function PlayPhase({
  playerHand, aiHand, playerNation, aiNation,
  playerDiscard, aiDiscard,
  currentRound, battleSubPhase, roundRecords, pendingRound,
  mandate, nextMandate,
  playerCaptainId, aiCaptainId,
  difficulty = "normal",
  onSubmit, onAdvanceBattle, onAdvance, playSfx, onCardInfo,
}: Props) {
  const hardMode = difficulty === "hard";
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [selectedCommand, setSelectedCommand] = useState<Command | null>(null);
  const [selectedRecoverId, setSelectedRecoverId] = useState<string | null>(null);
  const [infoCmd, setInfoCmd] = useState<Command | null>(null);
  const [showLog, setShowLog] = useState(false);
  const [showCaptainInfo, setShowCaptainInfo] = useState(false);
  const [escalationAnnounce, setEscalationAnnounce] = useState<AnnounceData | null>(null);

  // 에스컬레이션 안내: R5부터 매 라운드 시작 시 표시
  const prevRoundRef = useRef(currentRound);
  useEffect(() => {
    const prev = prevRoundRef.current;
    prevRoundRef.current = currentRound;
    if (currentRound <= prev || battleSubPhase !== "selecting") return;

    const esc = getEscalation(currentRound, "offense");
    if (esc > 1) {
      const pct = Math.round((esc - 1) * 100);
      setEscalationAnnounce({
        key: `esc-${currentRound}`,
        label: `ROUND ${currentRound}`,
        title: `전세 격화`,
        subtitle: `공격 피해 +${pct}%`,
        tone: "red",
      });
    }
  }, [currentRound, battleSubPhase]);

  const isSelecting = battleSubPhase === "selecting";
  const isClashing = battleSubPhase === "clashing";
  const isResolving = battleSubPhase === "resolving";
  const isClash = isClashing || isResolving;

  useEffect(() => {
    if (battleSubPhase === "selecting") {
      setSelectedCardId(null);
      setSelectedCommand(null);
      setSelectedRecoverId(null);
    }
  }, [currentRound, battleSubPhase]);

  // ── SFX: clashing (출전 → VS 화면) ──
  useEffect(() => {
    if (battleSubPhase === "clashing" && pendingRound) {
      playSfx("sfx-confirm.mp3");
    }
  }, [battleSubPhase, pendingRound, playSfx]);

  const selectedCard = useMemo(
    () => playerHand.find((c) => c.id === selectedCardId),
    [playerHand, selectedCardId],
  );

  const isReady = selectedCardId !== null && selectedCommand !== null;

  const handleCardClick = useCallback((cardId: string) => {
    if (!isSelecting) return;
    setSelectedCardId((prev) => {
      if (prev === cardId) {
        playSfx("sfx-card-deselect.mp3");
        return null;
      }
      playSfx("sfx-draft-pick.mp3");
      return cardId;
    });
  }, [playSfx, isSelecting]);

  const handleConfirm = useCallback(() => {
    if (!isReady || !selectedCardId || !selectedCommand || !isSelecting) return;
    onSubmit(selectedCardId, selectedCommand, selectedRecoverId ?? undefined);
  }, [isReady, selectedCardId, selectedCommand, selectedRecoverId, onSubmit, isSelecting]);

  const handleCommandClick = useCallback((cmd: Command) => {
    if (!isSelecting) return;
    playSfx("sfx-draft-ai.mp3");
    setSelectedCommand((prev) => prev === cmd ? null : cmd);
    if (cmd !== "govern") setSelectedRecoverId(null);
  }, [playSfx, isSelecting]);

  const lastRecord = roundRecords.length > 0 ? roundRecords[roundRecords.length - 1] : null;
  const aiSelectedCardId = pendingRound?.aiAction.cardId ?? null;

  const guideText = !isSelecting
    ? isClashing ? "충돌!" : "결과 처리 중..."
    : !selectedCardId
    ? "카드를 선택하세요"
    : !selectedCommand
    ? "군령패를 선택하세요"
    : "출전 준비 완료";

  // clashing에서 클릭 → resolving + 결과 SFX 직접 재생
  const handleBattleClick = useCallback(() => {
    const result = onAdvanceBattle();
    if (result === "blocked" || !result) return;

    const rec = result;
    if (rec.rebellion.player || rec.rebellion.ai) {
      playSfx("sfx-rebellion.mp3");
    } else if (rec.counterResult === "draw") {
      playSfx("sfx-clash-clang.mp3");
    } else {
      playSfx("sfx-clash-slash.mp3");
    }
  }, [onAdvanceBattle, playSfx]);

  // ── 카드 배열: 주장 분리 + 나머지 2×2 ──
  // 주장은 hand 또는 discard 어디에 있든 대형 슬롯에 표시
  const playerCaptainInHand = playerCaptainId ? playerHand.find(c => c.id === playerCaptainId) : null;
  const playerCaptainInDiscard = playerCaptainId && !playerCaptainInHand ? playerDiscard.find(c => c.id === playerCaptainId) : null;
  const playerCaptain = playerCaptainInHand ?? playerCaptainInDiscard ?? null;
  const playerOthers = playerCaptain ? playerHand.filter(c => c.id !== playerCaptainId) : playerHand;
  const playerOthersDiscard = playerCaptain ? playerDiscard.filter(c => c.id !== playerCaptainId) : playerDiscard;

  const aiCaptainInHand = aiCaptainId ? aiHand.find(c => c.id === aiCaptainId) : null;
  const aiCaptainInDiscard = aiCaptainId && !aiCaptainInHand ? aiDiscard.find(c => c.id === aiCaptainId) : null;
  const aiCaptain = aiCaptainInHand ?? aiCaptainInDiscard ?? null;
  const aiOthers = aiCaptain ? aiHand.filter(c => c.id !== aiCaptainId) : aiHand;
  const aiOthersDiscard = aiCaptain ? aiDiscard.filter(c => c.id !== aiCaptainId) : aiDiscard;

  return (
    <div className="w-full select-none flex flex-col relative">
      {isClash && <style>{CLASH_KEYFRAMES}</style>}

      {/* ━━━━━ 헤더 (데스크톱) ━━━━━ */}
      <div className="hidden lg:flex items-center relative px-4 py-3 border-b border-white/[0.04]">
        {/* 좌: 라운드 + 천명 */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-baseline gap-1.5">
            <span className="text-xs font-cinzel text-white/25 tracking-widest uppercase">Round</span>
            <span className="text-2xl font-cinzel font-bold text-white/60 leading-none">{currentRound}</span>
          </div>
          {mandate && (
            <span className="text-[10px] text-amber-400/60 font-bold px-2 py-0.5 rounded border border-amber-400/15 bg-amber-400/[0.03]">
              {mandate.label}
            </span>
          )}
        </div>

        {/* 중앙: 나 국력·민심 | 상대 국력·민심 (absolute 중앙) */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-6 w-full max-w-xl px-4 pointer-events-none">
          <div className="flex-1 min-w-0 pointer-events-auto">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-bold text-accent/40 uppercase tracking-wider">Player</span>
            </div>
            <NationStats power={playerNation.power} maxPower={MAX_POWER} morale={playerNation.morale} accent="player" powerDelta={isResolving && lastRecord ? lastRecord.powerDelta.player : undefined} moraleDelta={isResolving && lastRecord ? lastRecord.moraleDelta.player : undefined} />
          </div>
          <div className="w-px h-8 bg-white/[0.06] shrink-0" />
          <div className="flex-1 min-w-0 pointer-events-auto">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-bold text-red-400/40 uppercase tracking-wider">Enemy</span>
            </div>
            <NationStats power={aiNation.power} maxPower={MAX_POWER} morale={aiNation.morale} accent="ai" powerDelta={isResolving && lastRecord ? lastRecord.powerDelta.ai : undefined} moraleDelta={isResolving && lastRecord ? lastRecord.moraleDelta.ai : undefined} />
          </div>
        </div>

        {/* 우: 로그 버튼 */}
        <button
          type="button"
          onClick={() => setShowLog(true)}
          className="ml-auto shrink-0 w-9 h-9 rounded-lg border border-white/[0.06] bg-white/[0.02] flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition-colors"
          title="전황 기록"
        >
          <ScrollTextIcon size={16} />
        </button>
      </div>

      {/* ━━━━━ 모바일 상태 헤더 ━━━━━ */}
      <div className="lg:hidden flex items-stretch gap-0 rounded-lg border border-white/[0.06] bg-[#0e0e12] overflow-hidden">
        <MobileNationPanel nation={playerNation} accent="player" delta={isResolving && lastRecord ? { power: lastRecord.powerDelta.player, morale: lastRecord.moraleDelta.player } : undefined} />
        <div className="flex flex-col items-center justify-center px-4 border-x border-white/[0.06] bg-white/[0.02]">
          <span className="text-sm font-cinzel text-white/25 tracking-widest uppercase">Round</span>
          <span className="text-2xl font-cinzel font-bold text-white/60 leading-none">{currentRound}</span>
          {isClashing && <span className="text-xs text-white/30 font-bold">충돌!</span>}
          {isResolving && lastRecord && <span className="text-xs text-white/30 font-bold">결과</span>}
        </div>
        <MobileNationPanel nation={aiNation} accent="ai" delta={isResolving && lastRecord ? { power: lastRecord.powerDelta.ai, morale: lastRecord.moraleDelta.ai } : undefined} />
      </div>

      {/* ━━━━━ 본문 ━━━━━ */}
      <div className="flex flex-col gap-3 min-w-0 relative overflow-hidden flex-1">

        {/* ── 모바일: 충돌 연출 (clashing) ── */}
        {isClashing && pendingRound && (
          <div className="lg:hidden animate-fade-in rounded-lg border border-white/[0.06] bg-[#0c0c10]/90 px-4 py-6 flex flex-col items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end gap-0.5">
                <span className="text-accent font-bold text-sm">{pendingRound.playerAction.card.nickname}</span>
                <span className={`flex items-center gap-1 text-xs ${CMD_STYLE[pendingRound.playerAction.command].text}`}>
                  {CMD_ICON[pendingRound.playerAction.command]}
                  {COMMAND_LABELS[pendingRound.playerAction.command]}
                </span>
              </div>
              <span className="text-2xl font-cinzel font-bold text-white/70 tracking-widest px-1">VS</span>
              <div className="flex flex-col items-start gap-0.5">
                <span className="text-red-400 font-bold text-sm">{pendingRound.aiAction.card.nickname}</span>
                <span className={`flex items-center gap-1 text-xs ${CMD_STYLE[pendingRound.aiAction.command].text}`}>
                  {COMMAND_LABELS[pendingRound.aiAction.command]}
                  {CMD_ICON[pendingRound.aiAction.command]}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ── 모바일: 라운드 결과 (resolving) ── */}
        {isResolving && lastRecord && (
          <div className="lg:hidden">
            <RoundResultPanel record={lastRecord} compact playSfx={playSfx} onAdvance={onAdvance} />
          </div>
        )}

        {/* ── 데스크톱: 충돌/결과 오버레이 ── */}
        {isClash && pendingRound && (
          <>
            {/* 클릭으로 다음 단계 진행 (clashing → resolving) */}
            {isClashing && (
              <div
                className="hidden lg:block absolute inset-0 z-20 cursor-pointer"
                onClick={handleBattleClick}
              >
                <span className="absolute bottom-6 left-1/2 -translate-x-1/2 text-xs text-white/25 animate-pulse">
                  클릭하여 계속
                </span>
              </div>
            )}
            <div className={`hidden lg:flex absolute inset-0 flex-col items-center justify-center z-10 pointer-events-none ${isClashing ? "animate-shake" : ""}`}>
              {/* VS 대형 카드 + 좌우 명령 (clashing) */}
              {isClashing && (
                <div className="flex items-center gap-8">
                  <div style={{ animation: "clash-left 0.6s cubic-bezier(0.22,1,0.36,1) forwards" }} className="w-[240px]">
                    <FeaturedCard card={pendingRound.playerAction.card} accent="player" />
                  </div>
                  <div className="flex flex-col items-center gap-3" style={{ animation: "clash-flash 0.5s ease-out forwards" }}>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-sm font-bold text-accent/80">{pendingRound.playerAction.card.nickname}</span>
                      <span className={`flex items-center gap-1.5 text-sm ${CMD_STYLE[pendingRound.playerAction.command].text}`}>
                        {CMD_ICON[pendingRound.playerAction.command]}
                        <span className="font-bold">{COMMAND_LABELS[pendingRound.playerAction.command]}</span>
                      </span>
                    </div>
                    <span className="text-6xl font-cinzel font-bold text-white/80 tracking-widest drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]">
                      VS
                    </span>
                    <div className="flex flex-col items-start gap-1">
                      <span className="text-sm font-bold text-red-400/80">{pendingRound.aiAction.card.nickname}</span>
                      <span className={`flex items-center gap-1.5 text-sm ${CMD_STYLE[pendingRound.aiAction.command].text}`}>
                        <span className="font-bold">{COMMAND_LABELS[pendingRound.aiAction.command]}</span>
                        {CMD_ICON[pendingRound.aiAction.command]}
                      </span>
                    </div>
                  </div>
                  <div style={{ animation: "clash-right 0.6s cubic-bezier(0.22,1,0.36,1) forwards" }} className="w-[240px]">
                    <FeaturedCard card={pendingRound.aiAction.card} accent="ai" />
                  </div>
                </div>
              )}

              {/* 결과 */}
              {isResolving && lastRecord && (
                <RoundResultPanel record={lastRecord} playSfx={playSfx} onAdvance={onAdvance} />
              )}
            </div>
          </>
        )}

        {/* ── 데스크톱 selecting: 좌우 패 + 중앙 absolute ── */}
        <div className={`hidden lg:block relative py-4 ${isClash ? "invisible" : ""}`}>

          {/* 좌우 패 컨테이너 (양끝 정렬) */}
          <div className="flex justify-between px-4">

            {/* ─ 좌측: 내 패 (좌측 정렬) ─ */}
            <div className="flex flex-col gap-3 items-start">
              <div className="flex items-center gap-2 px-1">
                <h3 className="text-sm font-bold text-accent/60 tracking-wide uppercase">내 패</h3>
                <span className="text-xs text-accent/40">{playerHand.length}장</span>
                {playerDiscard.length > 0 && <span className="text-xs text-accent/25">사용 {playerDiscard.length}</span>}
                {selectedCard && isSelecting && (
                  <span className="flex items-center gap-1 text-xs text-accent/70">
                    <Check size={14} /> {selectedCard.nickname}
                  </span>
                )}
              </div>

              {/* 주장 + 2×2 통합 그리드 */}
              <div className="flex gap-3 items-stretch">
                {/* 주장 대형 카드 (사용되어도 비활성화 UI로 유지) */}
                {playerCaptain && (() => {
                  const captainRecoverable = !!playerCaptainInDiscard && selectedCommand === "govern" && isSelecting;
                  const captainRecoverSelected = captainRecoverable && selectedRecoverId === playerCaptain.id;
                  return (
                    <div
                      className={`@container w-[208px] relative transition-all ${
                        playerCaptainInDiscard
                          ? captainRecoverable
                            ? captainRecoverSelected
                              ? "ring-1 ring-amber-400 rounded-md opacity-100 cursor-pointer"
                              : "opacity-50 hover:opacity-100 cursor-pointer grayscale-[50%] hover:grayscale-0"
                            : "opacity-30 grayscale pointer-events-none"
                          : ""
                      }`}
                      onClick={captainRecoverable ? () => {
                        playSfx("sfx-card-select.mp3");
                        setSelectedRecoverId(captainRecoverSelected ? null : playerCaptain.id);
                      } : undefined}
                    >
                      <BattleCard
                        card={playerCaptain} mode="command"
                        activeCommand={isSelecting && playerCaptainInHand ? selectedCommand ?? undefined : undefined}
                        onClick={isSelecting && playerCaptainInHand ? () => handleCardClick(playerCaptain.id) : undefined}
                        selected={isSelecting && selectedCardId === playerCaptain.id}
                        disabled={!isSelecting || (!!playerCaptainInDiscard && !captainRecoverable)}
                        onInfo={onCardInfo ? () => onCardInfo(playerCaptain.id) : undefined}
                        onCaptainInfo={() => setShowCaptainInfo(true)}
                        isCaptain stretch
                      />
                      {playerCaptainInDiscard && !captainRecoverable && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <span className="text-sm font-bold text-white/50 bg-black/60 border border-white/10 px-3 py-1 rounded">사용</span>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* 2×2 그리드: 핸드 + 버린패 통합 (주장 제외) */}
                <div className="grid grid-cols-2 gap-2">
                  {playerOthers.map((card) => (
                    <div key={card.id} className="@container w-[100px]">
                      <BattleCard
                        card={card} mode="command"
                        activeCommand={isSelecting ? selectedCommand ?? undefined : undefined}
                        onClick={isSelecting ? () => handleCardClick(card.id) : undefined}
                        selected={isSelecting && selectedCardId === card.id}
                        disabled={!isSelecting}
                        onInfo={onCardInfo ? () => onCardInfo(card.id) : undefined}
                      />
                    </div>
                  ))}
                  {playerOthersDiscard.map((card) => {
                    const isRecoverable = selectedCommand === "govern" && isSelecting;
                    const isRecoverSelected = selectedRecoverId === card.id;
                    return (
                      <div key={card.id}
                        className={`@container relative w-[100px] transition-all ${
                          isRecoverable
                            ? isRecoverSelected
                              ? "ring-1 ring-amber-400 rounded-md opacity-100 cursor-pointer"
                              : "opacity-50 hover:opacity-100 cursor-pointer grayscale-[50%] hover:grayscale-0"
                            : "opacity-30 grayscale pointer-events-none"
                        }`}
                        onClick={isRecoverable ? () => {
                          playSfx("sfx-card-select.mp3");
                          setSelectedRecoverId(isRecoverSelected ? null : card.id);
                        } : undefined}
                      >
                        <BattleCard card={card} disabled={!isRecoverable} selected={isRecoverSelected} />
                        {!isRecoverable && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <span className="text-[10px] font-bold text-white/50 bg-black/60 border border-white/10 px-2 py-0.5 rounded">사용</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ─ 우측: 상대 패 (우측 정렬) ─ */}
            <div className="flex flex-col gap-3 items-end">
              <div className="flex items-center gap-2 px-1">
                <h3 className="text-sm font-bold text-red-400/60 tracking-wide uppercase">상대 패</h3>
                <span className="text-xs text-red-400/40">{aiHand.length}장</span>
                {aiDiscard.length > 0 && <span className="text-xs text-red-400/25">사용 {aiDiscard.length}</span>}
              </div>

              {/* 2×2 통합 그리드 + 주장 대형 (미러) */}
              <div className="flex gap-3 items-stretch">
                {/* 2×2 그리드: 핸드 + 버린패 통합 (주장 제외) */}
                <div className="grid grid-cols-2 gap-2">
                  {aiOthers.map((card) => {
                    const isAiSelected = aiSelectedCardId === card.id;
                    const showFace = isClash && isAiSelected;
                    return (
                      <div key={card.id} className={`@container w-[100px] ${showFace ? "ring-1 ring-red-400/50 rounded-md animate-fade-in" : ""}`}>
                        <BattleCard
                          card={card} mode="target" masked={hardMode}
                          disabled
                          onInfo={onCardInfo ? () => onCardInfo(card.id) : undefined}
                        />
                      </div>
                    );
                  })}
                  {aiOthersDiscard.map((card) => (
                    <div key={card.id} className="@container relative w-[100px] opacity-30 grayscale pointer-events-none">
                      <BattleCard card={card} disabled />
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="text-[10px] font-bold text-white/50 bg-black/60 border border-white/10 px-2 py-0.5 rounded">사용</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 주장 대형 카드 (사용되어도 비활성화 UI로 유지) */}
                {aiCaptain && (
                  <div className={`@container w-[208px] relative ${aiCaptainInDiscard ? "opacity-30 grayscale pointer-events-none" : ""}`}>
                    <BattleCard
                      card={aiCaptain} mode="target" masked={hardMode && !aiCaptainInDiscard}
                      disabled
                      onInfo={onCardInfo ? () => onCardInfo(aiCaptain.id) : undefined}
                      onCaptainInfo={() => setShowCaptainInfo(true)}
                      isCaptain stretch
                    />
                    {aiCaptainInDiscard && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="text-sm font-bold text-white/50 bg-black/60 border border-white/10 px-3 py-1 rounded">사용</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

          </div>{/* /좌우 패 */}

          {/* ─ 중앙: 군령패 + 가이드 + 출전 (absolute, 패와 독립) ─ */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="flex flex-col items-center gap-3 pointer-events-auto">
              {/* 군령패 3개 (세로 목패) */}
              <div className="flex items-end gap-2">
                {COMMANDS.map((cmd) => {
                  const isSelected = selectedCommand === cmd;
                  const rawApt = selectedCard ? calcAptitude(selectedCard, cmd) : 0;
                  const isMandateCmd = mandate?.command === cmd;
                  const apt = isMandateCmd ? rawApt * MANDATE_BONUS : rawApt;
                  const stars = selectedCard ? aptitudeToStars(apt) : 0;
                  const isDisabled = !isSelecting;
                  const label = COMMAND_LABELS[cmd];

                  return (
                    <div key={cmd}
                      className={`relative flex flex-col items-center transition-all duration-200 ${
                        isSelected ? "-translate-y-4" : isDisabled ? "" : "hover:-translate-y-0.5"
                      }`}
                    >
                      <button type="button"
                        onClick={() => !isDisabled && handleCommandClick(cmd)}
                        disabled={isDisabled}
                        className={`relative flex flex-col items-center w-[64px] rounded-[3px] overflow-hidden bg-black shadow-[2px_3px_10px_rgba(0,0,0,0.6)] transition-shadow ${
                          isDisabled
                            ? "opacity-30 cursor-not-allowed saturate-0"
                            : isSelected
                              ? "cursor-pointer ring-2 ring-red-400/60 shadow-[0_0_12px_rgba(248,113,113,0.3)]"
                              : "cursor-pointer"
                        }`}
                      >
                        <div className="absolute inset-0 bg-cover bg-center"
                          style={{
                            backgroundImage: "url('/images/textures/wood-tablet.jpg')",
                            filter: isSelected ? "brightness(0.45) saturate(0.8)" : "brightness(0.3) saturate(0.7)",
                          }}
                        />
                        <div className="relative w-full flex flex-col items-center pt-2.5 pb-1 gap-1"
                          onClick={(e) => { e.stopPropagation(); setInfoCmd(cmd); }}
                        >
                          <HelpCircle size={14} className="text-white/20 hover:text-white/50 transition-colors" />
                          <div className="w-7 h-px bg-gradient-to-r from-transparent via-[#a07850]/50 to-transparent" />
                        </div>
                        <div className="relative flex flex-col items-center gap-0.5 py-1.5">
                          {label.split("").map((char, i) => (
                            <span key={i}
                              className={`text-xl font-serif font-bold leading-none transition-colors ${
                                isMandateCmd
                                  ? "text-[#f0c850] drop-shadow-[0_0_6px_rgba(212,168,67,0.8)]"
                                  : isSelected
                                    ? "text-[#ff6b6b] drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]"
                                    : "text-[#c83232] drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]"
                              }`}
                            >{char}</span>
                          ))}
                        </div>
                        <div className="relative flex flex-col items-center gap-px py-2">
                          {Array.from({ length: 5 }, (_, i) => (
                            <span key={i}
                              className={`text-[10px] leading-none ${
                                selectedCard && i < stars
                                  ? "text-amber-300 drop-shadow-[0_0_2px_rgba(217,169,78,0.6)]"
                                  : "text-[#1a1008]"
                              }`}
                            >★</span>
                          ))}
                        </div>
                        <div className="relative w-full flex flex-col items-center pb-2">
                          <div className="w-7 h-px bg-[#8b6040]/30" />
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
              {/* 가이드 텍스트 */}
              <p className="text-xs text-white/30">{guideText}</p>
              {/* 출전 버튼 */}
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!isReady || !isSelecting}
                className={`px-10 py-3 rounded-lg font-bold text-sm transition-all ${
                  isReady && isSelecting
                    ? "bg-accent/20 border border-accent/40 text-accent hover:bg-accent/30 shadow-[0_0_16px_rgba(212,175,55,0.3)] cursor-pointer"
                    : "bg-white/[0.03] border border-white/[0.06] text-white/15 cursor-not-allowed"
                }`}
              >
                출전
              </button>
            </div>
          </div>

        </div>

        {/* ── 모바일: 카드 영역 (기존 1열 유지) ── */}
        <div className={`lg:hidden flex flex-col gap-3 min-h-0 ${isClash ? "opacity-0 pointer-events-none" : ""}`}>
          {/* 상대 패 */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 px-1">
              <h3 className="text-base font-bold text-red-400/60 tracking-wide uppercase">상대 패</h3>
              <span className="text-sm text-red-400/40">{aiHand.length}장</span>
              {aiDiscard.length > 0 && <span className="text-sm text-red-400/25">사용 {aiDiscard.length}</span>}
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {aiHand.map((card) => {
                const isAiSelected = aiSelectedCardId === card.id;
                const showFace = isClash && isAiSelected;
                return (
                  <div key={card.id} className={`@container w-[calc(30vw-8px)] sm:w-[120px] ${showFace ? "ring-1 ring-red-400/50 rounded-md animate-fade-in" : ""}`}>
                    <BattleCard
                      card={card} mode="target" masked={hardMode}
                      disabled
                      onInfo={onCardInfo ? () => onCardInfo(card.id) : undefined}
                      isCaptain={card.id === aiCaptainId}
                      onCaptainInfo={card.id === aiCaptainId ? () => setShowCaptainInfo(true) : undefined}
                    />
                  </div>
                );
              })}
              {aiDiscard.map((card) => (
                <div key={card.id} className="@container relative w-[calc(30vw-8px)] sm:w-[120px] opacity-30 grayscale pointer-events-none">
                  <BattleCard card={card} disabled />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-[10px] font-bold text-white/50 bg-black/60 border border-white/10 px-2 py-0.5 rounded">사용</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 내 패 */}
          <div className="flex flex-col gap-1.5 min-w-0">
            <div className="flex items-center gap-2 px-1">
              <h3 className="text-base font-bold text-accent/60 tracking-wide uppercase">내 패</h3>
              <span className="text-sm text-accent/40">{playerHand.length}장</span>
              {playerDiscard.length > 0 && <span className="text-sm text-accent/25">사용 {playerDiscard.length}</span>}
              {selectedCard && isSelecting && (
                <span className="flex items-center gap-1 text-sm text-accent/70">
                  <Check size={16} /> {selectedCard.nickname}
                </span>
              )}
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {playerHand.map((card) => {
                const isPlayerSelected = pendingRound?.playerAction.cardId === card.id;
                const highlight = isClash && isPlayerSelected;
                return (
                  <div key={card.id} className={`@container relative w-[calc(30vw-8px)] sm:w-[140px] ${highlight ? "ring-1 ring-accent/50 rounded-md" : ""}`}>
                    <BattleCard
                      card={card} mode="command"
                      activeCommand={isSelecting ? selectedCommand ?? undefined : undefined}
                      onClick={isSelecting ? () => handleCardClick(card.id) : undefined}
                      selected={isSelecting && selectedCardId === card.id}
                      disabled={!isSelecting}
                      onInfo={onCardInfo ? () => onCardInfo(card.id) : undefined}
                      isCaptain={card.id === playerCaptainId}
                      onCaptainInfo={card.id === playerCaptainId ? () => setShowCaptainInfo(true) : undefined}
                    />
                  </div>
                );
              })}
              {playerDiscard.map((card) => {
                const isRecoverable = selectedCommand === "govern" && isSelecting;
                const isRecoverSelected = selectedRecoverId === card.id;
                return (
                  <div key={card.id}
                    className={`@container relative w-[calc(30vw-8px)] sm:w-[140px] transition-all ${
                      isRecoverable
                        ? isRecoverSelected
                          ? "ring-1 ring-amber-400 rounded-md opacity-100 cursor-pointer"
                          : "opacity-50 hover:opacity-100 cursor-pointer grayscale-[50%] hover:grayscale-0"
                        : "opacity-30 grayscale pointer-events-none"
                    }`}
                    onClick={isRecoverable ? () => {
                      playSfx("sfx-card-select.mp3");
                      setSelectedRecoverId(isRecoverSelected ? null : card.id);
                    } : undefined}
                  >
                    <BattleCard card={card} disabled={!isRecoverable} selected={isRecoverSelected} />
                    {!isRecoverable && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="text-[10px] font-bold text-white/50 bg-black/60 border border-white/10 px-2 py-0.5 rounded">사용</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 모바일: 군령패 + 출전 */}
          <div className={`fixed bottom-16 left-0 right-0 transition-opacity duration-300 bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/95 to-transparent pt-6 pb-2 ${
            isClash ? "opacity-0 pointer-events-none" : ""
          }`}
            style={{ zIndex: Z_INDEX.gameModal - 1 }}
          >
            <p className="text-sm text-white/30 font-sans text-center mb-2">{guideText}</p>
            <div className="flex items-end justify-center gap-4">
              <div className="flex gap-2">
                {COMMANDS.map((cmd) => {
                  const isSelected = selectedCommand === cmd;
                  const rawApt = selectedCard ? calcAptitude(selectedCard, cmd) : 0;
                  const isMandateCmd = mandate?.command === cmd;
                  const apt = isMandateCmd ? rawApt * MANDATE_BONUS : rawApt;
                  const stars = selectedCard ? aptitudeToStars(apt) : 0;
                  const isDisabled = !isSelecting;
                  const label = COMMAND_LABELS[cmd];

                  return (
                    <div key={cmd}
                      className={`relative flex flex-col items-center transition-all duration-200 ${
                        isSelected ? "-translate-y-4" : isDisabled ? "" : "hover:-translate-y-0.5"
                      }`}
                    >
                      <button type="button"
                        onClick={() => !isDisabled && handleCommandClick(cmd)}
                        disabled={isDisabled}
                        className={`relative flex flex-col items-center w-[64px] rounded-[3px] overflow-hidden bg-black shadow-[2px_3px_10px_rgba(0,0,0,0.6)] transition-shadow ${
                          isDisabled
                            ? "opacity-30 cursor-not-allowed saturate-0"
                            : isSelected
                              ? "cursor-pointer ring-2 ring-red-400/60 shadow-[0_0_12px_rgba(248,113,113,0.3)]"
                              : "cursor-pointer"
                        }`}
                      >
                        <div className="absolute inset-0 bg-cover bg-center"
                          style={{
                            backgroundImage: "url('/images/textures/wood-tablet.jpg')",
                            filter: isSelected ? "brightness(0.45) saturate(0.8)" : "brightness(0.3) saturate(0.7)",
                          }}
                        />
                        <div className="relative w-full flex flex-col items-center pt-2.5 pb-1 gap-1"
                          onClick={(e) => { e.stopPropagation(); setInfoCmd(cmd); }}
                        >
                          <HelpCircle size={14} className="text-white/20 hover:text-white/50 transition-colors" />
                          <div className="w-7 h-px bg-gradient-to-r from-transparent via-[#a07850]/50 to-transparent" />
                        </div>
                        <div className="relative flex flex-col items-center gap-0.5 py-1.5">
                          {label.split("").map((char, i) => (
                            <span key={i}
                              className={`text-xl font-serif font-bold leading-none transition-colors ${
                                isMandateCmd
                                  ? "text-[#f0c850] drop-shadow-[0_0_6px_rgba(212,168,67,0.8)]"
                                  : isSelected
                                    ? "text-[#ff6b6b] drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]"
                                    : "text-[#c83232] drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]"
                              }`}
                            >{char}</span>
                          ))}
                        </div>
                        <div className="relative flex flex-col items-center gap-px py-2">
                          {Array.from({ length: 5 }, (_, i) => (
                            <span key={i}
                              className={`text-[10px] leading-none ${
                                selectedCard && i < stars
                                  ? "text-amber-300 drop-shadow-[0_0_2px_rgba(217,169,78,0.6)]"
                                  : "text-[#1a1008]"
                              }`}
                            >★</span>
                          ))}
                        </div>
                        <div className="relative w-full flex flex-col items-center pb-2">
                          <div className="w-7 h-px bg-[#8b6040]/30" />
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
              <div className="flex flex-col items-center justify-end pb-1 min-w-[72px]">
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={!isReady || !isSelecting}
                  className={`px-5 py-3 rounded-lg font-bold text-sm transition-all ${
                    isReady && isSelecting
                      ? "bg-accent/20 border border-accent/40 text-accent hover:bg-accent/30 shadow-[0_0_16px_rgba(212,175,55,0.3)] cursor-pointer"
                      : "bg-white/[0.03] border border-white/[0.06] text-white/15 cursor-not-allowed"
                  }`}
                >
                  출전
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>{/* /본문 */}

      {/* ━━━━━ 모달 ━━━━━ */}
      {infoCmd && (
        <CommandInfoModal command={infoCmd} onClose={() => setInfoCmd(null)} zIndex={Z_INDEX.gameModal} />
      )}
      {showLog && (
        <BattleLogModal records={roundRecords} mandate={mandate} onClose={() => setShowLog(false)} />
      )}
      {showCaptainInfo && (
        <CaptainInfoModal onClose={() => setShowCaptainInfo(false)} zIndex={Z_INDEX.gameModal} />
      )}
      <PhaseAnnounce data={escalationAnnounce} onDone={() => setEscalationAnnounce(null)} />
    </div>
  );
}
