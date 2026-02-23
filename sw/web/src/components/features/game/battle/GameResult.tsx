/*
  파일명: components/features/game/battle/GameResult.tsx
  기능: 패권 v5 최종 결과 화면
  책임: RoundRecord 기반 라운드별 히스토리, 국력/민심 최종 수치를 보여준다.
*/
"use client";

import { Swords, RotateCcw, Home, Skull } from "lucide-react";
import type { RoundRecord, NationState, Command, CounterResult } from "@/lib/game/types";
import { COMMAND_LABELS } from "@/lib/game/types";

interface Props {
  playerNation: NationState;
  aiNation: NationState;
  roundRecords: RoundRecord[];
  onRestart: () => void;
  onHome: () => void;
  playSfx?: (name: string) => void;
}

const COUNTER_LABEL: Record<CounterResult, { text: string; color: string }> = {
  win: { text: "카운터", color: "text-amber-300" },
  lose: { text: "역습", color: "text-red-400" },
  draw: { text: "접전", color: "text-yellow-300" },
};

export default function GameResult({ playerNation, aiNation, roundRecords, onRestart, onHome, playSfx }: Props) {
  const playerWins = playerNation.power > aiNation.power;
  const aiWins = aiNation.power > playerNation.power;

  return (
    <div className="max-w-4xl mx-auto flex flex-col items-center gap-6 py-4 relative">
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
      <div className="text-center space-y-3 animate-slide-up">
        <Swords size={36} className={`mx-auto ${playerWins ? "text-accent" : aiWins ? "text-red-400" : "text-text-secondary"}`} />
        <h2 className={`text-4xl font-serif font-black ${
          playerWins ? "text-accent text-glow" : aiWins ? "text-red-400" : "text-text-secondary"
        }`}>
          {playerWins ? "승리!" : aiWins ? "패배" : "무승부"}
        </h2>
      </div>

      {/* 국력/민심 최종 */}
      <div className="flex items-center gap-6 px-8 py-5 rounded-xl border border-white/10 bg-[#0e0e12] animate-fade-in">
        <div className="text-center">
          <span className="text-xs text-text-tertiary font-cinzel uppercase">나</span>
          <div className="text-4xl font-black text-accent animate-score-pop">{playerNation.power}</div>
          <div className="text-xs text-text-tertiary mt-1">민심 {playerNation.morale}</div>
        </div>
        <div className="text-center">
          <span className="text-xs text-text-tertiary font-cinzel">국력</span>
          <div className="text-2xl text-text-tertiary font-cinzel">:</div>
        </div>
        <div className="text-center">
          <span className="text-xs text-text-tertiary font-cinzel uppercase">AI</span>
          <div className="text-4xl font-black text-red-400 animate-score-pop">{aiNation.power}</div>
          <div className="text-xs text-text-tertiary mt-1">민심 {aiNation.morale}</div>
        </div>
      </div>

      {/* 라운드별 히스토리 */}
      <div className="w-full">
        <h3 className="text-xs text-text-tertiary font-cinzel uppercase tracking-wider text-center mb-4">
          ROUND HISTORY ({roundRecords.length} rounds)
        </h3>

        <div className="flex flex-col gap-1.5">
          {roundRecords.map((r, i) => {
            const counterInfo = COUNTER_LABEL[r.counterResult];
            return (
              <div
                key={i}
                className="animate-slide-up flex items-center gap-2 px-3 py-2 rounded-lg border border-white/5 bg-[#131317]"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                {/* 라운드 번호 */}
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 bg-white/5 text-white/40">
                  {r.round}
                </div>

                {/* 플레이어 카드+명령 */}
                <div className="flex-1 min-w-0">
                  <span className="text-[9px] font-bold text-accent/70">{r.player.card.nickname}</span>
                  <span className="text-[8px] text-text-tertiary ml-1">{COMMAND_LABELS[r.player.command]}</span>
                </div>

                {/* 상성 결과 */}
                {counterInfo && (
                  <span className={`text-[8px] font-bold shrink-0 ${counterInfo.color}`}>
                    {counterInfo.text}
                  </span>
                )}

                <span className="text-[8px] text-white/15 shrink-0">vs</span>

                {/* AI 카드+명령 */}
                <div className="flex-1 min-w-0 text-right">
                  <span className="text-[9px] font-bold text-red-400/70">{r.ai.card.nickname}</span>
                  <span className="text-[8px] text-text-tertiary ml-1">{COMMAND_LABELS[r.ai.command]}</span>
                </div>

                {/* 국력 변동 */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[10px] font-bold tabular-nums ${
                    r.powerDelta.player < 0 ? "text-red-400" : r.powerDelta.player > 0 ? "text-green-400" : "text-text-tertiary"
                  }`}>
                    {r.powerDelta.player >= 0 ? "+" : ""}{r.powerDelta.player}
                  </span>
                  <div className="w-px h-3 bg-white/[0.06]" />
                  <span className={`text-[10px] font-bold tabular-nums ${
                    r.powerDelta.ai < 0 ? "text-red-400" : r.powerDelta.ai > 0 ? "text-green-400" : "text-text-tertiary"
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
      <div className="flex items-center gap-3 animate-fade-in">
        <button
          onClick={() => { playSfx?.("sfx-confirm.mp3"); onRestart(); }}
          className="flex items-center gap-2 px-6 py-3 rounded-lg bg-accent/10 border border-accent/30 hover:bg-accent/20 active:scale-95 transition-all"
        >
          <RotateCcw size={16} className="text-accent" />
          <span className="font-serif font-bold text-accent">다시 대전</span>
        </button>
        <button
          onClick={onHome}
          className="flex items-center gap-2 px-6 py-3 rounded-lg border border-white/10 hover:border-white/20 hover:bg-white/5 active:scale-95 transition-all"
        >
          <Home size={16} className="text-text-secondary" />
          <span className="font-serif font-bold text-text-secondary">로비로</span>
        </button>
      </div>
    </div>
  );
}
