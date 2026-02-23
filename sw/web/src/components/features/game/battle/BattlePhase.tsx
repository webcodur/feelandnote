// @ts-nocheck
/* [DEAD CODE] v3에서 ResolutionPhase로 대체됨
  파일명: components/features/game/battle/BattlePhase.tsx
  기능: 대전 페이즈 UI (관전 모드)
  책임: 배치 완료 후 6라운드를 순차 자동 진행하며 결과를 표시한다.
*/
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import type { BattleCard as BattleCardType, Domain, DeploymentMap, RoundResult } from "@/lib/game/types";
import { DOMAIN_LABELS } from "@/lib/game/types";
import { AI_STRATEGY_LABELS, type AiStrategy } from "@/lib/game/aiPlayer";
import BattleCard from "./BattleCard";

const REVEAL_DELAY_MS = 500;
const SCORE_REVEAL_MS = 1100;
const AUTO_CONTINUE_MS = 5200;
const AUTO_PLAY_DELAY_MS = 800;

interface Props {
  playerHand: BattleCardType[];
  aiHand: BattleCardType[];
  domainOrder: Domain[];
  currentRound: number;
  playerScore: number;
  aiScore: number;
  rounds: RoundResult[];
  playerDeployment: DeploymentMap;
  aiDeployment: DeploymentMap;
  revealing?: boolean;
  lastResult?: RoundResult | null;
  onAutoPlayRound: () => void;
  onContinueFromReveal?: () => void;
  playSfx?: (name: string) => void;
  onCardInfo?: (celebId: string) => void;
}

