/*
  파일명: components/features/game/battle/DraftPhase.tsx
  기능: v8 드래프트 페이즈 UI (15장 그리드 + 배치 순차 활성화)
  책임: 15장을 5×3 그리드로 배치, 3장씩 순차 활성화하며 나 1장, AI 1장 픽, 나머지 폐기 표시.
*/
"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { Shuffle, Zap, X } from "lucide-react";
import type { DraftState } from "@/lib/game/types";
import BattleCard from "./BattleCard";

interface Props {
  draft: DraftState;
  onPlayerPick: (cardId: string) => void;
  onAiPick: () => void;
  onReshuffle?: () => void;
  onAutoDraft?: () => void;
  onConfirmDraft?: () => void;
  onCardInfo?: (celebId: string) => void;
  playSfx?: (name: string) => void;
}

const AI_PICK_DELAY = 800;
const BATCH_REVIEW_DELAY = 1500;  // 배치 결과 확인 시간
const DRAFT_COMPLETE_DELAY = 2500; // 드래프트 완료 후 대전 전환 대기
const TOTAL_BATCHES = 5;
const BATCH_SIZE = 3;

export default function DraftPhase({ draft, onPlayerPick, onAiPick, onReshuffle, onAutoDraft, onConfirmDraft, onCardInfo, playSfx }: Props) {
  const { pool, playerPicks, aiPicks, currentPicker, round } = draft;

  const batchIndex = Math.floor((round - 1) / 2);

  // ─── 배치 전환 대기: displayBatch는 결과 확인 후에만 전진 ───
  const [displayBatch, setDisplayBatch] = useState(0);
  const [reviewing, setReviewing] = useState(false);
  const prevBatchRef = useRef(0);
  const isDraftDone = currentPicker === "done";

  // 배치 간 리뷰 딜레이
  useEffect(() => {
    if (batchIndex > prevBatchRef.current && batchIndex <= TOTAL_BATCHES) {
      setReviewing(true);
      const t = setTimeout(() => {
        setDisplayBatch(batchIndex);
        setReviewing(false);
        prevBatchRef.current = batchIndex;
      }, BATCH_REVIEW_DELAY);
      return () => clearTimeout(t);
    }
    prevBatchRef.current = batchIndex;
  }, [batchIndex]);

  // 드래프트 완료 리뷰 → 배틀 전환
  useEffect(() => {
    if (!isDraftDone) return;
    setReviewing(true);
    const t = setTimeout(() => {
      onConfirmDraft?.();
    }, DRAFT_COMPLETE_DELAY);
    return () => clearTimeout(t);
  }, [isDraftDone, onConfirmDraft]);

  // AI 자동 픽 (리뷰 중엔 비활성)
  useEffect(() => {
    if (currentPicker !== "ai" || reviewing) return;
    const t = setTimeout(() => {
      playSfx?.("sfx-draft-ai.mp3");
      onAiPick();
    }, AI_PICK_DELAY);
    return () => clearTimeout(t);
  }, [currentPicker, round, onAiPick, playSfx, reviewing]);

  // 픽/폐기 ID 세트
  const playerPickIds = useMemo(() => new Set(playerPicks.map((c) => c.id)), [playerPicks]);
  const aiPickIds = useMemo(() => new Set(aiPicks.map((c) => c.id)), [aiPicks]);
  const pickedIds = useMemo(() => new Set([...playerPickIds, ...aiPickIds]), [playerPickIds, aiPickIds]);

  // 폐기된 카드: displayBatch 이전 배치에 속하면서 픽되지 않은 카드
  const discardedIds = useMemo(() => {
    const set = new Set<string>();
    for (let b = 0; b < displayBatch; b++) {
      const start = b * BATCH_SIZE;
      pool.slice(start, start + BATCH_SIZE).forEach((c) => {
        if (!pickedIds.has(c.id)) set.add(c.id);
      });
    }
    return set;
  }, [displayBatch, pool, pickedIds]);

  const isPlayerTurn = currentPicker === "player" && !reviewing;
  const currentBatchNum = Math.min(displayBatch + 1, TOTAL_BATCHES);
  const canReshuffle = onReshuffle && playerPicks.length === 0 && aiPicks.length === 0;

  return (
    <div className="w-full flex-1 flex flex-col items-center justify-center gap-4">
      {/* ── 턴 표시 ── */}
      <div className="flex items-center gap-3 flex-wrap justify-center">
        <span className="text-sm font-cinzel text-white/30 tracking-wider">
          {currentBatchNum}/{TOTAL_BATCHES}
        </span>
        <div className={`text-xs font-bold px-3 py-0.5 rounded-full transition-all ${
          reviewing
            ? "bg-white/5 text-white/40 border border-white/10"
            : isPlayerTurn
              ? "bg-accent/10 text-accent border border-accent/30"
              : "bg-red-500/10 text-red-400 border border-red-500/30 animate-pulse"
        }`}>
          {isDraftDone ? "드래프트 완료" : reviewing ? "결과 확인" : isPlayerTurn ? "내 차례" : "AI 선택 중"}
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-accent/50">P {playerPicks.length}</span>
          <span className="text-white/20">/</span>
          <span className="text-red-400/50">AI {aiPicks.length}</span>
        </div>
        {canReshuffle && (
          <button
            onClick={() => { playSfx?.("sfx-reshuffle.mp3"); onReshuffle?.(); }}
            className="flex items-center gap-1 text-xs text-white/30 hover:text-accent/70 px-2 py-0.5 rounded border border-white/[0.06] hover:border-accent/30 transition-all active:scale-95"
          >
            <Shuffle size={12} />
            <span>다시 섞기</span>
          </button>
        )}
        {onAutoDraft && (
          <button
            onClick={() => { playSfx?.("sfx-confirm.mp3"); onAutoDraft(); }}
            className="flex items-center gap-1 text-xs text-accent/70 hover:text-accent px-2.5 py-0.5 rounded border border-accent/30 hover:border-accent/50 bg-accent/[0.06] hover:bg-accent/10 transition-all active:scale-95"
          >
            <Zap size={12} />
            <span>자동 선택</span>
          </button>
        )}
      </div>

      {/* ── 15장 그리드 (5열 × 3행) ── */}
      <div className="grid grid-cols-5 gap-2 sm:gap-3">
        {pool.map((card, idx) => {
          const cardBatch = Math.floor(idx / BATCH_SIZE);
          const isActive = cardBatch === displayBatch;
          const isFuture = cardBatch > displayBatch;
          const isPlayerPick = playerPickIds.has(card.id);
          const isAiPick = aiPickIds.has(card.id);
          const isDiscarded = discardedIds.has(card.id);
          const isPicked = pickedIds.has(card.id);
          const canPick = isActive && isPlayerTurn && !isPicked;

          return (
            <div
              key={card.id}
              className={`@container relative w-[17vw] sm:w-[100px] lg:w-[110px] transition-all duration-300 ${
                isFuture ? "opacity-20 scale-[0.92] saturate-0" : ""
              } ${isDiscarded ? "opacity-15 scale-[0.9]" : ""
              } ${isPicked && !isActive ? "opacity-50 scale-[0.95]" : ""
              } ${isActive && !isPicked ? "ring-1 ring-accent/30 rounded-lg" : ""}`}
            >
              <BattleCard
                card={card}
                compact
                disabled={!canPick}
                onClick={canPick ? () => { playSfx?.("sfx-draft-pick.mp3"); onPlayerPick(card.id); } : undefined}
                pickedBy={isPlayerPick ? "player" : isAiPick ? "ai" : undefined}
                onInfo={onCardInfo ? () => onCardInfo(card.id) : undefined}
              />
              {/* P 배지 */}
              {isPlayerPick && (
                <span className="absolute -top-1.5 -right-1.5 text-[10px] font-cinzel font-bold w-5 h-5 rounded-full bg-accent text-black flex items-center justify-center z-10 shadow-[0_0_6px_rgba(212,175,55,0.4)]">
                  P
                </span>
              )}
              {/* AI 배지 */}
              {isAiPick && (
                <span className="absolute -top-1.5 -right-1.5 text-[10px] font-cinzel font-bold w-5 h-5 rounded-full bg-red-400 text-black flex items-center justify-center z-10 shadow-[0_0_6px_rgba(248,113,113,0.4)]">
                  AI
                </span>
              )}
              {/* 폐기 오버레이 */}
              {isDiscarded && (
                <div className="absolute inset-0 flex items-center justify-center z-10 rounded-lg bg-black/60">
                  <X size={20} className="text-red-400/60" strokeWidth={3} />
                </div>
              )}
              {/* 미공개 오버레이 */}
              {isFuture && (
                <div className="absolute inset-0 z-10 rounded-lg bg-black/40 backdrop-blur-[2px]" />
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
}
