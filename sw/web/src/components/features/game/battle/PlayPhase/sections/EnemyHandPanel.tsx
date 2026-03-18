/*
  EnemyHandPanel — 데스크톱 우측: 상대 패 2x2 그리드 + 주장
*/
import type { BattleCard as BattleCardType } from "@/lib/game/types";
import BattleCard from "../../BattleCard";
import type { BattleText } from "../types";

interface Props {
  aiHand: BattleCardType[];
  aiOthers: BattleCardType[];
  aiOthersDiscard: BattleCardType[];
  aiCaptain: BattleCardType | null;
  aiCaptainInDiscard: BattleCardType | null | undefined;
  aiSelectedCardId: string | null;
  isClash: boolean;
  hardMode: boolean;
  locale: string;
  text: BattleText;
  formatHandCount: (count: number) => string;
  onShowCaptainInfo: () => void;
  onCardInfo?: (celebId: string) => void;
}

export default function EnemyHandPanel({
  aiHand, aiOthers, aiOthersDiscard,
  aiCaptain, aiCaptainInDiscard,
  aiSelectedCardId, isClash, hardMode,
  locale, text, formatHandCount,
  onShowCaptainInfo, onCardInfo,
}: Props) {
  const aiDiscard = [...aiOthersDiscard, ...(aiCaptainInDiscard ? [aiCaptainInDiscard] : [])];

  return (
    <div className="flex flex-col gap-2 bg-black/80 rounded-xl p-3">
      <div className="flex items-center gap-2 px-1">
        <h3 className="text-xs font-bold text-red-400/70 tracking-wide uppercase">{text.play.handEnemy}</h3>
        <span className="text-xs text-red-400/50">{formatHandCount(aiHand.length)}</span>
        {aiDiscard.length > 0 && <span className="text-xs text-red-400/40">{text.play.used} {aiDiscard.length}</span>}
      </div>
      <div className="flex items-start gap-3">
        {/* 주장 (좌측 — 군령패에 가까운 쪽) */}
        {aiCaptain && (() => {
          const isCaptainDiscard = !!aiCaptainInDiscard;
          if (isCaptainDiscard) {
            return (
              <div className="shrink-0 self-center">
                <div className="@container w-[120px] xl:w-[160px] relative opacity-30 grayscale pointer-events-none">
                  <BattleCard card={aiCaptain} disabled isCaptain onCaptainInfo={onShowCaptainInfo} />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-[10px] font-bold text-white/50 bg-black/60 border border-white/10 px-2 py-0.5 rounded">{text.play.used}</span>
                  </div>
                </div>
              </div>
            );
          }
          const isAiSelected = aiSelectedCardId === aiCaptain.id;
          const showFace = isClash && isAiSelected;
          return (
            <div className="shrink-0 self-center">
              <div className={`@container w-[120px] xl:w-[160px] ${showFace ? "ring-1 ring-red-400/50 rounded-md animate-fade-in" : ""}`}>
                <BattleCard
                  card={aiCaptain} mode="target" masked={false}
                  disabled
                  onInfo={onCardInfo ? () => onCardInfo(aiCaptain.id) : undefined}
                  isCaptain
                  onCaptainInfo={onShowCaptainInfo}
                />
              </div>
            </div>
          );
        })()}
        {/* 일반 카드 2x2 */}
        {(() => {
          const allAiCards = [
            ...aiOthers.map(c => ({ card: c, isDiscard: false })),
            ...aiOthersDiscard.map(c => ({ card: c, isDiscard: true })),
          ];
          return (
            <div className="grid grid-cols-[repeat(2,100px)] xl:grid-cols-[repeat(2,130px)] gap-2 xl:gap-3">
              {allAiCards.map(({ card, isDiscard }) => {
                if (isDiscard) {
                  return (
                    <div key={card.id} className="@container relative opacity-30 grayscale pointer-events-none">
                      <BattleCard card={card} disabled isCaptain={false} />
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="text-[10px] font-bold text-white/50 bg-black/60 border border-white/10 px-2 py-0.5 rounded">{text.play.used}</span>
                      </div>
                    </div>
                  );
                }
                const isAiSelected = aiSelectedCardId === card.id;
                const showFace = isClash && isAiSelected;
                return (
                  <div key={card.id} className={`@container ${showFace ? "ring-1 ring-red-400/50 rounded-md animate-fade-in" : ""}`}>
                    <BattleCard
                      card={card} mode="target" masked={hardMode}
                      disabled
                      onInfo={onCardInfo ? () => onCardInfo(card.id) : undefined}
                      isCaptain={false}
                    />
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
