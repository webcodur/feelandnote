// @ts-nocheck
/* [DEAD CODE] v3에서 CommandPhase로 대체됨
  파일명: components/features/game/battle/DeployPhase.tsx
  기능: 배치 페이즈 UI
  책임: 3개 도메인 슬롯에 카드를 배정하는 인터페이스를 제공한다. (3+3 분할 배치)
*/
"use client";

import { useState, useCallback, useMemo } from "react";
import Image from "next/image";
import type { BattleCard as BattleCardType, Domain } from "@/lib/game/types";
import { DOMAIN_LABELS } from "@/lib/game/types";
import { calcBattleScore } from "@/lib/game/gameEngine";
import BattleCard from "./BattleCard";
import HegemonyActionButton from "./HegemonyActionButton";

interface Props {
  playerHand: BattleCardType[];
  domainOrder: Domain[];
  /** 이번 배치에서 배정할 도메인 (3개) */
  activeDomains: Domain[];
  /** 이전 배치에서 이미 배정된 카드 ID들 */
  deployedCardIds?: Set<string>;
  onDeploy: (deployment: Partial<Record<string, string>>) => void;
  playSfx?: (name: string) => void;
  onCardInfo?: (celebId: string) => void;
}

export default function DeployPhase({
  playerHand,
  domainOrder,
  activeDomains,
  deployedCardIds: alreadyDeployed,
  onDeploy,
  playSfx,
  onCardInfo,
}: Props) {
  const [slots, setSlots] = useState<Partial<Record<Domain, string>>>({});
  const [activeSlot, setActiveSlot] = useState<Domain | null>(null);

  // 현재 슬롯에 배치된 카드 ID
  const currentDeployedIds = new Set(Object.values(slots).filter(Boolean) as string[]);

  // 사용 가능한 카드: 이전 배치에서 사용되지 않고, 현재 슬롯에도 배치되지 않은 카드
  const availableCards = useMemo(() =>
    playerHand.filter((c) => !alreadyDeployed?.has(c.id) && !currentDeployedIds.has(c.id)),
    [playerHand, alreadyDeployed, currentDeployedIds]
  );

  // 3개 슬롯 모두 배치 완료 여부
  const allDeployed = activeDomains.every((d) => slots[d]);

  const handleSlotClick = useCallback((domain: Domain) => {
    const cardId = slots[domain];
    if (cardId) {
      playSfx?.("sfx-card-pick.mp3");
      setSlots((prev) => {
        const next = { ...prev };
        delete next[domain];
        return next;
      });
      setActiveSlot(domain);
    } else {
      playSfx?.("sfx-card-pick.mp3");
      setActiveSlot((prev) => (prev === domain ? null : domain));
    }
  }, [slots, playSfx]);

  const handleCardClick = useCallback((cardId: string) => {
    if (!activeSlot) {
      const emptySlot = activeDomains.find((d) => !slots[d]);
      if (!emptySlot) return;
      playSfx?.("sfx-deploy.mp3");
      setSlots((prev) => ({ ...prev, [emptySlot]: cardId }));
      const nextEmpty = activeDomains.find((d) => d !== emptySlot && !slots[d]);
      setActiveSlot(nextEmpty ?? null);
      return;
    }
    playSfx?.("sfx-deploy.mp3");
    setSlots((prev) => ({ ...prev, [activeSlot]: cardId }));
    const nextEmpty = activeDomains.find((d) => d !== activeSlot && !slots[d]);
    setActiveSlot(nextEmpty ?? null);
  }, [activeSlot, activeDomains, slots, playSfx]);

  const handleDeploy = useCallback(() => {
    if (!allDeployed) return;
    playSfx?.("sfx-start.mp3");
    onDeploy(slots);
  }, [allDeployed, slots, onDeploy, playSfx]);

  return (
    <div className="flex-1 flex flex-col">
      {/* 3개 도메인 슬롯 */}
      <div className="rounded-lg border border-accent/20 bg-[#15150f] px-3 py-3">
        <div className="flex items-center gap-1.5 mb-2">
          <div className="w-1.5 h-1.5 rounded-full bg-accent" />
          <span className="text-[9px] font-cinzel text-accent/70 uppercase tracking-wider">Deploy Zone</span>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {activeDomains.map((domain) => {
            const cardId = slots[domain];
            const card = cardId ? playerHand.find((c) => c.id === cardId) : null;
            const isActive = activeSlot === domain;

            return (
              <button
                key={domain}
                type="button"
                onClick={() => handleSlotClick(domain)}
                className={`
                  relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed
                  min-h-[160px] sm:min-h-[280px] transition-all duration-200
                  ${isActive
                    ? "border-accent bg-accent/10 shadow-[0_0_12px_rgba(212,175,55,0.15)]"
                    : card
                      ? "border-accent/30 bg-accent/[0.03]"
                      : "border-white/10 bg-white/[0.02] hover:border-white/20"
                  }
                `}
              >
                <span className={`absolute top-1 left-1.5 text-[9px] sm:text-[11px] font-bold ${
                  isActive ? "text-accent" : card ? "text-accent/60" : "text-white/30"
                }`}>
                  {DOMAIN_LABELS[domain]}
                </span>

                {card ? (
                  <div className="flex flex-col items-center gap-1">
                    <div className="relative w-10 h-10 sm:w-14 sm:h-14 rounded-full overflow-hidden border border-accent/30">
                      {card.avatarUrl ? (
                        <Image src={card.avatarUrl} alt={card.nickname} fill className="object-cover" sizes="56px" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-[#0a0a0c] text-white/10 text-xs">{card.nickname[0]}</div>
                      )}
                    </div>
                    <span className="text-[9px] sm:text-[11px] text-white/70 font-medium truncate max-w-[72px]">{card.nickname}</span>
                    <span className={`font-black tabular-nums text-[16px] sm:text-[22px] leading-none ${
                      calcBattleScore(card, domain) >= 20 ? "text-accent" : calcBattleScore(card, domain) >= 12 ? "text-accent/80" : "text-accent/50"
                    }`}>
                      {calcBattleScore(card, domain).toFixed(1)}
                    </span>
                  </div>
                ) : (
                  <span className={`text-2xl sm:text-3xl ${isActive ? "text-accent/40" : "text-white/10"}`}>+</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 대기 카드 */}
      {availableCards.length > 0 && (
        <div className="rounded-lg border border-white/[0.06] bg-[#131317] px-3 py-2 mt-2">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-[9px] font-cinzel text-white/40 uppercase tracking-wider">
              Available ({availableCards.length})
            </span>
          </div>
          <div className={`grid justify-items-center gap-2 sm:gap-3 ${
            availableCards.length <= 3 ? "grid-cols-3" : "grid-cols-6"
          }`}>
            {availableCards.map((card) => (
              <BattleCard
                key={card.id}
                card={card}
                mode={activeSlot ? "deploy" : "draft"}
                activeDomain={activeSlot ?? undefined}
                onClick={() => handleCardClick(card.id)}
                onInfo={onCardInfo ? () => onCardInfo(card.id) : undefined}
              />
            ))}
          </div>
        </div>
      )}

      {/* 하단 안내 */}
      {!allDeployed && !activeSlot && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="px-4 py-2 rounded-full bg-black/80 border border-accent/15 backdrop-blur-md shadow-lg">
            <span className="text-[11px] text-accent/70">도메인 슬롯을 선택하세요</span>
          </div>
        </div>
      )}
      {!allDeployed && activeSlot && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="px-4 py-2 rounded-full bg-black/80 border border-accent/15 backdrop-blur-md shadow-lg">
            <span className="text-[11px] text-accent/70">{DOMAIN_LABELS[activeSlot]}에 배치할 카드를 선택하세요</span>
          </div>
        </div>
      )}

      {/* 배치 완료 버튼 */}
      <HegemonyActionButton
        text="배치 완료"
        subtext="DEPLOY COMPLETE"
        disabled={!allDeployed}
        onClick={handleDeploy}
        className="fixed bottom-5 right-5 z-50"
      />
    </div>
  );
}
