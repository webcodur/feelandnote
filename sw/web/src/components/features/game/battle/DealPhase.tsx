/*
  파일명: components/features/game/battle/DealPhase.tsx
  기능: 딜링 페이즈 UI
  책임: 15장 풀을 순차 공개한 뒤 자동 분배 연출을 진행한다.
*/
"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import type { BattleCard as BattleCardType } from "@/lib/game/types";
import BattleCard from "./BattleCard";
import HegemonyActionButton from "./HegemonyActionButton";

interface Props {
  pool: BattleCardType[];
  playerHand: BattleCardType[];
  aiHand: BattleCardType[];
  reserve: BattleCardType[];
  onCompleteDeal: () => void;
  onStartBattle: () => void;
  onCardInfo?: (celebId: string) => void;
  dealt: boolean; // 이미 딜링이 완료되었는지
}

const REVEAL_INTERVAL = 120;
const REVEAL_HOLD = 600;
const INTRO_DELAY_MS = 400;

export default function DealPhase({
  pool, playerHand, aiHand, reserve,
  onCompleteDeal, onStartBattle, onCardInfo, dealt,
}: Props) {
  // === 인트로 연출 상태 ===
  const [introPhase, setIntroPhase] = useState<"dealing" | "revealing" | "done">("dealing");
  const [revealedCount, setRevealedCount] = useState(0);
  const [dealConfirmed, setDealConfirmed] = useState(false);

  useEffect(() => {
    if (introPhase !== "dealing") return;
    const t = setTimeout(() => setIntroPhase("revealing"), INTRO_DELAY_MS);
    return () => clearTimeout(t);
  }, [introPhase]);

  useEffect(() => {
    if (introPhase !== "revealing") return;
    if (revealedCount >= pool.length) {
      const t = setTimeout(() => setIntroPhase("done"), REVEAL_HOLD);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setRevealedCount((c) => c + 1), REVEAL_INTERVAL);
    return () => clearTimeout(t);
  }, [introPhase, revealedCount, pool.length]);

  const isIntro = introPhase !== "done";

  // 딜링이 아직 안됐으면 풀 공개 후 자동 딜링 트리거
  useEffect(() => {
    if (!isIntro && !dealt) {
      onCompleteDeal();
    }
  }, [isIntro, dealt, onCompleteDeal]);

  // 초기 풀 순서 고정
  const initialPoolRef = useRef<BattleCardType[]>([]);
  if (initialPoolRef.current.length === 0 && pool.length > 0) {
    initialPoolRef.current = [...pool];
  }
  const initialPool = initialPoolRef.current;

  // 분배 후 어떤 카드가 플레이어/AI인지 표시
  const playerIds = useMemo(() => new Set(playerHand.map((c) => c.id)), [playerHand]);
  const aiIds = useMemo(() => new Set(aiHand.map((c) => c.id)), [aiHand]);
  const reserveIds = useMemo(() => new Set(reserve.map((c) => c.id)), [reserve]);

  const handleConfirm = () => {
    setDealConfirmed(true);
    onStartBattle();
  };

  return (
    <>
      <div className="flex-1 flex flex-col gap-3 max-w-lg sm:max-w-xl md:max-w-2xl mx-auto w-full">
        {/* ── 15장 통합 그리드 ── */}
        <div className="rounded-lg border border-white/[0.06] bg-[#131317] px-3 py-3">
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
            {initialPool.map((card, i) => (
              <div
                key={card.id}
                className={`@container relative ${isIntro && i < revealedCount ? "animate-card-flip-in" : ""}`}
              >
                <BattleCard
                  card={card}
                  faceDown={isIntro ? i >= revealedCount : !dealt ? false : reserveIds.has(card.id)}
                  disabled
                  compact
                  pickedBy={!isIntro && dealt ? (playerIds.has(card.id) ? "player" : aiIds.has(card.id) ? "ai" : undefined) : undefined}
                />
                {!isIntro && dealt && playerIds.has(card.id) && (
                  <span className="absolute -top-1.5 -right-1.5 text-[9px] font-cinzel font-bold px-2 py-0.5 rounded-full bg-accent/90 text-black z-10">P</span>
                )}
                {!isIntro && dealt && aiIds.has(card.id) && (
                  <span className="absolute -top-1.5 -right-1.5 text-[9px] font-cinzel font-bold px-2 py-0.5 rounded-full bg-red-400/90 text-black z-10">AI</span>
                )}
                {!isIntro && dealt && reserveIds.has(card.id) && (
                  <span className="absolute -top-1.5 -right-1.5 text-[9px] font-cinzel font-bold px-2 py-0.5 rounded-full bg-sky-400/90 text-black z-10">예비</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── 상태 바 ── */}
        <div className="flex items-center justify-center px-4 h-[32px] bg-[#111115] rounded-lg">
          {isIntro ? (
            <span className="text-[11px] text-white/50">카드 공개 중...</span>
          ) : !dealt ? (
            <span className="text-[11px] text-accent animate-pulse">분배 중...</span>
          ) : (
            <div className="flex items-center gap-4">
              <span className="text-[10px] text-text-tertiary">
                <span className="text-accent font-bold">나</span> {playerHand.length}장
              </span>
              <span className="text-white/10">|</span>
              <span className="text-[10px] text-text-tertiary">
                <span className="text-red-400 font-bold">AI</span> {aiHand.length}장
              </span>
              <span className="text-white/10">|</span>
              <span className="text-[10px] text-text-tertiary">
                예비 {reserve.length}장
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 하단 안내 */}
      {isIntro && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="px-4 py-2 rounded-full bg-black/80 border border-white/10 backdrop-blur-md shadow-lg">
            <span className="text-[11px] text-white/70">공개 중...</span>
          </div>
        </div>
      )}

      {/* 패 확인 버튼 */}
      {!isIntro && dealt && !dealConfirmed && (
        <HegemonyActionButton
          text="대전 시작"
          subtext="START BATTLE"
          disabled={false}
          onClick={handleConfirm}
          className="fixed bottom-5 right-5"
        />
      )}
    </>
  );
}
