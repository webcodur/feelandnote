/*
  좌우 패널용 충돌 카드
*/
import Image from "next/image";
import type { BattleCard as BattleCardType, Command } from "@/lib/game/types";
import { CMD_ICON, CMD_STYLE } from "../types";
import { getBattleCommandLabel } from "../../i18n";

export default function FeaturedCard({ card, accent, command, locale }: { card: BattleCardType; accent: "player" | "ai"; command?: Command; locale: string }) {
  const border = accent === "player" ? "border-accent/40" : "border-red-500/40";
  const bg = accent === "player" ? "bg-black/90" : "bg-black/90";
  const nameColor = accent === "player" ? "text-accent" : "text-red-400";
  const titleColor = accent === "player" ? "text-accent/70" : "text-red-400/70";
  const imgSrc = card.avatarUrl;

  return (
    <div className={`w-full rounded-xl border ${border} ${bg} overflow-hidden`}>
      {imgSrc ? (
        <div className="relative w-full aspect-square">
          <Image src={imgSrc} alt={card.nickname} fill className="object-cover" sizes="200px" />
        </div>
      ) : (
        <div className="w-full aspect-square bg-white/5 flex items-center justify-center">
          <span className="text-3xl text-white/40 font-bold">{card.nickname[0]}</span>
        </div>
      )}
      <div className="px-2.5 py-2 space-y-1">
        <p className={`text-sm font-bold truncate ${nameColor}`}>{card.nickname}</p>
        {card.title && <p className={`text-[11px] truncate ${titleColor}`}>{card.title}</p>}
        {command && (
          <div className={`flex items-center gap-1.5 text-xs ${CMD_STYLE[command].text}`}>
            {CMD_ICON[command]}
            <span className="font-bold">{getBattleCommandLabel(command, locale)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
