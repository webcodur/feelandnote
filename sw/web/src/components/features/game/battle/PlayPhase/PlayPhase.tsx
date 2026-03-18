/*
  파일명: PlayPhase.tsx
  기능: v6 배틀 페이즈 UI (동시 행동) — 메인 오케스트레이터
  책임: 양측 손패 표시 + 카드/명령 선택 + 동시 공개 연출 + 상성 결과 표시
*/
"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { ScrollTextIcon } from "lucide-react";
import { useLocale } from "next-intl";
import type { BattleCard as BattleCardType, Command, NationState, RoundRecord, Mandate, BattleSubPhase, RoundAction, Difficulty } from "@/lib/game/types";
import { MAX_POWER } from "@/lib/game/types";
import { getEscalation } from "@/lib/game/gameEngine";
import CommandInfoModal from "../CommandInfoModal";
import CaptainInfoModal from "../CaptainInfoModal";
import PhaseAnnounce, { type AnnounceData } from "../PhaseAnnounce";
import ClashArena from "../../duel/ClashArena";
import { Z_INDEX } from "@/constants/zIndex";
import type { SpeechTone, DialogueType } from "@/lib/game/voice/types";

import {
  getBattleMandateLabel,
  getBattleText,
} from "../i18n";

import { CLASH_KEYFRAMES } from "./types";
import NationStats from "./sections/NationStats";
import BattleLogModal from "./sections/BattleLogModal";
import CommandPanel from "./sections/CommandPanel";
import MobileClashOverlay from "./sections/MobileClashOverlay";
import DesktopClashOverlay from "./sections/DesktopClashOverlay";
import PlayerHandPanel from "./sections/PlayerHandPanel";
import EnemyHandPanel from "./sections/EnemyHandPanel";
import MobileCardChips from "./sections/MobileCardChips";

interface Props {
  playerHand: BattleCardType[];
  aiHand: BattleCardType[];
  playerNation: NationState;
  aiNation: NationState;
  playerDiscard: BattleCardType[];
  aiDiscard: BattleCardType[];
  currentRound: number;
  battleSubPhase: BattleSubPhase;
  roundRecords: RoundRecord[];
  pendingRound: { playerAction: RoundAction; aiAction: RoundAction } | null;
  mandate: Mandate | null;
  nextMandate: Mandate | null;
  playerCaptainId: string | null;
  aiCaptainId: string | null;
  difficulty?: Difficulty;
  onSubmit: (cardId: string, command: Command, recoverId?: string) => void;
  onSubmitRest?: () => void;
  onAdvanceBattle: () => "blocked" | RoundRecord | null;
  onAdvance: () => void;
  onAdvanceRest?: () => void;
  onCompleteDuel?: (winner: "player" | "ai" | "draw") => void;
  playSfx: (name: string) => void;
  showDialogue?: (celebId: string, tone: SpeechTone, type: DialogueType, meta?: { nickname: string; avatarUrl: string | null }) => void;
  onCardInfo?: (celebId: string) => void;
}

