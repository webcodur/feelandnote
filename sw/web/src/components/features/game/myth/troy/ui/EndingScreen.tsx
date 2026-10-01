/*
  파일명: components/features/game/myth/troy/ui/EndingScreen.tsx
  기능: 트로이 전쟁 원정 끝
  책임: 마지막 장을 넘긴 뒤 원정을 맺고, 호메로스와 다른 길로 간 횟수와 이야기의 출전을 보이며, 오디세우스의 귀향으로 잇는다.
*/ // ------------------------------
"use client";

import { motion } from "framer-motion";
import { Home, ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { rise, stagger, useCalm } from "../../shared/motion";
import { BTN_GOLD, BTN_STONE, EYEBROW, SHINE } from "../../shared/ui";
import { CHAPTERS } from "../campaign";
import type { StoryLocale } from "../story/types";
import SceneBackdrop from "./SceneBackdrop";

interface Props {
  locale: StoryLocale;
  altCount: number;
  onTitle: () => void;
}

export default function EndingScreen({ locale, altCount, onTitle }: Props) {
  const t = useTranslations("gameMythTroy.ending");
  const calm = useCalm();
  const last = CHAPTERS[CHAPTERS.length - 1];
  return (
    <div className="relative h-full w-full">
      <SceneBackdrop map={last.battle.map} dim="heavy" />
      <motion.div variants={stagger(calm, 0.1, 0.2)} initial="hidden" animate="show"
        className="absolute inset-0 mx-auto flex w-full max-w-3xl flex-col items-center justify-center gap-4 overflow-y-auto px-5 py-10 text-center">
        <motion.p variants={rise(calm)} className={EYEBROW}>{t("eyebrow")}</motion.p>
        <motion.h1 variants={rise(calm, 28)} className="text-5xl font-black text-text-primary sm:text-7xl">{t("heading")}</motion.h1>
        <motion.p variants={rise(calm)} className="max-w-xl break-keep text-base leading-relaxed text-text-primary sm:text-lg">{t("body")}</motion.p>
        {altCount > 0 && <motion.p variants={rise(calm)} className="rounded-full border border-status-completed px-4 py-1.5 text-sm font-bold text-status-completed">{t("altCount", { count: altCount })}</motion.p>}
        <motion.div variants={rise(calm)} className="mt-4 flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Link href="/rest" className={BTN_GOLD}><span className={SHINE} aria-hidden /><ArrowLeft className="h-5 w-5" aria-hidden />{t("again")}</Link>
          <button type="button" onClick={onTitle} className={BTN_STONE}><Home className="h-5 w-5" aria-hidden />{t("again")}</button>
        </motion.div>
        <motion.div variants={rise(calm)} className="mt-6 w-full rounded-2xl border border-border bg-bg-card/90 p-4 text-start">
          <p className="text-sm font-bold text-accent">{t("sources")}</p>
          <ul className="mt-2 flex flex-col gap-1">
            {CHAPTERS.map((c) => <li key={c.id} className="text-sm text-text-secondary"><span className="font-semibold text-text-primary">{c.story[locale].title}</span> — {c.story[locale].source}</li>)}
          </ul>
        </motion.div>
      </motion.div>
    </div>
  );
}
