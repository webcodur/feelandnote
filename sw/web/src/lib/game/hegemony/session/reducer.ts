/*
  파일명: lib/game/hegemony/session/reducer.ts
  기능: 한 판의 상태 전이 진입점
  책임: 행동 종류별 처리 함수를 한 표로 묶는다. 처리 함수는 모두 순수 함수다.
*/

import {
  onCaptain, onDraftAiPick, onDraftAuto, onDraftConfirm, onDraftPick, onDraftReady, onDraftReshuffled,
} from "./draftFlow";
import {
  onDuelAccept, onDuelDecline, onDuelResult, onForfeit, onLockIn, onNextRound, onRecall, onRevealDone,
} from "./battleFlow";
import type { ActionOf, HegemonyAction, HegemonyState } from "./types";

export const initialHegemonyState: HegemonyState = {
  phase: "title",
  difficulty: "normal",
  seed: 0,
  roster: [],
  draft: null,
  battle: null,
  error: null,
};

type Handlers = { [K in HegemonyAction["type"]]: (state: HegemonyState, action: ActionOf<K>) => HegemonyState };

const HANDLERS: Handlers = {
  // 불러온 후보는 다시 쓰도록 남긴다
  load: (state, action) => ({ ...initialHegemonyState, roster: state.roster, phase: "loading", difficulty: action.difficulty, seed: action.seed }),
  loadFailed: (state, action) => ({ ...state, phase: "title", error: action.reason }),
  draftReady: onDraftReady,
  draftReshuffled: onDraftReshuffled,
  draftPick: onDraftPick,
  draftAiPick: onDraftAiPick,
  draftAuto: onDraftAuto,
  draftConfirm: onDraftConfirm,
  captain: onCaptain,
  recall: onRecall,
  lockIn: onLockIn,
  revealDone: onRevealDone,
  duelAccept: onDuelAccept,
  duelDecline: onDuelDecline,
  duelResult: onDuelResult,
  nextRound: onNextRound,
  forfeit: onForfeit,
  reset: (state) => ({ ...initialHegemonyState, roster: state.roster }),
};

export function hegemonyReducer(state: HegemonyState, action: HegemonyAction): HegemonyState {
  const handler = HANDLERS[action.type] as (s: HegemonyState, a: HegemonyAction) => HegemonyState;
  return handler(state, action);
}
