/*
  파일명: components/features/game/myth/troy/ui/PrepScreen.tsx
  기능: 트로이 전쟁 출진 준비
  책임: 장의 싸움판을 뒤에 깔고(출진 칸은 금빛, 고른 영웅이 그 칸에 선 모습 그대로), 이기는·지는 조건과 나갈 영웅 고르기를 보인다.
        고른 영웅 사이의 인연·맞수(DB 관계)를 함께 알려 준다. 반드시 나가는 영웅은 뺄 수 없다. 난이도도 여기서 고른다.
*/ // ------------------------------
"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, BookOpen, Link2, Quote, Swords } from "lucide-react";
import { useTranslations } from "next-intl";
import { BTN_GOLD, BTN_STONE, EYEBROW, SHINE } from "../../shared/ui";
import type { ChapterEntry } from "../campaign";
import { lineScene } from "../campaign/lineScene";
import { pickable, rosterFor } from "../campaign/progress";
import type { CampaignSave, Difficulty, TroyRelation } from "../model";
import type { ChapterStory } from "../story/types";
import { sceneUnits } from "./battle/sceneUnits";
import DifficultyPicker from "./DifficultyPicker";
import { bondsFrom, newBattle } from "./flow";
import HeroPickCard from "./HeroPickCard";
import SceneBackdrop from "./SceneBackdrop";
import type { PickLine } from "./useFigureLines";
import type { Names } from "./useNames";

interface Props {
  entry: ChapterEntry;
  story: ChapterStory;
  save: CampaignSave;
  relations: TroyRelation[];
  names: Names;
  medals: Record<string, string>;
  pickLine: PickLine;
  onStart: (deployed: string[]) => void;
  onDifficulty: (difficulty: Difficulty) => void;
  onStory: () => void;
  onBack: () => void;
}

