/*
  파일명: components/features/game/battle/GameResult.tsx
  기능: 패권 v5 최종 결과 화면
  책임: RoundRecord 기반 라운드별 히스토리, 국력/민심 최종 수치를 보여준다.
*/
"use client";

import { Swords, RotateCcw, Home, Skull } from "lucide-react";
import { useLocale } from "next-intl";
import type { RoundRecord, NationState, CounterResult } from "@/lib/game/types";
import { getBattleCommandLabel, getBattleCounterLabel, getBattleRoundsLabel, getBattleText } from "./i18n";

interface Props {
  playerNation: NationState;
  aiNation: NationState;
  roundRecords: RoundRecord[];
  onRestart: () => void;
  onHome: () => void;
  playSfx?: (name: string) => void;
}

const COUNTER_LABEL_COLOR: Record<CounterResult, string> = {
  win: "text-amber-300",
  lose: "text-red-400",
  draw: "text-yellow-300",
};

export default function GameResult({ playerNation, aiNation, roundRecords, onRestart, onHome, playSfx }: Props) {
  const locale = useLocale();
  const text = getBattleText(locale);
  const playerWins = playerNation.power > aiNation.power;
  const aiWins = aiNation.power > playerNation.power;

  return (
    <div className="max-w-4xl mx-auto flex flex-col items-center gap-6 lg:gap-8 py-4 lg:py-8 relative">
      {/* 배경 분위기 */}
      <div className={`
        absolute inset-0 -z-10 rounded-3xl opacity-30 blur-3xl
        ${playerWins
          ? "bg-gradient-to-b from-accent/20 via-transparent to-transparent"
          : aiWins
          ? "bg-gradient-to-b from-red-500/20 via-transparent to-transparent"
          : "bg-gradient-to-b from-white/10 via-transparent to-transparent"
        }
      `} />

      {/* 승패 */}
      <div className="text-center space-y-3 animate-slide-up bg-black/80 rounded-xl px-8 py-6">
        <Swords size={36} className={`mx-auto lg:w-12 lg:h-12 ${playerWins ? "text-accent" : aiWins ? "text-red-400" : "text-text-secondary"}`} />
        <h2 className={`text-4xl lg:text-5xl font-serif font-black ${
          playerWins ? "text-accent text-glow" : aiWins ? "text-red-400" : "text-text-secondary"
        }`}>
          {playerWins ? text.result.victory : aiWins ? text.result.defeat : text.result.draw}
        </h2>
      </div>

      {/* 국력/민심 최종 */}
      <div className="flex items-center gap-6 lg:gap-10 px-8 lg:px-12 py-5 lg:py-7 rounded-xl border border-white/10 bg-[#0e0e12] animate-fade-in">
        <div className="text-center">
          <span className="text-xs text-white/50 font-cinzel uppercase">{text.result.me}</span>
          <div className="text-4xl lg:text-5xl font-black text-accent animate-score-pop">{playerNation.power}</div>
          <div className="text-xs lg:text-sm text-white/50 mt-1">{text.result.morale} {playerNation.morale}</div>
        </div>
        <div className="text-center">
          <span className="text-xs text-white/50 font-cinzel">{text.result.power}</span>
          <div className="text-2xl lg:text-3xl text-white/50 font-cinzel">:</div>
        </div>
        <div className="text-center">
          <span className="text-xs text-white/50 font-cinzel uppercase">AI</span>
          <div className="text-4xl lg:text-5xl font-black text-red-400 animate-score-pop">{aiNation.power}</div>
          <div className="text-xs lg:text-sm text-white/50 mt-1">{text.result.morale} {aiNation.morale}</div>
        </div>
      </div>

      {/* 라운드별 히스토리 */}
      <div className="w-full bg-black/80 rounded-xl p-4">
        <h3 className="text-xs text-white/50 font-cinzel uppercase tracking-wider text-center mb-4">
          {text.result.roundHistory} ({getBattleRoundsLabel(roundRecords.length, locale)})
        </h3>

        <div className="flex flex-col gap-1.5">
          {roundRecords.map((r, i) => {
            const counterInfo = { text: getBattleCounterLabel(r.counterResult, locale), color: COUNTER_LABEL_COLOR[r.counterResult] };
            return (
              <div
                key={i}
                className="animate-slide-up flex items-center gap-2 lg:gap-3 px-3 lg:px-4 py-2 lg:py-3 rounded-lg border border-white/10 bg-white/5"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                {/* 라운드 번호 */}
                <div className="w-5 h-5 lg:w-7 lg:h-7 rounded-full flex items-center justify-center text-[9px] lg:text-xs font-bold shrink-0 bg-white/5 text-white/50">
                  {r.round}
                </div>

                {/* 플레이어 카드+명령 */}
                <div className="flex-1 min-w-0">
                  <span className="text-[9px] lg:text-xs font-bold text-accent/70">{r.player.card.nickname}</span>
                  <span className="text-[8px] lg:text-[11px] text-white/50 ml-1">{getBattleCommandLabel(r.player.command, locale)}</span>
                </div>

                {/* 상성 결과 */}
                {counterInfo && (
                  <span className={`text-[8px] lg:text-[11px] font-bold shrink-0 ${counterInfo.color}`}>
                    {counterInfo.text}
                  </span>
                )}

                <span className="text-[8px] lg:text-[11px] text-white/50 shrink-0">vs</span>

                {/* AI 카드+명령 */}
                <div className="flex-1 min-w-0 text-right">
                  <span className="text-[9px] lg:text-xs font-bold text-red-400/70">{r.ai.card.nickname}</span>
                  <span className="text-[8px] lg:text-[11px] text-white/50 ml-1">{getBattleCommandLabel(r.ai.command, locale)}</span>
                </div>

                {/* 국력 변동 */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[10px] lg:text-xs font-bold tabular-nums ${
                    r.powerDelta.player < 0 ? "text-red-400" : r.powerDelta.player > 0 ? "text-green-400" : "text-white/50"
                  }`}>
                    {r.powerDelta.player >= 0 ? "+" : ""}{r.powerDelta.player}
                  </span>
                  <div className="w-px h-3 bg-white/[0.06]" />
                  <span className={`text-[10px] lg:text-xs font-bold tabular-nums ${
                    r.powerDelta.ai < 0 ? "text-red-400" : r.powerDelta.ai > 0 ? "text-green-400" : "text-white/50"
                  }`}>
                    {r.powerDelta.ai >= 0 ? "+" : ""}{r.powerDelta.ai}
                  </span>
                </div>

                {/* 반란 */}
                {(r.rebellion.player || r.rebellion.ai) && (
                  <Skull size={12} className="text-red-400 shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 버튼 */}
      <div className="flex items-center gap-3 animate-fade-in bg-black/80 rounded-xl px-6 py-4">
        <button
          onClick={() => { playSfx?.("sfx-confirm.mp3"); onRestart(); }}
          className="flex items-center gap-2 px-6 lg:px-8 py-3 lg:py-4 rounded-lg bg-accent/10 border border-accent/30 hover:bg-accent/20 active:scale-95 transition-all"
        >
          <RotateCcw size={16} className="text-accent" />
          <span className="font-serif font-bold text-accent">{text.result.replay}</span>
        </button>
        <button
          onClick={onHome}
          className="flex items-center gap-2 px-6 lg:px-8 py-3 lg:py-4 rounded-lg border border-white/10 hover:border-white/20 hover:bg-white/5 active:scale-95 transition-all"
        >
          <Home size={16} className="text-text-secondary" />
          <span className="font-serif font-bold text-text-secondary">{text.result.lobby}</span>
        </button>
      </div>
    </div>
  );
}
