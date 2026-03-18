/*
  전황 로그 모달
*/
import { useMemo } from "react";
import { ScrollTextIcon } from "lucide-react";
import type { RoundRecord, Mandate } from "@/lib/game/types";
import { Z_INDEX } from "@/constants/zIndex";
import type { BattleText } from "../types";
import { getBattleCounterLabel, getBattleMandateLabel } from "../../i18n";

export default function BattleLogModal({ records, mandate, onClose, locale, text }: {
  records: RoundRecord[];
  mandate: Mandate | null;
  onClose: () => void;
  locale: string;
  text: BattleText;
}) {
  const reversed = useMemo(() => [...records].reverse(), [records]);

  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: Z_INDEX.gameModal }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md mx-4 rounded-2xl border border-white/15 bg-black/95 backdrop-blur-xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/15">
          <div className="flex items-center gap-2">
            <ScrollTextIcon size={16} className="text-white/60" />
            <span className="text-sm font-bold text-white/80">{text.play.recordTitle}</span>
            {mandate && <span className="text-[10px] text-amber-400/70 font-bold">{getBattleMandateLabel(mandate.command, locale)}</span>}
          </div>
          <button type="button" onClick={onClose} className="text-white/50 hover:text-white/80 transition-colors p-1">
            <span className="text-lg leading-none">&times;</span>
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto px-4 py-3 space-y-1 scrollbar-thin scrollbar-thumb-white/10">
          {reversed.length === 0 && (
            <div className="text-center text-white/40 text-xs py-8">{text.play.noRecord}</div>
          )}
          {reversed.map((rec) => {
            const pDelta = rec.powerDelta.player;
            const counterLabel = rec.duelWinner
              ? `⚔ ${text.play.duel} ${rec.duelWinner === "player" ? text.play.duelOutcome.player : rec.duelWinner === "ai" ? text.play.duelOutcome.ai : text.play.duelOutcome.draw}`
              : getBattleCounterLabel(rec.counterResult, locale);
            const counterColor = rec.duelWinner
              ? (rec.duelWinner === "player" ? "text-accent" : rec.duelWinner === "ai" ? "text-red-400" : "text-yellow-300")
              : rec.counterResult === "win" ? "text-amber-300" : rec.counterResult === "lose" ? "text-red-400" : "text-yellow-300";
            return (
              <div key={rec.round} className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-white/60 rounded-lg hover:bg-white/5">
                <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold shrink-0">{rec.round}</span>
                <span className="text-accent/70 truncate">{rec.player.card.nickname}</span>
                <span className="text-white/40 text-[10px]">vs</span>
                <span className="text-red-400/70 truncate">{rec.ai.card.nickname}</span>
                <span className={`text-[10px] font-bold ${counterColor}`}>{counterLabel}</span>
                <span className={`text-[10px] font-bold ml-auto ${pDelta > 0 ? "text-emerald-400/80" : pDelta < 0 ? "text-red-400/80" : "text-white/40"}`}>
                  {pDelta > 0 ? `+${pDelta}` : `${pDelta}`}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
