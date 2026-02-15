/*
  파일명: components/features/game/battle/DraftPhase.tsx
  기능: 드래프트 페이즈 UI
  책임: 12명 풀에서 교대로 6명을 선택하는 드래프트를 진행한다.
*/
"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import type { BattleCard as BattleCardType, Domain } from "@/lib/game/types";
import { DRAFT_ORDER } from "@/lib/game/types";
import BattleCard from "./BattleCard";
import { Z_INDEX } from "@/constants/zIndex";

interface Props {
  pool: BattleCardType[];
  playerHand: BattleCardType[];
  aiHand: BattleCardType[];
  draftTurn: number;
  onPick: (cardId: string) => void;
  aiDraftPending: boolean;
  aiDraftCards: BattleCardType[];
  onCardInfo?: (celebId: string) => void;
}

// 스네이크 드래프트 순서 시각화
const DRAFT_SEQUENCE: ("P" | "AI")[] = [
  "P", "AI", "AI", "P", "P", "AI",
  "AI", "P", "P", "AI", "AI", "P",
];

const REVEAL_INTERVAL = 120; // 카드 한 장당 공개 간격 (ms)
const REVEAL_HOLD = 600;     // 전체 공개 후 대기 시간 (ms)

export default function DraftPhase({
  pool,
  playerHand,
  aiHand,
  draftTurn,
  onPick,
  aiDraftPending,
  aiDraftCards,
  onCardInfo,
}: Props) {
  // === 인트로 연출 상태 ===
  const [introPhase, setIntroPhase] = useState<"dealing" | "revealing" | "done">("dealing");
  const [revealedCount, setRevealedCount] = useState(0);

  // 인트로 시퀀스: dealing(카드 배치) → revealing(순차 공개) → done
  useEffect(() => {
    if (introPhase !== "dealing") return;
    // 카드 배치 후 잠시 대기 → 공개 시작
    const t = setTimeout(() => setIntroPhase("revealing"), 400);
    return () => clearTimeout(t);
  }, [introPhase]);

  useEffect(() => {
    if (introPhase !== "revealing") return;
    if (revealedCount >= pool.length) {
      // 전부 공개 후 대기 → done
      const t = setTimeout(() => setIntroPhase("done"), REVEAL_HOLD);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setRevealedCount((c) => c + 1), REVEAL_INTERVAL);
    return () => clearTimeout(t);
  }, [introPhase, revealedCount, pool.length]);

  const isIntro = introPhase !== "done";

  // === 드래프트 상태 ===
  const [showGuide, setShowGuide] = useState(true);
  const [lensDomain, setLensDomain] = useState<Domain | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const handleDomainClick = useCallback((domain: Domain) => {
    setLensDomain((prev) => (prev === domain ? null : domain));
  }, []);

  const handleBackgroundClick = useCallback(() => {
    setLensDomain(null);
  }, []);
  const isPlayerTurn = !isIntro && draftTurn < 12 && DRAFT_ORDER[draftTurn] === "player" && !aiDraftPending;

  // 현재 턴부터 연속 플레이어 턴 수 (선택 가능 상한)
  const picksAvailable = useMemo(() => {
    let count = 0;
    for (let i = draftTurn; i < 12; i++) {
      if (DRAFT_ORDER[i] === "player") count++;
      else break;
    }
    return Math.max(count, 1);
  }, [draftTurn]);

  // AI 턴으로 넘어갈 때만 선택 초기화 (연속 플레이어 턴 중에는 유지)
  useEffect(() => {
    if (draftTurn >= 12 || DRAFT_ORDER[draftTurn] !== "player") {
      setSelectedIds([]);
    }
  }, [draftTurn]);

  const handleCardClick = (cardId: string) => {
    setSelectedIds((prev) => {
      // 이미 선택된 카드 클릭 → 해제
      if (prev.includes(cardId)) return prev.filter((id) => id !== cardId);
      // 새 카드: 상한 미달이면 추가, 도달이면 교체
      if (prev.length < picksAvailable) return [...prev, cardId];
      return [cardId];
    });
  };

  const handleCardConfirm = (cardId: string) => {
    setSelectedIds((prev) => prev.filter((id) => id !== cardId));
    onPick(cardId);
  };

  const playerCount = playerHand.length;
  const aiCount = aiHand.length + aiDraftCards.length;
  const aiPickedIds = useMemo(() => new Set(aiDraftCards.map((c) => c.id)), [aiDraftCards]);
  const visiblePool = useMemo(() => pool.filter((c) => !aiPickedIds.has(c.id)), [pool, aiPickedIds]);

  // 마지막 1장 남았을 때 자동 픽
  useEffect(() => {
    if (!isPlayerTurn || visiblePool.length !== 1) return;
    const t = setTimeout(() => onPick(visiblePool[0].id), 800);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlayerTurn, visiblePool.length]);

  // 초기 풀 순서 저장 — 잔흔 표시를 위해 그리드 위치 고정
  const initialPoolRef = useRef<BattleCardType[]>([]);
  if (initialPoolRef.current.length === 0 && pool.length > 0) {
    initialPoolRef.current = [...pool];
  }
  const initialPool = initialPoolRef.current;

  // 현재 풀에 남아있는 ID (pool prop + aiDraftCards 제외)
  const activePoolIds = useMemo(() => new Set(visiblePool.map((c) => c.id)), [visiblePool]);

  // 뽑힌 카드의 귀속 (플레이어 / AI)
  const playerPickedIds = useMemo(() => new Set(playerHand.map((c) => c.id)), [playerHand]);
  const allAiPickedIds = useMemo(
    () => new Set([...aiHand.map((c) => c.id), ...aiDraftCards.map((c) => c.id)]),
    [aiHand, aiDraftCards],
  );

  // === 통합 렌더 — 대전과 동일한 세로 플로우 구조 ===
  return (
    <>
      {/* 드래프트 가이드 오버레이 (인트로 끝난 직후 첫 턴에만) */}
      {!isIntro && showGuide && draftTurn === 0 && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/70 animate-fade-in"
          style={{ zIndex: Z_INDEX.overlay }}
          onClick={() => setShowGuide(false)}
        >
          <div className="relative max-w-xs mx-4 px-8 py-7 rounded-2xl bg-bg-main/95 border border-accent/25 shadow-[0_0_60px_rgba(212,175,55,0.08)] text-center">
            <p className="text-base text-text-secondary leading-relaxed">
              <span className="text-accent font-black text-xl">12명</span> 중 <span className="text-accent font-black text-xl">6명</span>을
              <br />교대로 선택합니다.
            </p>
            <p className="text-sm text-text-tertiary mt-3">
              상대가 가져갈 카드도 고려하세요!
            </p>
            <p className="text-[10px] text-text-tertiary/50 mt-5 animate-pulse">터치하여 시작</p>
          </div>
        </div>
      )}

      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div
        className="max-w-5xl mx-auto flex flex-col gap-3"
        onClick={isIntro ? undefined : handleBackgroundClick}
      >
        {/* ── 상단 카드 행 (대전 AI 패와 동일 래퍼) ── */}
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.01] px-3 py-2">
          <div className="grid grid-cols-3 sm:grid-cols-6 justify-items-center gap-1.5">
            {(isIntro ? pool.slice(0, 6) : initialPool.slice(0, 6)).map((card, i) =>
              isIntro ? (
                <div
                  key={card.id}
                  className={`h-[130px] sm:h-[248px] ${i < revealedCount ? "animate-card-flip-in" : ""}`}
                  style={i < revealedCount ? { animationDelay: "0ms" } : undefined}
                >
                  <BattleCard card={card} faceDown={i >= revealedCount} disabled />
                </div>
              ) : renderDraftCard(card)
            )}
          </div>
        </div>

        {/* ── 중앙 상태 바: 좌(카운트) 중(상태) 우(스네이크) ── */}
        <div className="flex items-center px-4 h-[32px]">
          {/* 좌: 카운트 */}
          <div className="flex-1 flex items-center justify-end gap-2 pr-3">
            <span className="text-[9px] text-text-tertiary font-cinzel">P <span className="text-accent font-black text-sm">{playerCount}</span></span>
            <span className="text-[9px] text-white/15">|</span>
            <span className="text-[9px] text-text-tertiary font-cinzel">AI <span className="text-red-400 font-black text-sm">{aiCount}</span></span>
          </div>

          {/* 중: 상태 메시지 */}
          <div className="shrink-0 text-center min-w-[120px]">
            {isIntro ? (
              <span className="text-xs text-text-secondary">공개 중...</span>
            ) : visiblePool.length === 0 ? (
              <span className="text-xs font-bold text-accent animate-slide-up">대전 시작!</span>
            ) : aiDraftPending ? (
              <div className="flex items-center justify-center gap-1.5">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ai-thinking" />
                  <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ai-thinking [animation-delay:200ms]" />
                  <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ai-thinking [animation-delay:400ms]" />
                </div>
                <span className="text-xs font-medium text-red-400">AI 선택 중</span>
              </div>
            ) : (
              <span className={`text-xs ${isPlayerTurn ? "text-accent/60" : "text-text-tertiary"}`}>
                {isPlayerTurn ? "선택하세요" : "\u00A0"}
              </span>
            )}
          </div>

          {/* 우: 스네이크 인디케이터 */}
          <div className="flex-1 flex items-center justify-start gap-0.5 pl-3">
            {DRAFT_SEQUENCE.map((who, i) => {
              const effectiveTurn = draftTurn + aiDraftCards.length;
              const isPast = i < effectiveTurn;
              const isCurrent = i === effectiveTurn;
              return (
                <div
                  key={i}
                  className={`
                    w-3.5 h-3.5 rounded text-[6px] font-bold flex items-center justify-center transition-all
                    ${isCurrent ? "ring-1 ring-accent scale-110 bg-accent/20 text-accent" : ""}
                    ${isPast
                      ? who === "P"
                        ? "bg-accent/10 text-accent/50"
                        : "bg-red-500/10 text-red-400/50"
                      : !isCurrent
                        ? "bg-white/5 text-text-tertiary/50"
                        : ""
                    }
                  `}
                >
                  {who === "P" ? "P" : "A"}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── 하단 카드 행 (대전 내 패와 동일 래퍼) ── */}
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.01] px-3 py-2">
          <div className="grid grid-cols-3 sm:grid-cols-6 justify-items-center gap-2">
            {(isIntro ? pool.slice(6, 12) : initialPool.slice(6, 12)).map((card, i) =>
              isIntro ? (
                <div
                  key={card.id}
                  className={`h-[130px] sm:h-[248px] ${(i + 6) < revealedCount ? "animate-card-flip-in" : ""}`}
                  style={(i + 6) < revealedCount ? { animationDelay: "0ms" } : undefined}
                >
                  <BattleCard card={card} faceDown={(i + 6) >= revealedCount} disabled />
                </div>
              ) : renderDraftCard(card)
            )}
          </div>
        </div>
      </div>
    </>
  );

  function renderDraftCard(card: BattleCardType) {
    const isActive = activePoolIds.has(card.id);
    const pickedByPlayer = playerPickedIds.has(card.id);
    const pickedByAi = allAiPickedIds.has(card.id);
    const isPicked = pickedByPlayer || pickedByAi;

    return (
      <div key={card.id} className="relative">
        <BattleCard
          card={card}
          highlightDomain={lensDomain ?? undefined}
          onDomainClick={handleDomainClick}
          onClick={isActive ? () => handleCardClick(card.id) : undefined}
          onConfirm={selectedIds.includes(card.id) ? () => handleCardConfirm(card.id) : undefined}
          onInfo={onCardInfo ? () => onCardInfo(card.id) : undefined}
          disabled={!isActive || !isPlayerTurn}
          selected={selectedIds.includes(card.id)}
          pickedBy={pickedByPlayer ? "player" : pickedByAi ? "ai" : undefined}
        />
        {isPicked && (
          <span className={`
            absolute -top-1.5 -right-1.5 text-[9px] font-cinzel font-bold px-2 py-0.5 rounded-full pointer-events-none z-10
            ${pickedByPlayer
              ? "bg-accent/90 text-black"
              : "bg-red-400/90 text-black"}
          `}>
            {pickedByPlayer ? "P" : "AI"}
          </span>
        )}
      </div>
    );
  }
}
