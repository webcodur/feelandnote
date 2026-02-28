import type { BattleCard } from "@/lib/game/types";
import type { ReactNode } from "react";

interface Props {
  playerCard: BattleCard;
  aiCard: BattleCard;
  themeColor?: string; // rgb format e.g. "192,128,90"
  centerText?: ReactNode; // text in the middle (round, momentum, note progress)
  centerStyle?: React.CSSProperties; // custom gold/red text styling
  bottomContent?: ReactNode; // HP bars or rhythm judgment marks under names
}

export default function ArenaHud({
  playerCard,
  aiCard,
  themeColor = "192,128,90",
  centerText,
  centerStyle,
  bottomContent,
}: Props) {
  return (
    <div className="shrink-0 px-3 pt-3 pb-2 md:px-5 md:pt-4 z-10"
      style={{
        background: "linear-gradient(to bottom, rgba(22,20,16,0.95), rgba(14,13,10,0.9))",
        borderBottom: `1px solid rgba(${themeColor}, 0.15)`,
        boxShadow: "0 4px 16px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.03), inset 0 -1px 0 rgba(0,0,0,0.3)",
      }}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] md:text-xs font-serif text-white/50 truncate max-w-[100px] md:max-w-[130px] tracking-wide">
          {aiCard.nickname}
        </span>
        <span className="font-cinzel text-xs md:text-sm tracking-[0.2em] px-2 text-center"
          style={{ textShadow: `0 0 8px rgba(${themeColor}, 0.2)`, ...centerStyle }}
        >
          {centerText}
        </span>
        <span className="text-[11px] md:text-xs font-serif text-white/50 truncate max-w-[100px] md:max-w-[130px] text-right tracking-wide">
          {playerCard.nickname}
        </span>
      </div>
      {bottomContent}
    </div>
  );
}
