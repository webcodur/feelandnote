/*
  파일명: components/features/game/hegemony/hooks/useHegemonyGame.ts
  기능: 패권 한 판의 상태 훅
  책임: 순수 상태 전이(hegemonyReducer)를 화면에 연결하고, 서버에서 후보·대사를 받아오는 비동기 단계를 맡는다.
*/
"use client";

import { useCallback, useMemo, useReducer, useRef } from "react";
import { getCelebCards, loadCardDialogues } from "@/actions/game/getCelebCards";
import type { BattleCard } from "@/lib/game/types";
import type { Difficulty } from "@/lib/game/hegemony/constants";
import { DRAFT_POOL_SIZE } from "@/lib/game/hegemony/constants";
import { buildDraftPool } from "@/lib/game/hegemony/draft";
import { newSeed, rngFor } from "@/lib/game/hegemony/rng";
import { hegemonyReducer, initialHegemonyState } from "@/lib/game/hegemony/session/reducer";
import type { DuelWinner, Play } from "@/lib/game/hegemony/types";

/** 선발 후보 15명에게만 대사를 붙인다 (전체 후보의 대사는 무거워 받지 않는다) */
async function withDialogues(pool: BattleCard[]): Promise<BattleCard[]> {
  const lines = await loadCardDialogues(pool.map((c) => c.id));
  return pool.map((c) => {
    const dialogueLines = lines.get(c.id);
    return dialogueLines ? { ...c, dialogueLines } : c;
  });
}

export function useHegemonyGame() {
  const [state, dispatch] = useReducer(hegemonyReducer, initialHegemonyState);
  // 비동기 응답이 늦게 와서 이미 떠난 판에 끼어들지 않도록 요청 번호를 센다
  const requestRef = useRef(0);

  const start = useCallback(async (difficulty: Difficulty) => {
    const request = ++requestRef.current;
    const seed = newSeed();
    dispatch({ type: "load", difficulty, seed });
    try {
      const roster = state.roster.length > 0 ? state.roster : await getCelebCards();
      if (request !== requestRef.current) return;
      if (roster.length < DRAFT_POOL_SIZE) {
        dispatch({ type: "loadFailed", reason: roster.length === 0 ? "load" : "notEnough" });
        return;
      }
      const pool = await withDialogues(buildDraftPool(roster, rngFor(seed, "pool")));
      if (request !== requestRef.current) return;
      dispatch({ type: "draftReady", roster, pool });
    } catch {
      if (request === requestRef.current) dispatch({ type: "loadFailed", reason: "load" });
    }
  }, [state.roster]);

  const reshuffle = useCallback(async () => {
    if (state.phase !== "draft" || !state.draft || state.draft.picks.length > 0) return;
    const request = ++requestRef.current;
    const seed = newSeed();
    const pool = await withDialogues(buildDraftPool(state.roster, rngFor(seed, "pool")));
    if (request !== requestRef.current) return;
    dispatch({ type: "draftReshuffled", seed, pool });
  }, [state.phase, state.draft, state.roster]);

  const actions = useMemo(() => ({
    pick: (cardId: string) => dispatch({ type: "draftPick", cardId }),
    aiPick: () => dispatch({ type: "draftAiPick" }),
    autoDraft: () => dispatch({ type: "draftAuto" }),
    confirmDraft: () => dispatch({ type: "draftConfirm" }),
    appointCaptain: (cardId: string) => dispatch({ type: "captain", cardId }),
    recall: (cardId: string) => dispatch({ type: "recall", cardId }),
    lockIn: (play: Play) => dispatch({ type: "lockIn", play }),
    revealDone: () => dispatch({ type: "revealDone" }),
    acceptDuel: () => dispatch({ type: "duelAccept" }),
    declineDuel: () => dispatch({ type: "duelDecline" }),
    duelResult: (winner: DuelWinner) => dispatch({ type: "duelResult", winner }),
    nextRound: () => dispatch({ type: "nextRound" }),
    forfeit: () => dispatch({ type: "forfeit" }),
    reset: () => {
      requestRef.current++;
      dispatch({ type: "reset" });
    },
  }), []);

  return { state, start, reshuffle, ...actions };
}

export type HegemonyGameApi = ReturnType<typeof useHegemonyGame>;
