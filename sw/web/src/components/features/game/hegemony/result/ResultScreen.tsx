/*
  파일명: components/features/game/hegemony/result/ResultScreen.tsx
  기능: 대전 결과 화면
  책임: 승패와 끝난 까닭, 가장 활약한 인물, 주요 수치, 국력 흐름, 라운드 기록을 보여 주고 다시 대전으로 잇는다.
*/
"use client";

import { useEffect, useEffectEvent } from "react";
import { motion } from "framer-motion";
import { Home, RotateCcw } from "lucide-react";
import type { BattleCard } from "@/lib/game/types";
import type { Difficulty } from "@/lib/game/hegemony/constants";
import type { BattleState } from "@/lib/game/hegemony/session/types";
import BattleLog from "../battle/BattleLog";
import type { HegemonyRecords } from "../hooks/useHegemonyRecords";
import { totalsOf } from "../hooks/useHegemonyRecords";
import { useHotkeys } from "../hooks/useHotkeys";
import type { ScreenCommon } from "../screenTypes";
import { useHegemonyText } from "../text";
import GameButton from "../ui/GameButton";
import HeroCard from "../ui/HeroCard";
import { PANEL } from "../ui/tokens";
import PowerChart from "./PowerChart";
import { resultStats } from "./resultStats";

interface Props extends ScreenCommon {
  battle: BattleState;
  difficulty: Difficulty;
  records: HegemonyRecords;
  cards: Map<string, BattleCard>;
  onRematch: () => void;
  onHome: () => void;
}

const TITLE_TONE = { player: "text-accent", ai: "text-hg-enemy", draw: "text-hg-bright" } as const;

export default function ResultScreen({ battle, difficulty, records, cards, onRematch, onHome, onInspect, say, sfx }: Props) {
  const text = useHegemonyText();
  const r = text.result;
  const winner = battle.winner ?? "draw";
  const stats = resultStats(battle.records);
  const rounds = battle.records.length;
  const p = Math.max(0, battle.player.nation.power);
  const a = Math.max(0, battle.ai.nation.power);
  const ko = battle.player.nation.power <= 0 || battle.ai.nation.power <= 0;
  const reason = battle.forfeited
    ? r.forfeit
    : winner === "draw"
      ? r.draw
      : ko
        ? (winner === "player" ? r.koWin(rounds) : r.koLose(rounds))
        : (winner === "player" ? r.timeWin(p, a) : r.timeLose(p, a));
  const mvp = stats.mvp ? cards.get(stats.mvp.cardId) : undefined;
  const totals = totalsOf(records);
  const nameOf = (id: string) => cards.get(id)?.nickname ?? "";
  useHotkeys({ Enter: onRematch });

  // 결과가 뜨면 한 번: 승패 효과음과 가장 활약한 인물의 한마디
  const greet = useEffectEvent(() => {
    sfx(winner === "player" ? "roundWin" : winner === "ai" ? "roundLose" : "roundDraw");
    if (mvp) say(mvp, winner === "player" ? "battle_win" : winner === "ai" ? "battle_lose" : "battle_draw");
  });
  useEffect(() => greet(), []);

  const figures = [
    { label: r.dealt, value: stats.dealt },
    { label: r.taken, value: stats.taken },
    { label: r.counters, value: stats.counters },
    { label: r.rebellions, value: `${stats.rebellions.player} / ${stats.rebellions.ai}` },
  ];

  return (
    // 아래 여백은 끝까지 내렸을 때 마지막 라운드 줄이 떠 있는 음악 단추 밑에 깔리지 않게 둔다
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-5 pt-4 pb-16">
      <motion.header
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="text-center"
      >
        {/* 넓은 자간은 영어 대문자에 맞춘 것이라 난이도 이름(Normal)도 대문자로 맞춘다 (한글에는 영향이 없다) */}
        <p className="text-sm font-bold uppercase tracking-[0.4em] text-text-secondary">{text.difficulty.name[difficulty]} · {text.game.english}</p>
        <h2 className={`mt-2 text-6xl font-black sm:text-7xl ${TITLE_TONE[winner]}`}>{r.title[winner]}</h2>
        <p className="mt-3 text-base text-text-primary sm:text-lg">{reason}</p>
        {/* 배경 신전 그림 위에 얹히므로 흐린 글색 대신 본문 글색을 쓴다 */}
        <p className="mt-1 text-sm text-text-primary">{r.record(totals.wins, totals.losses)}</p>
      </motion.header>

      {/* 대사 자막이 화면 아래에 떠서 단추를 가리므로 승패 바로 아래에 둔다.
          sm 이상은 기록을 내려 읽는 동안에도 위에 붙여 두고, 폰은 붙이면 본문을 너무 많이 가려 그대로 둔다 */}
      <div className={`${PANEL} z-10 mx-auto flex w-fit max-w-full flex-wrap items-center justify-center gap-3 p-2.5 sm:sticky sm:top-2`}>
        <GameButton variant="primary" size="lg" hotkey="Enter" icon={<RotateCcw size={18} />} onClick={onRematch}>{r.rematch}</GameButton>
        <GameButton size="lg" icon={<Home size={18} />} onClick={onHome}>{r.home}</GameButton>
      </div>

      {/* 첫 라운드 전에 기권하면 보여 줄 수치·흐름·기록이 없으므로 승패와 단추만 둔다 */}
      {rounds > 0 && (
        <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
          {/* 좁은 화면은 카드를 작게 옆에 두고 글을 오른쪽에, 넓은 화면은 세로로 쌓는다 */}
          {mvp && stats.mvp && (
            <section className={`${PANEL} grid grid-cols-[112px_minmax(0,1fr)] grid-rows-[1fr_auto_1fr] items-center gap-x-4 gap-y-1 p-3 md:grid-cols-1 md:grid-rows-none md:gap-y-2`}>
              <h3 className="col-start-2 row-start-1 self-end text-sm font-black text-accent md:col-start-1">{r.mvp}</h3>
              <div className="col-start-1 row-span-3 row-start-1 md:row-span-1 md:row-start-2">
                <HeroCard card={mvp} captain={mvp.id === battle.player.captainId} onInspect={() => onInspect(mvp.id)} />
              </div>
              <p className="col-start-2 row-start-2 text-xl font-black text-hg-bright md:hidden">{mvp.nickname}</p>
              <p className="col-start-2 row-start-3 self-start text-sm font-semibold text-text-primary md:col-start-1 md:text-center">{r.mvpLine(stats.mvp.dealt, stats.mvp.healed)}</p>
            </section>
          )}
          <section className={`${PANEL} flex flex-col gap-4 p-4`}>
            <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {/* 이름이 두 줄로 접히는 칸이 있어도 숫자는 아래에 맞춰 한 줄로 읽히게 한다 */}
              {figures.map((f) => (
                <div key={f.label} className="flex flex-col justify-between gap-0.5 rounded-xl border border-hg-line/70 bg-hg-raised px-3 py-2.5">
                  <dt className="text-sm font-semibold text-text-secondary">{f.label}</dt>
                  <dd className="text-2xl font-black tabular-nums text-hg-bright">{f.value}</dd>
                </div>
              ))}
            </dl>
            <PowerChart records={battle.records} label={r.chart} you={text.battle.you} enemy={text.battle.enemy} />
          </section>
        </div>
      )}

      {rounds > 0 && (
        <section className={`${PANEL} p-4`}>
          <h3 className="mb-3 text-sm font-black text-hg-bright">{r.rounds}</h3>
          <BattleLog records={battle.records} nameOf={nameOf} />
        </section>
      )}
    </div>
  );
}
