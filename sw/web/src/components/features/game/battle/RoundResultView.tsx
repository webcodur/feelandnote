/*
  파일명: components/features/game/battle/RoundResultView.tsx
  기능: 라운드 결과 표시
  책임: 카드 오픈 후 라운드 승패를 연출한다.
*/
"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import type { RoundResult, BattleCard } from "@/lib/game/types";
import { DOMAIN_LABELS, DOMAIN_LABELS_EN, TIEBREAK_MAP } from "@/lib/game/types";
import { AI_STRATEGY_LABELS, type AiStrategy } from "@/lib/game/aiPlayer";

interface Props {
  result: RoundResult;
  onContinue: () => void;
}

const ABILITY_LABELS: Record<string, string> = {
  command: "통솔",
  martial: "무력",
  intellect: "지력",
  charisma: "매력",
};

function MiniCard({ card, side, isWinner }: { card: BattleCard; side: "left" | "right"; isWinner: boolean }) {
  return (
    <div className={`
      flex flex-col items-center gap-2 p-3 rounded-xl border transition-all
      ${side === "left" ? "animate-slide-from-left" : "animate-slide-from-right"}
      ${isWinner
        ? side === "left"
          ? "border-accent/40 bg-accent/5 animate-glow-gold"
          : "border-red-400/40 bg-red-500/5 animate-glow-red"
        : "border-white/10 bg-white/[0.02] opacity-60"
      }
    `}>
      {/* 아바타 */}
      <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-black/40">
        {card.avatarUrl ? (
          <Image src={card.avatarUrl} alt={card.nickname} fill className="object-cover" sizes="64px" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xl text-white/20">?</div>
        )}
      </div>
      <span className="text-xs font-serif font-bold text-white truncate max-w-[100px]">
        {card.nickname}
      </span>
      <span className="text-[10px] text-text-tertiary">{card.title}</span>
    </div>
  );
}

export default function RoundResultView({ result, onContinue }: Props) {
  const [showScores, setShowScores] = useState(false);
  const [showResult, setShowResult] = useState(false);

  const playerWins = result.pointsAwarded.player > result.pointsAwarded.ai;
  const aiWins = result.pointsAwarded.ai > result.pointsAwarded.player;

  // 스텝별 연출 타이밍
  useEffect(() => {
    const t1 = setTimeout(() => setShowScores(true), 600);
    const t2 = setTimeout(() => setShowResult(true), 1200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div className="max-w-lg mx-auto flex flex-col items-center gap-5 py-6">
      {/* 영역 */}
      <div className="text-center space-y-1">
        <span className="text-[10px] font-cinzel text-accent/40 tracking-widest uppercase">
          {DOMAIN_LABELS_EN[result.domain]}
        </span>
        <h3 className="text-xl font-serif font-black text-accent">{DOMAIN_LABELS[result.domain]}</h3>
      </div>

      {/* 카드 대결 */}
      <div className="flex items-center gap-3 sm:gap-6">
        <MiniCard card={result.playerCard} side="left" isWinner={playerWins} />

        {/* 중앙 VS + 점수 */}
        <div className="flex flex-col items-center gap-2">
          {showScores ? (
            <>
              <div className="animate-score-pop">
                <span className={`text-3xl font-black ${playerWins ? "text-accent" : "text-text-secondary"}`}>
                  {result.playerDomainScore}
                </span>
              </div>
              <span className="text-text-tertiary text-xs font-cinzel">VS</span>
              <div className="animate-score-pop">
                <span className={`text-3xl font-black ${aiWins ? "text-red-400" : "text-text-secondary"}`}>
                  {result.aiDomainScore}
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="w-8 h-8 rounded bg-white/5 animate-ai-thinking" />
              <span className="text-text-tertiary text-xs font-cinzel">VS</span>
              <div className="w-8 h-8 rounded bg-white/5 animate-ai-thinking [animation-delay:200ms]" />
            </>
          )}
        </div>

        <MiniCard card={result.aiCard} side="right" isWinner={aiWins} />
      </div>

      {/* 타이브레이크 */}
      {result.isTiebreak && showScores && (
        <div className="animate-slide-up text-center space-y-2">
          <span className="text-[10px] text-accent/60 font-cinzel uppercase tracking-wider">TIEBREAK</span>
          <div className="flex items-center gap-4 px-4 py-2 rounded-lg bg-white/[0.02] border border-white/5">
            <span className="text-xs text-text-secondary">{ABILITY_LABELS[TIEBREAK_MAP[result.domain]]}</span>
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-center">
                <span className={`text-sm font-bold ${playerWins ? "text-accent" : "text-text-tertiary"}`}>
                  {result.playerCard.ability[TIEBREAK_MAP[result.domain]]}
                </span>
              </div>
              <span className="text-[10px] text-text-tertiary">vs</span>
              <div className="flex flex-col items-center">
                <span className={`text-sm font-bold ${aiWins ? "text-red-400" : "text-text-tertiary"}`}>
                  {result.aiCard.ability[TIEBREAK_MAP[result.domain]]}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 결과 점수 팝업 */}
      {showResult && (
        <div className="animate-score-pop text-center space-y-1">
          <div className={`text-3xl font-serif font-black ${
            playerWins ? "text-accent" : aiWins ? "text-red-400" : "text-text-secondary"
          }`}>
            {playerWins && `+${result.pointsAwarded.player}점`}
            {aiWins && `AI +${result.pointsAwarded.ai}점`}
            {!playerWins && !aiWins && "무승부"}
          </div>
          <p className="text-xs text-text-tertiary">
            {playerWins ? "승리!" : aiWins ? "패배..." : "동점"}
          </p>
        </div>
      )}

      {/* AI 전략 해설 */}
      {showResult && result.aiStrategy && (
        <div className="animate-fade-in px-4 py-2 rounded-lg bg-red-500/5 border border-red-500/10 max-w-xs text-center">
          <span className="text-[10px] text-red-400/60 font-cinzel uppercase tracking-wider">AI STRATEGY</span>
          <p className="text-xs text-text-secondary mt-0.5">
            {AI_STRATEGY_LABELS[result.aiStrategy as AiStrategy] ?? result.aiStrategy}
          </p>
        </div>
      )}

      {/* 계속 버튼 */}
      {showResult && (
        <button
          onClick={onContinue}
          className="animate-fade-in px-8 py-2.5 rounded-lg border border-white/10 hover:border-accent/30 bg-white/[0.02] hover:bg-accent/5 text-sm text-text-secondary hover:text-white transition-all"
        >
          계속
        </button>
      )}
    </div>
  );
}
