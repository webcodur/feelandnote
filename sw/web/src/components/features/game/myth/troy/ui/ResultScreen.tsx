/*
  파일명: components/features/game/myth/troy/ui/ResultScreen.tsx
  기능: 트로이 전쟁 판 결과
  책임: 이겼는지 졌는지, 몇 차례 만인지, 영웅마다 얻은 경험과 오른 수준, 쓰러진 영웅을 보여 준다.
        진 판은 무엇 때문에 졌는지(쓰러진 대장이나 지는 조건)를 앞세우고, 남지 않는 경험·수준은 보이지 않는다.
        이기면 이어지는 이야기로, 지면 다시 싸우기·장 고르기로 잇는다. 호메로스와 다른 길로 이긴 판에는 그 표시를 단다.
        이긴 판에서는 출진하지 않은 영웅이 받은 경험(진영의 몫)도 한 줄로 알린다.
*/ // ------------------------------
"use client";

import { motion } from "framer-motion";
import { ArrowUp, BookOpen, Map, Quote, RotateCcw, ShieldX, Tent } from "lucide-react";
import { useTranslations } from "next-intl";
import { celebAvatarSmallUrl } from "@feelandnote/shared/constants/celeb-avatar-small";
import { pop, rise, stagger, useCalm } from "../../shared/motion";
import { BTN_GOLD, BTN_STONE, EYEBROW, SHINE } from "../../shared/ui";
import type { BattleState } from "../engine";
import { lineScene } from "../campaign/lineScene";
import type { ChapterStory } from "../story/types";
import type { PickLine } from "./useFigureLines";
import type { Names } from "./useNames";

interface Props {
  no: number;
  story: ChapterStory;
  start: BattleState;
  final: BattleState;
  altRoad: boolean;
  // 출진하지 않은 영웅 수와 그들이 받은 경험(없으면 null)
  bench: { count: number; amount: number } | null;
  names: Names;
  pickLine: PickLine;
  // 이 판을 적은 뒤의 원정 표지(이야기에서 죽은 인물 dead:*)
  flags: string[];
  onNext: () => void;
  onRetry: () => void;
  onChapters: () => void;
}