export default function PrepScreen({ entry, story, save, relations, names, medals, pickLine, onStart, onDifficulty, onStory, onBack }: Props) {
  const t = useTranslations("gameMythTroy");
  const roster = useMemo(() => rosterFor(entry, save), [entry, save]);
  const options = useMemo(() => pickable(entry, save), [entry, save]);
  const forced = entry.battle.forced.filter((slug) => options.includes(slug));
  const max = Math.min(entry.battle.maxDeploy, entry.battle.deploy.length);
  const [picked, setPicked] = useState<string[]>(() => [...forced, ...options.filter((s) => !forced.includes(s))].slice(0, max));
  const preview = useMemo(() => newBattle(entry, save, picked, relations), [entry, save, picked, relations]);
  const units = useMemo(() => sceneUnits(preview, names.unitName, medals), [preview, names, medals]);
  const links = useMemo(() => bondsFrom(relations).filter((b) => picked.includes(b.a) && picked.includes(b.b)), [relations, picked]);
  // 부름에 답하는 한마디(DB 고유 대사). 처음에는 앞장서는 영웅이, 고를 때마다 고른 영웅이 답한다
  const [called, setCalled] = useState<{ slug: string; text: string } | null>(null);
  const lead = forced[0] ?? picked[0] ?? null;
  const callScene = lineScene(entry.id, save.flags, false, { allies: picked });
  const leadText = lead ? pickLine(lead, "roll_call", { scene: callScene, seed: entry.no }) : null;
  const callout = called ?? (lead && leadText ? { slug: lead, text: leadText } : null);
  const toggle = (slug: string) => {
    if (forced.includes(slug)) return;
    const adding = !picked.includes(slug) && picked.length < max;
    setPicked((list) => (list.includes(slug) ? list.filter((s) => s !== slug) : list.length >= max ? list : [...list, slug]));
    const text = adding ? pickLine(slug, "roll_call", { scene: lineScene(entry.id, save.flags, false, { allies: [...picked, slug] }) }) : null;
    setCalled(text ? { slug, text } : null);
  };
  return (
    <div className="relative h-full w-full">
      <SceneBackdrop map={entry.battle.map} units={units} deploy={entry.battle.deploy} orbit={false} dim="none" portraitZoom={1}
        className="absolute inset-x-0 top-0 h-[42dvh] sm:inset-y-0 sm:end-[26rem] sm:h-auto" />
      <div className="absolute inset-x-0 bottom-0 top-[40dvh] overflow-y-auto overscroll-contain rounded-t-3xl border-t border-border-gold bg-bg-main px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:inset-y-0 sm:end-0 sm:start-auto sm:top-0 sm:w-[26rem] sm:rounded-none sm:border-s sm:border-t-0 sm:px-6 sm:pt-6">
        <button type="button" onClick={onBack} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border bg-bg-card px-3 text-sm font-semibold text-text-secondary hover:border-accent hover:text-accent">
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />{t("chapters.heading")}
        </button>
        <p className={`${EYEBROW} mt-4`}>{t("chapters.chapterNo", { no: entry.no })} · {t("prep.heading")}</p>
        <h1 className="mt-1 text-3xl font-black text-text-primary">{story.title}</h1>
        <dl className="mt-3 grid gap-2 rounded-xl border border-border bg-bg-card p-3">
          <div><dt className="text-sm font-bold text-accent">{t("prep.objective")}</dt><dd className="break-keep text-sm text-text-primary">{story.objective}</dd></div>
          <div><dt className="text-sm font-bold text-status-paused">{t("prep.loss")}</dt><dd className="break-keep text-sm text-text-primary">{story.loss}</dd></div>
        </dl>
        <DifficultyPicker value={save.difficulty} onChange={onDifficulty} />
        <div className="mt-4 flex items-baseline justify-between">
          <p className="text-sm font-bold text-text-primary">{t("prep.pick")}</p>
          <p className="text-sm tabular-nums text-text-secondary">{t("prep.count", { count: picked.length, max })}</p>
        </div>
        <ul className="mt-2 grid grid-cols-2 gap-2">
          {roster.filter((hero) => options.includes(hero.slug)).map((hero) => (
            <li key={hero.slug}>
              <HeroPickCard hero={hero} names={names} on={picked.includes(hero.slug)} forced={forced.includes(hero.slug)} full={picked.length >= max} onToggle={() => toggle(hero.slug)} />
            </li>
          ))}
        </ul>
        {callout && (
          <p className="mt-3 flex items-start gap-2 rounded-xl border border-accent-dim bg-bg-card p-3 text-sm leading-relaxed text-text-primary">
            <Quote className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
            <span className="break-keep"><span className="font-bold text-accent">{names.figureName(callout.slug)}</span> {callout.text}</span>
          </p>
        )}
        {links.length > 0 && (
          <ul className="mt-3 flex flex-col gap-1.5">
            {links.map((b) => (
              <li key={`${b.a}-${b.b}-${b.type}`} className="flex items-center gap-2 text-sm text-text-secondary">
                {b.kind === "rival" ? <Swords className="h-4 w-4 text-status-paused" aria-hidden /> : <Link2 className="h-4 w-4 text-accent" aria-hidden />}
                <span className="font-semibold text-text-primary">{names.figureName(b.a)} · {names.figureName(b.b)}</span>
                <span>{b.kind === "rival" ? t("prep.rivals") : t("prep.bonds")}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="sticky -bottom-[max(1rem,env(safe-area-inset-bottom))] mt-4 flex gap-2 bg-bg-main pb-[max(1rem,env(safe-area-inset-bottom))] pt-2">
          <button type="button" onClick={onStory} className={`${BTN_STONE} px-4`} aria-label={t("prep.story")}>
            <BookOpen className="h-5 w-5" aria-hidden />
          </button>
          <button type="button" onClick={() => onStart(picked)} disabled={picked.length === 0} className={`${BTN_GOLD} flex-1`}>
            <span className={SHINE} aria-hidden />{t("prep.start")}
          </button>
        </div>
      </div>
    </div>
  );
}
