/*
  파일명: components/features/game/battle/hooks/useBattleGame.ts
  기능: 패권 v6 게임 상태 관리
  책임: draft→battle→result 동시 행동 게임 플로우를 관리한다.
*/
"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { BattleCard, GameState, Command, DraftState, Mandate, RoundAction, Difficulty } from "@/lib/game/types";
import { INITIAL_POWER, INITIAL_MORALE, MANDATE_POOL, COMMANDS } from "@/lib/game/types";
import { executeRound, calcAptitudeWithCaptain, applyCounter, getCounterResult } from "@/lib/game/gameEngine";
import { aiSelectRound, aiSelectCaptain } from "@/lib/game/aiPlayer";
import { buildDraftPool, aiDraftPick } from "@/lib/game/deckBuilder";
import { getCelebCards, loadCardDialogues } from "@/actions/game/getCelebCards";

const DRAFT_ROUNDS = 10; // 5장씩 = 10 픽 (5장 폐기)
const DRAFT_REVEAL = 3;  // 드래프트에서 한 번에 공개되는 카드 수

/** 천명 순서 셔플 (중복 허용하되 연속 동일 방지) */
function shuffleMandates(): Mandate[] {
  const result: Mandate[] = [];
  const pool = [...MANDATE_POOL];
  for (let i = 0; i < 8; i++) {
    const filtered = result.length > 0
      ? pool.filter((m) => m.command !== result[result.length - 1].command)
      : pool;
    const pick = filtered[Math.floor(Math.random() * filtered.length)];
    result.push(pick);
  }
  return result;
}

const emptyDraft: DraftState = {
  pool: [],
  playerPicks: [],
  aiPicks: [],
  currentPicker: "player",
  round: 1,
};

const initialState: GameState = {
  phase: "idle",
  difficulty: "normal",
  draft: emptyDraft,
  playerHand: [],
  aiHand: [],
  playerDiscard: [],
  aiDiscard: [],
  playerNation: { power: INITIAL_POWER, morale: INITIAL_MORALE },
  aiNation: { power: INITIAL_POWER, morale: INITIAL_MORALE },
  currentRound: 1,
  battleSubPhase: "selecting",
  roundRecords: [],
  pendingRound: null,
  mandates: [],
  mandateIndex: 0,
  playerCaptainId: null,
  aiCaptainId: null,
};

/**
 * 드래프트 픽 순서 결정 (배치별 선공 교대)
 * normal: 배치 0(라운드1,2)은 player 선공
 * hard:   배치 0(라운드1,2)은 AI 선공
 */
function getPickerForRound(round: number, difficulty: Difficulty = "normal"): "player" | "ai" {
  const batchIndex = Math.floor((round - 1) / 2);
  const isFirstInBatch = round % 2 === 1;
  const playerFirst = difficulty === "hard"
    ? batchIndex % 2 !== 0   // hard: AI가 첫 배치 선공
    : batchIndex % 2 === 0;  // normal: 플레이어 첫 배치 선공
  if (playerFirst) return isFirstInBatch ? "player" : "ai";
  return isFirstInBatch ? "ai" : "player";
}

/** 현재 배치(3장 묶음)의 시작/끝 인덱스. 배치마다 2픽 + 1폐기. */
function getDraftBatch(round: number, poolSize: number): { start: number; end: number } {
  const batchIndex = Math.floor((round - 1) / 2);
  const start = batchIndex * DRAFT_REVEAL;
  const end = Math.min(start + DRAFT_REVEAL, poolSize);
  return { start, end };
}

// 최소 체류 시간 (더블클릭으로 단계를 건너뛰는 것 방지)
const MIN_PHASE_MS = 800;

