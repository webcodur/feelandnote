/*
  상성 결과 배지 (인라인 태그)
*/
import { getBattleCounterLabel } from "../../i18n";

export default function CounterBadge({ result, locale }: { result: "win" | "lose" | "draw"; locale: string }) {
  const config = {
    win: { text: getBattleCounterLabel("win", locale, true), cls: "text-amber-200 bg-amber-500/15 border-amber-400/30" },
    lose: { text: getBattleCounterLabel("lose", locale, true), cls: "text-red-300 bg-red-500/15 border-red-400/30" },
    draw: { text: getBattleCounterLabel("draw", locale), cls: "text-yellow-200 bg-yellow-500/15 border-yellow-400/30" },
  };
  const c = config[result];
  return (
    <span className={`inline-block rounded border px-2.5 py-0.5 text-xs font-bold tracking-wide animate-score-pop ${c.cls}`}>
      {c.text}
    </span>
  );
}
