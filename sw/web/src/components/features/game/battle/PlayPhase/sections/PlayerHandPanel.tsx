/*
  PlayerHandPanel — 데스크톱 좌측: 내 패 2x2 그리드 + 주장
*/
import type { BattleCard as BattleCardType, Command } from "@/lib/game/types";
import BattleCard from "../../BattleCard";
import type { BattleText } from "../types";

interface Props {
  playerHand: BattleCardType[];
  playerOthers: BattleCardType[];
  playerOthersDiscard: BattleCardType[];
  playerCaptain: BattleCardType | null;
  playerCaptainInDiscard: BattleCardType | null | undefined;
  playerCaptainId: string | null;
  selectedCardId: string | null;
  selectedCommand: Command | null;
  selectedRecoverId: string | null;
  isSelecting: boolean;
  locale: string;
  text: BattleText;
  formatHandCount: (count: number) => string;
  onCardClick: (cardId: string) => void;
  onRecoverSelect: (cardId: string) => void;
  onShowCaptainInfo: () => void;
  onCardInfo?: (celebId: string) => void;
}

export default function PlayerHandPanel({
  playerHand, playerOthers, playerOthersDiscard,
  playerCaptain, playerCaptainInDiscard, playerCaptainId,
  selectedCardId, selectedCommand, selectedRecoverId,
  isSelecting, locale, text, formatHandCount,
  onCardClick, onRecoverSelect, onShowCaptainInfo, onCardInfo,
}: Props) {
  const playerDiscard = [...playerOthersDiscard, ...(playerCaptainInDiscard ? [playerCaptainInDiscard] : [])];

  return (
    <div className="flex flex-col gap-2 bg-black/80 rounded-xl p-3">
      <div className="flex items-center gap-2 px-1">
        <h3 className="text-xs font-bold text-accent/70 tracking-wide uppercase">{text.play.handMine}</h3>
        <span className="text-xs text-accent/50">{formatHandCount(playerHand.length)}</span>
        {playerDiscard.length > 0 && <span className="text-xs text-accent/40">{text.play.used} {playerDiscard.length}</span>}
      </div>
      <div className="flex items-start gap-3">
        {/* 일반 카드 2x2 */}
        {(() => {
          const allCards = [
            ...playerOthers.map(c => ({ card: c, isDiscard: false })),
            ...playerOthersDiscard.map(c => ({ card: c, isDiscard: true })),
          ];
          return (
            <div className="grid grid-cols-[repeat(2,100px)] xl:grid-cols-[repeat(2,130px)] gap-2 xl:gap-3">
              {allCards.map(({ card, isDiscard }) => {
                if (isDiscard) {
                  const isRecoverable = selectedCommand === "govern" && isSelecting;
                  const isRecoverSelected = selectedRecoverId === card.id;
                  return (
                    <div key={card.id}
                      className={`@container relative transition-all ${
                        isRecoverable
                          ? isRecoverSelected
                            ? "ring-1 ring-amber-400 rounded-md opacity-100 cursor-pointer"
                            : "opacity-50 hover:opacity-100 cursor-pointer grayscale-[50%] hover:grayscale-0"
                          : "opacity-30 grayscale pointer-events-none"
                      }`}
                      onClick={isRecoverable ? () => onRecoverSelect(card.id) : undefined}
                    >
                      <BattleCard card={card} disabled={!isRecoverable} selected={isRecoverSelected} isCaptain={false} />
                      {!isRecoverable && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <span className="text-[10px] font-bold text-white/50 bg-black/60 border border-white/10 px-2 py-0.5 rounded">{text.play.used}</span>
                        </div>
                      )}
                    </div>
                  );
                }
                return (
                  <div key={card.id} className="@container">
                    <BattleCard
                      card={card} mode="command"
                      activeCommand={isSelecting ? selectedCommand ?? undefined : undefined}
                      onClick={isSelecting ? () => onCardClick(card.id) : undefined}
                      selected={isSelecting && selectedCardId === card.id}
                      disabled={!isSelecting}
                      onInfo={onCardInfo ? () => onCardInfo(card.id) : undefined}
                      isCaptain={false}
                    />
                  </div>
                );
              })}
            </div>
          );
        })()}
        {/* 주장 (우측 — 군령패에 가까운 쪽) */}
        {playerCaptain && (() => {
          const isCaptainDiscard = !!playerCaptainInDiscard;
          if (isCaptainDiscard) {
            const isRecoverable = selectedCommand === "govern" && isSelecting;
            const isRecoverSelected = selectedRecoverId === playerCaptain.id;
            return (
              <div className="shrink-0 self-center">
                <div
                  className={`@container w-[120px] xl:w-[160px] relative transition-all ${
                    isRecoverable
                      ? isRecoverSelected
                        ? "ring-1 ring-amber-400 rounded-md opacity-100 cursor-pointer"
                        : "opacity-50 hover:opacity-100 cursor-pointer grayscale-[50%] hover:grayscale-0"
                      : "opacity-30 grayscale pointer-events-none"
                  }`}
                  onClick={isRecoverable ? () => onRecoverSelect(playerCaptain.id) : undefined}
                >
                  <BattleCard card={playerCaptain} disabled={!isRecoverable} selected={isRecoverSelected} isCaptain onCaptainInfo={onShowCaptainInfo} />
                  {!isRecoverable && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span className="text-[10px] font-bold text-white/50 bg-black/60 border border-white/10 px-2 py-0.5 rounded">{text.play.used}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          }
          return (
            <div className="shrink-0 self-center">
              <div className="@container w-[120px] xl:w-[160px]">
                <BattleCard
                  card={playerCaptain} mode="command"
                  activeCommand={isSelecting ? selectedCommand ?? undefined : undefined}
                  onClick={isSelecting ? () => onCardClick(playerCaptain.id) : undefined}
                  selected={isSelecting && selectedCardId === playerCaptainId}
                  disabled={!isSelecting}
                  onInfo={onCardInfo ? () => onCardInfo(playerCaptain.id) : undefined}
                  isCaptain
                  onCaptainInfo={onShowCaptainInfo}
                />
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
