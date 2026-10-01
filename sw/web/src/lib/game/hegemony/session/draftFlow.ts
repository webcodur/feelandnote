/*
  파일명: lib/game/hegemony/session/draftFlow.ts
  기능: 선발·주장 단계 상태 전이
  책임: 선발 진행(플레이어·AI 뽑기, 자동 선발, 다시 뽑기)과 주장 임명 뒤 대전 시작 상태를 만든다.
*/

import { aiChooseCaptain } from "../ai";
import { aiDraftPick, applyPick, autoCompleteDraft, availableCards, createDraft, currentPicker, isDraftDone, picksOf } from "../draft";
import { createSide } from "../hand";
import { buildMandates } from "../mandate";
import { rngFor } from "../rng";
import { beginRound } from "./battleFlow";
import type { ActionOf, HegemonyState } from "./types";

export function onDraftReady(state: HegemonyState, action: ActionOf<"draftReady">): HegemonyState {
  if (state.phase !== "loading") return state;
  return { ...state, phase: "draft", roster: action.roster, draft: createDraft(action.pool, state.difficulty), error: null };
}

/** 첫 픽 전에만 후보를 다시 뽑을 수 있다 */
export function onDraftReshuffled(state: HegemonyState, action: ActionOf<"draftReshuffled">): HegemonyState {
  if (state.phase !== "draft" || !state.draft || state.draft.picks.length > 0) return state;
  return { ...state, seed: action.seed, draft: createDraft(action.pool, state.difficulty) };
}

export function onDraftPick(state: HegemonyState, action: ActionOf<"draftPick">): HegemonyState {
  if (state.phase !== "draft" || !state.draft) return state;
  return { ...state, draft: applyPick(state.draft, "player", action.cardId) };
}

export function onDraftAiPick(state: HegemonyState): HegemonyState {
  const draft = state.draft;
  if (state.phase !== "draft" || !draft || currentPicker(draft) !== "ai") return state;
  const rng = rngFor(state.seed, "draft-ai", draft.picks.length);
  const pick = aiDraftPick(availableCards(draft), picksOf(draft, "ai"), picksOf(draft, "player"), state.difficulty, rng);
  return { ...state, draft: applyPick(draft, "ai", pick.id) };
}

export function onDraftAuto(state: HegemonyState): HegemonyState {
  if (state.phase !== "draft" || !state.draft) return state;
  const rng = rngFor(state.seed, "draft-auto", state.draft.picks.length);
  return { ...state, draft: autoCompleteDraft(state.draft, state.difficulty, rng) };
}

export function onDraftConfirm(state: HegemonyState): HegemonyState {
  if (state.phase !== "draft" || !state.draft || !isDraftDone(state.draft)) return state;
  return { ...state, phase: "captain" };
}

/** 주장 임명 → AI 주장·천명 순서를 정하고 1라운드를 연다 */
export function onCaptain(state: HegemonyState, action: ActionOf<"captain">): HegemonyState {
  const draft = state.draft;
  if (state.phase !== "captain" || !draft) return state;
  const playerHand = picksOf(draft, "player");
  const aiHand = picksOf(draft, "ai");
  if (!playerHand.some((c) => c.id === action.cardId)) return state;
  const aiCaptain = aiChooseCaptain(aiHand, rngFor(state.seed, "captain"));
  const battle = beginRound(state.seed, {
    round: 1,
    step: "plan",
    mandates: buildMandates(rngFor(state.seed, "mandate")),
    player: createSide(playerHand, action.cardId),
    ai: createSide(aiHand, aiCaptain),
    plays: null,
    recallOptions: [],
    records: [],
    winner: null,
    forfeited: false,
  });
  return { ...state, phase: "battle", battle };
}
