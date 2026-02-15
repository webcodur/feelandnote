/*
  파일명: components/features/game/battle/hooks/useBattleGame.ts
  기능: 영향력 대전 게임 상태 관리
  책임: 드래프트→대전→결과 전체 게임 플로우를 관리한다.
*/
"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { BattleCard, GameState, RoundResult } from "@/lib/game/types";
import { DOMAINS, DRAFT_ORDER } from "@/lib/game/types";
import { resolveRound, shuffleDomains } from "@/lib/game/gameEngine";
import { aiDraftPick, aiBattlePick } from "@/lib/game/aiPlayer";
import { buildDraftPool } from "@/lib/game/deckBuilder";
import { getCelebCards } from "@/actions/game/getCelebCards";

const initialState: GameState = {
  phase: "idle",
  pool: [],
  domainOrder: [],
  currentRound: 0,
  playerHand: [],
  aiHand: [],
  playerScore: 0,
  aiScore: 0,
  rounds: [],
  draftTurn: 0,
  nextDomain: null,
};

export function useBattleGame() {
  const [state, setState] = useState<GameState>(initialState);
  const [allCards, setAllCards] = useState<BattleCard[]>([]);
  const [lastResult, setLastResult] = useState<RoundResult | null>(null);
  const [aiDraftPending, setAiDraftPending] = useState(false);
  const [aiDraftCards, setAiDraftCards] = useState<BattleCard[]>([]);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const stateRef = useRef(state);

  // stateRef를 항상 최신으로 유지
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  const startGame = useCallback(async () => {
    setState((s) => ({ ...s, phase: "loading" }));

    let cards = allCards;
    if (cards.length === 0) {
      cards = await getCelebCards();
      setAllCards(cards);
    }

    if (cards.length < 12) {
      setState(initialState);
      return;
    }

    const pool = buildDraftPool(cards);
    const domainOrder = shuffleDomains([...DOMAINS]);

    clearTimers();
    setLastResult(null);
    setAiDraftPending(false);
    setAiDraftCards([]);

    setState({
      ...initialState,
      phase: "draft",
      pool,
      domainOrder,
      nextDomain: domainOrder[0],
    });
  }, [allCards, clearTimers]);

  const draftPick = useCallback(
    (cardId: string) => {
      const prev = stateRef.current;
      if (prev.phase !== "draft") return;

      const turn = prev.draftTurn;
      if (DRAFT_ORDER[turn] !== "player") return;

      const card = prev.pool.find((c) => c.id === cardId);
      if (!card) return;

      const newPool = prev.pool.filter((c) => c.id !== cardId);
      const newPlayerHand = [...prev.playerHand, card];
      const newTurn = turn + 1;

      // AI 턴이 있는지 확인
      const hasAiTurn = newTurn < 12 && DRAFT_ORDER[newTurn] === "ai" && newPool.length > 0;

      if (!hasAiTurn) {
        // AI 턴 없이 바로 진행
        const isDraftDone = newTurn >= 12 || newPool.length === 0;
        setState({
          ...prev,
          pool: newPool,
          playerHand: newPlayerHand,
          draftTurn: newTurn,
          phase: isDraftDone ? "battle" : "draft",
        });
        return;
      }

      // AI 연속 턴 계산
      let tempPool = [...newPool];
      let tempAiHand = [...prev.aiHand];
      let tempTurn = newTurn;
      const pickedCards: BattleCard[] = [];

      while (tempTurn < 12 && DRAFT_ORDER[tempTurn] === "ai" && tempPool.length > 0) {
        const aiCard = aiDraftPick(tempPool);
        tempPool = tempPool.filter((c) => c.id !== aiCard.id);
        tempAiHand = [...tempAiHand, aiCard];
        pickedCards.push(aiCard);
        tempTurn++;
      }

      const isDraftDone = tempTurn >= 12 || tempPool.length === 0;

      // 1) 즉시: 플레이어 카드 반영 + AI pending 시작
      //    pool에서 AI가 선택한 카드도 미리 제거 (중복 key 방지)
      setAiDraftPending(true);
      setAiDraftCards([]);
      setState({
        ...prev,
        pool: tempPool, // AI가 선택한 카드까지 미리 제거
        playerHand: newPlayerHand,
        draftTurn: newTurn,
      });

      // 2) 순차 타이머: AI 카드를 하나씩 공개
      clearTimers();
      pickedCards.forEach((pc, idx) => {
        const t = setTimeout(() => {
          setAiDraftCards((arr) => [...arr, pc]);
        }, 300 * (idx + 1));
        timersRef.current.push(t);
      });

      // 3) 최종 타이머: AI 패 확정 + aiDraftCards 제거
      const finalTimer = setTimeout(() => {
        setAiDraftPending(false);
        setAiDraftCards([]);
        setState((s) => ({
          ...s,
          aiHand: tempAiHand,
          draftTurn: tempTurn,
          phase: isDraftDone ? "battle" : "draft",
        }));
      }, 300 * pickedCards.length + 400);
      timersRef.current.push(finalTimer);
    },
    [clearTimers]
  );

  const playCard = useCallback(
    (cardId: string) => {
      const prev = stateRef.current;
      if (prev.phase !== "battle") return;
      if (prev.currentRound >= 6) return;

      // 이미 사용된 카드 ID
      const usedPlayerIds = new Set(prev.rounds.map((r) => r.playerCard.id));
      const usedAiIds = new Set(prev.rounds.map((r) => r.aiCard.id));

      const playerCard = prev.playerHand.find((c) => c.id === cardId);
      if (!playerCard || usedPlayerIds.has(cardId)) return;

      const availableAiHand = prev.aiHand.filter((c) => !usedAiIds.has(c.id));
      const availablePlayerHand = prev.playerHand.filter((c) => !usedPlayerIds.has(c.id));

      const domain = prev.domainOrder[prev.currentRound];
      const nextRound = prev.currentRound + 1;
      const nextDomain = nextRound < 6 ? prev.domainOrder[nextRound] : null;

      const remainingRounds = 6 - prev.currentRound;
      const futureDomains = prev.domainOrder.slice(prev.currentRound + 1);
      const aiPick = aiBattlePick(
        availableAiHand, domain, nextDomain, "normal",
        availablePlayerHand, prev.aiScore, prev.playerScore, remainingRounds, futureDomains
      );
      const result = resolveRound(domain, playerCard, aiPick.card, aiPick.strategy);

      const newPlayerScore = prev.playerScore + result.pointsAwarded.player;
      const newAiScore = prev.aiScore + result.pointsAwarded.ai;
      const newRounds = [...prev.rounds, result];
      const isGameDone = nextRound >= 6;

      // 동일 배치에서 처리 (setState 업데이터 내부 사이드이펙트 제거)
      setLastResult(result);
      setState({
        ...prev,
        playerScore: newPlayerScore,
        aiScore: newAiScore,
        rounds: newRounds,
        currentRound: nextRound,
        nextDomain: isGameDone ? null : (nextRound + 1 < 6 ? prev.domainOrder[nextRound + 1] : null),
        phase: "revealing",
      });
    },
    []
  );

  const continueFromReveal = useCallback(() => {
    setLastResult(null);
    setState((prev) => ({
      ...prev,
      phase: prev.currentRound >= 6 ? "result" : "battle",
    }));
  }, []);

  const reset = useCallback(() => {
    clearTimers();
    setLastResult(null);
    setAiDraftPending(false);
    setAiDraftCards([]);
    setState(initialState);
  }, [clearTimers]);

  return {
    state,
    lastResult,
    aiDraftPending,
    aiDraftCards,
    startGame,
    draftPick,
    playCard,
    continueFromReveal,
    reset,
  };
}
