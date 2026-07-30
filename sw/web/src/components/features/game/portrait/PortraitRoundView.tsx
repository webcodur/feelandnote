"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { Check, LoaderCircle, X } from "lucide-react";
import { useTranslations } from "next-intl";
import styles from "./PortraitGame.module.css";
import {
  PORTRAIT_REVEAL_POINTS,
  type PortraitAnswerState,
  type PortraitImageStatus,
  type PortraitRound,
} from "./types";

interface Props {
  round: PortraitRound;
  roundIndex: number;
  totalRounds: number;
  revealStep: number;
  imageStatus: PortraitImageStatus;
  answer: PortraitAnswerState | null;
  score: number;
  streak: number;
  onImageLoad: () => void;
  onImageError: () => void;
  onAnswer: (selectedId: string | null) => void;
  onNext: () => void;
}

const REVEAL_STYLES = [
  { filter: "blur(26px) grayscale(1) brightness(.48) contrast(.8)", transform: "scale(1.18)" },
  { filter: "blur(16px) grayscale(.9) brightness(.58) contrast(.88)", transform: "scale(1.13)" },
  { filter: "blur(8px) grayscale(.65) brightness(.72) contrast(.94)", transform: "scale(1.08)" },
  { filter: "blur(2px) grayscale(.2) brightness(.9) contrast(1)", transform: "scale(1.02)" },
] as const;

