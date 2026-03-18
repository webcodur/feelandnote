/*
  DesktopClashOverlay — 데스크톱 충돌/결과 오버레이
  hidden lg:block/lg:flex overlays
*/
import type { RoundAction, RoundRecord } from "@/lib/game/types";
import type { BattleText } from "../types";
import FeaturedCard from "./FeaturedCard";
import RoundResultPanel from "./RoundResultPanel";

interface Props {
  isClashing: boolean;
  isResolving: boolean;
  isClash: boolean;
  pendingRound: { playerAction: RoundAction; aiAction: RoundAction } | null;
  lastRecord: RoundRecord | null;
  locale: string;
  text: BattleText;
  playSfx: (name: string) => void;
  onBattleClick: () => void;
  onAdvance: () => void;
}

export default function DesktopClashOverlay({
  isClashing, isResolving, isClash, pendingRound, lastRecord,
  locale, text, playSfx, onBattleClick, onAdvance,
}: Props) {
  if (!isClash || !pendingRound) return null;

  return (
    <>
      {isClashing && (
        <div
          className="hidden lg:block absolute inset-0 z-20 cursor-pointer"
          onClick={onBattleClick}
        >
          <span className="absolute bottom-6 left-1/2 -translate-x-1/2 text-xs text-white/50 animate-pulse">
            {text.play.clickContinue}
          </span>
        </div>
      )}
      <div className={`hidden lg:flex absolute inset-0 flex-col items-center justify-center z-10 pointer-events-none ${isClashing ? "animate-shake" : ""}`}>
        {isClashing && (
          <div className="flex items-center gap-6">
            <div style={{ animation: "clash-left 0.6s cubic-bezier(0.22,1,0.36,1) forwards" }} className="w-[160px] xl:w-[200px]">
              <FeaturedCard card={pendingRound.playerAction.card} accent="player" command={pendingRound.playerAction.command} locale={locale} />
            </div>
            <div className="bg-black/80 rounded-xl px-5 py-4 flex items-center justify-center" style={{ animation: "clash-flash 0.5s ease-out forwards" }}>
              <span className="text-5xl font-cinzel font-bold text-white/80 tracking-widest drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]">
                VS
              </span>
            </div>
            <div style={{ animation: "clash-right 0.6s cubic-bezier(0.22,1,0.36,1) forwards" }} className="w-[160px] xl:w-[200px]">
              <FeaturedCard card={pendingRound.aiAction.card} accent="ai" command={pendingRound.aiAction.command} locale={locale} />
            </div>
          </div>
        )}

        {isResolving && lastRecord && (
          <RoundResultPanel record={lastRecord} playSfx={playSfx} onAdvance={onAdvance} locale={locale} text={text} />
        )}
      </div>
    </>
  );
}