export default function BattlePhase({
  playerHand,
  aiHand,
  domainOrder,
  currentRound,
  playerScore,
  aiScore,
  rounds,
  playerDeployment,
  aiDeployment,
  revealing,
  lastResult,
  onAutoPlayRound,
  onContinueFromReveal,
  playSfx,
  onCardInfo,
}: Props) {
  // revealing 단계별 연출
  const [revealStep, setRevealStep] = useState(0);

  const effectiveRound = revealing ? Math.max(0, currentRound - 1) : currentRound;
  const domain = domainOrder[effectiveRound];

  const playerWins = lastResult ? lastResult.pointsAwarded.player > lastResult.pointsAwarded.ai : false;
  const aiWins = lastResult ? lastResult.pointsAwarded.ai > lastResult.pointsAwarded.player : false;

  // battle 진입 시 첫 라운드 자동 시작
  useEffect(() => {
    if (!revealing && currentRound < 6 && rounds.length === currentRound) {
      const t = setTimeout(() => onAutoPlayRound(), AUTO_PLAY_DELAY_MS);
      return () => clearTimeout(t);
    }
  }, [revealing, currentRound, rounds.length, onAutoPlayRound]);

  // revealing 단계별 타이머 + 자동 진행 + SFX
  useEffect(() => {
    if (!revealing) {
      setRevealStep(0);
      return;
    }
    setRevealStep(0);
    playSfx?.("sfx-reveal.mp3");
    const t1 = setTimeout(() => setRevealStep(1), REVEAL_DELAY_MS);
    const t2 = setTimeout(() => {
      setRevealStep(2);
      if (lastResult) {
        const pWin = lastResult.pointsAwarded.player > lastResult.pointsAwarded.ai;
        playSfx?.(pWin ? "sfx-round-win.mp3" : "sfx-round-lose.mp3");
      }
    }, SCORE_REVEAL_MS);
    const t3 = setTimeout(() => { onContinueFromReveal?.(); }, AUTO_CONTINUE_MS);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [revealing, onContinueFromReveal, lastResult, playSfx]);

  // 도메인별 카드 매핑
  const getPlayerCard = useCallback((d: Domain) => {
    const cardId = playerDeployment[d];
    return playerHand.find((c) => c.id === cardId);
  }, [playerDeployment, playerHand]);

  const getAiCard = useCallback((d: Domain) => {
    const cardId = aiDeployment[d];
    return aiHand.find((c) => c.id === cardId);
  }, [aiDeployment, aiHand]);

  // 완료된 라운드 결과 매핑
  const roundResultMap = useMemo(() => {
    const map = new Map<Domain, RoundResult>();
    for (const r of rounds) map.set(r.domain, r);
    return map;
  }, [rounds]);

  return (
    <div className="flex-1 flex flex-col">
      {/* AI 패 — domainOrder 순서 */}
      <div className="rounded-lg border border-red-500/15 bg-[#141418] px-3 py-2 shadow-[inset_0_1px_12px_rgba(248,113,113,0.04)]">
        <div className="flex items-center gap-1.5 mb-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-red-400/80" />
          <span className="text-[9px] font-cinzel text-red-400/70 uppercase tracking-wider">Enemy</span>
        </div>
        <div className="grid grid-cols-6 justify-items-center gap-2 sm:gap-3">
          {domainOrder.map((d, i) => {
            const aiCard = getAiCard(d);
            if (!aiCard) return <div key={d} />;
            const result = roundResultMap.get(d);
            const isCurrentRound = i === effectiveRound;
            const isFuture = i > effectiveRound || (i === effectiveRound && !revealing);
            const isPast = !!result && !(revealing && d === lastResult?.domain);
            const aWin = result && result.pointsAwarded.ai > result.pointsAwarded.player;

            return (
              <div key={d} className={`relative transition-all duration-300 ${
                isCurrentRound && revealing
                  ? `-translate-y-1 ${aiWins ? "ring-1 ring-red-400/40" : "opacity-70"}`
                  : isPast ? "" : isFuture ? "opacity-40" : ""
              }`}>
                {isFuture && !isCurrentRound ? (
                  <BattleCard card={aiCard} faceDown disabled />
                ) : (
                  <BattleCard
                    card={aiCard}
                    mode="battle"
                    activeDomain={d}
                    onInfo={onCardInfo ? () => onCardInfo(aiCard.id) : undefined}
                    disabled
                  />
                )}
                {isPast && result && (
                  <div className="absolute inset-0 rounded-lg bg-black/70 backdrop-blur-[1px] flex items-center justify-center">
                    <div className="flex flex-col items-center">
                      <span className={`text-[10px] sm:text-xs font-serif font-black tracking-wider ${aWin ? "text-red-400" : "text-white/40"}`}>
                        {result.aiBattleScore.toFixed(1)}
                      </span>
                      <span className="text-[8px] text-white/20">{DOMAIN_LABELS[d]}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 중앙 타임라인 */}
      <div className="relative flex items-center px-4 h-[64px] bg-[#111115] rounded-lg">
        <div className="shrink-0 flex items-center gap-1 mr-2">
          <span className="text-[9px] font-cinzel text-accent/50">P</span>
          <span className="text-lg font-black tabular-nums text-accent">{playerScore}</span>
        </div>

        <div className="flex-1 flex items-center justify-end gap-1">
          {rounds.length > 0 && (
            <div className="flex gap-0.5 mr-1">
              {rounds.map((r, i) => (
                <div
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full ${
                    r.pointsAwarded.player > r.pointsAwarded.ai ? "bg-accent"
                    : r.pointsAwarded.ai > r.pointsAwarded.player ? "bg-red-400"
                    : "bg-white/30"
                  }`}
                />
              ))}
            </div>
          )}
          {domainOrder.slice(0, effectiveRound).map((d, i) => {
            const r = rounds[i];
            return (
              <span key={`past-${d}`} className={`text-[9px] px-1.5 py-0.5 rounded ${
                r?.pointsAwarded.player > r?.pointsAwarded.ai ? "text-accent/50 bg-accent/5"
                : r?.pointsAwarded.ai > r?.pointsAwarded.player ? "text-red-400/50 bg-red-500/5"
                : "text-white/20 bg-white/[0.02]"
              }`}>
                {DOMAIN_LABELS[d]}
              </span>
            );
          })}
          <div className="w-[20px] h-px bg-gradient-to-r from-transparent to-accent/20" />
        </div>

        {/* 현재 영역 */}
        <div className={`flex flex-col items-center justify-center h-[60px] min-w-[70px] mx-1 rounded-xl px-2.5 transition-all duration-300 ${
          revealing && revealStep >= 2
            ? playerWins ? "bg-accent/10 border border-accent/40"
              : aiWins ? "bg-red-500/10 border border-red-400/40"
              : "bg-white/5 border border-white/15"
            : revealing ? "border border-white/10"
            : "bg-white/[0.04] border border-accent/15"
        }`}>
          {revealing && lastResult ? (
            <>
              <span className={`text-base font-serif font-black leading-none ${
                revealStep >= 2 ? playerWins ? "text-accent" : aiWins ? "text-red-400" : "text-white/60" : "text-accent"
              }`}>
                {DOMAIN_LABELS[domain]}
              </span>
              {revealStep >= 1 ? (
                <div className="flex items-center gap-1.5 animate-score-pop">
                  <span className={`text-lg font-black tabular-nums ${playerWins ? "text-accent" : "text-white/40"}`}>
                    {lastResult.playerBattleScore.toFixed(1)}
                  </span>
                  <span className="text-[8px] text-white/20">:</span>
                  <span className={`text-lg font-black tabular-nums ${aiWins ? "text-red-400" : "text-white/40"}`}>
                    {lastResult.aiBattleScore.toFixed(1)}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded bg-white/5 animate-ai-thinking" />
                  <span className="text-[8px] text-white/20">:</span>
                  <div className="w-4 h-4 rounded bg-white/5 animate-ai-thinking [animation-delay:200ms]" />
                </div>
              )}
              {/* tiebreak 제거 (v5 턴제) */}
            </>
          ) : (
            <>
              <span className="text-base font-serif font-black text-accent leading-tight">{DOMAIN_LABELS[domain]}</span>
              <div className="flex items-center gap-1 mt-1">
                <div className="w-1.5 h-1.5 rounded-full bg-accent animate-ai-thinking" />
                <div className="w-1.5 h-1.5 rounded-full bg-accent animate-ai-thinking [animation-delay:200ms]" />
                <div className="w-1.5 h-1.5 rounded-full bg-accent animate-ai-thinking [animation-delay:400ms]" />
              </div>
            </>
          )}
        </div>

        <div className="flex-1 flex items-center justify-start gap-1">
          <div className="w-[20px] h-px bg-gradient-to-l from-transparent to-accent/20" />
          {domainOrder.slice(effectiveRound + 1).map((d) => (
            <span key={`future-${d}`} className="text-[9px] px-1.5 py-0.5 rounded text-white/20 bg-white/[0.02]">
              {DOMAIN_LABELS[d]}
            </span>
          ))}
        </div>

        <div className="shrink-0 flex items-center gap-1 ml-2">
          <span className="text-lg font-black tabular-nums text-red-400">{aiScore}</span>
          <span className="text-[9px] font-cinzel text-red-400/50">AI</span>
        </div>
      </div>

      {/* AI 전략 토스트 */}
      {revealing && revealStep >= 2 && (
        <div onClick={onContinueFromReveal} className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 cursor-pointer animate-toast-in-out">
          <div className="px-4 py-2 rounded-full bg-black/80 border border-white/10 backdrop-blur-md shadow-lg">
            <span className="text-[11px] text-white/70">
              {currentRound >= 6
                ? "모든 라운드가 종료되었습니다."
                : (AI_STRATEGY_LABELS[lastResult?.aiStrategy as AiStrategy] ?? lastResult?.aiStrategy ?? "")}
            </span>
          </div>
        </div>
      )}

      {/* 내 패 — domainOrder 순서 */}
      <div className="rounded-lg border border-accent/20 bg-[#15150f] px-3 py-2 shadow-[inset_0_-1px_12px_rgba(212,175,55,0.04)]">
        <div className="flex items-center gap-1.5 mb-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-accent" />
          <span className="text-[9px] font-cinzel text-accent/70 uppercase tracking-wider">My Hand</span>
        </div>
        <div className="grid grid-cols-6 justify-items-center gap-2 sm:gap-3">
          {domainOrder.map((d, i) => {
            const playerCard = getPlayerCard(d);
            if (!playerCard) return <div key={d} />;
            const result = roundResultMap.get(d);
            const isCurrentRound = i === effectiveRound;
            const isFuture = i > effectiveRound || (i === effectiveRound && !revealing);
            const isPast = !!result && !(revealing && d === lastResult?.domain);
            const pWin = result && result.pointsAwarded.player > result.pointsAwarded.ai;

            return (
              <div key={d} className={`relative transition-all duration-300 ${
                isCurrentRound && revealing
                  ? `-translate-y-1 ${playerWins ? "ring-1 ring-accent/40" : "opacity-70"}`
                  : isPast ? "" : isFuture ? "" : ""
              }`}>
                <BattleCard
                  card={playerCard}
                  mode="battle"
                  activeDomain={d}
                  onInfo={onCardInfo ? () => onCardInfo(playerCard.id) : undefined}
                  disabled
                />
                {isPast && result && (
                  <div className="absolute inset-0 rounded-lg bg-black/70 backdrop-blur-[1px] flex items-center justify-center">
                    <div className="flex flex-col items-center">
                      <span className={`text-[10px] sm:text-xs font-serif font-black tracking-wider ${pWin ? "text-accent" : "text-white/40"}`}>
                        {result.playerBattleScore.toFixed(1)}
                      </span>
                      <span className="text-[8px] text-white/20">{DOMAIN_LABELS[d]}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
