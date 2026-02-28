/*
  파일명: components/features/game/battle/BattleGame.tsx
  기능: 패권 v6 게임 컨테이너
  책임: 게임 페이즈에 따라 적절한 하위 컴포넌트를 라우팅한다.
*/
"use client";

import { useState, useEffect, useCallback, useRef, useMemo, type MutableRefObject } from "react";
import { Swords, Volume2 } from "lucide-react";
import { useBattleGame } from "./hooks/useBattleGame";
import DraftPhase from "./DraftPhase";
import PlayPhase from "./PlayPhase";
import GameResult from "./GameResult";
import BattleLobby from "./BattleLobby";
import CaptainSelect from "./CaptainSelect";
import PhaseAnnounce, { type AnnounceData } from "./PhaseAnnounce";
import CardInfoModal from "./CardInfoModal";
import DialogueSubtitle from "@/components/features/game/shared/DialogueSubtitle";
import type { DialogueSubtitleData } from "@/components/features/game/shared/hooks/useDialogue";
import { Z_INDEX } from "@/constants/zIndex";
import type { BattleCard, Difficulty } from "@/lib/game/types";
import type { DialogueLines } from "@/lib/game/voice/types";
import { useDialogue } from "@/components/features/game/shared/hooks/useDialogue";

interface BattleGameProps {
  onEnterFullScreen?: () => void;
  onExitFullScreen?: () => void;
  onHomeRef?: MutableRefObject<(() => void) | null>;
  onPhaseChange?: (phase: string) => void;
  onPlayerWinsChange?: (wins: boolean) => void;
  initialAudioReady?: boolean;
  setBgm: (state: string, context?: Record<string, unknown>) => void;
  playSfx: (name: string) => void;
  bgmMuted: boolean;
  sfxMuted: boolean;
  toggleBgmMuted: () => void;
  toggleSfxMuted: () => void;
}

