import type { BattleCard } from "@/lib/game/types";
import type { ReactNode } from "react";

interface Props {
  playerCard: BattleCard;
  aiCard: BattleCard;
  themeColor?: string; // rgb format e.g. "192,128,90"
  centerContent?: ReactNode; // 중앙 슬롯 (라운드, 진행도 등)
  playerContent?: ReactNode; // 플레이어 측 추가 정보 (HP바, 판정 등)
  aiContent?: ReactNode; // AI 측 추가 정보
}

export default function ArenaHud({
  playerCard,
  aiCard,
  themeColor = "192,128,90",
  centerContent,
  playerContent,
  aiContent,
}: Props) {
  return (
    <div
      className="shrink-0 z-10"
      style={{
        background: "linear-gradient(to bottom, rgba(22,20,16,0.95), rgba(14,13,10,0.9))",
        borderBottom: `1px solid rgba(${themeColor}, 0.15)`,
        boxShadow: "0 4px 16px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.03), inset 0 -1px 0 rgba(0,0,0,0.3)",
      }}
    >
      <div className="flex items-stretch">
        {/* 좌측 -- Player */}
        <div className="flex-1 flex flex-col justify-center pl-3 pr-2 py-2 md:pl-5">
          <span className="text-[11px] font-bold text-[#d4af37]/80 tracking-widest uppercase mb-0.5 truncate max-w-[120px]">
            {playerCard.nickname}
          </span>
          {playerContent}
        </div>

        {/* 중앙 */}
        <div className="shrink-0 w-[60px] sm:w-[70px] flex flex-col items-center justify-center">
          {centerContent}
        </div>

        {/* 우측 -- AI */}
        <div className="flex-1 flex flex-col justify-center pl-2 pr-3 py-2 md:pr-5">
          <span className="text-[11px] font-bold text-red-400/80 tracking-widest uppercase mb-0.5 text-right truncate max-w-[120px] ml-auto">
            {aiCard.nickname}
          </span>
          {aiContent}
        </div>
      </div>
    </div>
  );
}
