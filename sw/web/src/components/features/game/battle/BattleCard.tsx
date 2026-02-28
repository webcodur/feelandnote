/*
  파일명: components/features/game/battle/BattleCard.tsx
  기능: 셀럽 카드 컴포넌트 (container query 반응형)
  책임: 드래프트/플레이에서 공통으로 사용하는 셀럽 카드를 렌더링한다.
  구조: 3행 — 1행 초상화+이름 / 2행 명령 아이콘 5개 / 3행 적성 수치 5개
*/
"use client";

import Image from "next/image";
import { Swords, ScrollText, Landmark, Crown } from "lucide-react";
import type { BattleCard as BattleCardType, Command } from "@/lib/game/types";
import { COMMANDS } from "@/lib/game/types";
import { calcAptitude, aptitudeToStars } from "@/lib/game/gameEngine";

const CMD_HIGHLIGHT: Record<Command, string> = {
  assault: "text-red-400",
  stratagem: "text-purple-400",
  govern: "text-amber-400",
};

const CMD_ICON: Record<Command, React.ReactNode> = {
  assault: <Swords />,
  stratagem: <ScrollText />,
  govern: <Landmark />,
};

interface Props {
  card: BattleCardType;
  onClick?: () => void;
  disabled?: boolean;
  onInfo?: () => void;
  selected?: boolean;
  faceDown?: boolean;
  pickedBy?: "player" | "ai";
  mode?: "draft" | "command" | "target";
  activeCommand?: Command;
  /** 초상화+이름만 표시하는 컴팩트 모드 */
  compact?: boolean;
  /** 모략 타겟으로 지목 가능한 상태 */
  targetable?: boolean;
  /** 모략 타겟으로 지목된 상태 */
  targeted?: boolean;
  /** 적성 수치를 ? 로 마스킹 (상대 미공개 카드) */
  masked?: boolean;
  /** 주장 카드 표시 */
  isCaptain?: boolean;
  /** 주장 배지 클릭 시 설명 모달 */
  onCaptainInfo?: () => void;
  /** 하단 정보 섹션을 대체할 커스텀 슬롯 */
  footerSlot?: React.ReactNode;
}