export default function BattleGame({ onEnterFullScreen, onExitFullScreen, onHomeRef, onPhaseChange, onPlayerWinsChange, initialAudioReady = false, setBgm, playSfx, bgmMuted, sfxMuted, toggleBgmMuted, toggleSfxMuted }: BattleGameProps) {
  // 대사 시스템 — sfxMuted 상태를 ref로 동기화
  const sfxMutedRef = useRef(sfxMuted);
  sfxMutedRef.current = sfxMuted;

  // 자막 상태 — 매번 새 객체 참조로 동일 대사도 재표시
  const [dialogueSub, setDialogueSub] = useState<DialogueSubtitleData | null>(null);
  const handleSubtitle = useCallback((sub: DialogueSubtitleData) => {
    setDialogueSub({ ...sub });
  }, []);

  const {
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
  } = useBattleGame();

  // 홈 버튼 ref에 reset 등록
  useEffect(() => {
    if (onHomeRef) onHomeRef.current = reset;
    return () => { if (onHomeRef) onHomeRef.current = null; };
  }, [onHomeRef, reset]);

  // phase 변경 알림
  useEffect(() => {
    onPhaseChange?.(state.phase);
  }, [state.phase, onPhaseChange]);

  // 승패 변경 알림
  useEffect(() => {
    onPlayerWinsChange?.(state.playerNation.power > state.aiNation.power);
  }, [state.playerNation.power, state.aiNation.power, onPlayerWinsChange]);

  // 카드 상세 모달
  const [modalCardId, setModalCardId] = useState<string | null>(null);

  // 모든 카드를 하나의 풀에서 검색 (개별 배열에만 의존)
  const allCards = useMemo(() => {
    const cards: BattleCard[] = [
      ...state.playerHand, ...state.aiHand,
      ...state.playerDiscard, ...state.aiDiscard,
      ...state.draft.pool, ...state.draft.playerPicks, ...state.draft.aiPicks,
    ];
    return cards;
  }, [state.playerHand, state.aiHand, state.playerDiscard, state.aiDiscard, state.draft.pool, state.draft.playerPicks, state.draft.aiPicks]);

  // 개인별 대사 Map 구성
  const personalDialogues = useMemo(() => {
    const map = new Map<string, DialogueLines>();
    for (const card of allCards) {
      if (card.dialogueLines) map.set(card.id, card.dialogueLines);
    }
    return map;
  }, [allCards]);

  const { showDialogue } = useDialogue({ sfxMutedRef, onSubtitle: handleSubtitle, personalDialogues });

  const modalCard = useMemo(
    () => modalCardId ? allCards.find((c) => c.id === modalCardId) ?? null : null,
    [modalCardId, allCards],
  );

  const handleCardInfo = useCallback((celebId: string) => {
    setModalCardId(celebId);
  }, []);

  // 오디오 활성화 게이트
  const [audioReady, setAudioReady] = useState(initialAudioReady);

  // 전체화면 탈출 시 게이트로 복귀
  useEffect(() => {
    if (!initialAudioReady) setAudioReady(false);
  }, [initialAudioReady]);

  const handleEnterGame = useCallback(() => {
    setAudioReady(true);
    playSfx("sfx-enter-gate.mp3");
    onEnterFullScreen?.();
  }, [onEnterFullScreen, playSfx]);

  // BGM 페이즈 전환
  useEffect(() => {
    if (!audioReady) return;
    const playerWins = state.playerNation.power > state.aiNation.power;
    setBgm(state.phase, { playerWins });
  }, [audioReady, state.phase, state.playerNation.power, state.aiNation.power, setBgm]);

  // SFX 래퍼
  const handleStart = useCallback((difficulty: Difficulty = "normal") => {
    playSfx("sfx-confirm.mp3");
    startGame(difficulty);
  }, [playSfx, startGame]);

  // 페이즈 전환 알림
  const [announce, setAnnounce] = useState<AnnounceData | null>(null);
  const prevPhaseRef = useRef(state.phase);

  useEffect(() => {
    const prevPhase = prevPhaseRef.current;
    prevPhaseRef.current = state.phase;

    if (state.phase === "draft" && prevPhase !== "draft") {
      setAnnounce({
        key: "draft",
        label: "PHASE",
        title: "드래프트",
        subtitle: "15장에서 5장씩 선택합니다",
      });
      return;
    }

    if (state.phase === "captain" && prevPhase !== "captain") {
      playSfx("sfx-draft-complete.mp3");
      setAnnounce({
        key: "captain",
        label: "CAPTAIN",
        title: "주장 선택",
        subtitle: "아군의 지휘관을 임명합니다",
      });
      return;
    }

    if (state.phase === "battle" && prevPhase !== "battle") {
      playSfx("sfx-confirm.mp3");
      setAnnounce({
        key: "battle",
        label: "BATTLE",
        title: "대전",
        subtitle: "동시에 카드와 명령을 선택합니다",
      });
      return;
    }

    if (state.phase === "result" && prevPhase !== "result") {
      return;
    }
  }, [state.phase, playSfx]);

  // 페이즈별 콘텐츠
  let content: React.ReactNode = null;

  if (!audioReady) {
    content = (
      <div className="max-w-md mx-auto flex flex-col items-center text-center">
        <div className="w-full max-w-sm flex flex-col items-center gap-6 py-8 bg-black/80 rounded-xl px-6">
          <div className="space-y-2">
            <Swords size={40} className="mx-auto text-accent/60" />
            <h2 className="text-2xl font-serif font-black text-white">패권</h2>
            <p className="text-sm text-text-secondary">동시 행동 전략 게임</p>
          </div>
          <button
            onClick={handleEnterGame}
            className="flex items-center gap-2 px-8 py-4 rounded-xl bg-accent/10 border border-accent/30 hover:bg-accent/20 active:scale-95 transition-all"
          >
            <Volume2 size={18} className="text-accent" />
            <span className="font-serif font-bold text-accent text-lg">게임 입장</span>
          </button>
          <p className="text-[10px] text-white/50">사운드와 함께 진행됩니다</p>
        </div>
      </div>
    );
  } else if (state.phase === "loading") {
    content = (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3 bg-black/80 rounded-xl px-8 py-6">
          <div className="flex gap-1.5">
            <div className="w-2 h-2 rounded-full bg-accent animate-bounce" />
            <div className="w-2 h-2 rounded-full bg-accent animate-bounce [animation-delay:150ms]" />
            <div className="w-2 h-2 rounded-full bg-accent animate-bounce [animation-delay:300ms]" />
          </div>
          <p className="text-sm text-text-secondary font-serif">카드 데이터 로딩 중...</p>
        </div>
      </div>
    );
  } else if (state.phase === "idle") {
    content = (
      <BattleLobby
        onStartVsAi={handleStart}
        onExit={() => onExitFullScreen?.()}
        bgmMuted={bgmMuted}
        sfxMuted={sfxMuted}
        toggleBgmMuted={toggleBgmMuted}
        toggleSfxMuted={toggleSfxMuted}
      />
    );
  } else if (state.phase === "draft") {
    content = (
      <DraftPhase
        draft={state.draft}
        onPlayerPick={draftPick}
        onAiPick={draftAiTurn}
        onReshuffle={reshuffleDraft}
        onAutoDraft={autoDraft}
        onConfirmDraft={confirmDraft}
        onCardInfo={handleCardInfo}
        playSfx={playSfx}
        showDialogue={showDialogue}
      />
    );
  } else if (state.phase === "captain") {
    content = (
      <CaptainSelect
        playerHand={state.playerHand}
        onSelect={selectCaptain}
        onCardInfo={handleCardInfo}
        playSfx={playSfx}
        showDialogue={showDialogue}
      />
    );
  } else if (state.phase === "battle") {
    const curMandate = state.mandates.length > 0
      ? state.mandates[state.mandateIndex % state.mandates.length]
      : null;
    const nxtMandate = state.mandates.length > 0
      ? state.mandates[(state.mandateIndex + 1) % state.mandates.length]
      : null;
    content = (
      <PlayPhase
        playerHand={state.playerHand}
        aiHand={state.aiHand}
        playerNation={state.playerNation}
        aiNation={state.aiNation}
        playerDiscard={state.playerDiscard}
        aiDiscard={state.aiDiscard}
        currentRound={state.currentRound}
        battleSubPhase={state.battleSubPhase}
        roundRecords={state.roundRecords}
        pendingRound={state.pendingRound}
        mandate={curMandate}
        nextMandate={nxtMandate}
        playerCaptainId={state.playerCaptainId}
        aiCaptainId={state.aiCaptainId}
        difficulty={state.difficulty}
        onSubmit={submitRound}
        onSubmitRest={submitRestRound}
        onAdvanceBattle={advanceBattle}
        onAdvance={advanceRound}
        onAdvanceRest={advanceRest}
        onCompleteDuel={completeDuel}
        playSfx={playSfx}
        showDialogue={showDialogue}
        onCardInfo={handleCardInfo}
      />
    );
  } else if (state.phase === "result") {
    content = (
      <GameResult
        playerNation={state.playerNation}
        aiNation={state.aiNation}
        roundRecords={state.roundRecords}
        onRestart={() => handleStart(state.difficulty)}
        onHome={reset}
        playSfx={playSfx}
      />
    );
  }

  return (
    <>
      {content}
      <PhaseAnnounce data={announce} onDone={() => setAnnounce(null)} />
      <DialogueSubtitle subtitle={dialogueSub} />
      {modalCard && (
        <CardInfoModal
          card={modalCard}
          onClose={() => setModalCardId(null)}
          zIndex={Z_INDEX.gameModal}
        />
      )}
    </>
  );
}
