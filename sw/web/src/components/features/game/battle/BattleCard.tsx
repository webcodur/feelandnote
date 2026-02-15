/*
  파일명: components/features/game/battle/BattleCard.tsx
  기능: 셀럽 카드 컴포넌트
  책임: 드래프트/대전에서 사용하는 셀럽 카드를 렌더링한다.
*/
"use client";

import Image from "next/image";
import { Check, Info } from "lucide-react";
import type { BattleCard as BattleCardType, Domain, Tier } from "@/lib/game/types";

interface Props {
  card: BattleCardType;
  onClick?: () => void;
  onConfirm?: () => void;
  disabled?: boolean;
  highlightDomain?: Domain;
  activeDomain?: Domain;
  onDomainClick?: (domain: Domain) => void;
  onInfo?: () => void;
  usedDomains?: Domain[];
  selected?: boolean;
  faceDown?: boolean;
  /** 드래프트에서 픽된 귀속 표시 ("player" | "ai") */
  pickedBy?: "player" | "ai";
}

const DOMAIN_KEY: Record<Domain, string> = {
  political: "정치",
  strategic: "전략",
  tech: "기술",
  social: "사회",
  economic: "경제",
  cultural: "문화",
};

const TIER_ACCENT: Record<Tier, string> = {
  S: "border-red-500/60 text-red-400",
  A: "border-orange-500/50 text-orange-400",
  B: "border-yellow-500/40 text-yellow-400",
  C: "border-green-500/30 text-green-400",
  D: "border-blue-500/30 text-blue-400",
  E: "border-neutral-500/30 text-neutral-400",
};

/** 카드 크기 상수 — faceDown·DraftPhase 래퍼와 동기화 필수 */
const CARD = "w-[80px] h-[130px] sm:w-[148px] sm:h-[248px]";

export default function BattleCard({
  card,
  onClick,
  onConfirm,
  disabled,
  highlightDomain,
  activeDomain,
  onDomainClick,
  onInfo,
  usedDomains = [],
  selected,
  faceDown,
  pickedBy,
}: Props) {
  if (faceDown) {
    return (
      <div className={`flex items-center justify-center rounded-lg border border-white/8 bg-[#141418] ${CARD}`}>
        <span className="text-white/15 text-2xl font-sans font-bold">?</span>
      </div>
    );
  }

  const usedSet = new Set(usedDomains);

  return (
    <div
      role={onClick && !disabled ? "button" : undefined}
      tabIndex={onClick && !disabled ? 0 : undefined}
      onClick={!disabled ? onClick : undefined}
      onKeyDown={onClick && !disabled ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } } : undefined}
      className={`
        group relative flex flex-col rounded-lg border overflow-hidden font-sans transition-colors duration-300 ${CARD}
        ${selected
          ? "border-accent ring-1 ring-accent/30 bg-[#1a1a1a]"
          : pickedBy === "player"
            ? "border-accent/50 bg-accent/[0.04]"
            : pickedBy === "ai"
              ? "border-red-400/50 bg-red-400/[0.04]"
              : "border-white/8 bg-[#141418] hover:border-white/40 hover:bg-[#1a1a1f] hover:shadow-[0_0_18px_rgba(255,255,255,0.1)]"}
        ${disabled
          ? "cursor-not-allowed"
          : "cursor-pointer"}
      `}
    >
      {/* 이미지 — flex-1로 남은 공간 전부 차지 */}
      <div className="relative w-full flex-1 min-h-0 bg-black/60">
        {card.avatarUrl ? (
          <Image src={card.avatarUrl} alt={card.nickname} fill className="object-cover" sizes="(min-width:640px) 148px, 80px" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/10 text-2xl">?</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#141418] via-transparent to-transparent" />
        <span className={`absolute top-0.5 left-0.5 sm:top-1 sm:left-1 text-[7px] sm:text-[10px] font-bold px-1 sm:px-1.5 py-px sm:py-0.5 rounded border bg-black/60 ${TIER_ACCENT[card.tier]}`}>
          {card.tier}
        </span>
        {onInfo && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onInfo(); }}
            className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full bg-black/50 text-white/40 hover:text-white hover:bg-black/70 active:scale-90 transition-all z-10"
          >
            <Info size={10} className="sm:hidden" />
            <Info size={13} className="hidden sm:block" />
          </button>
        )}
      </div>

      {/* 이름 */}
      <div className="shrink-0 px-1 sm:px-2 pt-1 sm:pt-1.5">
        <p className="font-bold text-white truncate leading-tight text-[9px] sm:text-[13px]">{card.nickname}</p>
        <p className="hidden sm:block text-white/35 truncate leading-tight mt-px text-[11px]">{card.title}</p>
      </div>

      {/* 선택 체크 오버레이 */}
      {selected && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none animate-[check-pop_250ms_ease-out_both]">
          <div
            className="
              pointer-events-auto
              w-10 h-10 sm:w-14 sm:h-14 rounded-full flex items-center justify-center
              bg-accent/80 shadow-[0_0_20px_rgba(212,175,55,0.4)]
              hover:bg-accent hover:scale-110 hover:shadow-[0_0_30px_rgba(212,175,55,0.6)]
              active:scale-95
              transition-all duration-150 cursor-pointer
            "
            onClick={(e) => { e.stopPropagation(); onConfirm?.(); }}
          >
            <Check size={22} className="text-black sm:hidden" strokeWidth={3} />
            <Check size={30} className="text-black hidden sm:block" strokeWidth={3} />
          </div>
        </div>
      )}

      {/* 영향력 수치 — 2×3 그리드 */}
      <div className="shrink-0 px-1 pb-1 pt-0.5 sm:px-1.5 sm:pb-1.5 sm:pt-1 w-full">
        <div className="grid grid-cols-3 gap-0.5">
          {(Object.keys(DOMAIN_KEY) as Domain[]).map((d) => {
            const isLens = highlightDomain === d;
            const isActive = activeDomain === d;
            const isUsed = usedSet.has(d);
            return (
              <div
                key={d}
                role={onDomainClick ? "button" : undefined}
                onClick={onDomainClick ? (e) => { e.stopPropagation(); onDomainClick(d); } : undefined}
                className={`
                  flex items-center justify-center gap-0.5 rounded-sm py-0.5 sm:py-1
                  ${onDomainClick ? "cursor-pointer hover:bg-white/10 active:scale-95 transition-all" : ""}
                  ${isUsed
                    ? "bg-white/[0.01]"
                    : isLens
                      ? selected ? "bg-emerald-500/20" : "bg-emerald-500/10"
                      : isActive
                        ? "bg-accent/10"
                        : "bg-white/[0.02]"}
                `}
              >
                <span className={`hidden sm:inline text-[9px] ${
                  isUsed ? "text-white/15 line-through"
                    : isLens ? "text-emerald-400/70"
                    : isActive ? "text-accent/70"
                    : "text-white/30"
                }`}>
                  {DOMAIN_KEY[d]}
                </span>
                <span className={`font-bold tabular-nums text-[11px] sm:text-[13px] ${
                  isUsed ? "text-white/15"
                    : isLens ? "text-emerald-400"
                    : isActive ? "text-accent"
                    : "text-white/60"
                }`}>
                  {card.influence[d]}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