export default function BattleCard({
  card, onClick, disabled, onInfo, selected, faceDown,
  pickedBy, mode = "draft", activeCommand, compact,
  targetable, targeted, masked, isCaptain, onCaptainInfo,
  footerSlot,
}: Props) {
  if (faceDown) {
    return (
      <div
        className="relative flex items-center justify-center rounded-md overflow-hidden aspect-square"
        style={{
          background: "radial-gradient(circle at 50% 40%, #24242e 0%, #14141a 70%, #0e0e14 100%)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `
              repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(212,175,55,0.3) 8px, rgba(212,175,55,0.3) 9px),
              repeating-linear-gradient(-45deg, transparent, transparent 8px, rgba(212,175,55,0.3) 8px, rgba(212,175,55,0.3) 9px)
            `,
          }}
        />
        <div className="relative flex items-center justify-center w-7 h-7">
          <div className="absolute inset-0 rounded-full border border-accent/10" />
          <span className="text-accent/15 text-sm font-cinzel font-bold">F</span>
        </div>
      </div>
    );
  }

  const borderClass = targeted
    ? "border-purple-400 ring-2 ring-purple-400/40 shadow-[0_0_20px_rgba(168,85,247,0.3)]"
    : selected
    ? "border-accent ring-1 ring-accent/30 shadow-[0_0_16px_rgba(212,175,55,0.2)]"
    : targetable
    ? "border-purple-400/40 hover:border-purple-400/70 cursor-crosshair"
    : pickedBy === "player"
      ? "border-accent/40"
      : pickedBy === "ai"
        ? "border-red-400/40"
        : "border-white/[0.06] hover:border-white/15";

  return (
    <div
      role={onClick && !disabled ? "button" : undefined}
      tabIndex={onClick && !disabled ? 0 : undefined}
      onClick={!disabled ? onClick : undefined}
      onKeyDown={onClick && !disabled ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } } : undefined}
      className={`
        group relative flex flex-col rounded-md overflow-hidden font-sans transition-all duration-200
        border ${borderClass}
        ${disabled ? "cursor-not-allowed" : onClick ? "cursor-pointer hover:-translate-y-0.5" : ""}
      `}
    >
      {/* ── 1행: 초상화 ── */}
      <div className="relative w-full aspect-square" style={{ background: "radial-gradient(circle at 50% 40%, #24242e 0%, #14141a 70%, #0e0e14 100%)" }}>
        {card.avatarUrl ? (
          <Image src={card.avatarUrl} alt={card.nickname} fill className="object-cover" sizes="120px" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-white/[0.06] text-xl font-cinzel">{card.nickname[0]}</span>
          </div>
        )}

        {/* 주장 왕관 배지 */}
        {isCaptain && (
          onCaptainInfo ? (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onCaptainInfo(); }}
              onTouchStart={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              className="absolute top-0.5 left-0.5 z-[1] flex items-center justify-center w-5 h-5 rounded-full bg-amber-500/90 shadow-[0_0_8px_rgba(212,175,55,0.5)] hover:bg-amber-500 active:scale-90 transition-all cursor-help"
            >
              <Crown className="w-3 h-3 text-white" />
            </button>
          ) : (
            <div className="absolute top-0.5 left-0.5 z-[1] flex items-center justify-center w-4 h-4 rounded-full bg-amber-500/90 shadow-[0_0_8px_rgba(212,175,55,0.5)]">
              <Crown className="w-2.5 h-2.5 text-white" />
            </div>
          )
        )}

        {/* 타겟 크로스헤어 오버레이 */}
        {targetable && (
          <div className="absolute inset-0 flex items-center justify-center bg-purple-500/5">
            <span className="text-purple-400/30 text-2xl">+</span>
          </div>
        )}

        {/* 상세 버튼 */}
        {onInfo && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onInfo(); }}
            onTouchStart={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            className="absolute top-1 right-1 text-[7px] text-white/15 hover:text-white/50 transition-colors z-[1]"
          >
            ···
          </button>
        )}
      </div>

      {/* ── 하단: footerSlot 또는 기본 정보 ── */}
      {footerSlot || (
        <div className="bg-gradient-to-b from-[#1a1714] to-[#141210] border-t border-amber-500/10 px-1.5 py-1 text-center">
          {card.title && (
            <p className="text-[7px] @min-[120px]:text-[9px] font-cinzel font-bold text-amber-500 tracking-widest uppercase truncate leading-tight">{card.title}</p>
          )}
          <p className="text-[10px] @min-[120px]:text-xs font-sans font-bold text-white truncate leading-tight">{card.nickname}</p>
        </div>
      )}

      {/* ── 2행: 명령 아이콘 + 3행: 적성 수치 ── */}
      {!compact && (
        <div className="bg-[#141210] border-t border-amber-500/5 py-1">
          {/* 아이콘 행 */}
          <div className="flex items-center justify-around px-1">
            {COMMANDS.map((cmd) => {
              const isActive = activeCommand === cmd;
              return (
                <span key={cmd} className={`[&>svg]:w-3.5 [&>svg]:h-3.5 @min-[120px]:[&>svg]:w-4 @min-[120px]:[&>svg]:h-4 transition-all ${
                  isActive ? CMD_HIGHLIGHT[cmd] : activeCommand ? "text-white/10" : "text-white/30"
                }`}>
                  {CMD_ICON[cmd]}
                </span>
              );
            })}
          </div>
          {/* 수치 행 */}
          <div className="flex items-center justify-around px-1 mt-0.5">
            {COMMANDS.map((cmd) => {
              if (masked) {
                return (
                  <span key={cmd} className="text-[11px] @min-[120px]:text-xs font-bold tabular-nums leading-none text-white/15">
                    ?
                  </span>
                );
              }
              const stars = aptitudeToStars(calcAptitude(card, cmd));
              const isActive = activeCommand === cmd;
              return (
                <span key={cmd} className={`text-[11px] @min-[120px]:text-xs font-bold tabular-nums leading-none transition-all ${
                  isActive
                    ? `${CMD_HIGHLIGHT[cmd]} scale-110`
                    : activeCommand
                      ? "text-white/10"
                      : stars >= 4 ? "text-accent" : stars >= 2 ? "text-white/50" : "text-white/20"
                }`}>
                  {stars}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
