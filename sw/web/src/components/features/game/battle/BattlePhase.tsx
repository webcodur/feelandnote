/*
  파일명: components/features/game/battle/BattlePhase.tsx
  기능: 대전 페이즈 UI
  책임: 6라운드 카드 배치 대전 + 라운드 결과를 인라인으로 처리한다.
*/
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { BattleCard as BattleCardType, Domain, RoundResult } from "@/lib/game/types";
import { DOMAIN_LABELS } from "@/lib/game/types";
import { AI_STRATEGY_LABELS, type AiStrategy } from "@/lib/game/aiPlayer";
import BattleCard from "./BattleCard";

const CARD_STAGGER_MS = 100; // 카드 한 장당 등장 간격

interface Props {
  playerHand: BattleCardType[];
  aiHand: BattleCardType[];
  domainOrder: Domain[];
  currentRound: number;
  playerScore: number;
  aiScore: number;
  rounds: RoundResult[];
  nextDomain: Domain | null;
  onPlayCard: (cardId: string) => void;
  revealing?: boolean;
  lastResult?: RoundResult | null;
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
  onPlayCard,
  revealing,
  lastResult,
  onContinueFromReveal,
  playSfx,
  onCardInfo,
}: Props) {
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [lensDomain, setLensDomain] = useState<Domain | null>(null);
  const [aiThinking, setAiThinking] = useState(false);
  const [prevPlayerScore, setPrevPlayerScore] = useState(playerScore);
  const [prevAiScore, setPrevAiScore] = useState(aiScore);
  const [scoreAnimating, setScoreAnimating] = useState(false);

  // === 이미지 프리로딩 + 순차 등장 ===
  const allCards = useMemo(() => [...aiHand, ...playerHand], [aiHand, playerHand]);
  const [imagesReady, setImagesReady] = useState(false);
  const [revealedCount, setRevealedCount] = useState(0);

  useEffect(() => {
    const urls = allCards.map((c) => c.avatarUrl).filter(Boolean) as string[];
    if (urls.length === 0) { setImagesReady(true); return; }
    let done = 0;
    const finish = () => { done++; if (done >= urls.length) setImagesReady(true); };
    urls.forEach((url) => {
      const img = new window.Image();
      img.onload = finish;
      img.onerror = finish;
      img.src = url;
    });
    // 3초 안전장치
    const t = setTimeout(() => setImagesReady(true), 3000);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!imagesReady) return;
    if (revealedCount >= allCards.length) return;
    const t = setTimeout(() => setRevealedCount((c) => c + 1), CARD_STAGGER_MS);
    return () => clearTimeout(t);
  }, [imagesReady, revealedCount, allCards.length]);

  // revealing 단계별 연출
  const [revealStep, setRevealStep] = useState(0); // 0: 카드공개, 1: 점수, 2: 결과+전략

  // 현재 라운드 영역 (revealing 중에는 이전 라운드)
  const effectiveRound = revealing ? Math.max(0, currentRound - 1) : currentRound;
  const domain = domainOrder[effectiveRound];

  // 라운드 변경 시 선택 초기화
  useEffect(() => {
    setSelectedCard(null);
  }, [currentRound]);

  // revealing 단계별 타이머 + 자동 진행 + SFX
  useEffect(() => {
    if (!revealing) {
      setRevealStep(0);
      return;
    }
    setRevealStep(0);
    playSfx?.("sfx-reveal.mp3");
    const t1 = setTimeout(() => setRevealStep(1), 500);
    const t2 = setTimeout(() => {
      setRevealStep(2);
      // 승패 SFX
      if (lastResult) {
        const pWin = lastResult.pointsAwarded.player > lastResult.pointsAwarded.ai;
        playSfx?.(pWin ? "sfx-win.mp3" : "sfx-lose.mp3");
      }
    }, 1100);
    const t3 = setTimeout(() => { onContinueFromReveal?.(); }, 5200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [revealing, onContinueFromReveal, lastResult, playSfx]);

  // 스코어 변경 감지
  useEffect(() => {
    if (playerScore !== prevPlayerScore || aiScore !== prevAiScore) {
      setScoreAnimating(true);
      setPrevPlayerScore(playerScore);
      setPrevAiScore(aiScore);
      const t = setTimeout(() => setScoreAnimating(false), 500);
      return () => clearTimeout(t);
    }
  }, [playerScore, aiScore, prevPlayerScore, prevAiScore]);

  const handleConfirm = useCallback(() => {
    if (!selectedCard) return;
    playSfx?.("sfx-deploy.mp3");
    setAiThinking(true);
    setTimeout(() => {
      setAiThinking(false);
      onPlayCard(selectedCard);
      setSelectedCard(null);
    }, 800);
  }, [selectedCard, onPlayCard, playSfx]);

  const playerWins = lastResult ? lastResult.pointsAwarded.player > lastResult.pointsAwarded.ai : false;
  const aiWins = lastResult ? lastResult.pointsAwarded.ai > lastResult.pointsAwarded.player : false;

  // 이미 사용된 영역 목록
  const usedDomains = rounds.map((r) => r.domain);

  // 사용된 카드 ID → 라운드 도메인 매핑
  const playedPlayerMap = new Map<string, Domain>();
  const playedAiMap = new Map<string, Domain>();
  for (const r of rounds) {
    playedPlayerMap.set(r.playerCard.id, r.domain);
    playedAiMap.set(r.aiCard.id, r.domain);
  }

  const handleDomainClick = useCallback((d: Domain) => {
    setLensDomain((prev) => (prev === d ? null : d));
  }, []);


  // 프리로딩 중 스피너
  if (!imagesReady) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="flex flex-col items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-2 h-2 rounded-full bg-accent animate-bounce" />
            <div className="w-2 h-2 rounded-full bg-accent animate-bounce [animation-delay:150ms]" />
            <div className="w-2 h-2 rounded-full bg-accent animate-bounce [animation-delay:300ms]" />
          </div>
          <p className="text-sm text-text-secondary font-serif">카드 준비 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-3">
      {/* HUD — 스코어 + 라운드 + 남은 영역 통합 */}
      <div className="flex items-center justify-center">
        <div className="inline-flex items-center gap-4 sm:gap-6 px-4 py-2 rounded-full border border-white/10 bg-black/40 backdrop-blur-md">
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] text-text-tertiary uppercase font-cinzel">나</span>
            <span className={`text-lg font-black text-accent transition-transform ${scoreAnimating ? "animate-score-pop" : ""}`}>
              {playerScore}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] text-text-tertiary uppercase font-cinzel">R{effectiveRound + 1}/6</span>
            {/* 라운드 결과 도트 */}
            {rounds.length > 0 && (
              <div className="flex gap-0.5">
                {rounds.map((r, i) => (
                  <div
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full ${
                      r.pointsAwarded.player > r.pointsAwarded.ai
                        ? "bg-accent"
                        : r.pointsAwarded.ai > r.pointsAwarded.player
                        ? "bg-red-400"
                        : "bg-white/30"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`text-lg font-black text-red-400 transition-transform ${scoreAnimating ? "animate-score-pop" : ""}`}>
              {aiScore}
            </span>
            <span className="text-[9px] text-text-tertiary uppercase font-cinzel">AI</span>
          </div>
        </div>
      </div>

      {/* AI 패 */}
      <div className="rounded-lg border border-red-500/15 bg-red-500/[0.03] px-3 py-2 shadow-[inset_0_1px_12px_rgba(248,113,113,0.04)]">
        <div className="flex items-center gap-1.5 mb-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-red-400/80" />
          <span className="text-[9px] font-cinzel text-red-400/70 uppercase tracking-wider">Enemy</span>
          <span className="text-[9px] text-red-400/40">{aiHand.length - playedAiMap.size}</span>
        </div>
        <div className="grid grid-cols-6 justify-items-center gap-1.5">
          {aiHand.map((card, i) => {
            const usedInDomain = playedAiMap.get(card.id);
            const isCurrentlyRevealing = revealing && lastResult?.aiCard.id === card.id;
            const isUsed = !!usedInDomain && !isCurrentlyRevealing;
            const isVisible = i < revealedCount;
            return (
              <div key={card.id} className={`relative transition-all duration-300 ${
                !isVisible ? "opacity-0 translate-y-2" :
                isCurrentlyRevealing
                  ? `-translate-y-2 ${aiWins ? "ring-1 ring-red-400/40" : "opacity-70"}`
                  : revealing && !isUsed ? "opacity-25" : ""
              }`}>
                <BattleCard card={card} activeDomain={domain} highlightDomain={lensDomain ?? undefined} onDomainClick={handleDomainClick} onInfo={onCardInfo ? () => onCardInfo(card.id) : undefined} usedDomains={usedDomains} disabled />
                {isUsed && (
                  <div className="absolute inset-0 rounded-lg bg-black/70 backdrop-blur-[1px] flex items-center justify-center">
                    <span className="text-[10px] sm:text-xs font-serif font-black text-red-400/70 tracking-wider">
                      {DOMAIN_LABELS[usedInDomain]}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 중앙 타임라인: 지나간 영역 — 현재 — 남은 영역 (높이 고정) */}
      <div className="relative flex items-center px-4 h-[64px]">
        {/* 좌측: 지나간 영역 (우측 정렬) */}
        <div className="flex-1 flex items-center justify-end gap-1">
          {domainOrder.slice(0, effectiveRound).map((d, i) => {
            const r = rounds[i];
            return (
              <span
                key={`past-${d}`}
                className={`text-[9px] px-1.5 py-0.5 rounded ${
                  r?.pointsAwarded.player > r?.pointsAwarded.ai
                    ? "text-accent/50 bg-accent/5"
                    : r?.pointsAwarded.ai > r?.pointsAwarded.player
                    ? "text-red-400/50 bg-red-500/5"
                    : "text-white/20 bg-white/[0.02]"
                }`}
              >
                {DOMAIN_LABELS[d]}
              </span>
            );
          })}
          <div className="w-[20px] h-px bg-gradient-to-r from-transparent to-accent/20" />
        </div>

        {/* 현재 영역 (고정 중앙, 높이 고정) */}
        <div className={`flex flex-col items-center justify-center h-[60px] min-w-[70px] mx-1 rounded-xl px-2.5 transition-all duration-300 ${
          revealing && revealStep >= 2
            ? playerWins
              ? "bg-accent/15 border border-accent/50 shadow-[0_0_28px_rgba(212,175,55,0.35)]"
              : aiWins
                ? "bg-red-500/15 border border-red-400/50 shadow-[0_0_28px_rgba(248,113,113,0.3)]"
                : "bg-white/5 border border-white/20"
            : revealing
              ? "border border-white/10"
              : selectedCard
                ? "bg-accent/15 border border-accent/40 shadow-[0_0_24px_rgba(212,175,55,0.25)]"
                : "bg-accent/[0.06] border border-accent/20 shadow-[0_0_16px_rgba(212,175,55,0.1)] animate-domain-pulse"
        }`}>
          {revealing && lastResult ? (
            <>
              <span className={`text-base font-serif font-black leading-none ${
                revealStep >= 2
                  ? playerWins ? "text-accent" : aiWins ? "text-red-400" : "text-white/60"
                  : "text-accent"
              }`}>
                {DOMAIN_LABELS[domain]}
              </span>
              {revealStep >= 1 ? (
                <div className="flex items-center gap-1.5 animate-score-pop">
                  <span className={`text-lg font-black tabular-nums ${playerWins ? "text-accent" : "text-white/40"}`}>
                    {lastResult.playerDomainScore}
                  </span>
                  <span className="text-[8px] text-white/20">:</span>
                  <span className={`text-lg font-black tabular-nums ${aiWins ? "text-red-400" : "text-white/40"}`}>
                    {lastResult.aiDomainScore}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded bg-white/5 animate-ai-thinking" />
                  <span className="text-[8px] text-white/20">:</span>
                  <div className="w-4 h-4 rounded bg-white/5 animate-ai-thinking [animation-delay:200ms]" />
                </div>
              )}
              {revealStep >= 1 && lastResult.isTiebreak && (
                <div className="flex items-center gap-1 text-[8px] text-text-tertiary">
                  <span>등급</span>
                  <span className={playerWins ? "text-accent font-bold" : ""}>
                    {lastResult.playerCard.tier}
                  </span>
                  <span>vs</span>
                  <span className={aiWins ? "text-red-400 font-bold" : ""}>
                    {lastResult.aiCard.tier}
                  </span>
                </div>
              )}
            </>
          ) : aiThinking ? (
            <>
              <span className="text-base font-serif font-black text-accent leading-none">
                {DOMAIN_LABELS[domain]}
              </span>
              <div className="flex items-center gap-1 mt-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ai-thinking" />
                <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ai-thinking [animation-delay:200ms]" />
                <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ai-thinking [animation-delay:400ms]" />
              </div>
            </>
          ) : (
            <>
              <span className="text-base font-serif font-black text-accent leading-tight">
                {DOMAIN_LABELS[domain]}
              </span>
              <span className="text-[9px] font-cinzel text-accent/40">VS</span>
            </>
          )}
        </div>

        {/* 우측: 남은 영역 (좌측 정렬) */}
        <div className="flex-1 flex items-center justify-start gap-1">
          <div className="w-[20px] h-px bg-gradient-to-l from-transparent to-accent/20" />
          {domainOrder.slice(effectiveRound + 1).map((d) => (
            <span
              key={`future-${d}`}
              className="text-[9px] px-1.5 py-0.5 rounded text-white/20 bg-white/[0.02]"
            >
              {DOMAIN_LABELS[d]}
            </span>
          ))}
        </div>
      </div>

      {/* AI 전략 토스트 */}
      {revealing && revealStep >= 2 && (
        <div
          onClick={onContinueFromReveal}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 cursor-pointer animate-toast-in-out"
        >
          <div className="px-4 py-2 rounded-full bg-black/80 border border-white/10 backdrop-blur-md shadow-lg">
            <span className="text-[11px] text-white/70">
              {currentRound >= 6
                ? "서로 마지막 카드를 사용했습니다."
                : (AI_STRATEGY_LABELS[lastResult?.aiStrategy as AiStrategy] ?? lastResult?.aiStrategy ?? "")}
            </span>
          </div>
        </div>
      )}

      {/* 내 패 */}
      <div className="rounded-lg border border-accent/20 bg-accent/[0.03] px-3 py-2 shadow-[inset_0_-1px_12px_rgba(212,175,55,0.04)]">
        <div className="flex items-center gap-1.5 mb-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-accent" />
          <span className="text-[9px] font-cinzel text-accent/70 uppercase tracking-wider">My Hand</span>
          <span className="text-[9px] text-accent/40">{playerHand.length - playedPlayerMap.size}</span>
        </div>
        <div className="grid grid-cols-6 justify-items-center gap-2">
          {playerHand.map((card, i) => {
            const usedInDomain = playedPlayerMap.get(card.id);
            const isCurrentlyRevealing = revealing && lastResult?.playerCard.id === card.id;
            const isUsed = !!usedInDomain && !isCurrentlyRevealing;
            const isVisible = (aiHand.length + i) < revealedCount;
            return (
              <div key={card.id} className={`relative transition-all duration-300 ${
                !isVisible ? "opacity-0 translate-y-2" :
                isCurrentlyRevealing
                  ? `-translate-y-2 ${playerWins ? "ring-1 ring-accent/40" : "opacity-70"}`
                  : revealing && !isUsed ? "opacity-25 pointer-events-none" : ""
              }`}>
                <BattleCard
                  card={card}
                  activeDomain={domain}
                  highlightDomain={lensDomain ?? undefined}
                  onDomainClick={handleDomainClick}
                  onInfo={onCardInfo ? () => onCardInfo(card.id) : undefined}
                  usedDomains={usedDomains}
                  selected={!revealing && !isUsed && selectedCard === card.id}
                  onClick={revealing || isUsed ? undefined : () => {
                    playSfx?.("sfx-card-pick.mp3");
                    setSelectedCard((prev) => prev === card.id ? null : card.id);
                  }}
                  onConfirm={!revealing && !isUsed && selectedCard === card.id ? () => handleConfirm() : undefined}
                  disabled={revealing || isUsed}
                />
                {isUsed && (
                  <div className="absolute inset-0 rounded-lg bg-black/70 backdrop-blur-[1px] flex items-center justify-center">
                    <span className="text-[10px] sm:text-xs font-serif font-black text-accent/70 tracking-wider">
                      {DOMAIN_LABELS[usedInDomain]}
                    </span>
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
