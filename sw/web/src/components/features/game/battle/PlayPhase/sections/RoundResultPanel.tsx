/*
  충돌 결과 통합 패널 (모바일/데스크톱 공용)
*/
import type { RoundRecord } from "@/lib/game/types";
import { CMD_ICON, CMD_STYLE, NARRATIVE_STYLE, type BattleText, type ParsedNarrative } from "../types";
import { getBattleCommandLabel, getBattleCounterExplain, translateBattleNarrative } from "../../i18n";
import CounterBadge from "./CounterBadge";
import EtchedDivider from "./EtchedDivider";
import FeaturedCard from "./FeaturedCard";

/* ─── 내러티브 파싱 ─── */

type NarrativeSide = "player" | "ai" | "system";
type NarrativeType = "normal" | "rebellion" | "mandate";

function parseNarratives(result: string, locale: string): ParsedNarrative[] {
  return result.split(" / ").map((raw) => {
    const trimmed = raw.trim();
    if (!trimmed) return null;

    let side: NarrativeSide = "system";
    let text = trimmed;

    if (trimmed.startsWith("[아군] ")) {
      side = "player";
      text = trimmed.slice(5);
    } else if (trimmed.startsWith("[적군] ")) {
      side = "ai";
      text = trimmed.slice(5);
    } else if (trimmed.includes("아군")) {
      side = "player";
    } else if (trimmed.includes("적군") || trimmed.includes("AI")) {
      side = "ai";
    }

    let type: NarrativeType = "normal";
    if (/반란/.test(text)) type = "rebellion";
    else if (/\[천명/.test(text)) type = "mandate";

    return { side, type, text: translateBattleNarrative(text, locale) };
  }).filter(Boolean) as ParsedNarrative[];
}

/* ─── 컴포넌트 ─── */

export default function RoundResultPanel({ record, compact, playSfx, onAdvance, locale, text }: {
  record: RoundRecord;
  compact?: boolean;
  playSfx: (name: string) => void;
  onAdvance: () => void;
  locale: string;
  text: BattleText;
}) {
  const narratives = parseNarratives(record.result, locale);
  const counterExplain = getBattleCounterExplain(record.player.command, record.ai.command, locale);
  const playerNarrs = narratives.filter(n => n.side === "player");
  const aiNarrs = narratives.filter(n => n.side === "ai");
  const systemNarrs = narratives.filter(n => n.side === "system");

  const stagger = (i: number) => ({ animation: `result-reveal 0.35s cubic-bezier(0.22,1,0.36,1) ${100 + i * 80}ms both` });

  /* ─── 모바일 (compact) ─── */
  if (compact) {
    return (
      <div className="animate-fade-in rounded-lg border border-white/15 bg-black/90 px-4 py-4 space-y-3">

        {/* VS 히어로 + 좌우 명령 */}
        <div className="flex items-center justify-center gap-3">
          {/* 플레이어 측 */}
          <div className="flex-1 flex flex-col items-end gap-0.5 min-w-0">
            <span className="text-accent font-bold text-sm truncate">{record.player.card.nickname}</span>
            <span className={`flex items-center gap-1 text-xs ${CMD_STYLE[record.player.command].text}`}>
              {CMD_ICON[record.player.command]}
              {getBattleCommandLabel(record.player.command, locale)}
            </span>
            <span className={`text-[10px] tabular-nums ${record.player.effectiveAptitude > 0 ? "text-accent/70" : "text-accent/30"}`}>
              {text.play.aptitude} {record.player.aptitude.toFixed(1)}{record.player.mandateBonus && " ★"}{record.player.effectiveAptitude === 0 && ` (${text.play.invalid})`}
            </span>
          </div>
          {/* VS */}
          <span className="text-2xl font-cinzel font-bold text-white/70 tracking-widest shrink-0 px-1">VS</span>
          {/* AI 측 */}
          <div className="flex-1 flex flex-col items-start gap-0.5 min-w-0">
            <span className="text-red-400 font-bold text-sm truncate">{record.ai.card.nickname}</span>
            <span className={`flex items-center gap-1 text-xs ${CMD_STYLE[record.ai.command].text}`}>
              {getBattleCommandLabel(record.ai.command, locale)}
              {CMD_ICON[record.ai.command]}
            </span>
            <span className={`text-[10px] tabular-nums ${record.ai.effectiveAptitude > 0 ? "text-red-400/70" : "text-red-400/30"}`}>
              {text.play.aptitude} {record.ai.aptitude.toFixed(1)}{record.ai.mandateBonus && " ★"}{record.ai.effectiveAptitude === 0 && ` (${text.play.invalid})`}
            </span>
          </div>
        </div>

        {/* 상성 태그 + 이벤트 로그 */}
        {(narratives.length > 0) && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              {record.duelWinner ? (
                <span className={`text-[11px] font-bold ${record.duelWinner === "player" ? "text-accent" : record.duelWinner === "ai" ? "text-red-400" : "text-yellow-300"}`}>
                  ⚔ {text.play.duel} {record.duelWinner === "player" ? text.play.duelOutcome.player : record.duelWinner === "ai" ? text.play.duelOutcome.ai : text.play.duelOutcome.draw}
                </span>
              ) : (
                <>
                  <CounterBadge result={record.counterResult} locale={locale} />
                  {counterExplain && <span className="text-[11px] text-white/50">{counterExplain}</span>}
                  {record.counterResult === "draw" && (
                    <span className="text-[11px] text-white/50">
                      {text.play.aptitude} {record.player.aptitude.toFixed(1)} vs {record.ai.aptitude.toFixed(1)} → {
                        record.player.aptitude > record.ai.aptitude
                          ? `${record.player.card.nickname} ${text.play.edge}`
                          : record.ai.aptitude > record.player.aptitude
                            ? `${record.ai.card.nickname} ${text.play.edge}`
                            : text.play.tie
                      }
                    </span>
                  )}
                </>
              )}
            </div>
            {narratives.map((n, i) => {
              const style = NARRATIVE_STYLE[n.type];
              const isSpecial = n.type !== "normal";
              return (
                <div key={i} className={`flex items-start gap-1.5 text-xs rounded px-2 py-1 border ${
                  isSpecial ? style.mobileCls : "border-transparent text-white/70"
                }`}>
                  {style.icon}
                  <span className="text-white/50 shrink-0 w-5">
                    {n.side === "player" ? text.play.ally[0] : n.side === "ai" ? text.play.enemy[0] : ""}
                  </span>
                  <span className="leading-relaxed">{n.text}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* 다음 버튼 */}
        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={() => { playSfx("sfx-round-draw.mp3"); onAdvance(); }}
            className="px-4 py-1.5 rounded-md bg-accent/15 border border-accent/25 text-accent text-xs font-bold hover:bg-accent/25 transition-colors shrink-0"
          >
            {text.play.next}
          </button>
        </div>
      </div>
    );
  }

  /* ─── 데스크톱 ─── */
  return (
    <div className="pointer-events-auto rounded-2xl bg-black/90 border border-white/15 shadow-[0_8px_60px_rgba(0,0,0,0.7)] px-8 py-6 max-w-2xl mx-auto space-y-5" style={stagger(0)}>

      {/* 좌우 카드 + 중앙 VS + 상성 */}
      <div className="flex items-start justify-center gap-6" style={stagger(0)}>
        {/* 플레이어 카드 */}
        <div className="flex flex-col items-center gap-2 min-w-0 flex-1">
          <FeaturedCard card={record.player.card} accent="player" command={record.player.command} locale={locale} />
          <span className={`text-[10px] tabular-nums ${record.player.effectiveAptitude > 0 ? "text-accent/70" : "text-accent/40"}`}>
            {text.play.aptitude} {record.player.aptitude.toFixed(1)}{record.player.mandateBonus && " ★"}{record.player.effectiveAptitude === 0 && ` (${text.play.invalid})`}
          </span>
        </div>
        {/* VS + 상성 중앙 */}
        <div className="flex flex-col items-center justify-center shrink-0 pt-6 gap-3">
          <span
            className="text-4xl font-cinzel font-bold text-white/80 tracking-[0.15em] drop-shadow-[0_0_20px_rgba(255,255,255,0.15)] select-none"
            style={{ animation: "clash-flash 0.5s ease-out forwards" }}
          >
            VS
          </span>
          {record.duelWinner ? (
            <span className={`text-sm font-bold ${record.duelWinner === "player" ? "text-accent" : record.duelWinner === "ai" ? "text-red-400" : "text-yellow-300"}`}>
              ⚔ {text.play.duel} {record.duelWinner === "player" ? text.play.duelOutcome.player : record.duelWinner === "ai" ? text.play.duelOutcome.ai : text.play.duelOutcome.draw}
            </span>
          ) : (
            <>
              <CounterBadge result={record.counterResult} locale={locale} />
              {counterExplain && (
                <span className="text-[11px] text-white/50 text-center leading-snug">
                  {counterExplain}
                </span>
              )}
              {record.counterResult === "draw" && (
                <span className="text-[11px] text-white/50 text-center leading-snug">
                  {text.play.aptitude} {record.player.aptitude.toFixed(1)} vs {record.ai.aptitude.toFixed(1)}<br />{
                    record.player.aptitude > record.ai.aptitude
                      ? `${record.player.card.nickname} ${text.play.edge}`
                      : record.ai.aptitude > record.player.aptitude
                        ? `${record.ai.card.nickname} ${text.play.edge}`
                        : text.play.tie
                  }
                </span>
              )}
            </>
          )}
        </div>
        {/* AI 카드 */}
        <div className="flex flex-col items-center gap-2 min-w-0 flex-1">
          <FeaturedCard card={record.ai.card} accent="ai" command={record.ai.command} locale={locale} />
          <span className={`text-[10px] tabular-nums ${record.ai.effectiveAptitude > 0 ? "text-red-400/70" : "text-red-400/40"}`}>
            {text.play.aptitude} {record.ai.aptitude.toFixed(1)}{record.ai.mandateBonus && " ★"}{record.ai.effectiveAptitude === 0 && ` (${text.play.invalid})`}
          </span>
        </div>
      </div>

      <EtchedDivider />

      {/* 이벤트 로그 */}
      <div className="space-y-2" style={stagger(1)}>
        {playerNarrs.length > 0 && (
          <div className="rounded-lg border border-accent/20 bg-accent/5 px-4 py-2.5">
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-accent/60" />
              <span className="text-[10px] font-bold text-accent/60 uppercase tracking-wider">{text.play.ally}</span>
            </div>
            <div className="space-y-1">
              {playerNarrs.map((n, i) => {
                const style = NARRATIVE_STYLE[n.type];
                const isSpecial = n.type !== "normal";
                return (
                  <div key={i} className={`flex items-center gap-2 text-xs leading-relaxed ${
                    isSpecial ? `${style.cls} rounded px-2 py-1 border` : "text-white/70"
                  }`}>
                    {style.icon}
                    <span>{n.text}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {aiNarrs.length > 0 && (
          <div className="rounded-lg border border-red-400/20 bg-red-500/5 px-4 py-2.5">
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-red-400/60" />
              <span className="text-[10px] font-bold text-red-400/60 uppercase tracking-wider">{text.play.enemy}</span>
            </div>
            <div className="space-y-1">
              {aiNarrs.map((n, i) => {
                const style = NARRATIVE_STYLE[n.type];
                const isSpecial = n.type !== "normal";
                return (
                  <div key={i} className={`flex items-center gap-2 text-xs leading-relaxed ${
                    isSpecial ? `${style.cls} rounded px-2 py-1 border` : "text-white/70"
                  }`}>
                    {style.icon}
                    <span>{n.text}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {systemNarrs.map((n, i) => {
          const style = NARRATIVE_STYLE[n.type];
          return (
            <div key={i} className={`flex items-center justify-center gap-2 text-xs rounded-lg border px-4 py-2.5 ${style.cls}`}>
              {style.icon}
              <span className="leading-relaxed">{n.text}</span>
            </div>
          );
        })}
      </div>

      {/* 다음 라운드 */}
      <div className="flex justify-center pt-1" style={stagger(2)}>
        <button
          type="button"
          onClick={() => { playSfx("sfx-round-draw.mp3"); onAdvance(); }}
          className="group relative px-10 py-3 rounded-lg bg-accent/15 border border-accent/30 text-accent font-bold text-sm hover:bg-accent/25 transition-all shadow-[0_0_24px_rgba(212,175,55,0.15)] hover:shadow-[0_0_32px_rgba(212,175,55,0.25)]"
        >
          {text.play.nextRound}
        </button>
      </div>
    </div>
  );
}
