/*
  파일명: components/features/game/battle/PlayPhase.tsx
  기능: v6 배틀 페이즈 UI (동시 행동)
  책임: 양측 손패 표시 + 카드/명령 선택 + 동시 공개 연출 + 상성 결과 표시
*/
"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import { Swords, ScrollText, Landmark, AlertTriangle, ScrollTextIcon } from "lucide-react";
import { useLocale } from "next-intl";
import type { BattleCard as BattleCardType, Command, NationState, RoundRecord, Mandate, BattleSubPhase, RoundAction, Difficulty } from "@/lib/game/types";
import { COMMANDS, MANDATE_BONUS, MAX_POWER, MAX_MORALE } from "@/lib/game/types";
import { calcAptitude, aptitudeToStars, getEscalation } from "@/lib/game/gameEngine";
import BattleCard from "./BattleCard";
import CommandInfoModal from "./CommandInfoModal";
import CaptainInfoModal from "./CaptainInfoModal";
import PhaseAnnounce, { type AnnounceData } from "./PhaseAnnounce";
import ClashArena from "../duel/ClashArena";
import { Z_INDEX } from "@/constants/zIndex";
import type { SpeechTone, DialogueType } from "@/lib/game/voice/types";

import {
  getBattleCommandLabel,
  getBattleCounterExplain,
  getBattleCounterLabel,
  getBattleMandateLabel,
  getBattlePlaqueLabel,
  getBattleSealLabel,
  getBattleText,
  translateBattleNarrative,
} from "./i18n";

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
  onSubmitRest?: () => void;
  onAdvanceBattle: () => "blocked" | RoundRecord | null;
  onAdvance: () => void;
  onAdvanceRest?: () => void;
  onCompleteDuel?: (winner: "player" | "ai" | "draw") => void;
  playSfx: (name: string) => void;
  showDialogue?: (celebId: string, tone: SpeechTone, type: DialogueType, meta?: { nickname: string; avatarUrl: string | null }) => void;
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
@keyframes deploy-pulse {
  0%, 100% { box-shadow: 0 0 12px 2px rgba(180,40,40,0.3), inset 0 0 20px rgba(180,40,40,0.1); }
  50% { box-shadow: 0 0 24px 6px rgba(200,50,50,0.5), inset 0 0 30px rgba(200,60,60,0.2); }
}
@keyframes deploy-ripple {
  0% { transform: scale(1); opacity: 0.6; }
  100% { transform: scale(2.2); opacity: 0; }
}
`;

/** 상성 결과 배지 (인라인 태그) */
function CounterBadge({ result, locale }: { result: "win" | "lose" | "draw"; locale: string }) {
  const config = {
    win: { text: getBattleCounterLabel("win", locale, true), cls: "text-amber-200 bg-amber-500/15 border-amber-400/30" },
    lose: { text: getBattleCounterLabel("lose", locale, true), cls: "text-red-300 bg-red-500/15 border-red-400/30" },
    draw: { text: getBattleCounterLabel("draw", locale), cls: "text-yellow-200 bg-yellow-500/15 border-yellow-400/30" },
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

function parseNarratives(result: string, locale: string): ParsedNarrative[] {
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

    return { side, type, text: translateBattleNarrative(text, locale) };
  }).filter(Boolean) as ParsedNarrative[];
}

const NARRATIVE_STYLE: Record<NarrativeType, { icon: React.ReactNode | null; cls: string; mobileCls: string }> = {
  rebellion: {
    icon: <AlertTriangle size={14} className="text-red-400 shrink-0" />,
    cls: "bg-red-500/15 border-red-400/30 text-red-300",
    mobileCls: "border-red-400/20 bg-red-500/10 text-red-300",
  },
  mandate: { icon: null, cls: "text-amber-300", mobileCls: "text-amber-300" },
  normal: { icon: null, cls: "text-white/70", mobileCls: "text-white/70" },
};

/** 에칭 구분선 */
function EtchedDivider({ className = "" }: { className?: string }) {
  return (
    <div className={`w-full flex items-center gap-3 ${className}`}>
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
      <div className="w-1 h-1 rounded-full bg-white/15" />
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
    </div>
  );
}

/** 충돌 결과 통합 패널 (모바일/데스크톱 공용) */
function RoundResultPanel({ record, compact, playSfx, onAdvance, locale, text }: {
  record: RoundRecord;
  compact?: boolean;
  playSfx: (name: string) => void;
  onAdvance: () => void;
  locale: string;
  text: ReturnType<typeof getBattleText>;
}) {
  const narratives = parseNarratives(record.result, locale);
  const counterExplain = getBattleCounterExplain(record.player.command, record.ai.command, locale);
  const playerNarrs = narratives.filter(n => n.side === "player");
  const aiNarrs = narratives.filter(n => n.side === "ai");
  const systemNarrs = narratives.filter(n => n.side === "system");

  const stagger = (i: number) => ({ animation: `result-reveal 0.35s cubic-bezier(0.22,1,0.36,1) ${100 + i * 80}ms both` });

  /* ─── 모바일 (compact) ─── */
  if (compact) {
    return (
      <div className="animate-fade-in rounded-lg border border-white/15 bg-black/90 px-4 py-4 space-y-3">

        {/* ① VS 히어로 + 좌우 명령 */}
        <div className="flex items-center justify-center gap-3">
          {/* 플레이어 측 */}
          <div className="flex-1 flex flex-col items-end gap-0.5 min-w-0">
            <span className="text-accent font-bold text-sm truncate">{record.player.card.nickname}</span>
            <span className={`flex items-center gap-1 text-xs ${CMD_STYLE[record.player.command].text}`}>
              {CMD_ICON[record.player.command]}
              {getBattleCommandLabel(record.player.command, locale)}
            </span>
            <span className={`text-[10px] tabular-nums ${record.player.effectiveAptitude > 0 ? "text-accent/70" : "text-accent/30"}`}>
              {text.play.aptitude} {record.player.aptitude.toFixed(1)}{record.player.mandateBonus && " ★"}{record.player.effectiveAptitude === 0 && ` (${text.play.invalid})`}
            </span>
          </div>
          {/* VS */}
          <span className="text-2xl font-cinzel font-bold text-white/70 tracking-widest shrink-0 px-1">VS</span>
          {/* AI 측 */}
          <div className="flex-1 flex flex-col items-start gap-0.5 min-w-0">
            <span className="text-red-400 font-bold text-sm truncate">{record.ai.card.nickname}</span>
            <span className={`flex items-center gap-1 text-xs ${CMD_STYLE[record.ai.command].text}`}>
              {getBattleCommandLabel(record.ai.command, locale)}
              {CMD_ICON[record.ai.command]}
            </span>
            <span className={`text-[10px] tabular-nums ${record.ai.effectiveAptitude > 0 ? "text-red-400/70" : "text-red-400/30"}`}>
              {text.play.aptitude} {record.ai.aptitude.toFixed(1)}{record.ai.mandateBonus && " ★"}{record.ai.effectiveAptitude === 0 && ` (${text.play.invalid})`}
            </span>
          </div>
        </div>

        {/* ② 상성 태그 + 이벤트 로그 */}
        {(narratives.length > 0) && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              {record.duelWinner ? (
                <span className={`text-[11px] font-bold ${record.duelWinner === "player" ? "text-accent" : record.duelWinner === "ai" ? "text-red-400" : "text-yellow-300"}`}>
                  ⚔ {text.play.duel} {record.duelWinner === "player" ? text.play.duelOutcome.player : record.duelWinner === "ai" ? text.play.duelOutcome.ai : text.play.duelOutcome.draw}
                </span>
              ) : (
                <>
                  <CounterBadge result={record.counterResult} locale={locale} />
                  {counterExplain && <span className="text-[11px] text-white/50">{counterExplain}</span>}
                  {record.counterResult === "draw" && (
                    <span className="text-[11px] text-white/50">
                      {text.play.aptitude} {record.player.aptitude.toFixed(1)} vs {record.ai.aptitude.toFixed(1)} → {
                        record.player.aptitude > record.ai.aptitude
                          ? `${record.player.card.nickname} ${text.play.edge}`
                          : record.ai.aptitude > record.player.aptitude
                            ? `${record.ai.card.nickname} ${text.play.edge}`
                            : text.play.tie
                      }
                    </span>
                  )}
                </>
              )}
            </div>
            {narratives.map((n, i) => {
              const style = NARRATIVE_STYLE[n.type];
              const isSpecial = n.type !== "normal";
              return (
                <div key={i} className={`flex items-start gap-1.5 text-xs rounded px-2 py-1 border ${
                  isSpecial ? style.mobileCls : "border-transparent text-white/70"
                }`}>
                  {style.icon}
                  <span className="text-white/50 shrink-0 w-5">
                    {n.side === "player" ? text.play.ally[0] : n.side === "ai" ? text.play.enemy[0] : ""}
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
            {text.play.next}
          </button>
        </div>
      </div>
    );
  }

  /* ─── 데스크톱 ─── */
  return (
    <div className="pointer-events-auto rounded-2xl bg-black/90 border border-white/15 shadow-[0_8px_60px_rgba(0,0,0,0.7)] px-8 py-6 max-w-2xl mx-auto space-y-5" style={stagger(0)}>

      {/* ① 좌우 카드 + 중앙 VS + 상성 */}
      <div className="flex items-start justify-center gap-6" style={stagger(0)}>
        {/* 플레이어 카드 */}
        <div className="flex flex-col items-center gap-2 min-w-0 flex-1">
          <FeaturedCard card={record.player.card} accent="player" command={record.player.command} locale={locale} />
          <span className={`text-[10px] tabular-nums ${record.player.effectiveAptitude > 0 ? "text-accent/70" : "text-accent/40"}`}>
            {text.play.aptitude} {record.player.aptitude.toFixed(1)}{record.player.mandateBonus && " ★"}{record.player.effectiveAptitude === 0 && ` (${text.play.invalid})`}
          </span>
        </div>
        {/* VS + 상성 중앙 */}
        <div className="flex flex-col items-center justify-center shrink-0 pt-6 gap-3">
          <span
            className="text-4xl font-cinzel font-bold text-white/80 tracking-[0.15em] drop-shadow-[0_0_20px_rgba(255,255,255,0.15)] select-none"
            style={{ animation: "clash-flash 0.5s ease-out forwards" }}
          >
            VS
          </span>
          {record.duelWinner ? (
            <span className={`text-sm font-bold ${record.duelWinner === "player" ? "text-accent" : record.duelWinner === "ai" ? "text-red-400" : "text-yellow-300"}`}>
              ⚔ {text.play.duel} {record.duelWinner === "player" ? text.play.duelOutcome.player : record.duelWinner === "ai" ? text.play.duelOutcome.ai : text.play.duelOutcome.draw}
            </span>
          ) : (
            <>
              <CounterBadge result={record.counterResult} locale={locale} />
              {counterExplain && (
                <span className="text-[11px] text-white/50 text-center leading-snug">
                  {counterExplain}
                </span>
              )}
              {record.counterResult === "draw" && (
                <span className="text-[11px] text-white/50 text-center leading-snug">
                  {text.play.aptitude} {record.player.aptitude.toFixed(1)} vs {record.ai.aptitude.toFixed(1)}<br />{
                    record.player.aptitude > record.ai.aptitude
                      ? `${record.player.card.nickname} ${text.play.edge}`
                      : record.ai.aptitude > record.player.aptitude
                        ? `${record.ai.card.nickname} ${text.play.edge}`
                        : text.play.tie
                  }
                </span>
              )}
            </>
          )}
        </div>
        {/* AI 카드 */}
        <div className="flex flex-col items-center gap-2 min-w-0 flex-1">
          <FeaturedCard card={record.ai.card} accent="ai" command={record.ai.command} locale={locale} />
          <span className={`text-[10px] tabular-nums ${record.ai.effectiveAptitude > 0 ? "text-red-400/70" : "text-red-400/40"}`}>
            {text.play.aptitude} {record.ai.aptitude.toFixed(1)}{record.ai.mandateBonus && " ★"}{record.ai.effectiveAptitude === 0 && ` (${text.play.invalid})`}
          </span>
        </div>
      </div>

      <EtchedDivider />

      {/* ② 이벤트 로그 */}
      <div className="space-y-2" style={stagger(1)}>
        {/* 이벤트 로그 */}
        {playerNarrs.length > 0 && (
          <div className="rounded-lg border border-accent/20 bg-accent/5 px-4 py-2.5">
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-accent/60" />
              <span className="text-[10px] font-bold text-accent/60 uppercase tracking-wider">{text.play.ally}</span>
            </div>
            <div className="space-y-1">
              {playerNarrs.map((n, i) => {
                const style = NARRATIVE_STYLE[n.type];
                const isSpecial = n.type !== "normal";
                return (
                  <div key={i} className={`flex items-center gap-2 text-xs leading-relaxed ${
                    isSpecial ? `${style.cls} rounded px-2 py-1 border` : "text-white/70"
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
          <div className="rounded-lg border border-red-400/20 bg-red-500/5 px-4 py-2.5">
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-red-400/60" />
              <span className="text-[10px] font-bold text-red-400/60 uppercase tracking-wider">{text.play.enemy}</span>
            </div>
            <div className="space-y-1">
              {aiNarrs.map((n, i) => {
                const style = NARRATIVE_STYLE[n.type];
                const isSpecial = n.type !== "normal";
                return (
                  <div key={i} className={`flex items-center gap-2 text-xs leading-relaxed ${
                    isSpecial ? `${style.cls} rounded px-2 py-1 border` : "text-white/70"
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
            <div key={i} className={`flex items-center justify-center gap-2 text-xs rounded-lg border px-4 py-2.5 ${style.cls}`}>
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
          {text.play.nextRound}
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
  const locale = useLocale();
  const text = getBattleText(locale);
  const isPlayer = accent === "player";
  const powerBar = isPlayer ? "bg-accent" : "bg-red-500";
  const moraleBar = isPlayer ? "bg-accent/60" : "bg-red-500/60";
  const numColor = isPlayer ? "text-accent" : "text-red-400";
  const labelColor = isPlayer ? "text-accent/70" : "text-red-400/70";
  const pd = powerDelta ?? 0;
  const md = moraleDelta ?? 0;
  const prevPower = power - pd;
  const prevMorale = morale - md;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        <span className={`text-[10px] font-bold shrink-0 ${labelColor}`}>{text.result.power}</span>
        <div className="flex-1 h-[6px] lg:h-2 rounded-full bg-black/50 lg:bg-white/15 overflow-hidden relative">
          {pd < 0 && (
            <div className="absolute inset-y-0 left-0 rounded-full bg-red-500/40" style={{ width: `${(prevPower / maxPower) * 100}%` }} />
          )}
          {pd > 0 && (
            <div className="absolute inset-y-0 left-0 rounded-full bg-emerald-500/30" style={{ width: `${(power / maxPower) * 100}%` }} />
          )}
          <div className={`absolute inset-y-0 left-0 rounded-full ${powerBar} transition-all duration-700 ease-out`} style={{ width: `${(power / maxPower) * 100}%` }} />
        </div>
        <div className="flex items-center gap-0.5 shrink-0 min-w-[32px] lg:min-w-[40px] justify-end">
          <span className={`text-sm font-cinzel font-bold tabular-nums text-right ${numColor}`}>{power}</span>
          {pd !== 0 && (
            <span className={`text-[9px] font-bold tabular-nums ${pd > 0 ? "text-emerald-400" : "text-red-400"}`}>
              {pd > 0 ? `+${pd}` : pd}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <span className={`text-[10px] font-bold shrink-0 ${labelColor}`}>{text.result.morale}</span>
        <div className="flex-1 h-[6px] lg:h-1.5 rounded-full bg-black/50 lg:bg-white/15 overflow-hidden relative">
          {md < 0 && (
            <div className="absolute inset-y-0 left-0 rounded-full bg-red-500/40" style={{ width: `${(prevMorale / MAX_MORALE) * 100}%` }} />
          )}
          {md > 0 && (
            <div className="absolute inset-y-0 left-0 rounded-full bg-emerald-500/30" style={{ width: `${(morale / MAX_MORALE) * 100}%` }} />
          )}
          <div className={`absolute inset-y-0 left-0 rounded-full ${moraleBar} transition-all duration-700 ease-out`} style={{ width: `${(morale / MAX_MORALE) * 100}%` }} />
        </div>
        <div className="flex items-center gap-0.5 shrink-0 min-w-[24px] lg:min-w-[30px] justify-end">
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


/** 좌우 패널용 충돌 카드 */
function FeaturedCard({ card, accent, command, locale }: { card: BattleCardType; accent: "player" | "ai"; command?: Command; locale: string }) {
  const border = accent === "player" ? "border-accent/40" : "border-red-500/40";
  const bg = accent === "player" ? "bg-black/90" : "bg-black/90";
  const nameColor = accent === "player" ? "text-accent" : "text-red-400";
  const titleColor = accent === "player" ? "text-accent/70" : "text-red-400/70";
  const imgSrc = card.avatarUrl;

  return (
    <div className={`w-full rounded-xl border ${border} ${bg} overflow-hidden`}>
      {imgSrc ? (
        <div className="relative w-full aspect-square">
          <Image src={imgSrc} alt={card.nickname} fill className="object-cover" sizes="200px" />
        </div>
      ) : (
        <div className="w-full aspect-square bg-white/5 flex items-center justify-center">
          <span className="text-3xl text-white/40 font-bold">{card.nickname[0]}</span>
        </div>
      )}
      <div className="px-2.5 py-2 space-y-1">
        <p className={`text-sm font-bold truncate ${nameColor}`}>{card.nickname}</p>
        {card.title && <p className={`text-[11px] truncate ${titleColor}`}>{card.title}</p>}
        {command && (
          <div className={`flex items-center gap-1.5 text-xs ${CMD_STYLE[command].text}`}>
            {CMD_ICON[command]}
            <span className="font-bold">{getBattleCommandLabel(command, locale)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/** 전황 로그 모달 */
function BattleLogModal({ records, mandate, onClose, locale, text }: {
  records: RoundRecord[];
  mandate: Mandate | null;
  onClose: () => void;
  locale: string;
  text: ReturnType<typeof getBattleText>;
}) {
  const reversed = useMemo(() => [...records].reverse(), [records]);

  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: Z_INDEX.gameModal }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md mx-4 rounded-2xl border border-white/15 bg-black/95 backdrop-blur-xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/15">
          <div className="flex items-center gap-2">
            <ScrollTextIcon size={16} className="text-white/60" />
            <span className="text-sm font-bold text-white/80">{text.play.recordTitle}</span>
            {mandate && <span className="text-[10px] text-amber-400/70 font-bold">{getBattleMandateLabel(mandate.command, locale)}</span>}
          </div>
          <button type="button" onClick={onClose} className="text-white/50 hover:text-white/80 transition-colors p-1">
            <span className="text-lg leading-none">&times;</span>
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto px-4 py-3 space-y-1 scrollbar-thin scrollbar-thumb-white/10">
          {reversed.length === 0 && (
            <div className="text-center text-white/40 text-xs py-8">{text.play.noRecord}</div>
          )}
          {reversed.map((rec) => {
            const pDelta = rec.powerDelta.player;
            const counterLabel = rec.duelWinner
              ? `⚔ ${text.play.duel} ${rec.duelWinner === "player" ? text.play.duelOutcome.player : rec.duelWinner === "ai" ? text.play.duelOutcome.ai : text.play.duelOutcome.draw}`
              : getBattleCounterLabel(rec.counterResult, locale);
            const counterColor = rec.duelWinner
              ? (rec.duelWinner === "player" ? "text-accent" : rec.duelWinner === "ai" ? "text-red-400" : "text-yellow-300")
              : rec.counterResult === "win" ? "text-amber-300" : rec.counterResult === "lose" ? "text-red-400" : "text-yellow-300";
            return (
              <div key={rec.round} className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-white/60 rounded-lg hover:bg-white/5">
                <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold shrink-0">{rec.round}</span>
                <span className="text-accent/70 truncate">{rec.player.card.nickname}</span>
                <span className="text-white/40 text-[10px]">vs</span>
                <span className="text-red-400/70 truncate">{rec.ai.card.nickname}</span>
                <span className={`text-[10px] font-bold ${counterColor}`}>{counterLabel}</span>
                <span className={`text-[10px] font-bold ml-auto ${pDelta > 0 ? "text-emerald-400/80" : pDelta < 0 ? "text-red-400/80" : "text-white/40"}`}>
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
  onSubmit, onSubmitRest, onAdvanceBattle, onAdvance, onAdvanceRest, onCompleteDuel, playSfx, showDialogue, onCardInfo,
}: Props) {
  const locale = useLocale();
  const text = getBattleText(locale);
  const formatHandCount = useCallback(
    (count: number) => (locale.startsWith("en") ? `${count} cards` : `${count}장`),
    [locale],
  );
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
        title: text.play.escalateTitle,
        subtitle: `${text.play.escalateSubtitlePrefix}${pct}%`,
        tone: "red",
      });
    }
  }, [currentRound, battleSubPhase, text.play.escalateSubtitlePrefix, text.play.escalateTitle]);

  const isSelecting = battleSubPhase === "selecting";
  const isClashing = battleSubPhase === "clashing";
  const isResolving = battleSubPhase === "resolving";
  const isResting = battleSubPhase === "resting";
  const isClash = isClashing || isResolving;
  const playerExhausted = isSelecting && playerHand.length === 0 && playerDiscard.length > 0;

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
      // 출전 카드의 deploy 보이스
      const playerCard = playerHand.find((c) => c.id === pendingRound.playerAction.cardId);
      if (playerCard) showDialogue?.(playerCard.id, playerCard.speechTone, "deploy", { nickname: playerCard.nickname, avatarUrl: playerCard.avatarUrl });
    }
  }, [battleSubPhase, pendingRound, playSfx, showDialogue, playerHand]);

  // ── 일기토 결과 대사: dueling → resolving 전환 시 ──
  const prevSubPhaseRef = useRef(battleSubPhase);
  useEffect(() => {
    const prev = prevSubPhaseRef.current;
    prevSubPhaseRef.current = battleSubPhase;
    if (prev === "dueling" && battleSubPhase === "resolving" && roundRecords.length > 0) {
      const lastRec = roundRecords[roundRecords.length - 1];
      const pCard = playerHand.find((c) => c.id === lastRec.player.cardId);
      if (pCard) {
        const voiceType = lastRec.counterResult === "win" ? "battle_win" : lastRec.counterResult === "lose" ? "battle_lose" : "battle_draw";
        showDialogue?.(pCard.id, pCard.speechTone, voiceType, { nickname: pCard.nickname, avatarUrl: pCard.avatarUrl });
        playSfx(lastRec.counterResult === "draw" ? "sfx-clash-clang.mp3" : "sfx-clash-slash.mp3");
      }
    }
  }, [battleSubPhase, roundRecords, playerHand, showDialogue, playSfx]);

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
    const card = playerHand.find((c) => c.id === cardId);
    if (card) showDialogue?.(card.id, card.speechTone, "roll_call", { nickname: card.nickname, avatarUrl: card.avatarUrl });
  }, [playSfx, isSelecting, playerHand, showDialogue]);

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
    ? isClashing ? text.play.clash : text.play.resolving
    : playerExhausted
    ? text.play.exhausted
    : !selectedCardId
    ? text.play.chooseCard
    : !selectedCommand
    ? text.play.chooseCommand
    : text.play.ready;

  // clashing에서 클릭 → clash_attack 보이스 → resolving + 결과 SFX 직접 재생
  const handleBattleClick = useCallback(() => {
    // 충돌 기합 (clash_attack)
    if (pendingRound) {
      const atkCard = playerHand.find((c) => c.id === pendingRound.playerAction.cardId);
      if (atkCard) showDialogue?.(atkCard.id, atkCard.speechTone, "clash_attack", { nickname: atkCard.nickname, avatarUrl: atkCard.avatarUrl });
    }

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

    // 충돌 결과 보이스 (플레이어 카드 기준)
    const pCard = playerHand.find((c) => c.id === rec.player.cardId);
    if (pCard) {
      const voiceType = rec.counterResult === "win" ? "battle_win" : rec.counterResult === "lose" ? "battle_lose" : "battle_draw";
      showDialogue?.(pCard.id, pCard.speechTone, voiceType, { nickname: pCard.nickname, avatarUrl: pCard.avatarUrl });
    }
  }, [onAdvanceBattle, playSfx, showDialogue, playerHand, pendingRound]);

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
    <div className="w-full lg:flex-1 lg:min-h-0 select-none flex flex-col relative gap-2 sm:gap-4 pb-4">
      {isClash && <style>{CLASH_KEYFRAMES}</style>}

      {/* ━━━━━ 휴식 턴 오버레이 ━━━━━ */}
      {isResting && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm rounded-2xl">
          <div className="flex flex-col items-center gap-4 text-center">
            <span className="text-2xl">🔄</span>
            <div>
              <p className="text-sm font-bold text-white/80">{text.play.restTitle}</p>
              <p className="text-xs text-white/50 mt-1">{text.play.restDescription}</p>
            </div>
            <button
              type="button"
              onClick={onAdvanceRest}
              className="px-5 py-2 rounded-lg bg-accent/15 border border-accent/25 text-accent text-xs font-bold hover:bg-accent/25 transition-colors"
            >
              {text.play.restComplete}
            </button>
          </div>
        </div>
      )}

      {/* ━━━━━ 통합 상태 헤더 (모바일 + PC) ━━━━━ */}
      <div className="flex items-stretch rounded-xl border border-white/10 bg-[#16141a]/90 backdrop-blur shadow-[0_4px_24px_rgba(0,0,0,0.4)] overflow-hidden min-h-[85px] lg:max-w-3xl lg:mx-auto lg:w-full relative shrink-0">

        {/* 좌측 (Player) */}
        <div className="flex-1 flex flex-col justify-center pl-5 pr-2 py-2">
          <span className="text-[11px] font-black text-accent/90 tracking-widest uppercase mb-1 text-center">PLAYER</span>
          <NationStats power={playerNation.power} maxPower={MAX_POWER} morale={playerNation.morale} accent="player" powerDelta={isResolving && lastRecord ? lastRecord.powerDelta.player : undefined} moraleDelta={isResolving && lastRecord ? lastRecord.moraleDelta.player : undefined} />
        </div>

        {/* 중앙 (Round + 로그) */}
        <div className="shrink-0 w-[60px] sm:w-[70px] lg:w-[90px] flex flex-col items-center justify-center relative gap-0.5">
          <span className="text-[9px] sm:text-[10px] font-cinzel text-white/50 tracking-[0.2em] uppercase">RND</span>
          <span className="text-2xl sm:text-3xl font-cinzel font-black text-white/90 leading-none drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]">{currentRound}</span>
          {mandate && (
            <span className="text-[8px] lg:text-[9px] text-amber-400/80 font-bold mt-0.5 truncate max-w-full px-1">{getBattleMandateLabel(mandate.command, locale)}</span>
          )}
          {isClashing && <span className="absolute -bottom-2 text-[9px] text-white/60 font-bold">{text.play.clash}</span>}
          {isResolving && lastRecord && <span className="absolute -bottom-2 text-[9px] text-white/60 font-bold">{text.play.result}</span>}
        </div>

        {/* 우측 (Enemy) */}
        <div className="flex-1 flex flex-col justify-center pl-2 pr-4 py-2">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <span className="text-[11px] font-black text-red-500/90 tracking-widest uppercase text-center">ENEMY</span>
            <button
              type="button"
              onClick={() => setShowLog(true)}
              className="shrink-0 w-5 h-5 rounded border border-white/15 bg-black/40 flex items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/10 transition-colors"
              title={text.play.battleLog}
            >
              <ScrollTextIcon size={10} />
            </button>
          </div>
          <NationStats power={aiNation.power} maxPower={MAX_POWER} morale={aiNation.morale} accent="ai" powerDelta={isResolving && lastRecord ? lastRecord.powerDelta.ai : undefined} moraleDelta={isResolving && lastRecord ? lastRecord.moraleDelta.ai : undefined} />
        </div>
      </div>

      {/* ━━━━━ 본문 ━━━━━ */}
      <div className="flex flex-col lg:min-w-0 lg:min-h-0 relative lg:flex-1 w-full gap-4">

        {/* ── 모바일: 충돌 연출 (clashing) ── */}
        {isClashing && pendingRound && (
          <div
            className="lg:hidden fixed inset-0 flex items-center justify-center bg-black/80 cursor-pointer"
            style={{ zIndex: Z_INDEX.gameModal - 1 }}
            onClick={handleBattleClick}
          >
            <div className="flex items-center gap-3 animate-fade-in">
              {/* 아군 카드 */}
              <div className="flex flex-col items-center gap-2" style={{ animation: "clash-left 0.6s cubic-bezier(0.22,1,0.36,1) forwards" }}>
                <div className="w-20 h-20 rounded-lg overflow-hidden border-2 border-accent/50 shadow-[0_0_16px_rgba(212,175,55,0.3)]">
                  {pendingRound.playerAction.card.avatarUrl ? (
                    <Image src={pendingRound.playerAction.card.avatarUrl} alt={pendingRound.playerAction.card.nickname} width={80} height={80} className="object-cover w-full h-full" />
                  ) : (
                    <div className="w-full h-full bg-[#1a1a20] flex items-center justify-center">
                      <span className="text-2xl text-white/30 font-bold">{pendingRound.playerAction.card.nickname[0]}</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-accent font-bold text-sm">{pendingRound.playerAction.card.nickname}</span>
                  <span className={`flex items-center gap-1 text-xs ${CMD_STYLE[pendingRound.playerAction.command].text}`}>
                    {CMD_ICON[pendingRound.playerAction.command]}
                    {getBattleCommandLabel(pendingRound.playerAction.command, locale)}
                  </span>
                </div>
              </div>

              {/* VS */}
              <div className="flex flex-col items-center gap-1" style={{ animation: "clash-flash 0.5s ease-out forwards" }}>
                <span className="text-3xl font-cinzel font-bold text-white/80 tracking-widest drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">
                  VS
                </span>
              </div>

              {/* 적군 카드 */}
              <div className="flex flex-col items-center gap-2" style={{ animation: "clash-right 0.6s cubic-bezier(0.22,1,0.36,1) forwards" }}>
                <div className="w-20 h-20 rounded-lg overflow-hidden border-2 border-red-400/50 shadow-[0_0_16px_rgba(248,113,113,0.3)]">
                  {pendingRound.aiAction.card.avatarUrl ? (
                    <Image src={pendingRound.aiAction.card.avatarUrl} alt={pendingRound.aiAction.card.nickname} width={80} height={80} className="object-cover w-full h-full" />
                  ) : (
                    <div className="w-full h-full bg-[#1a1a20] flex items-center justify-center">
                      <span className="text-2xl text-white/30 font-bold">{pendingRound.aiAction.card.nickname[0]}</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-red-400 font-bold text-sm">{pendingRound.aiAction.card.nickname}</span>
                  <span className={`flex items-center gap-1 text-xs ${CMD_STYLE[pendingRound.aiAction.command].text}`}>
                    {getBattleCommandLabel(pendingRound.aiAction.command, locale)}
                    {CMD_ICON[pendingRound.aiAction.command]}
                  </span>
                </div>
              </div>
            </div>
            <span className="absolute bottom-12 text-xs text-white/40 animate-pulse">{text.play.tapContinue}</span>
          </div>
        )}

        {/* ── 모바일: 라운드 결과 (resolving) ── */}
        {isResolving && lastRecord && (
          <div
            className="lg:hidden fixed inset-0 flex items-center justify-center px-4 bg-black/80"
            style={{ zIndex: Z_INDEX.gameModal - 1 }}
          >
            <div className="w-full max-w-sm">
              <RoundResultPanel record={lastRecord} compact playSfx={playSfx} onAdvance={onAdvance} locale={locale} text={text} />
            </div>
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
                <span className="absolute bottom-6 left-1/2 -translate-x-1/2 text-xs text-white/50 animate-pulse">
                  {text.play.clickContinue}
                </span>
              </div>
            )}
            <div className={`hidden lg:flex absolute inset-0 flex-col items-center justify-center z-10 pointer-events-none ${isClashing ? "animate-shake" : ""}`}>
              {/* VS 대형 카드 + 좌우 명령 (clashing) */}
              {isClashing && (
                <div className="flex items-center gap-6">
                  <div style={{ animation: "clash-left 0.6s cubic-bezier(0.22,1,0.36,1) forwards" }} className="w-[160px] xl:w-[200px]">
                    <FeaturedCard card={pendingRound.playerAction.card} accent="player" command={pendingRound.playerAction.command} locale={locale} />
                  </div>
                  <div className="bg-black/80 rounded-xl px-5 py-4 flex items-center justify-center" style={{ animation: "clash-flash 0.5s ease-out forwards" }}>
                    <span className="text-5xl font-cinzel font-bold text-white/80 tracking-widest drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]">
                      VS
                    </span>
                  </div>
                  <div style={{ animation: "clash-right 0.6s cubic-bezier(0.22,1,0.36,1) forwards" }} className="w-[160px] xl:w-[200px]">
                    <FeaturedCard card={pendingRound.aiAction.card} accent="ai" command={pendingRound.aiAction.command} locale={locale} />
                  </div>
                </div>
              )}

              {/* 결과 */}
              {isResolving && lastRecord && (
                <RoundResultPanel record={lastRecord} playSfx={playSfx} onAdvance={onAdvance} locale={locale} text={text} />
              )}
            </div>
          </>
        )}

        {/* ── 데스크톱 selecting: 좌 내패 | 중앙 군령 | 우 상대패 ── */}
        <div className={`hidden lg:flex items-center justify-center flex-1 min-h-0 px-4 py-4 gap-4 ${isClash ? "invisible" : ""}`}>

            {/* ─ 좌측: 내 패 ─ */}
            <div className="flex flex-col gap-2 bg-black/80 rounded-xl p-3">
              <div className="flex items-center gap-2 px-1">
                <h3 className="text-xs font-bold text-accent/70 tracking-wide uppercase">{text.play.handMine}</h3>
                <span className="text-xs text-accent/50">{formatHandCount(playerHand.length)}</span>
                {playerDiscard.length > 0 && <span className="text-xs text-accent/40">{text.play.used} {playerDiscard.length}</span>}
              </div>
              <div className="flex items-start gap-3">
                {/* 일반 카드 2×2 */}
                {(() => {
                  const allCards = [
                    ...playerOthers.map(c => ({ card: c, isDiscard: false })),
                    ...playerOthersDiscard.map(c => ({ card: c, isDiscard: true })),
                  ];
                  return (
                    <div className="grid grid-cols-[repeat(2,100px)] xl:grid-cols-[repeat(2,130px)] gap-2 xl:gap-3">
                      {allCards.map(({ card, isDiscard }) => {
                        if (isDiscard) {
                          const isRecoverable = selectedCommand === "govern" && isSelecting;
                          const isRecoverSelected = selectedRecoverId === card.id;
                          return (
                            <div key={card.id}
                              className={`@container relative transition-all ${
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
                              <BattleCard card={card} disabled={!isRecoverable} selected={isRecoverSelected} isCaptain={false} />
                              {!isRecoverable && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                  <span className="text-[10px] font-bold text-white/50 bg-black/60 border border-white/10 px-2 py-0.5 rounded">{text.play.used}</span>
                                </div>
                              )}
                            </div>
                          );
                        }
                        return (
                          <div key={card.id} className="@container">
                            <BattleCard
                              card={card} mode="command"
                              activeCommand={isSelecting ? selectedCommand ?? undefined : undefined}
                              onClick={isSelecting ? () => handleCardClick(card.id) : undefined}
                              selected={isSelecting && selectedCardId === card.id}
                              disabled={!isSelecting}
                              onInfo={onCardInfo ? () => onCardInfo(card.id) : undefined}
                              isCaptain={false}
                            />
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
                {/* 주장 (우측 — 군령패에 가까운 쪽) */}
                {playerCaptain && (() => {
                  const isCaptainDiscard = !!playerCaptainInDiscard;
                  if (isCaptainDiscard) {
                    const isRecoverable = selectedCommand === "govern" && isSelecting;
                    const isRecoverSelected = selectedRecoverId === playerCaptain.id;
                    return (
                      <div className="shrink-0 self-center">
                        <div
                          className={`@container w-[120px] xl:w-[160px] relative transition-all ${
                            isRecoverable
                              ? isRecoverSelected
                                ? "ring-1 ring-amber-400 rounded-md opacity-100 cursor-pointer"
                                : "opacity-50 hover:opacity-100 cursor-pointer grayscale-[50%] hover:grayscale-0"
                              : "opacity-30 grayscale pointer-events-none"
                          }`}
                          onClick={isRecoverable ? () => {
                            playSfx("sfx-card-select.mp3");
                            setSelectedRecoverId(isRecoverSelected ? null : playerCaptain.id);
                          } : undefined}
                        >
                          <BattleCard card={playerCaptain} disabled={!isRecoverable} selected={isRecoverSelected} isCaptain onCaptainInfo={() => setShowCaptainInfo(true)} />
                          {!isRecoverable && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <span className="text-[10px] font-bold text-white/50 bg-black/60 border border-white/10 px-2 py-0.5 rounded">{text.play.used}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div className="shrink-0 self-center">
                      <div className="@container w-[120px] xl:w-[160px]">
                        <BattleCard
                          card={playerCaptain} mode="command"
                          activeCommand={isSelecting ? selectedCommand ?? undefined : undefined}
                          onClick={isSelecting ? () => handleCardClick(playerCaptain.id) : undefined}
                          selected={isSelecting && selectedCardId === playerCaptainId}
                          disabled={!isSelecting}
                          onInfo={onCardInfo ? () => onCardInfo(playerCaptain.id) : undefined}
                          isCaptain
                          onCaptainInfo={() => setShowCaptainInfo(true)}
                        />
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* ─ 중앙: 군령패 + 가이드 + 출전 ─ */}
            <div className="flex flex-col items-center gap-3 shrink-0 bg-black/80 rounded-xl p-4 pt-8">
              {/* 군령패 3개 (세로 목패) */}
              <div className="flex items-end gap-2.5 xl:gap-3.5">
                {COMMANDS.map((cmd) => {
                  const isSelected = selectedCommand === cmd;
                  const rawApt = selectedCard ? calcAptitude(selectedCard, cmd) : 0;
                  const isMandateCmd = mandate?.command === cmd;
                  const apt = isMandateCmd ? rawApt * MANDATE_BONUS : rawApt;
                  const stars = selectedCard ? aptitudeToStars(apt) : 0;
                  const isDisabled = !isSelecting;
                  const label = getBattlePlaqueLabel(cmd, locale);

                  return (
                    <div key={cmd}
                      className={`relative flex flex-col items-center transition-all duration-300 ease-out ${
                        isSelected ? "-translate-y-3" : isDisabled ? "" : "hover:-translate-y-1"
                      }`}
                    >
                      {/* 선택 시 하단 광원 */}
                      {isSelected && !isDisabled && (
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-[80%] h-3 rounded-full pointer-events-none" style={{
                          background: "radial-gradient(ellipse, rgba(248,113,113,0.5) 0%, transparent 70%)",
                          filter: "blur(4px)",
                        }} />
                      )}
                      <button type="button"
                        onClick={() => !isDisabled && handleCommandClick(cmd)}
                        disabled={isDisabled}
                        className={`relative flex flex-col items-center w-[64px] xl:w-[88px] rounded-[3px] overflow-hidden bg-black transition-all duration-300 ${
                          isDisabled
                            ? "opacity-30 cursor-not-allowed saturate-0 shadow-[1px_2px_6px_rgba(0,0,0,0.4)]"
                            : isSelected
                              ? "cursor-pointer shadow-[0_4px_20px_rgba(0,0,0,0.7),0_0_15px_rgba(248,113,113,0.2)]"
                              : "cursor-pointer shadow-[2px_3px_10px_rgba(0,0,0,0.6)] brightness-[0.85] hover:brightness-100"
                        }`}
                      >
                        {/* 목재 텍스처 */}
                        <div className="absolute inset-0 bg-cover bg-center"
                          style={{
                            backgroundImage: "url('/images/textures/wood-tablet.jpg')",
                            filter: isSelected ? "brightness(0.4) saturate(1.1)" : "brightness(0.25) saturate(0.8)",
                          }}
                        />
                        {/* 스크래치/마모 오버레이 */}
                        <div className="absolute inset-0 opacity-[0.08] mix-blend-overlay" style={{
                          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='5' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
                        }} />
                        {/* 모서리 마모 (비네팅) */}
                        <div className="absolute inset-0 rounded-[3px]" style={{
                          boxShadow: "inset 3px 3px 6px rgba(0,0,0,0.35), inset -3px -3px 6px rgba(0,0,0,0.25), inset 0 0 12px rgba(0,0,0,0.2)",
                        }} />
                        {/* 외곽 금속/옻칠 테두리 */}
                        <div className="absolute inset-0 rounded-[3px]" style={{
                          boxShadow: isSelected
                            ? "inset 0 0 0 1.5px rgba(180,80,50,0.5), 0 0 0 1px rgba(0,0,0,0.6)"
                            : "inset 0 0 0 1px rgba(100,70,45,0.3), 0 0 0 1px rgba(0,0,0,0.4)",
                        }} />
                        {/* 상단: 봉인 인장 + 정보 */}
                        <div className="relative w-full flex flex-col items-center pt-2 xl:pt-2.5 pb-1 gap-1"
                          onClick={(e) => { e.stopPropagation(); setInfoCmd(cmd); }}
                        >
                          <div className="relative w-5 h-5 xl:w-6 xl:h-6 flex items-center justify-center cursor-help">
                            {/* 인장 원형 베이스 */}
                            <div className="absolute inset-0 rounded-full" style={{
                              background: "radial-gradient(circle at 40% 35%, #6a4830 0%, #3a2818 60%, #2a1a10 100%)",
                              boxShadow: "inset 0 1px 2px rgba(140,100,60,0.3), inset 0 -1px 2px rgba(0,0,0,0.5), 0 1px 3px rgba(0,0,0,0.4)",
                            }} />
                            <span className="relative text-[8px] xl:text-[10px] font-bold select-none" style={{
                              fontFamily: "'Noto Serif KR', serif",
                              color: "rgba(200,160,100,0.6)",
                              textShadow: "0 -1px 1px rgba(0,0,0,0.8)",
                            }}>
                              {getBattleSealLabel(cmd, locale)}
                            </span>
                          </div>
                          <div className="w-7 xl:w-9 h-px bg-gradient-to-r from-transparent via-[#a07850]/40 to-transparent" />
                        </div>
                        {/* 중앙: 명령 글자 (붓 터치 강조) */}
                        <div className="relative flex flex-col items-center gap-0.5 xl:gap-1 py-1.5 xl:py-2">
                          {label.split("").map((char, i) => (
                            <span key={i}
                              className="block text-xl xl:text-2xl font-bold leading-none transition-colors duration-300"
                              style={{
                                fontFamily: "'Noto Serif KR', serif",
                                ...(isMandateCmd ? {
                                  color: "#f0c850",
                                  textShadow: "0 1px 2px rgba(0,0,0,0.8), 0 0 8px rgba(212,168,67,0.6)",
                                } : isSelected ? {
                                  color: "#ff7070",
                                  textShadow: "0 1px 2px rgba(0,0,0,0.8), 0 0 6px rgba(248,113,113,0.4)",
                                } : {
                                  color: "#9a2a2a",
                                  textShadow: "0 1px 2px rgba(0,0,0,0.6), 0 -1px 1px rgba(140,60,40,0.15)",
                                }),
                              }}
                            >{char}</span>
                          ))}
                        </div>
                        {/* 하단: 별점 (금속 핀 스타일) */}
                        <div className="relative flex flex-col items-center gap-[3px] xl:gap-1 py-2 xl:py-2.5">
                          {Array.from({ length: 5 }, (_, i) => {
                            const lit = selectedCard && i < stars;
                            return (
                              <span key={i}
                                className="text-[10px] xl:text-xs leading-none transition-all duration-200"
                                style={lit ? {
                                  color: "#e8c050",
                                  textShadow: "0 0 4px rgba(217,169,78,0.7), 0 1px 1px rgba(0,0,0,0.5)",
                                  filter: "drop-shadow(0 0 2px rgba(217,169,78,0.4))",
                                } : {
                                  color: "rgba(60,40,20,0.4)",
                                  textShadow: "0 1px 1px rgba(0,0,0,0.3)",
                                }}
                              >★</span>
                            );
                          })}
                        </div>
                        <div className="relative w-full flex flex-col items-center pb-2 xl:pb-2.5">
                          <div className="w-7 xl:w-9 h-px bg-gradient-to-r from-transparent via-[#8b6040]/25 to-transparent" />
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
              {/* 가이드 텍스트 */}
              <p className="text-xs xl:text-sm text-white/60">{guideText}</p>
              {/* 출전 / 한 턴 쉬기 버튼 */}
              <div className="relative mt-4 w-full flex justify-center">
                {playerExhausted ? (
                  /* ─ 한 턴 쉬기 버튼 (유저 패 소진) ─ */
                  <button
                    type="button"
                    onClick={onSubmitRest}
                    className="relative w-[210px] xl:w-[260px] h-[56px] xl:h-[64px] rounded-[6px] cursor-pointer active:scale-[0.97] active:translate-y-[2px] hover:scale-[1.02] transition-all duration-300 group/btn"
                  >
                    <div className="absolute inset-0 rounded-[6px] bg-gradient-to-b from-[#3a3d42] to-[#1a1c20] border border-[#4a5060]/60 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_4px_10px_rgba(0,0,0,0.6)]" />
                    <div className="absolute inset-[3px] xl:inset-[4px] rounded-[3px]" style={{
                      background: "linear-gradient(to bottom, #2a4a6a, #1a2a3a)",
                      boxShadow: "inset 0 2px 6px rgba(0,0,0,0.7), inset 0 -1px 2px rgba(100,180,255,0.1)",
                    }} />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="flex flex-col items-center">
                        <span className="text-[18px] xl:text-[22px] font-bold tracking-[0.15em] ml-[0.15em] select-none text-blue-200/90" style={{
                          fontFamily: "'Noto Serif KR', 'Noto Serif TC', serif",
                          textShadow: "0 1px 3px rgba(0,0,0,0.9), 0 0 8px rgba(100,180,255,0.3)",
                        }}>
                          {text.play.restButton}
                        </span>
                        <span className="text-[9px] xl:text-[10px] text-blue-300/50 mt-1">
                          {text.play.randomRecover}
                        </span>
                      </div>
                    </div>
                    <div className="absolute inset-[3px] xl:inset-[4px] rounded-[3px] opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300 pointer-events-none" style={{
                      background: "radial-gradient(ellipse at center, rgba(100,180,255,0.15) 0%, transparent 70%)"
                    }} />
                  </button>
                ) : (
                  /* ─ 기존 출전 버튼 ─ */
                  <>
                {/* 클릭 시 파동 링 (CSS 애니메이션) */}
                {isReady && isSelecting && (
                  <div className="absolute inset-0 max-w-[210px] xl:max-w-[260px] mx-auto rounded-[6px] pointer-events-none" style={{ animation: "deploy-pulse 2s ease-in-out infinite" }} />
                )}
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={!isReady || !isSelecting}
                  className={`relative w-[210px] xl:w-[260px] h-[56px] xl:h-[64px] rounded-[6px] transition-all duration-300 group/btn ${
                    isReady && isSelecting
                      ? "cursor-pointer active:scale-[0.97] active:translate-y-[2px] hover:scale-[1.02]"
                      : "cursor-not-allowed opacity-40 grayscale"
                  }`}
                >
                  {/* 외곽 흑금 프레임 */}
                  <div className="absolute inset-0 rounded-[6px] bg-gradient-to-b from-[#4a3d32] to-[#1a1410] border border-[#5a483a]/60 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_4px_10px_rgba(0,0,0,0.6)]" />

                  {/* 중앙 패널 (붉은 옻칠 느낌) */}
                  <div className="absolute inset-[3px] xl:inset-[4px] rounded-[3px]" style={{
                    background: isReady && isSelecting
                      ? "linear-gradient(to bottom, #8a1515, #5a0b0b)"
                      : "#333",
                    boxShadow: "inset 0 2px 6px rgba(0,0,0,0.7), inset 0 -1px 2px rgba(255,100,100,0.15)",
                  }} />

                  {/* 옻칠 하이라이트 */}
                  {isReady && isSelecting && (
                    <div className="absolute inset-[3px] xl:inset-[4px] rounded-[3px] opacity-[0.25] pointer-events-none" style={{
                      background: "linear-gradient(180deg, rgba(255,255,255,0.2) 0%, transparent 35%)",
                    }} />
                  )}

                  {/* 미세한 텍스처 오버레이 */}
                  {isReady && isSelecting && (
                     <div className="absolute inset-[3px] xl:inset-[4px] rounded-[3px] opacity-[0.08] mix-blend-overlay pointer-events-none" style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
                     }} />
                  )}

                  {/* 텍스트 및 장식 */}
                  <div className="absolute inset-0 flex items-center justify-center gap-4 xl:gap-5 pointer-events-none">
                    {/* 양옆 장식 (다이아몬드 - 음각 금박 느낌) */}
                    <div style={isReady && isSelecting ? { filter: "drop-shadow(0 -1px 1px rgba(30,5,5,0.9)) drop-shadow(0 1px 1px rgba(255,255,255,0.15))" } : {}}>
                      <span className={`block text-[12px] xl:text-[14px] font-serif leading-none ${isReady && isSelecting ? "" : "text-white/20"}`}
                        style={isReady && isSelecting ? {
                          background: "linear-gradient(135deg, #a67c00 0%, #bf953f 30%, #fcf6ba 50%, #b38728 70%, #fdffcc 100%)",
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                        } : {}}
                      >◆</span>
                    </div>

                    <div className="flex flex-col items-center justify-center mt-[-1px]">
                       <div style={isReady && isSelecting ? { filter: "drop-shadow(0 -3px 2px rgba(20,0,0,0.9)) drop-shadow(0 2px 2px rgba(255,255,200,0.3)) drop-shadow(0 0 12px rgba(212,168,67,0.5))" } : {}}>
                         <span className={`block text-[22px] xl:text-[26px] font-bold tracking-[0.2em] ml-[0.2em] select-none leading-none ${
                          isReady && isSelecting ? "" : "text-white/40"
                        }`} style={{
                          fontFamily: "'Noto Serif KR', 'Noto Serif TC', serif",
                          ...(isReady && isSelecting ? {
                            background: "linear-gradient(to bottom, #fcf6ea 0%, #e6c565 35%, #b47a20 50%, #d4a843 70%, #ffe8a1 100%)",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                          } : {}),
                        }}>
                          {text.play.advance}
                        </span>
                      </div>
                      {isReady && isSelecting && (
                        <span className="text-[9px] xl:text-[10px] tracking-[0.4em] ml-[0.4em] font-bold text-[#d4a843]/60 leading-tight mt-1" style={{
                          filter: "drop-shadow(0 -1px 1px rgba(0,0,0,0.8)) drop-shadow(0 1px 1px rgba(255,255,255,0.15))"
                        }}>
                          {text.play.advance}
                        </span>
                      )}
                    </div>

                    <div style={isReady && isSelecting ? { filter: "drop-shadow(0 -1px 1px rgba(30,5,5,0.9)) drop-shadow(0 1px 1px rgba(255,255,255,0.15))" } : {}}>
                      <span className={`block text-[12px] xl:text-[14px] font-serif leading-none ${isReady && isSelecting ? "" : "text-white/20"}`}
                        style={isReady && isSelecting ? {
                          background: "linear-gradient(135deg, #a67c00 0%, #bf953f 30%, #fcf6ba 50%, #b38728 70%, #fdffcc 100%)",
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                        } : {}}
                      >◆</span>
                    </div>
                  </div>

                  {/* Hover 은은한 붉은 광원 */}
                  {isReady && isSelecting && (
                    <div className="absolute inset-[3px] xl:inset-[4px] rounded-[3px] opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300 pointer-events-none" style={{
                      background: "radial-gradient(ellipse at center, rgba(255,100,100,0.2) 0%, transparent 70%)"
                    }} />
                  )}
                </button>
                  </>
                )}
              </div>
            </div>

            {/* ─ 우측: 상대 패 ─ */}
            <div className="flex flex-col gap-2 bg-black/80 rounded-xl p-3">
              <div className="flex items-center gap-2 px-1">
                <h3 className="text-xs font-bold text-red-400/70 tracking-wide uppercase">{text.play.handEnemy}</h3>
                <span className="text-xs text-red-400/50">{formatHandCount(aiHand.length)}</span>
                {aiDiscard.length > 0 && <span className="text-xs text-red-400/40">{text.play.used} {aiDiscard.length}</span>}
              </div>
              <div className="flex items-start gap-3">
                {/* 주장 (좌측 — 군령패에 가까운 쪽) */}
                {aiCaptain && (() => {
                  const isCaptainDiscard = !!aiCaptainInDiscard;
                  if (isCaptainDiscard) {
                    return (
                      <div className="shrink-0 self-center">
                        <div className="@container w-[120px] xl:w-[160px] relative opacity-30 grayscale pointer-events-none">
                          <BattleCard card={aiCaptain} disabled isCaptain onCaptainInfo={() => setShowCaptainInfo(true)} />
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <span className="text-[10px] font-bold text-white/50 bg-black/60 border border-white/10 px-2 py-0.5 rounded">{text.play.used}</span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  const isAiSelected = aiSelectedCardId === aiCaptain.id;
                  const showFace = isClash && isAiSelected;
                  return (
                    <div className="shrink-0 self-center">
                      <div className={`@container w-[120px] xl:w-[160px] ${showFace ? "ring-1 ring-red-400/50 rounded-md animate-fade-in" : ""}`}>
                        <BattleCard
                          card={aiCaptain} mode="target" masked={false}
                          disabled
                          onInfo={onCardInfo ? () => onCardInfo(aiCaptain.id) : undefined}
                          isCaptain
                          onCaptainInfo={() => setShowCaptainInfo(true)}
                        />
                      </div>
                    </div>
                  );
                })()}
                {/* 일반 카드 2×2 */}
                {(() => {
                  const allAiCards = [
                    ...aiOthers.map(c => ({ card: c, isDiscard: false })),
                    ...aiOthersDiscard.map(c => ({ card: c, isDiscard: true })),
                  ];
                  return (
                    <div className="grid grid-cols-[repeat(2,100px)] xl:grid-cols-[repeat(2,130px)] gap-2 xl:gap-3">
                      {allAiCards.map(({ card, isDiscard }) => {
                        if (isDiscard) {
                          return (
                            <div key={card.id} className="@container relative opacity-30 grayscale pointer-events-none">
                              <BattleCard card={card} disabled isCaptain={false} />
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <span className="text-[10px] font-bold text-white/50 bg-black/60 border border-white/10 px-2 py-0.5 rounded">{text.play.used}</span>
                              </div>
                            </div>
                          );
                        }
                        const isAiSelected = aiSelectedCardId === card.id;
                        const showFace = isClash && isAiSelected;
                        return (
                          <div key={card.id} className={`@container ${showFace ? "ring-1 ring-red-400/50 rounded-md animate-fade-in" : ""}`}>
                            <BattleCard
                              card={card} mode="target" masked={hardMode}
                              disabled
                              onInfo={onCardInfo ? () => onCardInfo(card.id) : undefined}
                              isCaptain={false}
                            />
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>

        </div>

        {/* ── 모바일: 카드 칩 (좌 아군 | 우 적군) — 자연스러운 흐름 배치 (내부 스크롤 제거) ── */}
        <div className={`lg:hidden w-full transition-opacity duration-300 ${isClash ? "opacity-0 pointer-events-none" : ""}`}>
          <div className="flex flex-col justify-start px-4 pt-2">
            <div className="grid grid-cols-2 gap-3 w-full max-w-sm mx-auto">
              {/* ─ 좌측: 아군 ─ */}
              <div className="flex flex-col gap-2 relative">
                {(() => {
                  const allPlayer = [
                    ...(playerCaptain ? [{ card: playerCaptain, isDiscard: !!playerCaptainInDiscard, isCaptain: true }] : []),
                    ...playerOthers.map(c => ({ card: c, isDiscard: false, isCaptain: false })),
                    ...playerOthersDiscard.map(c => ({ card: c, isDiscard: true, isCaptain: false })),
                  ];
                  return (
                    <div className="flex flex-col gap-2">
                      {allPlayer.map(({ card, isDiscard, isCaptain }) => {
                        if (isDiscard) {
                          const isRecoverable = selectedCommand === "govern" && isSelecting;
                          const isRecoverSelected = selectedRecoverId === card.id;
                          return (
                            <button key={card.id} type="button"
                              onClick={isRecoverable ? () => {
                                playSfx("sfx-card-select.mp3");
                                setSelectedRecoverId(isRecoverSelected ? null : card.id);
                              } : undefined}
                              disabled={!isRecoverable}
                              className={`relative flex flex-col items-center justify-center h-[64px] rounded-[3px] transition-all overflow-hidden ${
                                isRecoverable
                                  ? isRecoverSelected
                                    ? "shadow-[0_0_12px_rgba(217,169,78,0.2)]"
                                    : "active:scale-[0.97] shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
                                  : "cursor-not-allowed opacity-50 grayscale shadow-[0_1px_3px_rgba(0,0,0,0.5)]"
                              }`}
                            >
                              <div className="absolute inset-0 bg-cover bg-center pointer-events-none transition-all duration-300"
                                style={{
                                  backgroundImage: "url('/images/textures/wood-tablet.jpg')",
                                  filter: isRecoverSelected ? "brightness(0.2) sepia(0.3) hue-rotate(-10deg)" : "brightness(0.2) sepia(0.2)",
                                }}
                              />
                              <div className="absolute inset-0 opacity-[0.08] mix-blend-overlay pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />
                              <div className="absolute inset-0 rounded-[3px] pointer-events-none" style={{
                                boxShadow: isRecoverSelected
                                  ? "inset 0 0 0 1px rgba(217,169,78,0.3), inset 2px 2px 4px rgba(0,0,0,0.5), inset -2px -2px 4px rgba(0,0,0,0.4)"
                                  : "inset 0 0 0 1px rgba(160,120,80,0.15), inset 2px 2px 4px rgba(0,0,0,0.6)",
                              }} />

                              <div className="flex items-center justify-center gap-1.5 w-full min-w-0 z-10 px-1 mt-0.5">
                                {isCaptain && <span className="text-amber-400 text-[12px] shrink-0 drop-shadow-[0_0_4px_rgba(217,169,78,0.5)]">&#9813;</span>}
                                <span className={`text-[13px] font-serif font-bold truncate ${
                                  isRecoverSelected ? "text-[#ffeeb5] drop-shadow-[0_0_6px_rgba(217,169,78,0.5)]" : isRecoverable ? "text-[#a09070]" : "text-[#706050] line-through"
                                }`}>{card.nickname}</span>
                              </div>
                              <span className="text-[10px] font-serif font-bold text-[#d9a94e]/40 mt-0.5 z-10">{isRecoverable ? text.play.recovered : text.play.usedDone}</span>
                            </button>
                          );
                        }
                        const isSelected = isSelecting && selectedCardId === card.id;
                        const stars = COMMANDS.map(cmd => aptitudeToStars(calcAptitude(card, cmd)));
                        return (
                          <button key={card.id} type="button"
                            onClick={isSelecting ? () => handleCardClick(card.id) : undefined}
                            disabled={!isSelecting}
                            className={`relative flex flex-col items-center justify-center gap-1 h-[64px] rounded-[3px] transition-all overflow-hidden ${
                              isSelected
                                ? "shadow-[0_4px_16px_rgba(217,169,78,0.4),0_0_8px_rgba(217,169,78,0.2)] scale-[1.02] z-10 cursor-pointer"
                                : isSelecting
                                  ? "hover:-translate-y-0.5 active:scale-[0.97] shadow-[0_3px_8px_rgba(0,0,0,0.6)] cursor-pointer"
                                  : "opacity-60 saturate-50 cursor-not-allowed shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
                            }`}
                          >
                            {/* 실제 목판 텍스처 배경 */}
                            <div className="absolute inset-0 bg-cover bg-center transition-all duration-300 pointer-events-none"
                              style={{
                                backgroundImage: "url('/images/textures/wood-tablet.jpg')",
                                filter: isSelected ? "brightness(0.3) sepia(0.3) hue-rotate(-10deg) saturate(1.2)" : "brightness(0.25) sepia(0.2) saturate(0.8)",
                              }}
                            />
                            {/* 노이즈 및 스크래치 질감 보강 */}
                            <div className="absolute inset-0 opacity-[0.1] mix-blend-overlay pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />
                            
                            {/* 금속 재질의 다이아몬드 커팅 느낌 테두리 */}
                            <div className="absolute inset-0 rounded-[3px] pointer-events-none" style={{
                              boxShadow: isSelected
                                ? "inset 0 0 0 1px rgba(217,169,78,0.4), inset 0 0 8px rgba(217,169,78,0.3), inset 2px 2px 4px rgba(0,0,0,0.4), inset -2px -2px 4px rgba(0,0,0,0.3)"
                                : "inset 0 0 0 1px rgba(160,120,80,0.2), inset 2px 2px 5px rgba(0,0,0,0.6), inset -2px -2px 5px rgba(0,0,0,0.4)",
                            }} />

                            {isSelected && (
                              <div className="absolute inset-0 bg-gradient-to-t from-[#d9a94e]/20 via-transparent to-transparent pointer-events-none" />
                            )}

                            <div className="flex items-center justify-center gap-1.5 w-full min-w-0 z-10 px-1 mt-1">
                              {isCaptain && <span className="text-amber-400 text-[12px] shrink-0 drop-shadow-[0_0_4px_rgba(217,169,78,0.6)]">&#9813;</span>}
                              <span className={`text-[14px] leading-tight truncate font-serif font-bold ${
                                isSelected ? "text-[#ffeeb5] drop-shadow-[0_0_8px_rgba(217,169,78,0.6)]" : isSelecting ? "text-[#e8d4a2] drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" : "text-[#a09070]"
                              }`}>
                                {card.nickname}
                              </span>
                            </div>

                            <div className="relative w-[80%] h-px bg-gradient-to-r from-transparent via-[#d9a94e]/30 to-transparent mt-0.5 mb-1 z-10" />

                            <div className="flex items-center justify-center gap-2.5 z-10 mb-1">
                              {stars.map((s, i) => (
                                <span key={i} className={`flex items-center gap-[2px] text-[11px] font-serif font-black tabular-nums ${
                                  selectedCommand === COMMANDS[i]
                                    ? CMD_STYLE[COMMANDS[i]].text
                                    : s >= 4 ? "text-[#e8c050]" : "text-[#a09070]/70"
                                }`} style={{ textShadow: "0 1px 2px rgba(0,0,0,0.8)" }}>
                                  <span className={`[&>svg]:w-[11px] [&>svg]:h-[11px] ${s >= 4 && selectedCommand !== COMMANDS[i] ? "text-red-400/90" : ""}`}>
                                    {CMD_ICON[COMMANDS[i]]}
                                  </span>
                                  {s}
                                </span>
                              ))}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

            {/* ─ 우측: 적군 ─ */}
            <div className="flex flex-col gap-2 relative">
              {(() => {
                const allAi = [
                  ...(aiCaptain ? [{ card: aiCaptain, isDiscard: !!aiCaptainInDiscard, isCaptain: true }] : []),
                  ...aiOthers.map(c => ({ card: c, isDiscard: false, isCaptain: false })),
                  ...aiOthersDiscard.map(c => ({ card: c, isDiscard: true, isCaptain: false })),
                ];
                return (
                  <div className="flex flex-col gap-2">
                    {allAi.map(({ card, isDiscard, isCaptain }) => {
                      if (isDiscard) {
                        return (
                          <div key={card.id}
                            className="relative flex flex-col items-center justify-center h-[64px] rounded-[3px] overflow-hidden opacity-50 grayscale shadow-[0_1px_3px_rgba(0,0,0,0.5)]"
                          >
                            <div className="absolute inset-0 bg-cover bg-center pointer-events-none"
                              style={{
                                backgroundImage: "url('/images/textures/wood-tablet.jpg')",
                                filter: "brightness(0.2) sepia(0.4) hue-rotate(320deg)",
                              }}
                            />
                            <div className="absolute inset-0 opacity-[0.08] mix-blend-overlay pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />
                            <div className="absolute inset-0 rounded-[3px] pointer-events-none" style={{
                              boxShadow: "inset 0 0 0 1px rgba(120,40,40,0.2), inset 2px 2px 4px rgba(0,0,0,0.6)",
                            }} />

                            <div className="flex items-center justify-center gap-1.5 w-full min-w-0 z-10 px-1 mt-0.5">
                              {isCaptain && <span className="text-amber-400/40 text-[12px] shrink-0">&#9813;</span>}
                              <span className="text-[13px] font-serif font-bold truncate text-[#806060] line-through">{card.nickname}</span>
                            </div>
                            <span className="text-[10px] font-serif font-bold text-[#806060]/50 mt-0.5 z-10">{text.play.usedDone}</span>
                          </div>
                        );
                      }
                      const isAiSelected = aiSelectedCardId === card.id;
                      const showFace = isClash && isAiSelected;
                      const stars = COMMANDS.map(cmd => aptitudeToStars(calcAptitude(card, cmd)));
                      return (
                        <div key={card.id}
                          className={`relative flex flex-col items-center justify-center gap-1 h-[64px] rounded-[3px] transition-all overflow-hidden ${
                            showFace
                              ? "shadow-[0_4px_16px_rgba(248,113,113,0.3),0_0_8px_rgba(248,113,113,0.2)] scale-[1.02] z-10"
                              : "shadow-[0_3px_8px_rgba(0,0,0,0.6)]"
                          }`}
                        >
                          {/* 적군 흑철/적목재 명패 베이스 */}
                          <div className="absolute inset-0 bg-cover bg-center transition-all duration-300 pointer-events-none"
                            style={{
                              backgroundImage: "url('/images/textures/wood-tablet.jpg')",
                              filter: showFace ? "brightness(0.2) sepia(0.6) hue-rotate(320deg) saturate(1.5)" : "brightness(0.18) sepia(0.4) hue-rotate(320deg) saturate(0.8)",
                            }}
                          />
                          <div className="absolute inset-0 opacity-[0.1] mix-blend-overlay pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />
                          
                          {/* 적군 특유 붉은 금속성 테두리 */}
                          <div className="absolute inset-0 rounded-[3px] pointer-events-none" style={{
                            boxShadow: showFace
                              ? "inset 0 0 0 1px rgba(248,113,113,0.3), inset 0 0 8px rgba(248,113,113,0.2), inset 2px 2px 4px rgba(0,0,0,0.5), inset -2px -2px 4px rgba(0,0,0,0.4)"
                              : "inset 0 0 0 1px rgba(120,40,40,0.3), inset 2px 2px 5px rgba(0,0,0,0.7), inset -2px -2px 5px rgba(0,0,0,0.5)",
                          }} />

                          {showFace && (
                            <div className="absolute inset-0 bg-gradient-to-t from-red-500/20 via-transparent to-transparent pointer-events-none animate-fade-in" />
                          )}

                          <div className="flex items-center justify-center gap-1.5 w-full min-w-0 z-10 px-1 mt-1">
                            {isCaptain && <span className="text-amber-400 text-[12px] shrink-0 drop-shadow-[0_0_4px_rgba(217,169,78,0.5)]">&#9813;</span>}
                            <span className={`text-[14px] leading-tight truncate font-serif font-bold ${
                              showFace ? "text-[#ffcccc] drop-shadow-[0_0_8px_rgba(248,113,113,0.6)]" : "text-[#b08080] drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
                            }`}>
                              {hardMode && !isCaptain ? "???" : card.nickname}
                            </span>
                          </div>

                          <div className="relative w-[80%] h-px bg-gradient-to-r from-transparent via-red-500/30 to-transparent mt-0.5 mb-1 z-10" />

                          {!hardMode || isCaptain ? (
                            <div className="flex items-center justify-center gap-2.5 z-10 mb-1">
                              {stars.map((s, i) => (
                                <span key={i} className={`flex items-center gap-[2px] text-[11px] font-serif font-black tabular-nums ${
                                  selectedCommand === COMMANDS[i]
                                    ? CMD_STYLE[COMMANDS[i]].text
                                    : s >= 4 ? "text-[#e8c050]" : "text-[#b08080]/70"
                                }`} style={{ textShadow: "0 1px 2px rgba(0,0,0,0.8)" }}>
                                  <span className={`[&>svg]:w-[11px] [&>svg]:h-[11px] ${s >= 4 && selectedCommand !== COMMANDS[i] ? "text-red-500/90" : ""}`}>
                                    {CMD_ICON[COMMANDS[i]]}
                                  </span>
                                  {s}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-2.5 z-10 mb-1 text-[11px] font-serif font-bold text-[#b08080]/50" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.8)" }}>
                              {COMMANDS.map((cmd, i) => (
                                <span key={i} className="flex items-center gap-[2px]">
                                  <span className="[&>svg]:w-[11px] [&>svg]:h-[11px]">{CMD_ICON[cmd]}</span>?
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>

          {/* 모바일: 초상화 + 군령패 + 출전 */}
          <div className={`lg:hidden shrink-0 transition-opacity duration-300 w-full px-4 mt-2 ${
            isClash ? "opacity-0 hidden" : ""
          }`}>
            <div className="pointer-events-auto flex items-center justify-center gap-4 w-full max-w-md mx-auto">

              {/* 좌측: 선택된 카드 초상화 */}
              <div className="flex-1 w-0 flex items-center justify-center">
                <div className="w-full aspect-[3/4] max-w-[150px] rounded-md relative overflow-hidden bg-[#1a1410] flex items-center justify-center border border-[#5a483a]/60 shadow-[0_4px_16px_rgba(0,0,0,0.9)]"
                     style={{
                     boxShadow: selectedCard ? "0 0 15px rgba(217,169,78,0.2), inset 0 0 0 1px rgba(217,169,78,0.4)" : "inset 0 0 0 1px rgba(100,70,45,0.3)"
                   }}>
                {/* 텍스처 배경 */}
                <div className="absolute inset-0 opacity-[0.4] bg-cover bg-center" style={{ backgroundImage: "url('/images/textures/wood-tablet.jpg')" }} />
                
                {selectedCard ? (
                  <div className="absolute inset-1 rounded-[1px] overflow-hidden bg-black">
                    <img 
                      src={selectedCard.avatarUrl || `/images/cards/${selectedCard.id}.png`} 
                      alt={selectedCard.nickname}
                      className="w-full h-full object-cover object-top opacity-90 transition-opacity duration-300"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.onerror = null;
                        target.style.display = 'none';
                      }}
                    />
                    {/* 초상화 내부 그라데이션 및 이름 표기 */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                    <div className="absolute bottom-1 left-0 right-0 text-center">
                      <span className="text-[11px] font-bold text-[#e8d4a2] drop-shadow-[0_1px_3px_rgba(0,0,0,1)] font-serif tracking-wider truncate px-1 block">
                        {selectedCard.nickname}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-1 opacity-40">
                    <span className="text-[24px] text-[#a07850] opacity-50 font-serif">?</span>
                    <span className="text-[8px] font-bold text-[#a07850] tracking-widest">{text.play.waiting}</span>
                  </div>
                )}
                
                  <div className="absolute inset-0 opacity-[0.1] mix-blend-overlay pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />
                </div>
              </div>

              {/* 우측 2열: 가이드 텍스트 + 군령패 + 출전 버튼 (수직/수평 중앙 정렬) */}
              <div className="flex-1 flex flex-col items-center justify-center min-w-0">
                
                {/* 가이드 텍스트 */}
                <p className="w-full text-[12px] font-bold text-accent/80 tracking-[0.2em] text-center mb-3 drop-shadow-[0_2px_4px_rgba(0,0,0,1)] truncate"
                   style={{ fontFamily: "'Noto Serif KR', serif" }}
                >
                  {guideText}
                </p>

                {/* 군령 3목패 수평 배치 */}
                <div className="flex items-center justify-center gap-1.5 mb-4">
                  {COMMANDS.map((cmd) => {
                    const isSelected = selectedCommand === cmd;
                    const rawApt = selectedCard ? calcAptitude(selectedCard, cmd) : 0;
                    const isMandateCmd = mandate?.command === cmd;
                    const apt = isMandateCmd ? rawApt * MANDATE_BONUS : rawApt;
                    const stars = selectedCard ? aptitudeToStars(apt) : 0;
                    const isDisabled = !isSelecting;
                    const label = getBattlePlaqueLabel(cmd, locale);

                    return (
                      <div key={cmd} className={`relative transition-all duration-300 ease-out ${
                        isSelected ? "-translate-y-1.5" : ""
                      }`}>
                        {isSelected && !isDisabled && (
                          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-[70%] h-2 rounded-full pointer-events-none" style={{
                            background: "radial-gradient(ellipse, rgba(248,113,113,0.5) 0%, transparent 70%)",
                            filter: "blur(2px)",
                          }} />
                        )}
                        <button type="button"
                          onClick={() => !isDisabled && handleCommandClick(cmd)}
                          disabled={isDisabled}
                          className={`relative flex flex-col items-center w-[52px] h-[86px] rounded-[3px] overflow-hidden transition-all duration-300 ${
                            isDisabled
                              ? "opacity-30 cursor-not-allowed saturate-0 shadow-[1px_2px_4px_rgba(0,0,0,0.3)]"
                              : isSelected
                                ? "cursor-pointer shadow-[0_3px_12px_rgba(0,0,0,0.6),0_0_10px_rgba(248,113,113,0.15)]"
                                : "cursor-pointer active:scale-95 shadow-[2px_3px_6px_rgba(0,0,0,0.5)] brightness-[0.85]"
                          }`}
                        >
                          {/* 목재 텍스처 */}
                          <div className="absolute inset-0 bg-cover bg-center"
                            style={{
                              backgroundImage: "url('/images/textures/wood-tablet.jpg')",
                              filter: isSelected ? "brightness(0.4) saturate(1.1)" : "brightness(0.25) saturate(0.8)",
                            }}
                          />
                          <div className="absolute inset-0 opacity-[0.08] mix-blend-overlay" style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='5' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
                          }} />
                          <div className="absolute inset-0 rounded-[3px]" style={{
                            boxShadow: "inset 1px 1px 3px rgba(0,0,0,0.3), inset -1px -1px 3px rgba(0,0,0,0.2), inset 0 0 6px rgba(0,0,0,0.2)",
                          }} />
                          <div className="absolute inset-0 rounded-[3px]" style={{
                            boxShadow: isSelected
                              ? "inset 0 0 0 1px rgba(180,80,50,0.5), 0 0 0 1px rgba(0,0,0,0.5)"
                              : "inset 0 0 0 1px rgba(100,70,45,0.3), 0 0 0 1px rgba(0,0,0,0.3)",
                          }} />
                          
                          {/* 봉인 인장 (크기 축소) */}
                          <div className="relative w-full flex justify-center pt-2 pb-0.5"
                            onClick={(e) => { e.stopPropagation(); setInfoCmd(cmd); }}
                          >
                            <div className="relative w-3.5 h-3.5 flex items-center justify-center cursor-help">
                              <div className="absolute inset-0 rounded-full" style={{
                                background: "radial-gradient(circle at 40% 35%, #6a4830 0%, #3a2818 60%, #2a1a10 100%)",
                                boxShadow: "inset 0 1px 1px rgba(140,100,60,0.3), inset 0 -1px 1px rgba(0,0,0,0.5)",
                              }} />
                              <span className="relative text-[7px] font-bold select-none text-[#c8a064]/60 font-serif">
                                {getBattleSealLabel(cmd, locale)}
                              </span>
                            </div>
                          </div>
                          <div className="relative w-4 h-px bg-gradient-to-r from-transparent via-[#a07850]/40 to-transparent mb-0.5" />
                          
                          {/* 글자 세로 */}
                          <div className="relative flex-1 flex flex-col items-center justify-center -mt-0.5">
                            {label.split("").map((char, i) => (
                              <span key={i}
                                className="text-[13px] font-bold leading-none"
                                style={{
                                  fontFamily: "'Noto Serif KR', serif",
                                  ...(isMandateCmd ? {
                                    color: "#f0c850",
                                    textShadow: "0 1px 2px rgba(0,0,0,0.8), 0 0 4px rgba(212,168,67,0.6)",
                                  } : isSelected ? {
                                    color: "#ff7070",
                                    textShadow: "0 1px 2px rgba(0,0,0,0.8), 0 0 4px rgba(255,112,112,0.4)",
                                  } : {
                                    color: "#9a2a2a",
                                    textShadow: "0 1px 2px rgba(0,0,0,0.6)",
                                  }),
                                }}
                              >{char}</span>
                            ))}
                          </div>
                          
                          {/* 적성 숫자 */}
                          <div className="relative w-4 h-[1.5px] bg-gradient-to-r from-transparent via-[#8b6040]/30 to-transparent mb-1" />
                          <div className="relative flex items-center justify-center pb-2">
                            <span className="text-[12px] font-cinzel font-bold tabular-nums leading-none"
                              style={selectedCard && stars > 0 ? (
                                stars >= 4 ? { color: "#e8c050", textShadow: "0 0 4px rgba(217,169,78,0.7)" } : 
                                stars >= 2 ? { color: "rgba(232,192,80,0.6)" } : 
                                { color: "rgba(60,40,20,0.5)" }
                              ) : { color: "rgba(40,25,10,0.4)" }}
                            >{selectedCard ? stars : "-"}</span>
                          </div>
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* 가로형 출전 / 한 턴 쉬기 버튼 */}
                <div className="relative w-full max-w-[170px] mx-auto">
                  {playerExhausted ? (
                    <button
                      type="button"
                      onClick={onSubmitRest}
                      className="relative w-full h-[42px] rounded-[3px] cursor-pointer active:scale-[0.98] active:translate-y-[1px] transition-all duration-300 group/btn"
                      style={{ filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.6))" }}
                    >
                      <div className="absolute inset-0 rounded-[3px] bg-gradient-to-b from-[#3a3d42] to-[#1a1c20] border border-[#4a5060]/60 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]" />
                      <div className="absolute inset-[2px] rounded-[1px]" style={{
                        background: "linear-gradient(to bottom, #2a4a6a, #1a2a3a)",
                        boxShadow: "inset 0 1px 3px rgba(0,0,0,0.7), inset 0 -1px 2px rgba(100,180,255,0.1)",
                      }} />
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="text-[14px] font-bold tracking-[0.1em] ml-[0.1em] select-none text-blue-200/90 font-serif" style={{
                          textShadow: "0 1px 3px rgba(0,0,0,0.9), 0 0 6px rgba(100,180,255,0.3)",
                        }}>
                          {text.play.restButton}
                        </span>
                      </div>
                    </button>
                  ) : (
                    <>
                  {/* 외곽 펄스 (오퍼시티로 제어) */}
                  <div className={`absolute inset-0 rounded-[3px] pointer-events-none transition-opacity duration-300 ${isReady && isSelecting ? 'opacity-100' : 'opacity-0'}`} style={{ animation: "deploy-pulse 2s ease-in-out infinite" }} />

                  <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={!isReady || !isSelecting}
                    className={`relative w-full h-[42px] rounded-[3px] transition-all duration-300 group/btn ${
                      isReady && isSelecting
                        ? "cursor-pointer active:scale-[0.98] active:translate-y-[1px]"
                        : "cursor-not-allowed opacity-[0.45] grayscale"
                    }`}
                    style={isReady && isSelecting ? { filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.6))" } : { filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))" }}
                  >
                    <div className="absolute inset-0 rounded-[3px] bg-gradient-to-b from-[#4a3d32] to-[#1a1410] border border-[#5a483a]/60 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]" />

                    {/* 활성화 상태 배경 (오퍼시티 트랜지션) */}
                    <div className={`absolute inset-[2px] rounded-[1px] transition-opacity duration-300 ${isReady && isSelecting ? 'opacity-100' : 'opacity-0'}`} style={{
                      background: "linear-gradient(to bottom, #8a1515, #5a0b0b)",
                      boxShadow: "inset 0 1px 3px rgba(0,0,0,0.7), inset 0 -1px 2px rgba(255,100,100,0.15)",
                    }} />

                    {/* 비활성화 상태 배경 (오퍼시티 트랜지션) */}
                    <div className={`absolute inset-[2px] rounded-[1px] bg-[#333] transition-opacity duration-300 ${isReady && isSelecting ? 'opacity-0' : 'opacity-100'}`} style={{
                      boxShadow: "inset 0 1px 2px rgba(0,0,0,0.5)",
                    }} />

                    {/* 투명 그라데이션 광택 (오퍼시티 트랜지션) */}
                    <div className={`absolute inset-[2px] rounded-[1px] transition-opacity duration-300 ${isReady && isSelecting ? 'opacity-[0.2]' : 'opacity-0'}`} style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.2) 0%, transparent 40%)" }} />

                    {/* 텍스처 오버레이 (오퍼시티 트랜지션) */}
                    <div className={`absolute inset-[2px] mix-blend-overlay pointer-events-none transition-opacity duration-300 ${isReady && isSelecting ? 'opacity-[0.08]' : 'opacity-0'}`} style={{
                       backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
                    }} />

                    {/* 텍스트 영역 */}
                    <div className="absolute inset-0 flex items-center justify-center gap-2 pointer-events-none">
                      <span className={`text-[10px] font-serif transition-colors duration-300 ${isReady && isSelecting ? "text-[#e8d4a2]" : "text-white/20"}`}
                        style={isReady && isSelecting ? {
                          textShadow: "0 1px 2px rgba(0,0,0,0.8)",
                        } : {}}
                      >◆</span>

                      <div className="flex flex-col items-center justify-center">
                         <span className={`text-[18px] font-bold tracking-[0.2em] ml-[0.2em] leading-none select-none font-serif transition-colors duration-300 ${
                          isReady && isSelecting ? "text-[#fcf6ea]" : "text-white/40"
                        }`} style={isReady && isSelecting ? {
                          textShadow: "0 1px 3px rgba(0,0,0,0.9), 0 0 8px rgba(212,168,67,0.5)",
                        } : {}}>
                          {text.play.advance}
                        </span>
                      </div>

                      <span className={`text-[10px] font-serif transition-colors duration-300 ${isReady && isSelecting ? "text-[#e8d4a2]" : "text-white/20"}`}
                        style={isReady && isSelecting ? {
                          textShadow: "0 1px 2px rgba(0,0,0,0.8)",
                        } : {}}
                      >◆</span>
                    </div>
                  </button>
                    </>
                  )}
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
        <BattleLogModal records={roundRecords} mandate={mandate} onClose={() => setShowLog(false)} locale={locale} text={text} />
      )}
      {showCaptainInfo && (
        <CaptainInfoModal onClose={() => setShowCaptainInfo(false)} zIndex={Z_INDEX.gameModal} />
      )}
      <PhaseAnnounce data={escalationAnnounce} onDone={() => setEscalationAnnounce(null)} />

      {/* ─── 일기토 (draw 시 서브페이즈) ─── */}
      {battleSubPhase === "dueling" && pendingRound && onCompleteDuel && (
        <ClashArena
          playerCard={pendingRound.playerAction.card}
          aiCard={pendingRound.aiAction.card}
          command={pendingRound.playerAction.command}
          onComplete={onCompleteDuel}
        />
      )}
    </div>
  );
}