export default function PortraitRoundView({
  round,
  roundIndex,
  totalRounds,
  revealStep,
  imageStatus,
  answer,
  score,
  streak,
  onImageLoad,
  onImageError,
  onAnswer,
  onNext,
}: Props) {
  const t = useTranslations("rest.arena.portrait");
  const nextButtonRef = useRef<HTMLButtonElement>(null);
  const isAnswered = answer !== null;
  const isReady = imageStatus === "ready";
  const possiblePoints = PORTRAIT_REVEAL_POINTS[revealStep];
  const imageStyle = isAnswered && answer.kind !== "skipped"
    ? { filter: "blur(0) grayscale(0) brightness(1) contrast(1)", transform: "scale(1)" }
    : REVEAL_STYLES[revealStep];

  useEffect(() => {
    if (answer) nextButtonRef.current?.focus();
  }, [answer]);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col py-1 sm:justify-center sm:py-4">
      <p className="sr-only" aria-live="polite">
        {t("roundStatus", {
          current: roundIndex + 1,
          total: totalRounds,
          points: possiblePoints.toLocaleString(),
        })}
      </p>

      <div className="mb-2 flex items-center justify-between gap-3 text-[11px] sm:mb-3 sm:text-xs">
        <span className="font-serif font-bold text-text-primary">
          {t("round", { current: roundIndex + 1, total: totalRounds })}
        </span>
        <div className="flex items-center gap-3 text-text-secondary">
          <span>{t("score")} <strong className="text-accent">{score.toLocaleString()}</strong></span>
          <span>{t("streak")} <strong className="text-text-primary">{streak}</strong></span>
        </div>
      </div>

      <div className="mb-3 rounded-lg border border-white/10 bg-bg-main/65 px-3 py-2 sm:mb-4">
        <div className="mb-1.5 flex items-center justify-between gap-3">
          <p className="font-serif text-xs font-bold text-accent sm:text-sm">
            {isReady && !isAnswered
              ? t("possiblePoints", { points: possiblePoints.toLocaleString() })
              : imageStatus === "loading"
                ? t("loadingPortrait")
                : t("revealComplete")}
          </p>
          {isReady && !isAnswered && (
            <span className="text-[9px] text-text-secondary sm:text-[10px]">{t("threeSecondWindow")}</span>
          )}
        </div>
        <div
          className="grid grid-cols-4 gap-1.5"
          role="progressbar"
          aria-label={t("revealProgress")}
          aria-valuemin={1}
          aria-valuemax={PORTRAIT_REVEAL_POINTS.length}
          aria-valuenow={revealStep + 1}
        >
          {PORTRAIT_REVEAL_POINTS.map((points, index) => (
            <div key={points} className="space-y-1">
              <div className="relative h-1.5 overflow-hidden rounded-full bg-white/10">
                {index < revealStep && <span className="absolute inset-0 bg-white/15" />}
                {index === revealStep && (
                  <span
                    key={`${round.target.id}-${revealStep}-${imageStatus}`}
                    className={`absolute inset-0 bg-accent ${isReady && !isAnswered ? styles.countdownFill : ""}`}
                  />
                )}
              </div>
              <p className={`text-center text-[9px] ${index === revealStep && !isAnswered ? "font-bold text-accent" : "text-text-secondary/55"}`}>
                {points.toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid min-h-0 flex-1 items-center gap-3 md:grid-cols-[minmax(240px,0.82fr)_minmax(320px,1.18fr)] md:gap-8">
        <div className="mx-auto w-full max-w-[160px] sm:max-w-[230px] md:max-w-[290px]">
          <div className="relative aspect-[4/5] overflow-hidden rounded-xl border border-accent/30 bg-stone-heavy shadow-[0_24px_70px_-28px_rgba(0,0,0,1)] sm:rounded-2xl">
            <Image
              key={round.target.id}
              src={round.target.avatarUrl}
              alt={isAnswered && answer.kind !== "skipped" ? round.target.name : t("hiddenPortraitAlt")}
              fill
              priority
              sizes="(max-width: 640px) 160px, (max-width: 768px) 230px, 290px"
              className="object-cover transition-[filter,transform] duration-700 ease-out"
              style={imageStyle}
              onLoad={onImageLoad}
              onError={onImageError}
            />

            {imageStatus === "loading" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-bg-main/85 text-accent">
                <LoaderCircle className="h-6 w-6 animate-spin" aria-hidden />
                <span className="text-[10px] font-bold">{t("loadingPortrait")}</span>
              </div>
            )}

            {imageStatus === "error" && (
              <div className="absolute inset-0 flex items-center justify-center bg-bg-main/95 px-4 text-center text-xs leading-relaxed text-text-secondary">
                {t("imageError")}
              </div>
            )}

            {!isAnswered && isReady && (
              <>
                <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent_0,transparent_5px,rgba(212,175,55,0.035)_6px)]" aria-hidden />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-bg-main/95 to-transparent px-2 pb-2 pt-8 text-center sm:px-3 sm:pb-3 sm:pt-10">
                  <p className="text-[9px] font-bold tracking-[0.12em] text-accent/75 sm:text-[10px] sm:tracking-[0.15em]">
                    {t(`revealStages.${revealStep}`)}
                  </p>
                </div>
              </>
            )}

            {isAnswered && answer.kind !== "skipped" && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-bg-main via-bg-main/85 to-transparent px-2 pb-2 pt-8 text-center sm:px-3 sm:pb-4 sm:pt-12">
                <p className="font-serif text-base font-black text-text-primary sm:text-xl">{round.target.name}</p>
              </div>
            )}
          </div>
        </div>

        <div>
          <p className="mb-2 text-center font-serif text-sm font-bold text-text-primary sm:mb-3 sm:text-lg md:text-left">
            {isAnswered ? t("answerTitle") : t("question")}
          </p>

          <div className="grid grid-cols-2 gap-2">
            {round.choices.map((choice, index) => {
              const isTarget = choice.id === round.target.id;
              const isSelected = answer?.selectedId === choice.id;
              const isCorrectChoice = isAnswered && answer.kind !== "skipped" && isTarget;
              const isWrongChoice = isAnswered && answer.kind === "wrong" && isSelected;
              const stateClass = isAnswered
                ? isCorrectChoice
                  ? "border-emerald-400/80 bg-emerald-400/15 text-emerald-100"
                  : isWrongChoice
                    ? "border-red-400/80 bg-red-400/15 text-red-100"
                    : "border-white/8 bg-black/25 text-text-secondary opacity-50"
                : "border-white/15 bg-bg-main/75 text-text-primary hover:border-accent hover:bg-accent/10";

              return (
                <button
                  key={choice.id}
                  type="button"
                  disabled={isAnswered || !isReady}
                  aria-label={`${index + 1}. ${choice.name}${isCorrectChoice ? `, ${t("correctChoice")}` : isWrongChoice ? `, ${t("wrongChoice")}` : ""}`}
                  onClick={() => onAnswer(choice.id)}
                  className={`flex min-h-12 items-center gap-2 rounded-lg border px-2 py-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-default sm:min-h-14 sm:gap-3 sm:rounded-xl sm:px-4 sm:py-3 ${stateClass}`}
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-current/25 text-[9px] font-black sm:h-6 sm:w-6 sm:rounded-md sm:text-[10px]">
                    {isCorrectChoice ? <Check className="h-3.5 w-3.5" aria-hidden /> : isWrongChoice ? <X className="h-3.5 w-3.5" aria-hidden /> : index + 1}
                  </span>
                  <span className="min-w-0 font-serif text-xs font-bold leading-tight sm:text-base">{choice.name}</span>
                </button>
              );
            })}
          </div>

          {answer && (
            <div className="mt-3" aria-live="assertive">
              <div className={`rounded-lg border px-3 py-2 ${answer.kind === "correct" ? "border-emerald-400/30 bg-emerald-400/10" : answer.kind === "skipped" ? "border-white/15 bg-white/5" : "border-red-400/30 bg-red-400/10"}`}>
                <p className={`font-serif text-sm font-black sm:text-base ${answer.kind === "correct" ? "text-emerald-200" : answer.kind === "skipped" ? "text-text-primary" : "text-red-200"}`}>
                  {answer.kind === "correct"
                    ? `✓ ${t("correct", { points: answer.points.toLocaleString() })}`
                    : answer.kind === "timeout"
                      ? `✕ ${t("timeUp")}`
                      : answer.kind === "skipped"
                        ? t("imageSkipped")
                        : `✕ ${t("incorrect")}`}
                </p>
                {answer.kind !== "skipped" && (
                  <p className="mt-0.5 text-[11px] text-text-secondary sm:text-xs">
                    {t("answerIs", { name: round.target.name })}
                  </p>
                )}
              </div>
              <button
                ref={nextButtonRef}
                type="button"
                onClick={onNext}
                className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-accent/50 bg-accent/20 px-4 py-2.5 font-serif text-sm font-black text-accent hover:border-accent hover:bg-accent/30 active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:min-h-12"
              >
                {roundIndex === totalRounds - 1 ? t("finish") : t("next")}
                <kbd className="hidden rounded border border-accent/25 bg-black/20 px-1.5 py-0.5 font-sans text-[9px] font-normal text-accent/70 sm:inline">Enter</kbd>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