export default function PlayPhase({
  playerHand, aiHand, playerNation, aiNation,
  playerDiscard, aiDiscard,
  currentRound, battleSubPhase, roundRecords, pendingRound,
  mandate, nextMandate,
  playerCaptainId, aiCaptainId,
  difficulty = "normal",
  onSubmit, onSubmitRest, onAdvanceBattle, onAdvance, onAdvanceRest, onCompleteDuel, playSfx, showDialogue, onCardInfo,
}: Props) {
  const locale = useLocale();
  const text = getBattleText(locale);
  const formatHandCount = useCallback(
    (count: number) => (locale.startsWith("en") ? `${count} cards` : `${count}장`),
    [locale],
  );
  const hardMode = difficulty === "hard";
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [selectedCommand, setSelectedCommand] = useState<Command | null>(null);
  const [selectedRecoverId, setSelectedRecoverId] = useState<string | null>(null);
  const [infoCmd, setInfoCmd] = useState<Command | null>(null);
  const [showLog, setShowLog] = useState(false);
  const [showCaptainInfo, setShowCaptainInfo] = useState(false);
  const [escalationAnnounce, setEscalationAnnounce] = useState<AnnounceData | null>(null);

  // 에스컬레이션 안내: R5부터 매 라운드 시작 시 표시
  const prevRoundRef = useRef(currentRound);
  useEffect(() => {
    const prev = prevRoundRef.current;
    prevRoundRef.current = currentRound;
    if (currentRound <= prev || battleSubPhase !== "selecting") return;

    const esc = getEscalation(currentRound, "offense");
    if (esc > 1) {
      const pct = Math.round((esc - 1) * 100);
      setEscalationAnnounce({
        key: `esc-${currentRound}`,
        label: `ROUND ${currentRound}`,
        title: text.play.escalateTitle,
        subtitle: `${text.play.escalateSubtitlePrefix}${pct}%`,
        tone: "red",
      });
    }
  }, [currentRound, battleSubPhase, text.play.escalateSubtitlePrefix, text.play.escalateTitle]);

  const isSelecting = battleSubPhase === "selecting";
  const isClashing = battleSubPhase === "clashing";
  const isResolving = battleSubPhase === "resolving";
  const isResting = battleSubPhase === "resting";
  const isClash = isClashing || isResolving;
  const playerExhausted = isSelecting && playerHand.length === 0 && playerDiscard.length > 0;

  useEffect(() => {
    if (battleSubPhase === "selecting") {
      setSelectedCardId(null);
      setSelectedCommand(null);
      setSelectedRecoverId(null);
    }
  }, [currentRound, battleSubPhase]);

  // ── SFX: clashing (출전 → VS 화면) ──
  useEffect(() => {
    if (battleSubPhase === "clashing" && pendingRound) {
      playSfx("sfx-confirm.mp3");
      const playerCard = playerHand.find((c) => c.id === pendingRound.playerAction.cardId);
      if (playerCard) showDialogue?.(playerCard.id, playerCard.speechTone, "deploy", { nickname: playerCard.nickname, avatarUrl: playerCard.avatarUrl });
    }
  }, [battleSubPhase, pendingRound, playSfx, showDialogue, playerHand]);

  // ── 일기토 결과 대사: dueling → resolving 전환 시 ──
  const prevSubPhaseRef = useRef(battleSubPhase);
  useEffect(() => {
    const prev = prevSubPhaseRef.current;
    prevSubPhaseRef.current = battleSubPhase;
    if (prev === "dueling" && battleSubPhase === "resolving" && roundRecords.length > 0) {
      const lastRec = roundRecords[roundRecords.length - 1];
      const pCard = playerHand.find((c) => c.id === lastRec.player.cardId);
      if (pCard) {
        const voiceType = lastRec.counterResult === "win" ? "battle_win" : lastRec.counterResult === "lose" ? "battle_lose" : "battle_draw";
        showDialogue?.(pCard.id, pCard.speechTone, voiceType, { nickname: pCard.nickname, avatarUrl: pCard.avatarUrl });
        playSfx(lastRec.counterResult === "draw" ? "sfx-clash-clang.mp3" : "sfx-clash-slash.mp3");
      }
    }
  }, [battleSubPhase, roundRecords, playerHand, showDialogue, playSfx]);

  const selectedCard = useMemo(
    () => playerHand.find((c) => c.id === selectedCardId),
    [playerHand, selectedCardId],
  );

  const isReady = selectedCardId !== null && selectedCommand !== null;

  const handleCardClick = useCallback((cardId: string) => {
    if (!isSelecting) return;
    setSelectedCardId((prev) => {
      if (prev === cardId) {
        playSfx("sfx-card-deselect.mp3");
        return null;
      }
      playSfx("sfx-draft-pick.mp3");
      return cardId;
    });
    const card = playerHand.find((c) => c.id === cardId);
    if (card) showDialogue?.(card.id, card.speechTone, "roll_call", { nickname: card.nickname, avatarUrl: card.avatarUrl });
  }, [playSfx, isSelecting, playerHand, showDialogue]);

  const handleConfirm = useCallback(() => {
    if (!isReady || !selectedCardId || !selectedCommand || !isSelecting) return;
    onSubmit(selectedCardId, selectedCommand, selectedRecoverId ?? undefined);
  }, [isReady, selectedCardId, selectedCommand, selectedRecoverId, onSubmit, isSelecting]);

  const handleCommandClick = useCallback((cmd: Command) => {
    if (!isSelecting) return;
    playSfx("sfx-draft-ai.mp3");
    setSelectedCommand((prev) => prev === cmd ? null : cmd);
    if (cmd !== "govern") setSelectedRecoverId(null);
  }, [playSfx, isSelecting]);

  const lastRecord = roundRecords.length > 0 ? roundRecords[roundRecords.length - 1] : null;
  const aiSelectedCardId = pendingRound?.aiAction.cardId ?? null;

  const guideText = !isSelecting
    ? isClashing ? text.play.clash : text.play.resolving
    : playerExhausted
    ? text.play.exhausted
    : !selectedCardId
    ? text.play.chooseCard
    : !selectedCommand
    ? text.play.chooseCommand
    : text.play.ready;

  // clashing에서 클릭 → clash_attack 보이스 → resolving + 결과 SFX 직접 재생
  const handleBattleClick = useCallback(() => {
    if (pendingRound) {
      const atkCard = playerHand.find((c) => c.id === pendingRound.playerAction.cardId);
      if (atkCard) showDialogue?.(atkCard.id, atkCard.speechTone, "clash_attack", { nickname: atkCard.nickname, avatarUrl: atkCard.avatarUrl });
    }

    const result = onAdvanceBattle();
    if (result === "blocked" || !result) return;

    const rec = result;
    if (rec.rebellion.player || rec.rebellion.ai) {
      playSfx("sfx-rebellion.mp3");
    } else if (rec.counterResult === "draw") {
      playSfx("sfx-clash-clang.mp3");
    } else {
      playSfx("sfx-clash-slash.mp3");
    }

    const pCard = playerHand.find((c) => c.id === rec.player.cardId);
    if (pCard) {
      const voiceType = rec.counterResult === "win" ? "battle_win" : rec.counterResult === "lose" ? "battle_lose" : "battle_draw";
      showDialogue?.(pCard.id, pCard.speechTone, voiceType, { nickname: pCard.nickname, avatarUrl: pCard.avatarUrl });
    }
  }, [onAdvanceBattle, playSfx, showDialogue, playerHand, pendingRound]);

  const handleRecoverSelect = useCallback((cardId: string) => {
    playSfx("sfx-card-select.mp3");
    setSelectedRecoverId((prev) => prev === cardId ? null : cardId);
  }, [playSfx]);

  // ── 카드 배열: 주장 분리 + 나머지 2x2 ──
  const playerCaptainInHand = playerCaptainId ? playerHand.find(c => c.id === playerCaptainId) : null;
  const playerCaptainInDiscard = playerCaptainId && !playerCaptainInHand ? playerDiscard.find(c => c.id === playerCaptainId) : null;
  const playerCaptain = playerCaptainInHand ?? playerCaptainInDiscard ?? null;
  const playerOthers = playerCaptain ? playerHand.filter(c => c.id !== playerCaptainId) : playerHand;
  const playerOthersDiscard = playerCaptain ? playerDiscard.filter(c => c.id !== playerCaptainId) : playerDiscard;

  const aiCaptainInHand = aiCaptainId ? aiHand.find(c => c.id === aiCaptainId) : null;
  const aiCaptainInDiscard = aiCaptainId && !aiCaptainInHand ? aiDiscard.find(c => c.id === aiCaptainId) : null;
  const aiCaptain = aiCaptainInHand ?? aiCaptainInDiscard ?? null;
  const aiOthers = aiCaptain ? aiHand.filter(c => c.id !== aiCaptainId) : aiHand;
  const aiOthersDiscard = aiCaptain ? aiDiscard.filter(c => c.id !== aiCaptainId) : aiDiscard;

  return (
    <div className="w-full lg:flex-1 lg:min-h-0 select-none flex flex-col relative gap-2 sm:gap-4 pb-4">
      {isClash && <style>{CLASH_KEYFRAMES}</style>}

      {/* ━━━━━ 휴식 턴 오버레이 ━━━━━ */}
      {isResting && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm rounded-2xl">
          <div className="flex flex-col items-center gap-4 text-center">
            <span className="text-2xl">🔄</span>
            <div>
              <p className="text-sm font-bold text-white/80">{text.play.restTitle}</p>
              <p className="text-xs text-white/50 mt-1">{text.play.restDescription}</p>
            </div>
            <button
              type="button"
              onClick={onAdvanceRest}
              className="px-5 py-2 rounded-lg bg-accent/15 border border-accent/25 text-accent text-xs font-bold hover:bg-accent/25 transition-colors"
            >
              {text.play.restComplete}
            </button>
          </div>
        </div>
      )}

      {/* ━━━━━ 통합 상태 헤더 (모바일 + PC) ━━━━━ */}
      <div className="flex items-stretch rounded-xl border border-white/10 bg-[#16141a]/90 backdrop-blur shadow-[0_4px_24px_rgba(0,0,0,0.4)] overflow-hidden min-h-[85px] lg:max-w-3xl lg:mx-auto lg:w-full relative shrink-0">

        {/* 좌측 (Player) */}
        <div className="flex-1 flex flex-col justify-center pl-5 pr-2 py-2">
          <span className="text-[11px] font-black text-accent/90 tracking-widest uppercase mb-1 text-center">PLAYER</span>
          <NationStats power={playerNation.power} maxPower={MAX_POWER} morale={playerNation.morale} accent="player" powerDelta={isResolving && lastRecord ? lastRecord.powerDelta.player : undefined} moraleDelta={isResolving && lastRecord ? lastRecord.moraleDelta.player : undefined} />
        </div>

        {/* 중앙 (Round + 로그) */}
        <div className="shrink-0 w-[60px] sm:w-[70px] lg:w-[90px] flex flex-col items-center justify-center relative gap-0.5">
          <span className="text-[9px] sm:text-[10px] font-cinzel text-white/50 tracking-[0.2em] uppercase">RND</span>
          <span className="text-2xl sm:text-3xl font-cinzel font-black text-white/90 leading-none drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]">{currentRound}</span>
          {mandate && (
            <span className="text-[8px] lg:text-[9px] text-amber-400/80 font-bold mt-0.5 truncate max-w-full px-1">{getBattleMandateLabel(mandate.command, locale)}</span>
          )}
          {isClashing && <span className="absolute -bottom-2 text-[9px] text-white/60 font-bold">{text.play.clash}</span>}
          {isResolving && lastRecord && <span className="absolute -bottom-2 text-[9px] text-white/60 font-bold">{text.play.result}</span>}
        </div>

        {/* 우측 (Enemy) */}
        <div className="flex-1 flex flex-col justify-center pl-2 pr-4 py-2">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <span className="text-[11px] font-black text-red-500/90 tracking-widest uppercase text-center">ENEMY</span>
            <button
              type="button"
              onClick={() => setShowLog(true)}
              className="shrink-0 w-5 h-5 rounded border border-white/15 bg-black/40 flex items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/10 transition-colors"
              title={text.play.battleLog}
            >
              <ScrollTextIcon size={10} />
            </button>
          </div>
          <NationStats power={aiNation.power} maxPower={MAX_POWER} morale={aiNation.morale} accent="ai" powerDelta={isResolving && lastRecord ? lastRecord.powerDelta.ai : undefined} moraleDelta={isResolving && lastRecord ? lastRecord.moraleDelta.ai : undefined} />
        </div>
      </div>

      {/* ━━━━━ 본문 ━━━━━ */}
      <div className="flex flex-col lg:min-w-0 lg:min-h-0 relative lg:flex-1 w-full gap-4">

        <MobileClashOverlay
          isClashing={isClashing} isResolving={isResolving}
          pendingRound={pendingRound} lastRecord={lastRecord}
          locale={locale} text={text} playSfx={playSfx}
          onBattleClick={handleBattleClick} onAdvance={onAdvance}
        />

        <DesktopClashOverlay
          isClashing={isClashing} isResolving={isResolving} isClash={isClash}
          pendingRound={pendingRound} lastRecord={lastRecord}
          locale={locale} text={text} playSfx={playSfx}
          onBattleClick={handleBattleClick} onAdvance={onAdvance}
        />

        {/* ── 데스크톱 selecting: 좌 내패 | 중앙 군령 | 우 상대패 ── */}
        <div className={`hidden lg:flex items-center justify-center flex-1 min-h-0 px-4 py-4 gap-4 ${isClash ? "invisible" : ""}`}>

            <PlayerHandPanel
              playerHand={playerHand}
              playerOthers={playerOthers} playerOthersDiscard={playerOthersDiscard}
              playerCaptain={playerCaptain} playerCaptainInDiscard={playerCaptainInDiscard}
              playerCaptainId={playerCaptainId}
              selectedCardId={selectedCardId} selectedCommand={selectedCommand} selectedRecoverId={selectedRecoverId}
              isSelecting={isSelecting}
              locale={locale} text={text} formatHandCount={formatHandCount}
              onCardClick={handleCardClick} onRecoverSelect={handleRecoverSelect}
              onShowCaptainInfo={() => setShowCaptainInfo(true)}
              onCardInfo={onCardInfo}
            />

            <CommandPanel
              selectedCard={selectedCard} selectedCommand={selectedCommand}
              mandate={mandate} isSelecting={isSelecting} isReady={isReady}
              playerExhausted={playerExhausted} guideText={guideText}
              locale={locale} text={text}
              onCommandClick={handleCommandClick} onConfirm={handleConfirm}
              onSubmitRest={onSubmitRest} onInfoCmd={setInfoCmd}
            />

            <EnemyHandPanel
              aiHand={aiHand}
              aiOthers={aiOthers} aiOthersDiscard={aiOthersDiscard}
              aiCaptain={aiCaptain} aiCaptainInDiscard={aiCaptainInDiscard}
              aiSelectedCardId={aiSelectedCardId} isClash={isClash} hardMode={hardMode}
              locale={locale} text={text} formatHandCount={formatHandCount}
              onShowCaptainInfo={() => setShowCaptainInfo(true)}
              onCardInfo={onCardInfo}
            />

        </div>

        <MobileCardChips
          playerHand={playerHand}
          playerOthers={playerOthers} playerOthersDiscard={playerOthersDiscard}
          playerCaptain={playerCaptain} playerCaptainInDiscard={playerCaptainInDiscard}
          aiOthers={aiOthers} aiOthersDiscard={aiOthersDiscard}
          aiCaptain={aiCaptain} aiCaptainInDiscard={aiCaptainInDiscard}
          aiSelectedCardId={aiSelectedCardId}
          selectedCardId={selectedCardId} selectedCard={selectedCard}
          selectedCommand={selectedCommand} selectedRecoverId={selectedRecoverId}
          mandate={mandate} isSelecting={isSelecting} isClash={isClash}
          isReady={isReady} playerExhausted={playerExhausted} hardMode={hardMode}
          guideText={guideText} locale={locale} text={text}
          onCardClick={handleCardClick} onRecoverSelect={handleRecoverSelect}
          onCommandClick={handleCommandClick} onConfirm={handleConfirm}
          onSubmitRest={onSubmitRest} onInfoCmd={setInfoCmd}
        />

      </div>{/* /본문 */}

      {/* ━━━━━ 모달 ━━━━━ */}
      {infoCmd && (
        <CommandInfoModal command={infoCmd} onClose={() => setInfoCmd(null)} zIndex={Z_INDEX.gameModal} />
      )}
      {showLog && (
        <BattleLogModal records={roundRecords} mandate={mandate} onClose={() => setShowLog(false)} locale={locale} text={text} />
      )}
      {showCaptainInfo && (
        <CaptainInfoModal onClose={() => setShowCaptainInfo(false)} zIndex={Z_INDEX.gameModal} />
      )}
      <PhaseAnnounce data={escalationAnnounce} onDone={() => setEscalationAnnounce(null)} />

      {/* ─── 일기토 (draw 시 서브페이즈) ─── */}
      {battleSubPhase === "dueling" && pendingRound && onCompleteDuel && (
        <ClashArena
          playerCard={pendingRound.playerAction.card}
          aiCard={pendingRound.aiAction.card}
          command={pendingRound.playerAction.command}
          onComplete={onCompleteDuel}
        />
      )}
    </div>
  );
}
