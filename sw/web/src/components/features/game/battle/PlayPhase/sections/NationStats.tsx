/*
  국력+민심 바 (델타 잔상 + 숫자 애니메이션)
*/
import { useLocale } from "next-intl";
import { MAX_MORALE } from "@/lib/game/types";
import { getBattleText } from "../../i18n";

export default function NationStats({ power, maxPower, morale, accent, powerDelta, moraleDelta }: {
  power: number; maxPower: number; morale: number; accent: "player" | "ai";
  powerDelta?: number; moraleDelta?: number;
}) {
  const locale = useLocale();
  const text = getBattleText(locale);
  const isPlayer = accent === "player";
  const powerBar = isPlayer ? "bg-accent" : "bg-red-500";
  const moraleBar = isPlayer ? "bg-accent/60" : "bg-red-500/60";
  const numColor = isPlayer ? "text-accent" : "text-red-400";
  const labelColor = isPlayer ? "text-accent/70" : "text-red-400/70";
  const pd = powerDelta ?? 0;
  const md = moraleDelta ?? 0;
  const prevPower = power - pd;
  const prevMorale = morale - md;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        <span className={`text-[10px] font-bold shrink-0 ${labelColor}`}>{text.result.power}</span>
        <div className="flex-1 h-[6px] lg:h-2 rounded-full bg-black/50 lg:bg-white/15 overflow-hidden relative">
          {pd < 0 && (
            <div className="absolute inset-y-0 left-0 rounded-full bg-red-500/40" style={{ width: `${(prevPower / maxPower) * 100}%` }} />
          )}
          {pd > 0 && (
            <div className="absolute inset-y-0 left-0 rounded-full bg-emerald-500/30" style={{ width: `${(power / maxPower) * 100}%` }} />
          )}
          <div className={`absolute inset-y-0 left-0 rounded-full ${powerBar} transition-all duration-700 ease-out`} style={{ width: `${(power / maxPower) * 100}%` }} />
        </div>
        <div className="flex items-center gap-0.5 shrink-0 min-w-[32px] lg:min-w-[40px] justify-end">
          <span className={`text-sm font-cinzel font-bold tabular-nums text-right ${numColor}`}>{power}</span>
          {pd !== 0 && (
            <span className={`text-[9px] font-bold tabular-nums ${pd > 0 ? "text-emerald-400" : "text-red-400"}`}>
              {pd > 0 ? `+${pd}` : pd}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <span className={`text-[10px] font-bold shrink-0 ${labelColor}`}>{text.result.morale}</span>
        <div className="flex-1 h-[6px] lg:h-1.5 rounded-full bg-black/50 lg:bg-white/15 overflow-hidden relative">
          {md < 0 && (
            <div className="absolute inset-y-0 left-0 rounded-full bg-red-500/40" style={{ width: `${(prevMorale / MAX_MORALE) * 100}%` }} />
          )}
          {md > 0 && (
            <div className="absolute inset-y-0 left-0 rounded-full bg-emerald-500/30" style={{ width: `${(morale / MAX_MORALE) * 100}%` }} />
          )}
          <div className={`absolute inset-y-0 left-0 rounded-full ${moraleBar} transition-all duration-700 ease-out`} style={{ width: `${(morale / MAX_MORALE) * 100}%` }} />
        </div>
        <div className="flex items-center gap-0.5 shrink-0 min-w-[24px] lg:min-w-[30px] justify-end">
          <span className={`text-xs font-cinzel font-bold tabular-nums text-right ${numColor}`}>{morale}</span>
          {md !== 0 && (
            <span className={`text-[9px] font-bold tabular-nums ${md > 0 ? "text-emerald-400" : "text-red-400"}`}>
              {md > 0 ? `+${md}` : md}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
