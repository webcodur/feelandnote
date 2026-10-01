/*
  파일명: components/features/game/myth/troy/ui/TitleScreen.tsx
  기능: 트로이 전쟁 첫 화면
  책임: 1장 해변 디오라마를 천천히 돌려 깔고, 제목과 이어 하기·새로 시작·장 고르기·싸우는 법을 둔다.
        기록이 있을 때 새로 시작을 누르면 한 번 더 묻는다.
*/ // ------------------------------
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, BookOpen, Map, Play, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { rise, stagger, useCalm } from "../../shared/motion";
import { BTN_GOLD, BTN_STONE, EYEBROW, SHINE } from "../../shared/ui";
import type { BattleMap } from "../engine";
import type { SceneUnit } from "../scene/BoardView";
import HelpSheet from "./HelpSheet";
import SceneBackdrop from "./SceneBackdrop";

interface Props {
  map: BattleMap;
  units: SceneUnit[];
  continueLabel: string | null;
  progress: string;
  hasRecord: boolean;
  isFixture: boolean;
  onContinue: () => void;
  onNew: () => void;
  onChapters: () => void;
  onExit?: () => void;
}

export default function TitleScreen({ map, units, continueLabel, progress, hasRecord, isFixture, onContinue, onNew, onChapters, onExit }: Props) {
  const t = useTranslations("gameMythTroy");
  const calm = useCalm();
  const [asking, setAsking] = useState(false);
  const [help, setHelp] = useState(false);
  return (
    <div className="relative h-full w-full">
      <SceneBackdrop map={map} units={units} />
      <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3 sm:p-5">
        {onExit ? (
          <button
            type="button"
            onClick={onExit}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border bg-bg-main/80 px-4 text-sm font-semibold text-text-secondary hover:border-accent hover:text-accent cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />{t("frame.hub")}
          </button>
        ) : (
          <Link href="/rest" className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border bg-bg-main/80 px-4 text-sm font-semibold text-text-secondary hover:border-accent hover:text-accent">
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />{t("frame.hub")}
          </Link>
        )}
        <button type="button" onClick={() => setHelp(true)} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border bg-bg-main/80 px-4 text-sm font-semibold text-text-secondary hover:border-accent hover:text-accent">
          <BookOpen className="h-4 w-4" aria-hidden />{t("help.heading")}
        </button>
      </div>
      <motion.div variants={stagger(calm, 0.09, 0.15)} initial="hidden" animate="show"
        className="absolute inset-x-0 bottom-0 mx-auto flex w-full max-w-5xl flex-col items-start gap-4 px-5 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-10 sm:pb-14">
        <motion.p variants={rise(calm)} className={EYEBROW}>{t("titleScreen.eyebrow")}</motion.p>
        <motion.h1 variants={rise(calm, 28)} className="break-keep text-6xl font-black leading-none tracking-tight text-text-primary drop-shadow-[0_6px_30px_var(--color-bg-main)] sm:text-8xl">{t("title")}</motion.h1>
        <motion.p variants={rise(calm)} className="max-w-xl break-keep text-base leading-relaxed text-text-primary drop-shadow-[0_2px_10px_var(--color-bg-main)] sm:text-lg">{t("titleScreen.tagline")}</motion.p>
        {isFixture && <motion.p variants={rise(calm)} className="rounded-lg border border-accent-dim bg-bg-card/90 px-3 py-2 text-sm text-accent">{t("frame.fixture")}</motion.p>}
        <motion.div variants={rise(calm)} className="mt-2 flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row sm:flex-wrap">
          {continueLabel && (
            <button type="button" onClick={onContinue} className={BTN_GOLD}>
              <span className={SHINE} aria-hidden />
              <Play className="h-5 w-5" aria-hidden />
              <span className="flex flex-col items-start leading-tight">
                <span>{t("titleScreen.continue")}</span>
                <span className="text-sm font-semibold">{continueLabel}</span>
              </span>
            </button>
          )}
          <button type="button" onClick={() => (hasRecord ? setAsking(true) : onNew())} className={continueLabel ? BTN_STONE : BTN_GOLD}>
            {!continueLabel && <span className={SHINE} aria-hidden />}
            <RotateCcw className="h-5 w-5" aria-hidden />{t("titleScreen.newGame")}
          </button>
          <button type="button" onClick={onChapters} className={BTN_STONE}>
            <Map className="h-5 w-5" aria-hidden />{t("titleScreen.chapters")}
          </button>
        </motion.div>
        <motion.p variants={rise(calm)} className="text-sm text-text-secondary">{progress}</motion.p>
      </motion.div>
      {asking && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-bg-main/80 p-4" role="alertdialog" aria-label={t("titleScreen.confirmNew")}>
          <div className="w-full max-w-sm rounded-2xl border border-border-gold bg-bg-card p-5">
            <p className="break-keep text-base text-text-primary">{t("titleScreen.confirmNew")}</p>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => setAsking(false)} className={`${BTN_STONE} flex-1 px-3`}>{t("titleScreen.confirmNo")}</button>
              <button type="button" onClick={() => { setAsking(false); onNew(); }} className={`${BTN_GOLD} flex-1 px-3`}>{t("titleScreen.confirmYes")}</button>
            </div>
          </div>
        </div>
      )}
      {help && <HelpSheet onClose={() => setHelp(false)} />}
    </div>
  );
}
