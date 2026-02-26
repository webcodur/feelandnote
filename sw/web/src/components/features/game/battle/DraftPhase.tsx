/*
  파일명: components/features/game/battle/DraftPhase.tsx
  기능: v8 드래프트 페이즈 UI (15장 그리드 + 배치 순차 활성화)
  책임: 15장을 5×3 그리드로 배치, 3장씩 순차 활성화하며 나 1장, AI 1장 픽, 나머지 폐기 표시.
*/
"use client";

import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { Shuffle, Zap, X } from "lucide-react";
import type { DraftState } from "@/lib/game/types";
import type { SpeechTone, DialogueType } from "@/lib/game/voice/types";
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
  showDialogue?: (celebId: string, tone: SpeechTone, type: DialogueType, meta?: { nickname: string; avatarUrl: string | null }) => void;
}

const STEP_DELAY = 1000;             // 모든 단계 간 1초 간격
const DRAFT_COMPLETE_DELAY = 2000;   // 드래프트 완료 후 대전 전환
const TOTAL_BATCHES = 5;
const BATCH_SIZE = 3;

export default function DraftPhase({ draft, onPlayerPick, onAiPick, onReshuffle, onAutoDraft, onConfirmDraft, onCardInfo, playSfx, showDialogue }: Props) {
  const { pool, playerPicks, aiPicks, currentPicker, round } = draft;

  const batchIndex = Math.floor((round - 1) / 2);

  // ─── 시각 상태 (ref 기반 타이머로 관리, effect cleanup에 영향받지 않음) ───
  const [displayBatch, setDisplayBatch] = useState(0);
  const [visualStep, setVisualStep] = useState<"idle" | "ai-thinking" | "ai-picked" | "discarding" | "revealing">("idle");
  const [pendingDiscardBatch, setPendingDiscardBatch] = useState(-1);

  const busy = visualStep !== "idle";
  const isDraftDone = currentPicker === "done";

  // ─── Ref 기반 타이머 (React effect cleanup에 의해 지워지지 않음) ───
  const chainRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const chainActiveRef = useRef(false);
  const lastHandledRoundRef = useRef(0);

  // 최신 props를 ref로 유지 (타이머 콜백에서 stale closure 방지)
  const onAiPickRef = useRef(onAiPick);
  onAiPickRef.current = onAiPick;
  const onConfirmDraftRef = useRef(onConfirmDraft);
  onConfirmDraftRef.current = onConfirmDraft;
  const playSfxRef = useRef(playSfx);
  playSfxRef.current = playSfx;

  const prevBatchRef = useRef(0);

  const clearChain = useCallback(() => {
    chainRef.current.forEach(clearTimeout);
    chainRef.current = [];
    chainActiveRef.current = false;
  }, []);

  // 언마운트 시 정리
  useEffect(() => clearChain, [clearChain]);

  // ─── 배치 전환 체인 (폐기 → 개봉 → 다음 배치 활성화) ───
  // fromBatch 의 잔여 카드를 폐기하고, toBatch 를 활성화한다.
  // 전환 완료 후 AI 선공이면 이어서 AI 체인을 시작한다.
  const startBatchTransition = useCallback((fromBatch: number, toBatch: number) => {
    let t = 0;

    // 폐기 표시
    chainRef.current.push(setTimeout(() => {
      setPendingDiscardBatch(fromBatch);
      setVisualStep("discarding");
    }, t));

    // 1초 후: 개봉 준비
    t += STEP_DELAY;
    chainRef.current.push(setTimeout(() => {
      setVisualStep("revealing");
    }, t));

    // 2초 후: 다음 배치 활성화
    t += STEP_DELAY;
    chainRef.current.push(setTimeout(() => {
      setDisplayBatch(toBatch);
      setPendingDiscardBatch(-1);
      prevBatchRef.current = toBatch;
      setVisualStep("idle");
      chainActiveRef.current = false;
    }, t));
  }, []);

  // ─── AI 턴 감지 ───
  // AI 선공(배치 첫 픽): AI 픽 → idle (유저 차례)
  // AI 후공(배치 마지막 픽): AI 픽 → 배치 전환
  useEffect(() => {
    if (currentPicker !== "ai") return;
    if (chainActiveRef.current) return;
    if (lastHandledRoundRef.current >= round) return;

    chainActiveRef.current = true;
    lastHandledRoundRef.current = round;
    const curBatch = displayBatch;
    const isLastInBatch = round % 2 === 0; // 짝수 라운드 = 배치의 두 번째(마지막) 픽

    // T+0: "AI 선택 중" 표시
    setVisualStep("ai-thinking");

    // T+1s: AI 선택 실행
    chainRef.current.push(setTimeout(() => {
      playSfxRef.current?.("sfx-draft-ai.mp3");
      onAiPickRef.current();
      setVisualStep("ai-picked");
    }, STEP_DELAY));

    if (isLastInBatch) {
      // AI 후공 → AI 픽 결과 1초 보여준 후 배치 전환
      chainRef.current.push(setTimeout(() => {
        startBatchTransition(curBatch, curBatch + 1);
      }, STEP_DELAY * 2));
    } else {
      // AI 선공 → AI 픽 결과 1초 보여준 후 유저 턴으로
      chainRef.current.push(setTimeout(() => {
        setVisualStep("idle");
        chainActiveRef.current = false;
      }, STEP_DELAY * 2));
    }
  }, [currentPicker, round, displayBatch, startBatchTransition]);

  // ─── 유저가 배치 마지막 픽을 완료 → 배치 전환 ───
  // batchIndex 가 올라갔는데 AI 체인이 처리하지 않은 경우 = 유저가 후공
  useEffect(() => {
    if (batchIndex <= prevBatchRef.current) {
      prevBatchRef.current = batchIndex;
      return;
    }
    if (chainActiveRef.current) {
      // AI 체인이 이미 처리 중 → 스킵 (AI 후공 케이스)
      prevBatchRef.current = batchIndex;
      return;
    }
    // 유저가 배치 마지막 픽을 했으므로 배치 전환 시작
    const fromBatch = prevBatchRef.current;
    chainActiveRef.current = true;
    startBatchTransition(fromBatch, batchIndex);
  }, [batchIndex, startBatchTransition]);

  // ─── 드래프트 완료 → 마지막 폐기 표시 후 배틀 전환 ───
  useEffect(() => {
    if (!isDraftDone) return;
    const delay = chainActiveRef.current ? STEP_DELAY * 5 : 0;
    const t = setTimeout(() => {
      chainActiveRef.current = true;
      setVisualStep("discarding");
      setPendingDiscardBatch(displayBatch);
      const t2 = setTimeout(() => {
        onConfirmDraftRef.current?.();
      }, DRAFT_COMPLETE_DELAY);
      chainRef.current.push(t2);
    }, delay);
    chainRef.current.push(t);
  }, [isDraftDone, displayBatch]);

  // 픽/폐기 ID 세트
  const playerPickIds = useMemo(() => new Set(playerPicks.map((c) => c.id)), [playerPicks]);
  const aiPickIds = useMemo(() => new Set(aiPicks.map((c) => c.id)), [aiPicks]);
  const pickedIds = useMemo(() => new Set([...playerPickIds, ...aiPickIds]), [playerPickIds, aiPickIds]);

  // 폐기된 카드: displayBatch 이전 배치 + discarding 중인 배치의 미픽 카드
  const discardedIds = useMemo(() => {
    const set = new Set<string>();
    const upTo = pendingDiscardBatch >= 0 ? Math.max(displayBatch, pendingDiscardBatch + 1) : displayBatch;
    for (let b = 0; b < upTo; b++) {
      const start = b * BATCH_SIZE;
      pool.slice(start, start + BATCH_SIZE).forEach((c) => {
        if (!pickedIds.has(c.id)) set.add(c.id);
      });
    }
    return set;
  }, [displayBatch, pendingDiscardBatch, pool, pickedIds]);

  const isPlayerTurn = currentPicker === "player" && !busy;
  const currentBatchNum = Math.min(displayBatch + 1, TOTAL_BATCHES);
  const canReshuffle = onReshuffle && playerPicks.length === 0 && aiPicks.length === 0;

  return (
    <div className="w-full flex-1 flex flex-col items-center justify-center gap-4">
      {/* ── 턴 표시 ── */}
      <div className="flex items-center gap-3 flex-wrap justify-center bg-black/80 rounded-lg px-4 py-2">
        <span className="text-sm font-cinzel text-white/60 tracking-wider">
          {currentBatchNum}/{TOTAL_BATCHES}
        </span>
        <div className={`text-xs font-bold px-3 py-0.5 rounded-full transition-all ${
          busy
            ? "bg-white/5 text-white/40 border border-white/10"
            : isPlayerTurn
              ? "bg-accent/10 text-accent border border-accent/30"
              : "bg-red-500/10 text-red-400 border border-red-500/30 animate-pulse"
        }`}>
          {isDraftDone ? "드래프트 완료" : visualStep === "ai-thinking" ? "AI 선택 중" : visualStep === "ai-picked" ? "AI 선택 완료" : visualStep === "discarding" ? "카드 폐기" : visualStep === "revealing" ? "다음 개봉" : isPlayerTurn ? "내 차례" : "AI 선택 중"}
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-accent/80">P {playerPicks.length}</span>
          <span className="text-white/40">/</span>
          <span className="text-red-400/80">AI {aiPicks.length}</span>
        </div>
        {canReshuffle && (
          <button
            onClick={() => { playSfx?.("sfx-reshuffle.mp3"); onReshuffle?.(); }}
            className="flex items-center gap-1 text-xs text-white/60 hover:text-accent/90 px-2 py-0.5 rounded border border-white/15 hover:border-accent/50 transition-all active:scale-95"
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

      {/* ── 15장 그리드 (모바일 3열 5행 / PC 5열 3행) ── */}
      <div className="grid grid-cols-3 md:grid-cols-5 gap-2 sm:gap-3 lg:gap-4 px-2 w-full max-w-sm md:max-w-none justify-items-center">
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
              className={`@container relative w-[90px] min-[380px]:w-[105px] sm:w-[120px] lg:w-[164px] transition-all duration-300 ${
                isFuture ? "opacity-20 scale-[0.92] saturate-0" : ""
              } ${isDiscarded ? "opacity-15 scale-[0.9]" : ""
              } ${isPicked && !isActive ? "opacity-50 scale-[0.95]" : ""
              } ${isActive && !isPicked ? "ring-1 ring-accent/30 rounded-lg" : ""}`}
            >
              <BattleCard
                card={card}
                compact
                disabled={!canPick}
                onClick={canPick ? () => { playSfx?.("sfx-draft-pick.mp3"); showDialogue?.(card.id, card.speechTone, "select", { nickname: card.nickname, avatarUrl: card.avatarUrl }); onPlayerPick(card.id); } : undefined}
                pickedBy={isPlayerPick ? "player" : isAiPick ? "ai" : undefined}
                onInfo={onCardInfo ? () => onCardInfo(card.id) : undefined}
              />
              {/* P 배지 */}
              {isPlayerPick && (
                <span className="absolute -top-1.5 -right-1.5 text-[10px] sm:text-xs font-cinzel font-bold w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-accent text-black flex items-center justify-center z-10 shadow-[0_0_6px_rgba(212,175,55,0.4)]">
                  P
                </span>
              )}
              {/* AI 배지 */}
              {isAiPick && (
                <span className="absolute -top-1.5 -right-1.5 text-[10px] sm:text-xs font-cinzel font-bold w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-red-400 text-black flex items-center justify-center z-10 shadow-[0_0_6px_rgba(248,113,113,0.4)]">
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
