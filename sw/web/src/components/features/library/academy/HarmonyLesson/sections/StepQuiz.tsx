"use client";

import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";
import type { QuizQuestion } from "@/constants/libraryMuseum";

export function StepQuizQuestion({
  question,
  questionIndex,
  selected,
  revealed,
  onSelect,
  onReveal,
  onRetry,
}: {
  question: QuizQuestion;
  questionIndex: number;
  selected: number | undefined;
  revealed: boolean;
  onSelect: (choiceIndex: number) => void;
  onReveal: () => void;
  onRetry: () => void;
}) {
  const t = useTranslations("library.academy.quiz");
  const isCorrect = selected === question.answerIndex;

  return (
    <div className="mt-5 border-t border-white/[0.06] pt-4">
      <div className="mb-3 flex items-center gap-2">
        <CheckCircle2 className="h-3.5 w-3.5 text-[#d4af37]/60" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#d4af37]/60">
          {t("title")} Q{questionIndex + 1}
        </span>
        {revealed && (
          <span className={`ml-auto text-[10px] font-medium ${isCorrect ? "text-emerald-400/70" : "text-rose-400/70"}`}>
            {isCorrect ? t("correct") : t("incorrect")}
          </span>
        )}
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        <p className="mb-3 text-[15px] font-medium leading-relaxed text-white/90 sm:text-base">
          {question.question}
        </p>

        <div className="flex flex-col gap-1.5">
          {question.choices.map((choice, cIndex) => {
            let style = "border-white/[0.06] bg-white/[0.02] text-white/65 hover:border-white/15 hover:text-white/80";

            if (selected === cIndex && !revealed) {
              style = "border-[#d4af37]/30 bg-[#d4af37]/10 text-[#d4af37]/90";
            }

            if (revealed) {
              if (cIndex === question.answerIndex) {
                style = "border-emerald-400/30 bg-emerald-500/10 text-emerald-300";
              } else if (cIndex === selected) {
                style = "border-rose-400/30 bg-rose-500/10 text-rose-300";
              } else {
                style = "border-white/[0.04] bg-white/[0.01] text-white/30";
              }
            }

            return (
              <button
                key={cIndex}
                type="button"
                disabled={revealed}
                onClick={() => onSelect(cIndex)}
                className={`flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left text-[14px] transition-all sm:text-[15px] ${style} ${revealed ? "cursor-default" : "cursor-pointer"}`}
              >
                <span className="mt-px flex-shrink-0 font-mono text-[11px] opacity-60">
                  {String.fromCharCode(65 + cIndex)}.
                </span>
                <span className="leading-relaxed">{choice}</span>
              </button>
            );
          })}
        </div>

        {selected !== undefined && !revealed && (
          <button
            type="button"
            onClick={onReveal}
            className="mt-3 rounded-full border border-[#d4af37]/20 bg-[#d4af37]/10 px-3 py-1.5 text-[11px] font-medium text-[#d4af37]/80 transition-colors hover:text-[#d4af37]"
          >
            {t("checkAnswer")}
          </button>
        )}

        {revealed && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mt-3 rounded-lg border px-3 py-2.5 text-[14px] leading-relaxed sm:text-[15px] ${
              isCorrect
                ? "border-emerald-400/20 bg-emerald-500/5 text-emerald-200/80"
                : "border-rose-400/20 bg-rose-500/5 text-rose-200/80"
            }`}
          >
            <span className="font-medium">{isCorrect ? t("correct") : t("incorrect")}</span>
            {" — "}
            {question.explanation}
            {!isCorrect && (
              <button
                type="button"
                onClick={onRetry}
                className="mt-2 block rounded-full border border-rose-400/20 bg-rose-500/10 px-3 py-1.5 text-[11px] font-medium text-rose-300/90 transition-colors hover:bg-rose-500/20 hover:text-rose-200"
              >
                {t("retry")}
              </button>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}

/** 퀴즈 문제를 스텝에 분배한다. stepIndex가 있으면 사용, 없으면 균등 분배. */
export function distributeQuiz(quiz: QuizQuestion[], stepCount: number): Record<number, { question: QuizQuestion; globalIndex: number }[]> {
  const map: Record<number, { question: QuizQuestion; globalIndex: number }[]> = {};
  if (!quiz || quiz.length === 0 || stepCount === 0) return map;

  for (let i = 0; i < quiz.length; i++) {
    const q = quiz[i];
    const stepIdx = q.stepIndex != null
      ? Math.min(q.stepIndex, stepCount - 1)
      : Math.min(Math.floor(((i + 1) * stepCount) / quiz.length) - 1, stepCount - 1);
    if (!map[stepIdx]) map[stepIdx] = [];
    map[stepIdx].push({ question: q, globalIndex: i });
  }
  return map;
}
