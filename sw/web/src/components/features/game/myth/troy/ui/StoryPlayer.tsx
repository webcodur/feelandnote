/*
  파일명: components/features/game/myth/troy/ui/StoryPlayer.tsx
  기능: 트로이 전쟁 이야기 장면 재생
  책임: 장면의 줄을 한 줄씩 보여 준다. 말하는 인물은 대표 사진을 크게 세우고, 서술은 가운데 넓은 판에 적는다.
        누르거나 Enter·Space·→로 넘기고, 건너뛰기로 끝까지 넘긴다. 싸움판 위에 겹칠 때(overlay)는 아래쪽만 덮는다.
*/ // ------------------------------
"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, SkipForward } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCalm } from "../../shared/motion";
import type { StoryLine, StoryScene } from "../story/types";
import type { Names } from "./useNames";

interface Props {
  scene: StoryScene;
  names: Names;
  onDone: () => void;
  overlay?: boolean;
  doneLabel?: string;
}

const TONE_RING: Record<NonNullable<StoryLine["tone"]> | "none", string> = {
  calm: "border-accent-dim", fierce: "border-status-paused", grief: "border-text-tertiary", awe: "border-accent", cunning: "border-status-completed", none: "border-accent-dim",
};

function Portrait({ line, names, calm }: { line: StoryLine; names: Names; calm: boolean }) {
  const figure = line.speaker ? names.figure(line.speaker) : null;
  const src = figure?.portraitUrl ?? figure?.avatarUrl ?? null;
  if (!line.speaker) return null;
  return (
    <motion.div
      key={line.speaker}
      initial={calm ? { opacity: 0 } : { opacity: 0, x: -24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: calm ? 0.15 : 0.45 }}
      className={`pointer-events-none relative h-[34dvh] w-[27dvh] shrink-0 overflow-hidden rounded-2xl border-2 bg-bg-card shadow-[0_24px_60px_-18px_var(--color-bg-main)] sm:h-[46dvh] sm:w-[37dvh] ${TONE_RING[line.tone ?? "none"]}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {src && <img src={src} alt="" decoding="async" className="h-full w-full object-cover object-top" />}
      {!src && (
        <div className="flex h-full w-full items-center justify-center bg-bg-stone-light text-6xl font-black text-accent">{[...(names.speakerName(line.speaker) ?? "?")][0]}</div>
      )}
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-linear-to-t from-bg-main to-transparent" />
    </motion.div>
  );
}

export default function StoryPlayer({ scene, names, onDone, overlay = false, doneLabel }: Props) {
  const t = useTranslations("gameMythTroy.story");
  const calm = useCalm();
  const [index, setIndex] = useState(0);
  const line = scene.lines[index];
  const last = index >= scene.lines.length - 1;
  const next = useCallback(() => (last ? onDone() : setIndex((i) => i + 1)), [last, onDone]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (["Enter", " ", "ArrowRight"].includes(event.key)) {
        event.preventDefault();
        next();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next]);

  if (!line) return null;
  const speaker = names.speakerName(line.speaker);
  const shell = overlay
    ? "absolute inset-x-0 bottom-0 top-auto flex flex-col justify-end bg-linear-to-t from-bg-main via-bg-main/80 to-transparent px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-24 sm:px-8"
    : "absolute inset-0 flex flex-col justify-end bg-linear-to-t from-bg-main via-bg-main/55 to-bg-main/10 px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-16 sm:px-10";
  return (
    <div className={shell} style={{ zIndex: 40 }} onClick={next} role="dialog" aria-label={t("narrator")}>
      <button
        type="button"
        onClick={(event) => { event.stopPropagation(); onDone(); }}
        className="absolute end-3 top-3 inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border bg-bg-main/80 px-4 text-sm font-semibold text-text-secondary hover:border-accent hover:text-accent"
      >
        <SkipForward className="h-4 w-4" aria-hidden />
        {t("skip")}
      </button>
      <div className="mx-auto flex w-full max-w-5xl flex-col items-start gap-4 sm:flex-row sm:items-end">
        <AnimatePresence mode="popLayout">{line.speaker && <Portrait line={line} names={names} calm={calm} />}</AnimatePresence>
        <motion.div
          key={index}
          initial={calm ? { opacity: 0 } : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: calm ? 0.12 : 0.3 }}
          className={`w-full rounded-2xl border border-border-gold bg-bg-main/92 p-5 shadow-[0_20px_60px_-20px_var(--color-bg-main)] sm:p-6 ${line.speaker ? "" : "sm:mx-auto sm:max-w-3xl sm:text-center"}`}
        >
          {speaker && <p className="mb-2 text-sm font-bold tracking-[0.18em] text-accent">{speaker}</p>}
          <p className={`break-keep text-text-primary ${line.speaker ? "text-base leading-relaxed sm:text-lg" : "text-base leading-loose text-text-secondary sm:text-lg"}`}>{line.text}</p>
          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="text-sm tabular-nums text-text-tertiary">{index + 1} / {scene.lines.length}</span>
            <button
              type="button"
              onClick={(event) => { event.stopPropagation(); next(); }}
              className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-accent-hover/40 bg-accent px-5 text-sm font-bold text-bg-main hover:bg-accent-hover"
            >
              {last ? doneLabel ?? t("done") : t("next")}
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
