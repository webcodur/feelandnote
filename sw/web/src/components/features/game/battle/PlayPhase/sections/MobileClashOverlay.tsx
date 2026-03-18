/*
  MobileClashOverlay — 모바일 충돌 연출 (clashing) + 라운드 결과 (resolving)
  lg:hidden fixed overlays
*/
import Image from "next/image";
import type { RoundAction, RoundRecord, Command } from "@/lib/game/types";
import { Z_INDEX } from "@/constants/zIndex";
import { getBattleCommandLabel } from "../../i18n";
import { CMD_ICON, CMD_STYLE } from "../types";
import type { BattleText } from "../types";
import RoundResultPanel from "./RoundResultPanel";

interface Props {
  isClashing: boolean;
  isResolving: boolean;
  pendingRound: { playerAction: RoundAction; aiAction: RoundAction } | null;
  lastRecord: RoundRecord | null;
  locale: string;
  text: BattleText;
  playSfx: (name: string) => void;
  onBattleClick: () => void;
  onAdvance: () => void;
}

export default function MobileClashOverlay({
  isClashing, isResolving, pendingRound, lastRecord,
  locale, text, playSfx, onBattleClick, onAdvance,
}: Props) {
  return (
    <>
      {/* ── 모바일: 충돌 연출 (clashing) ── */}
      {isClashing && pendingRound && (
        <div
          className="lg:hidden fixed inset-0 flex items-center justify-center bg-black/80 cursor-pointer"
          style={{ zIndex: Z_INDEX.gameModal - 1 }}
          onClick={onBattleClick}
        >
          <div className="flex items-center gap-3 animate-fade-in">
            {/* 아군 카드 */}
            <div className="flex flex-col items-center gap-2" style={{ animation: "clash-left 0.6s cubic-bezier(0.22,1,0.36,1) forwards" }}>
              <div className="w-20 h-20 rounded-lg overflow-hidden border-2 border-accent/50 shadow-[0_0_16px_rgba(212,175,55,0.3)]">
                {pendingRound.playerAction.card.avatarUrl ? (
                  <Image src={pendingRound.playerAction.card.avatarUrl} alt={pendingRound.playerAction.card.nickname} width={80} height={80} className="object-cover w-full h-full" />
                ) : (
                  <div className="w-full h-full bg-[#1a1a20] flex items-center justify-center">
                    <span className="text-2xl text-white/30 font-bold">{pendingRound.playerAction.card.nickname[0]}</span>
                  </div>
                )}
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-accent font-bold text-sm">{pendingRound.playerAction.card.nickname}</span>
                <span className={`flex items-center gap-1 text-xs ${CMD_STYLE[pendingRound.playerAction.command].text}`}>
                  {CMD_ICON[pendingRound.playerAction.command]}
                  {getBattleCommandLabel(pendingRound.playerAction.command, locale)}
                </span>
              </div>
            </div>

            {/* VS */}
            <div className="flex flex-col items-center gap-1" style={{ animation: "clash-flash 0.5s ease-out forwards" }}>
              <span className="text-3xl font-cinzel font-bold text-white/80 tracking-widest drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">
                VS
              </span>
            </div>

            {/* 적군 카드 */}
            <div className="flex flex-col items-center gap-2" style={{ animation: "clash-right 0.6s cubic-bezier(0.22,1,0.36,1) forwards" }}>
              <div className="w-20 h-20 rounded-lg overflow-hidden border-2 border-red-400/50 shadow-[0_0_16px_rgba(248,113,113,0.3)]">
                {pendingRound.aiAction.card.avatarUrl ? (
                  <Image src={pendingRound.aiAction.card.avatarUrl} alt={pendingRound.aiAction.card.nickname} width={80} height={80} className="object-cover w-full h-full" />
                ) : (
                  <div className="w-full h-full bg-[#1a1a20] flex items-center justify-center">
                    <span className="text-2xl text-white/30 font-bold">{pendingRound.aiAction.card.nickname[0]}</span>
                  </div>
                )}
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-red-400 font-bold text-sm">{pendingRound.aiAction.card.nickname}</span>
                <span className={`flex items-center gap-1 text-xs ${CMD_STYLE[pendingRound.aiAction.command].text}`}>
                  {getBattleCommandLabel(pendingRound.aiAction.command, locale)}
                  {CMD_ICON[pendingRound.aiAction.command]}
                </span>
              </div>
            </div>
          </div>
          <span className="absolute bottom-12 text-xs text-white/40 animate-pulse">{text.play.tapContinue}</span>
        </div>
      )}

      {/* ── 모바일: 라운드 결과 (resolving) ── */}
      {isResolving && lastRecord && (
        <div
          className="lg:hidden fixed inset-0 flex items-center justify-center px-4 bg-black/80"
          style={{ zIndex: Z_INDEX.gameModal - 1 }}
        >
          <div className="w-full max-w-sm">
            <RoundResultPanel record={lastRecord} compact playSfx={playSfx} onAdvance={onAdvance} locale={locale} text={text} />
          </div>
        </div>
      )}
    </>
  );
}