export default function ResultScreen({ no, story, start, final, altRoad, bench, names, pickLine, flags, onNext, onRetry, onChapters }: Props) {
  const t = useTranslations("gameMythTroy");
  const calm = useCalm();
  const won = final.outcome === "victory";
  const heroes = start.units.filter((u) => u.side === "player" && u.figureSlug);
  const now = (id: string) => final.units.find((u) => u.id === id) ?? final.removed.find((u) => u.id === id);
  // 진 까닭: 지켜야 할 장수가 쓰러졌으면 그 이름, 아니면 모두 쓰러짐·배가 탐·차례가 다 감 가운데 맞는 것, 그래도 없으면 이 장의 지는 조건 글
  const lostLord = won ? null : final.loss.flatMap((r) => (r.kind === "unitFalls" ? r.unitIds : [])).map(now).find((u) => u && final.fallen.includes(u.id)) ?? null;
  const limit = final.loss.flatMap((r) => (r.kind === "turnLimit" ? [r.turns] : []))[0];
  const shipsAt = final.rules.flatMap((r) => (r.kind === "burnShips" ? [r.lossAt] : []))[0];
  const why = !final.units.some((u) => u.side === "player") ? t("result.allFell")
    : shipsAt && final.burned.length >= shipsAt ? t("result.shipsBurned", { count: final.burned.length })
      : limit && final.turn >= limit ? t("result.timeUp") : story.loss;
  // 이긴 판의 한마디 — 경험을 가장 많이 얻고 판에 남은 영웅의 DB 고유 대사. 이 장에서 있었던 일·이야기에서 죽은 인물에 맞는 줄만 쓴다
  const standing = heroes.filter((h) => !final.fallen.includes(h.id) && h.figureSlug);
  const scene = lineScene(final.chapterId, flags, true, { allies: standing.map((h) => h.figureSlug ?? ""), comradeFell: final.fallen.length > 0 });
  const quote = won
    ? [...standing]
      .sort((a, b) => (final.expGained[b.id] ?? 0) - (final.expGained[a.id] ?? 0))
      .map((h) => ({ slug: h.figureSlug ?? "", text: pickLine(h.figureSlug ?? "", "battle_win", { scene, seed: final.turn * 31 + no }) }))
      .find((q) => q.text) ?? null
    : null;
  return (
    <div className="absolute inset-0 overflow-y-auto overscroll-contain bg-bg-main">
      <motion.div variants={stagger(calm, 0.06, 0.1)} initial="hidden" animate="show" className="mx-auto flex w-full max-w-3xl flex-col items-center px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-10 text-center sm:px-8">
        <motion.p variants={rise(calm)} className={EYEBROW}>{t("chapters.chapterNo", { no })} · {story.title}</motion.p>
        <motion.h1 variants={pop(calm)} className={`mt-2 text-6xl font-black sm:text-7xl ${won ? "text-accent" : "text-status-paused"}`}>{won ? t("result.victory") : t("result.defeat")}</motion.h1>
        <motion.p variants={rise(calm)} className="mt-2 text-base text-text-secondary">{won ? t("result.turns", { turns: final.turn }) : t("result.defeatAt", { turns: final.turn })}</motion.p>
        {!won && (
          <motion.div variants={rise(calm)} className="mt-6 w-full max-w-xl rounded-2xl border border-status-paused bg-bg-card p-4 text-start">
            <p className="flex items-center gap-2 text-sm font-bold text-status-paused"><ShieldX className="h-4 w-4" aria-hidden />{lostLord ? t("result.lostLord") : t("result.lostWhy")}</p>
            <p className="mt-1 break-keep text-base font-semibold text-text-primary">{lostLord ? names.unitName(lostLord) : why}</p>
            <p className="mt-3 break-keep text-sm text-text-secondary">{t("result.noExp")}</p>
          </motion.div>
        )}
        {quote?.text && (
          <motion.p variants={rise(calm)} className="mt-5 flex max-w-xl items-start gap-2 rounded-2xl border border-border-gold bg-bg-card px-4 py-3 text-start text-sm leading-relaxed text-text-primary sm:text-base">
            <Quote className="mt-1 h-4 w-4 shrink-0 text-accent" aria-hidden />
            <span className="break-keep"><span className="font-bold text-accent">{names.figureName(quote.slug)}</span> {quote.text}</span>
          </motion.p>
        )}
        {won && altRoad && <motion.p variants={rise(calm)} className="mt-3 rounded-full border border-status-completed px-4 py-1.5 text-sm font-bold text-status-completed">{t("result.altRoad")}</motion.p>}
        {won && <motion.ul variants={rise(calm)} className="mt-8 grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
          {heroes.map((hero) => {
            const after = now(hero.id) ?? hero;
            const figure = hero.figureSlug ? names.figure(hero.figureSlug) : null;
            const avatar = celebAvatarSmallUrl(figure?.avatarUrl) ?? figure?.avatarUrl ?? null;
            const gained = final.expGained[hero.id] ?? 0;
            const up = after.level - hero.level;
            const fell = final.fallen.includes(hero.id);
            return (
              <li key={hero.id} className="flex items-center gap-3 rounded-xl border border-border bg-bg-card p-3 text-start">
                <span className="h-12 w-12 shrink-0 overflow-hidden rounded-full border border-border bg-bg-stone-light">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {avatar && <img src={avatar} alt="" className={`h-full w-full object-cover ${fell ? "grayscale brightness-50" : ""}`} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base font-bold text-text-primary">{names.unitName(hero)}</span>
                  <span className="block text-sm text-text-secondary">{t("unit.level", { level: after.level })} · {t("banner.exp", { amount: gained })}</span>
                  {fell && <span className="block text-sm text-text-tertiary">{t("result.fallen")}</span>}
                </span>
                {up > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2.5 py-1 text-sm font-bold text-accent"><ArrowUp className="h-4 w-4" aria-hidden />{up}</span>}
              </li>
            );
          })}
        </motion.ul>}
        {won && bench && (
          <motion.p variants={rise(calm)} className="mt-3 inline-flex items-center gap-2 text-sm text-text-secondary">
            <Tent className="h-4 w-4 text-accent" aria-hidden />{t("result.bench", bench)}
          </motion.p>
        )}
        {/* 휴대폰은 영웅 목록이 길어 단추가 화면 밖으로 밀린다 — 아래에 붙여 둔다 */}
        <motion.div variants={rise(calm)} className="sticky bottom-0 mt-8 flex w-full flex-col gap-2 bg-bg-main pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:static sm:w-auto sm:flex-row sm:bg-transparent sm:p-0">
          {won && <button type="button" onClick={onNext} className={BTN_GOLD}><span className={SHINE} aria-hidden /><BookOpen className="h-5 w-5" aria-hidden />{t("result.story")}</button>}
          {!won && <button type="button" onClick={onRetry} className={BTN_GOLD}><span className={SHINE} aria-hidden /><RotateCcw className="h-5 w-5" aria-hidden />{t("result.retry")}</button>}
          <button type="button" onClick={onChapters} className={BTN_STONE}><Map className="h-5 w-5" aria-hidden />{t("result.chapters")}</button>
        </motion.div>
      </motion.div>
    </div>
  );
}
