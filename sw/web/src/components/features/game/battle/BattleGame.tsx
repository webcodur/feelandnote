/*
  파일명: components/features/game/battle/BattleGame.tsx
  기능: 영향력 대전 게임 컨테이너
  책임: 게임 페이즈에 따라 적절한 하위 컴포넌트를 라우팅한다.
*/
"use client";

import { useState, useEffect, useCallback, useRef, type MutableRefObject } from "react";
import { Swords, Volume2 } from "lucide-react";
import { useBattleGame } from "./hooks/useBattleGame";
import DraftPhase from "./DraftPhase";
import BattlePhase from "./BattlePhase";
import GameResult from "./GameResult";
import BattleLobby from "./BattleLobby";
import type { CelebProfile } from "@/types/home";
import { getCelebForModal } from "@/actions/celebs/getCelebForModal";
import CelebDetailModal from "@/components/features/home/celeb-card-drafts/CelebDetailModal";

interface BattleGameProps {
  onEnterFullScreen?: () => void;
  onHomeRef?: MutableRefObject<(() => void) | null>;
  onPhaseChange?: (phase: string) => void;
  initialAudioReady?: boolean;
  setBgm: (phase: "idle" | "loading" | "draft" | "battle" | "revealing" | "result", playerWins?: boolean) => void;
  playSfx: (name: string) => void;
}

export default function BattleGame({ onEnterFullScreen, onHomeRef, onPhaseChange, initialAudioReady = false, setBgm, playSfx }: BattleGameProps) {
  const {
    state,
    lastResult,
    aiDraftPending,
    aiDraftCards,
    startGame,
    draftPick,
    playCard,
    continueFromReveal,
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

  // 셀럽 상세 모달
  const [modalCeleb, setModalCeleb] = useState<CelebProfile | null>(null);
  const loadingRef = useRef(false);

  const handleCardInfo = useCallback(async (celebId: string) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    const celeb = await getCelebForModal(celebId);
    loadingRef.current = false;
    if (celeb) setModalCeleb(celeb);
  }, []);

  // 오디오 활성화 게이트 — 유저 클릭 전까지 BGM 미재생
  const [audioReady, setAudioReady] = useState(initialAudioReady);

  const handleEnterGame = useCallback(() => {
    setAudioReady(true);
    onEnterFullScreen?.();
  }, [onEnterFullScreen]);

  // BGM 페이즈 전환 (audioReady 이후에만)
  useEffect(() => {
    if (!audioReady) return;
    const playerWins = state.playerScore > state.aiScore;
    setBgm(state.phase, playerWins);
  }, [audioReady, state.phase, state.playerScore, state.aiScore, setBgm]);

  // "대전 시작" 래퍼: SFX + 원래 로직
  const handleStart = useCallback(() => {
    playSfx("sfx-start.mp3");
    startGame();
  }, [playSfx, startGame]);

  // 드래프트 픽 래퍼
  const handleDraftPick = useCallback(
    (cardId: string) => {
      playSfx("sfx-card-pick.mp3");
      draftPick(cardId);
    },
    [playSfx, draftPick]
  );

  // 페이즈별 콘텐츠
  let content: React.ReactNode = null;

  if (!audioReady) {
    content = (
      <div className="max-w-md mx-auto flex flex-col items-center text-center">
        <div className="w-full max-w-sm flex flex-col items-center gap-6 py-8">
          <div className="space-y-2">
            <Swords size={40} className="mx-auto text-accent/60" />
            <h2 className="text-2xl font-serif font-black text-white">패권</h2>
            <p className="text-sm text-text-secondary">영향력 대전 시뮬레이션</p>
          </div>
          <button
            onClick={handleEnterGame}
            className="flex items-center gap-2 px-8 py-4 rounded-xl bg-accent/10 border border-accent/30 hover:bg-accent/20 active:scale-95 transition-all"
          >
            <Volume2 size={18} className="text-accent" />
            <span className="font-serif font-bold text-accent text-lg">게임 입장</span>
          </button>
          <p className="text-[10px] text-text-tertiary">사운드와 함께 진행됩니다</p>
        </div>
      </div>
    );
  } else if (state.phase === "loading") {
    content = (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
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
    content = <BattleLobby onStartVsAi={handleStart} />;
  } else if (state.phase === "draft") {
    content = (
      <DraftPhase
        pool={state.pool}
        playerHand={state.playerHand}
        aiHand={state.aiHand}
        draftTurn={state.draftTurn}
        onPick={handleDraftPick}
        aiDraftPending={aiDraftPending}
        aiDraftCards={aiDraftCards}
        onCardInfo={handleCardInfo}
      />
    );
  } else if (state.phase === "battle" || state.phase === "revealing") {
    content = (
      <BattlePhase
        playerHand={state.playerHand}
        aiHand={state.aiHand}
        domainOrder={state.domainOrder}
        currentRound={state.currentRound}
        playerScore={state.playerScore}
        aiScore={state.aiScore}
        rounds={state.rounds}
        nextDomain={state.nextDomain}
        onPlayCard={playCard}
        revealing={state.phase === "revealing"}
        lastResult={lastResult}
        onContinueFromReveal={continueFromReveal}
        playSfx={playSfx}
        onCardInfo={handleCardInfo}
      />
    );
  } else if (state.phase === "result") {
    content = (
      <GameResult
        playerScore={state.playerScore}
        aiScore={state.aiScore}
        rounds={state.rounds}
        onRestart={handleStart}
      />
    );
  }

  return (
    <>
      {content}
      {modalCeleb && (
        <CelebDetailModal
          celeb={modalCeleb}
          isOpen={!!modalCeleb}
          onClose={() => setModalCeleb(null)}
        />
      )}
    </>
  );
}