export function useBattleGame() {
  const [state, setState] = useState<GameState>(initialState);
  const [allCards, setAllCards] = useState<BattleCard[]>([]);
  const stateRef = useRef(state);

  useEffect(() => { stateRef.current = state; }, [state]);

  // ─── 게임 시작 ───
  const startGame = useCallback(async (difficulty: Difficulty = "normal") => {
    setState((s) => ({ ...s, phase: "loading" }));

    let cards = allCards;
    if (cards.length === 0) {
      cards = await getCelebCards();
      setAllCards(cards);
    }

    if (cards.length < 15) {
      setState(initialState);
      return;
    }

    const pool = buildDraftPool(cards);

    // 드래프트 풀(15장)의 대사만 경량 조회
    const poolIds = pool.map((c) => c.id);
    const dialogueMap = await loadCardDialogues(poolIds);
    const poolWithDialogues = pool.map((c) => {
      const dl = dialogueMap.get(c.id);
      return dl ? { ...c, dialogueLines: dl } : c;
    });

    setState({
      ...initialState,
      phase: "draft",
      difficulty,
      draft: {
        pool: poolWithDialogues,
        playerPicks: [],
        aiPicks: [],
        currentPicker: getPickerForRound(1, difficulty),
        round: 1,
      },
    });
  }, [allCards]);

  // ─── 드래프트 픽 (플레이어) ───
  const draftPick = useCallback((cardId: string) => {
    const prev = stateRef.current;
    if (prev.phase !== "draft") return;
    if (prev.draft.currentPicker !== "player") return;

    // 현재 배치(3장)에서만 선택 가능
    const { start, end } = getDraftBatch(prev.draft.round, prev.draft.pool.length);
    const batchCards = prev.draft.pool.slice(start, end);
    const card = batchCards.find((c) => c.id === cardId);
    if (!card) return;

    const pickedIds = new Set([
      ...prev.draft.playerPicks.map((c) => c.id),
      ...prev.draft.aiPicks.map((c) => c.id),
    ]);
    if (pickedIds.has(cardId)) return;

    const newPlayerPicks = [...prev.draft.playerPicks, card];
    const nextRound = prev.draft.round + 1;

    if (nextRound > DRAFT_ROUNDS) {
      setState((s) => ({
        ...s,
        draft: { ...s.draft, playerPicks: newPlayerPicks, round: nextRound, currentPicker: "done" },
      }));
      return;
    }

    setState((s) => ({
      ...s,
      draft: {
        ...s.draft,
        playerPicks: newPlayerPicks,
        round: nextRound,
        currentPicker: getPickerForRound(nextRound, s.difficulty),
      },
    }));
  }, []);

  // ─── 드래프트 AI 턴 ───
  const draftAiTurn = useCallback(() => {
    const prev = stateRef.current;
    if (prev.phase !== "draft") return;
    if (prev.draft.currentPicker !== "ai") return;

    const pickedIds = new Set([
      ...prev.draft.playerPicks.map((c) => c.id),
      ...prev.draft.aiPicks.map((c) => c.id),
    ]);
    // 현재 배치(3장)에서만 선택 가능
    const { start, end } = getDraftBatch(prev.draft.round, prev.draft.pool.length);
    const batchCards = prev.draft.pool.slice(start, end);
    const available = batchCards.filter((c) => !pickedIds.has(c.id));
    if (available.length === 0) return;

    const pick = aiDraftPick(available, prev.draft.aiPicks, prev.draft.playerPicks);
    const newAiPicks = [...prev.draft.aiPicks, pick];
    const nextRound = prev.draft.round + 1;

    if (nextRound > DRAFT_ROUNDS) {
      setState((s) => ({
        ...s,
        draft: { ...s.draft, aiPicks: newAiPicks, round: nextRound, currentPicker: "done" },
      }));
      return;
    }

    setState((s) => ({
      ...s,
      draft: {
        ...s.draft,
        aiPicks: newAiPicks,
        round: nextRound,
        currentPicker: getPickerForRound(nextRound, s.difficulty),
      },
    }));
  }, []);

  // ─── 드래프트 패 다시 섞기 ───
  const reshuffleDraft = useCallback(() => {
    const prev = stateRef.current;
    if (prev.phase !== "draft") return;
    if (prev.draft.playerPicks.length > 0 || prev.draft.aiPicks.length > 0) return;

    const pool = buildDraftPool(allCards);
    setState((s) => ({
      ...s,
      draft: { ...s.draft, pool },
    }));
  }, [allCards]);

  // ─── 자동 드래프트 (남은 픽을 AI 로직으로 자동 완료) ───
  const autoDraft = useCallback(() => {
    const prev = stateRef.current;
    if (prev.phase !== "draft") return;

    const playerPicks = [...prev.draft.playerPicks];
    const aiPicks = [...prev.draft.aiPicks];
    let round = prev.draft.round;

    while (round <= DRAFT_ROUNDS) {
      const pickedIds = new Set([...playerPicks.map((c) => c.id), ...aiPicks.map((c) => c.id)]);
      // 수동 드래프트와 동일하게 현재 배치(3장)에서만 선택
      const { start, end } = getDraftBatch(round, prev.draft.pool.length);
      const batchCards = prev.draft.pool.slice(start, end);
      const available = batchCards.filter((c) => !pickedIds.has(c.id));
      if (available.length === 0) break;

      const picker = getPickerForRound(round, prev.difficulty);
      if (picker === "player") {
        playerPicks.push(aiDraftPick(available, playerPicks, aiPicks));
      } else {
        aiPicks.push(aiDraftPick(available, aiPicks, playerPicks));
      }
      round++;
    }

    setState((s) => ({
      ...s,
      draft: { ...s.draft, playerPicks, aiPicks, round, currentPicker: "done" },
    }));
  }, []);

  // ─── 드래프트 완료 확정 → 주장 선택 전환 ───
  const confirmDraft = useCallback(() => {
    const prev = stateRef.current;
    if (prev.phase !== "draft" || prev.draft.currentPicker !== "done") return;
    setState((s) => ({
      ...s,
      phase: "captain",
      playerHand: s.draft.playerPicks,
      aiHand: s.draft.aiPicks,
    }));
  }, []);

  // ─── 주장 선택 (플레이어) → 배틀 전환 ───
  const selectCaptain = useCallback((cardId: string) => {
    const prev = stateRef.current;
    if (prev.phase !== "captain") return;
    if (!prev.playerHand.some(c => c.id === cardId)) return;

    const aiCaptainId = aiSelectCaptain(prev.aiHand);
    const mandates = shuffleMandates();

    setState((s) => ({
      ...s,
      phase: "battle",
      playerCaptainId: cardId,
      aiCaptainId,
      currentRound: 1,
      battleSubPhase: "selecting",
      mandates,
      mandateIndex: 0,
    }));
  }, []);

  // ─── 현재 천명 ───
  const getCurrentMandate = (s: GameState) =>
    s.mandates.length > 0 ? s.mandates[s.mandateIndex % s.mandates.length] : null;

  // ─── 배틀: 동시 행동 라운드 제출 ───
  const submitRound = useCallback((
    cardId: string,
    command: Command,
    recoverId?: string,
  ) => {
    const prev = stateRef.current;
    if (prev.phase !== "battle" || prev.battleSubPhase !== "selecting") return;

    const playerCard = prev.playerHand.find((c) => c.id === cardId);
    if (!playerCard) return;

    const mandate = getCurrentMandate(prev);

    // AI 패 소진 시 버린패에서 랜덤 1장 징집
    let effectiveAiHand = prev.aiHand;
    let effectiveAiDiscard = prev.aiDiscard;
    let aiCard: BattleCard | undefined;
    let aiChoice: { cardId: string; command: Command; recoverId?: string };

    if (effectiveAiHand.length > 0) {
      aiChoice = aiSelectRound({
        hand: effectiveAiHand,
        aiNation: prev.aiNation,
        playerNation: prev.playerNation,
        playerHand: prev.playerHand,
        aiDiscard: effectiveAiDiscard,
        roundRecords: prev.roundRecords,
        currentRound: prev.currentRound,
        mandateCommand: mandate?.command,
        aiCaptainId: prev.aiCaptainId,
      });
      aiCard = effectiveAiHand.find((c) => c.id === aiChoice.cardId);
    } else if (effectiveAiDiscard.length > 0) {
      // AI 손패 소진: 버린패에서 랜덤 1장 징집
      const idx = Math.floor(Math.random() * effectiveAiDiscard.length);
      const conscript = effectiveAiDiscard[idx];
      aiCard = conscript;
      aiChoice = {
        cardId: conscript.id,
        command: COMMANDS[Math.floor(Math.random() * COMMANDS.length)],
      };
      effectiveAiHand = [conscript];
      effectiveAiDiscard = effectiveAiDiscard.filter((_, i) => i !== idx);
    } else {
      aiChoice = { cardId: "", command: "assault" };
    }

    if (!aiCard) {
      setState((s) => ({ ...s, phase: "result" }));
      return;
    }

    // 적성 + 주장 오라 + 상성 보정 계산
    const pCaptainInHand = !!prev.playerCaptainId && prev.playerHand.some(c => c.id === prev.playerCaptainId);
    const aCaptainInHand = !!prev.aiCaptainId && effectiveAiHand.some(c => c.id === prev.aiCaptainId);
    const pRawApt = calcAptitudeWithCaptain(playerCard, command, prev.playerCaptainId, pCaptainInHand);
    const aRawApt = calcAptitudeWithCaptain(aiCard, aiChoice.command, prev.aiCaptainId, aCaptainInHand);
    const pMandateBonus = mandate?.command === command;
    const aMandateBonus = mandate?.command === aiChoice.command;
    const pApt = pMandateBonus ? pRawApt * 1.5 : pRawApt;
    const aApt = aMandateBonus ? aRawApt * 1.5 : aRawApt;

    const counterResult = getCounterResult(command, aiChoice.command);
    const { myMul: pMul, oppMul: aMul } = applyCounter(counterResult, pApt, aApt);

    const playerAction: RoundAction = {
      cardId,
      command,
      recoverId,
      card: playerCard,
      aptitude: pApt,
      mandateBonus: !!pMandateBonus,
      effectiveAptitude: pApt * pMul,
    };

    const aiAction: RoundAction = {
      cardId: aiChoice.cardId,
      command: aiChoice.command,
      recoverId: aiChoice.recoverId,
      card: aiCard,
      aptitude: aApt,
      mandateBonus: !!aMandateBonus,
      effectiveAptitude: aApt * aMul,
    };

    // → clashing (카드+VS 한방 표시) — 유저 클릭으로 resolving 진행
    phaseEnteredAt.current = Date.now();
    setState((s) => ({
      ...s,
      battleSubPhase: "clashing",
      pendingRound: { playerAction, aiAction },
      // AI 징집 시 손패/버린패 반영
      aiHand: effectiveAiHand,
      aiDiscard: effectiveAiDiscard,
    }));
  }, []);

  // ─── 배틀: 유저 패 소진 시 "한 턴 쉬기" 제출 ───
  const submitRestRound = useCallback(() => {
    const prev = stateRef.current;
    if (prev.phase !== "battle" || prev.battleSubPhase !== "selecting") return;
    if (prev.playerHand.length > 0) return; // 패가 있으면 일반 제출 사용
    if (prev.playerDiscard.length === 0) {
      setState((s) => ({ ...s, phase: "result" }));
      return;
    }

    // 유저 버린패에서 랜덤 1장 징집
    const pIdx = Math.floor(Math.random() * prev.playerDiscard.length);
    const playerConscript = prev.playerDiscard[pIdx];
    const playerCommand = COMMANDS[Math.floor(Math.random() * COMMANDS.length)];
    const effectivePlayerHand = [playerConscript];
    const effectivePlayerDiscard = prev.playerDiscard.filter((_, i) => i !== pIdx);

    const mandate = getCurrentMandate(prev);

    // AI 측 처리 (AI도 패 소진 가능)
    let effectiveAiHand = prev.aiHand;
    let effectiveAiDiscard = prev.aiDiscard;
    let aiCard: BattleCard | undefined;
    let aiChoice: { cardId: string; command: Command; recoverId?: string };

    if (effectiveAiHand.length > 0) {
      aiChoice = aiSelectRound({
        hand: effectiveAiHand,
        aiNation: prev.aiNation,
        playerNation: prev.playerNation,
        playerHand: effectivePlayerHand,
        aiDiscard: effectiveAiDiscard,
        roundRecords: prev.roundRecords,
        currentRound: prev.currentRound,
        mandateCommand: mandate?.command,
        aiCaptainId: prev.aiCaptainId,
      });
      aiCard = effectiveAiHand.find((c) => c.id === aiChoice.cardId);
    } else if (effectiveAiDiscard.length > 0) {
      const idx = Math.floor(Math.random() * effectiveAiDiscard.length);
      const conscript = effectiveAiDiscard[idx];
      aiCard = conscript;
      aiChoice = {
        cardId: conscript.id,
        command: COMMANDS[Math.floor(Math.random() * COMMANDS.length)],
      };
      effectiveAiHand = [conscript];
      effectiveAiDiscard = effectiveAiDiscard.filter((_, i) => i !== idx);
    } else {
      aiChoice = { cardId: "", command: "assault" };
    }

    if (!aiCard) {
      setState((s) => ({ ...s, phase: "result" }));
      return;
    }

    // 적성 계산
    const pCaptainInHand = !!prev.playerCaptainId && effectivePlayerHand.some(c => c.id === prev.playerCaptainId);
    const aCaptainInHand = !!prev.aiCaptainId && effectiveAiHand.some(c => c.id === prev.aiCaptainId);
    const pRawApt = calcAptitudeWithCaptain(playerConscript, playerCommand, prev.playerCaptainId, pCaptainInHand);
    const aRawApt = calcAptitudeWithCaptain(aiCard, aiChoice.command, prev.aiCaptainId, aCaptainInHand);
    const pMandateBonus = mandate?.command === playerCommand;
    const aMandateBonus = mandate?.command === aiChoice.command;
    const pApt = pMandateBonus ? pRawApt * 1.5 : pRawApt;
    const aApt = aMandateBonus ? aRawApt * 1.5 : aRawApt;

    const counterResult = getCounterResult(playerCommand, aiChoice.command);
    const { myMul: pMul, oppMul: aMul } = applyCounter(counterResult, pApt, aApt);

    const playerAction: RoundAction = {
      cardId: playerConscript.id,
      command: playerCommand,
      card: playerConscript,
      aptitude: pApt,
      mandateBonus: !!pMandateBonus,
      effectiveAptitude: pApt * pMul,
    };

    const aiAction: RoundAction = {
      cardId: aiChoice.cardId,
      command: aiChoice.command,
      recoverId: aiChoice.recoverId,
      card: aiCard,
      aptitude: aApt,
      mandateBonus: !!aMandateBonus,
      effectiveAptitude: aApt * aMul,
    };

    phaseEnteredAt.current = Date.now();
    setState((s) => ({
      ...s,
      battleSubPhase: "clashing",
      pendingRound: { playerAction, aiAction },
      playerHand: effectivePlayerHand,
      playerDiscard: effectivePlayerDiscard,
      aiHand: effectiveAiHand,
      aiDiscard: effectiveAiDiscard,
    }));
  }, []);

  // ─── clashing → resolving (유저 클릭) ───
  const phaseEnteredAt = useRef(0);

  /** 반환값: "blocked" | RoundRecord (resolving 진입 시) | null */
  const advanceBattle = useCallback((): "blocked" | import("@/lib/game/types").RoundRecord | null => {
    const cur = stateRef.current;
    const elapsed = Date.now() - phaseEnteredAt.current;
    if (elapsed < MIN_PHASE_MS) return "blocked";

    if (cur.battleSubPhase !== "clashing" || !cur.pendingRound) return null;

    const { playerAction: pa, aiAction: aa } = cur.pendingRound;
    const counterResult = getCounterResult(pa.command, aa.command);

    // ─── draw 시 일기토 여부 판정 ───
    // 적성 차이가 작을수록 일기토 확률 ↑ (차이 0 → 80%, 차이 30+ → 10%)
    if (counterResult === "draw") {
      const pCaptainInHand = !!cur.playerCaptainId && cur.playerHand.some(c => c.id === cur.playerCaptainId);
      const aCaptainInHand = !!cur.aiCaptainId && cur.aiHand.some(c => c.id === cur.aiCaptainId);
      const pApt = calcAptitudeWithCaptain(pa.card, pa.command, cur.playerCaptainId, pCaptainInHand);
      const aApt = calcAptitudeWithCaptain(aa.card, aa.command, cur.aiCaptainId, aCaptainInHand);
      const gap = Math.abs(pApt - aApt);
      // 차이 0→80%, 10→60%, 20→40%, 30+→10%
      const duelChance = Math.max(0.1, 0.8 - gap * 0.023);

      if (Math.random() < duelChance) {
        setState((s) => ({ ...s, battleSubPhase: "dueling" }));
        return null;
      }
      // 일기토 불발 → 적성 비교로 통상 결산
    }

    return resolvePendingRound(cur);
  }, []);

  /** 일기토 결과 → 라운드 결산 (draw 배수를 일기토 승자에 따라 결정) */
  const completeDuel = useCallback((winner: "player" | "ai" | "draw") => {
    const cur = stateRef.current;
    if (cur.battleSubPhase !== "dueling" || !cur.pendingRound) return;

    // 일기토 결과에 따라 applyCounter의 draw 분기를 오버라이드
    duelWinnerRef.current = winner;
    resolvePendingRound(cur);
    duelWinnerRef.current = null;
  }, []);

  const duelWinnerRef = useRef<"player" | "ai" | "draw" | null>(null);

  /** 공통 라운드 결산 로직 */
  const resolvePendingRound = useCallback((cur: GameState) => {
    if (!cur.pendingRound) return null;

    const { playerAction: pa, aiAction: aa } = cur.pendingRound;
    const curMandate = getCurrentMandate(cur);

    const result = executeRound({
      round: cur.currentRound,
      playerCard: pa.card,
      playerCommand: pa.command,
      playerRecoverId: pa.recoverId,
      aiCard: aa.card,
      aiCommand: aa.command,
      aiRecoverId: aa.recoverId,
      playerNation: cur.playerNation,
      aiNation: cur.aiNation,
      playerHand: cur.playerHand,
      aiHand: cur.aiHand,
      playerDiscard: cur.playerDiscard,
      aiDiscard: cur.aiDiscard,
      mandateCommand: curMandate?.command,
      playerCaptainId: cur.playerCaptainId,
      aiCaptainId: cur.aiCaptainId,
      duelWinner: duelWinnerRef.current,
    });

    const gameOver = result.newPlayerNation.power <= 0 || result.newAiNation.power <= 0;
    const playerExhausted = result.newPlayerHand.length === 0 && result.newPlayerDiscard.length === 0;
    const aiExhausted = result.newAiHand.length === 0 && result.newAiDiscard.length === 0;
    const bothExhausted = playerExhausted || aiExhausted;

    setState((s) => ({
      ...s,
      battleSubPhase: "resolving",
      playerNation: result.newPlayerNation,
      aiNation: result.newAiNation,
      playerHand: result.newPlayerHand,
      aiHand: result.newAiHand,
      playerDiscard: result.newPlayerDiscard,
      aiDiscard: result.newAiDiscard,
      roundRecords: [...s.roundRecords, result.record],
      phase: gameOver || bothExhausted ? "result" : "battle",
    }));

    return result.record;
  }, []);

  // ─── 결과 확인 후 다음 라운드 (유저 수동 호출) ───
  const advanceRound = useCallback(() => {
    setState((s) => {
      if (s.battleSubPhase !== "resolving") return s;
      if (s.phase === "result") return s; // 게임 종료 시 무시

      const nextRound = s.currentRound + 1;
      return {
        ...s,
        currentRound: nextRound,
        mandateIndex: nextRound - 1,
        battleSubPhase: "selecting" as const,
        pendingRound: null,
      };
    });
  }, []);

  // ─── 휴식 턴 종료 → 버린패 전체 회수 ───
  const advanceRest = useCallback(() => {
    setState((s) => {
      if (s.battleSubPhase !== "resting") return s;

      let playerHand = s.playerHand;
      let playerDiscard = s.playerDiscard;
      let aiHand = s.aiHand;
      let aiDiscard = s.aiDiscard;

      if (playerHand.length === 0 && playerDiscard.length > 0) {
        const idx = Math.floor(Math.random() * playerDiscard.length);
        playerHand = [playerDiscard[idx]];
        playerDiscard = playerDiscard.filter((_, i) => i !== idx);
      }
      if (aiHand.length === 0 && aiDiscard.length > 0) {
        const idx = Math.floor(Math.random() * aiDiscard.length);
        aiHand = [aiDiscard[idx]];
        aiDiscard = aiDiscard.filter((_, i) => i !== idx);
      }

      return {
        ...s,
        battleSubPhase: "selecting" as const,
        playerHand,
        playerDiscard,
        aiHand,
        aiDiscard,
      };
    });
  }, []);

  // ─── 리셋 ───
  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  return {
    state,
    startGame,
    draftPick,
    draftAiTurn,
    reshuffleDraft,
    autoDraft,
    confirmDraft,
    selectCaptain,
    submitRound,
    submitRestRound,
    advanceBattle,
    advanceRound,
    advanceRest,
    completeDuel,
    reset,
  };
}
