"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Music, CheckCircle2, Loader2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { useTranslations } from "next-intl";
import type { LessonSection, SheetExample, QuizQuestion } from "@/constants/scripturesMuseum";
import type { AcademyLessonProgress } from "@/types/academy";
import { setAcademyLessonCompletion, touchAcademyLessonProgress } from "@/actions/scriptures/academyProgress";
import SheetMusic from "./SheetMusic";

function InlineMarkdown({ text }: { text: string }) {
  const parts = text.split(/(\*\*.*?\*\*|`[^`]+`)/g);

  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={index} className="font-semibold text-white">
              {part.slice(2, -2)}
            </strong>
          );
        }

        if (part.startsWith("`") && part.endsWith("`")) {
          return (
            <code
              key={index}
              className="rounded bg-[#d4af37]/10 px-1 py-0.5 font-mono text-[13px] text-[#d4af37]/80"
            >
              {part.slice(1, -1)}
            </code>
          );
        }

        return <span key={index}>{part}</span>;
      })}
    </>
  );
}

// #region 마크다운 렌더러
function renderMarkdown(markdown: string) {
  const paragraphs = markdown.split("\n\n");
  return paragraphs.map((paragraph, paragraphIndex) => {
    if (paragraph.startsWith("- ")) {
      const items = paragraph.split("\n").filter((line) => line.startsWith("- "));
      return (
        <ul key={paragraphIndex} className="space-y-1 pl-1">
          {items.map((item, itemIndex) => (
            <li
              key={itemIndex}
              className="flex items-start gap-2 text-[15px] leading-[1.8] text-white/85 sm:text-base"
            >
              <span className="mt-[6px] flex-shrink-0 text-[#d4af37]/40">*</span>
              <InlineMarkdown text={item.replace("- ", "")} />
            </li>
          ))}
        </ul>
      );
    }

    if (paragraph.includes("|") && paragraph.split("\n").every((line) => line.trim().startsWith("|"))) {
      const rows = paragraph.split("\n").filter((line) => line.trim());
      const parseRow = (row: string) => row.split("|").slice(1, -1).map((cell) => cell.trim());
      const header = parseRow(rows[0]);
      const body = rows.slice(2).map(parseRow);

      return (
        <div key={paragraphIndex} className="overflow-x-auto rounded-xl border border-white/[0.08] my-4">
          <table className="w-full text-[14px] sm:text-[15px]">
            <thead>
              <tr className="border-b border-white/[0.08] bg-white/[0.03]">
                {header.map((cell, cellIndex) => (
                  <th key={cellIndex} className="px-3 py-2 text-left font-semibold text-white/80 whitespace-nowrap">
                    <InlineMarkdown text={cell} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {body.map((row, rowIndex) => (
                <tr key={rowIndex} className="border-b border-white/[0.04] last:border-0">
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="px-3 py-2 text-white/75">
                      <InlineMarkdown text={cell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    return (
      <p
        key={paragraphIndex}
        className="text-[16px] leading-[1.85] text-white/90 sm:text-[17px] mb-4 last:mb-0"
      >
        <InlineMarkdown text={paragraph} />
      </p>
    );
  });
}
// #endregion

function SheetExampleCard({ example }: { example: SheetExample }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 sm:p-4">
      <div className="mb-2 flex items-center gap-2">
        <Music className="h-3.5 w-3.5 text-[#d4af37]/60" />
        <span className="text-xs font-medium text-white/80">{example.label}</span>
      </div>
      <SheetMusic abc={example.abc} playable={example.playable} />
      {example.caption && <p className="mt-2 text-[13px] leading-relaxed text-white/55">{example.caption}</p>}
    </div>
  );
}

// #region 퀴즈 컴포넌트 (단일 문제)
function StepQuizQuestion({
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
  const t = useTranslations("scriptures.academy.quiz");
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
function distributeQuiz(quiz: QuizQuestion[], stepCount: number): Record<number, { question: QuizQuestion; globalIndex: number }[]> {
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
// #endregion

// #region 네비게이터 공통
function ArrowNavigator({
  items,
  activeIndex,
  onChange,
  prefix,
  compact,
  className,
}: {
  items: string[];
  activeIndex: number;
  onChange: (index: number) => void;
  prefix?: string;
  /** compact=true → 레슨용 소형, false → 스텝용 강조 */
  compact?: boolean;
  className?: string;
}) {
  const isFirst = activeIndex === 0;
  const isLast = activeIndex === items.length - 1;

  const btnSize = compact ? "h-6 w-6" : "h-8 w-8";
  const iconSize = compact ? "h-3.5 w-3.5" : "h-4 w-4";
  const btnBase = `flex ${btnSize} items-center justify-center rounded-full transition-colors`;
  const btnEnabled = "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white";

  return (
    <div className={`flex items-center justify-center gap-2 ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => onChange(isFirst ? items.length - 1 : activeIndex - 1)}
        className={`${btnBase} ${btnEnabled}`}
        aria-label={isFirst ? "Last" : "Previous"}
      >
        {isFirst ? <ChevronsLeft className={iconSize} /> : <ChevronLeft className={iconSize} />}
      </button>

      <div className={`flex flex-col items-center ${compact ? "min-w-[140px] gap-0.5" : "min-w-[200px] gap-1"}`}>
        {prefix && (
          <span className={`font-semibold uppercase tracking-[0.16em] ${compact ? "text-[10px] text-white/30" : "text-[11px] text-white/45"}`}>
            {prefix} {activeIndex + 1}/{items.length}
          </span>
        )}
        <span className={`text-center leading-tight ${compact ? "text-xs font-semibold text-[#d4af37]/60" : "text-sm font-bold tracking-[0.05em] text-[#d4af37]/90 sm:text-base"}`}>
          {items[activeIndex]}
        </span>
      </div>

      <button
        type="button"
        onClick={() => onChange(isLast ? 0 : activeIndex + 1)}
        className={`${btnBase} ${btnEnabled}`}
        aria-label={isLast ? "First" : "Next"}
      >
        {isLast ? <ChevronsRight className={iconSize} /> : <ChevronRight className={iconSize} />}
      </button>
    </div>
  );
}
// #endregion

const DIFFICULTY_STYLES = {
  beginner: { bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-400/80" },
  intermediate: { bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-400/80" },
  advanced: { bg: "bg-rose-500/10", border: "border-rose-500/20", text: "text-rose-400/80" },
} as const;

function DifficultyBadge({ difficulty }: { difficulty: keyof typeof DIFFICULTY_STYLES }) {
  const t = useTranslations("scriptures.academy.lesson.difficulty");
  const style = DIFFICULTY_STYLES[difficulty];

  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${style.bg} ${style.border} ${style.text}`}>
      {t(difficulty)}
    </span>
  );
}

interface HarmonyLessonProps {
  data: LessonSection[];
  categoryId: string;
  courseId: string;
  isSignedIn: boolean;
  progressByLessonId: Record<string, AcademyLessonProgress>;
  onProgressChange: (progress: AcademyLessonProgress) => void;
}

export default function HarmonyLesson({
  data,
  categoryId,
  courseId,
  isSignedIn,
  progressByLessonId,
  onProgressChange,
}: HarmonyLessonProps) {
  const [savingLessonId, setSavingLessonId] = useState<string | null>(null);
  const [, startProgressTransition] = useTransition();
  const t = useTranslations("scriptures.academy");

  // 과(Lesson) 인덱스
  const [activeLessonIndex, setActiveLessonIndex] = useState(0);
  const activeLesson = data[activeLessonIndex] ?? data[0];

  // 과 타이틀 목록 (네비게이터용)
  const lessonTitles = useMemo(
    () => data.map((lesson) => lesson.title),
    [data],
  );

  const recentLessonId = useMemo(() => {
    const sorted = data
      .map((lesson) => progressByLessonId[lesson.id])
      .filter((p): p is AcademyLessonProgress => Boolean(p))
      .sort((a, b) => new Date(b.lastStudiedAt).getTime() - new Date(a.lastStudiedAt).getTime());
    return sorted[0]?.lessonId ?? null;
  }, [data, progressByLessonId]);

  // 과 진입 시 progress 기록
  useEffect(() => {
    if (!activeLesson || !isSignedIn) return;

    startProgressTransition(async () => {
      const result = await touchAcademyLessonProgress({
        categoryId,
        courseId,
        lessonId: activeLesson.id,
      });

      if (result.success && result.data) {
        onProgressChange(result.data);
      }
    });
  }, [activeLesson?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleQuizComplete = useCallback((lessonId: string) => {
    if (!isSignedIn) return;
    if (progressByLessonId[lessonId]?.isCompleted) return;

    setSavingLessonId(lessonId);

    startProgressTransition(async () => {
      const result = await setAcademyLessonCompletion({
        categoryId,
        courseId,
        isCompleted: true,
        lessonId,
      });

      if (result.success && result.data) {
        onProgressChange(result.data);
      }

      setSavingLessonId((current) => (current === lessonId ? null : current));
    });
  }, [categoryId, courseId, isSignedIn, progressByLessonId, onProgressChange, startProgressTransition]);

  if (!activeLesson) return null;

  const isCompleted = progressByLessonId[activeLesson.id]?.isCompleted ?? false;
  const isRecentLesson = recentLessonId === activeLesson.id;

  const exampleMap = useMemo(
    () => new Map((activeLesson.sheetExamples ?? []).map((ex) => [ex.id, ex])),
    [activeLesson.sheetExamples],
  );

  const [activeStepIndex, setActiveStepIndex] = useState(0);
  // 퀴즈 상태 (레슨 레벨에서 관리 — 스텝 이동해도 유지)
  const [quizSelected, setQuizSelected] = useState<Record<number, number>>({});
  const [quizRevealed, setQuizRevealed] = useState<Record<number, boolean>>({});
  // 문제 없는 스텝의 이해 확인 체크
  const [stepChecked, setStepChecked] = useState<Record<number, boolean>>({});
  const [lessonCompleted, setLessonCompleted] = useState(false);

  // 레슨 전환 시 스텝·퀴즈 리셋
  useEffect(() => {
    setActiveStepIndex(0);
    setQuizSelected({});
    setQuizRevealed({});
    setStepChecked({});
    setLessonCompleted(false);
  }, [activeLesson.id]);

  const steps = activeLesson.steps;
  const currentStep = steps[activeStepIndex] ?? steps[0];
  const stepTitles = useMemo(() => steps.map((s) => s.title), [steps]);

  const quiz = activeLesson.quiz ?? [];
  const quizByStep = useMemo(() => distributeQuiz(quiz, steps.length), [quiz, steps.length]);
  const currentStepQuiz = quizByStep[activeStepIndex] ?? [];
  // 퀴즈 없는 스텝 인덱스
  const noQuizStepIndices = useMemo(
    () => steps.map((_, i) => i).filter((i) => !(quizByStep[i]?.length)),
    [steps, quizByStep],
  );
  const currentStepHasQuiz = currentStepQuiz.length > 0;

  // 완료 조건 체크: 퀴즈 전문 정답 + 문제없는 스텝 전부 체크
  const checkCompletion = useCallback((
    nextRevealed: Record<number, boolean>,
    nextSelected: Record<number, number>,
    nextStepChecked: Record<number, boolean>,
  ) => {
    if (lessonCompleted) return;
    // 퀴즈 전문 정답?
    const allQuizOk = quiz.length === 0 || (
      quiz.every((_, i) => nextRevealed[i]) &&
      quiz.every((q, i) => nextSelected[i] === q.answerIndex)
    );
    // 문제 없는 스텝 전부 체크?
    const allStepsChecked = noQuizStepIndices.every((i) => nextStepChecked[i]);
    if (allQuizOk && allStepsChecked) {
      setLessonCompleted(true);
      handleQuizComplete(activeLesson.id);
    }
  }, [quiz, noQuizStepIndices, lessonCompleted, activeLesson.id, handleQuizComplete]);

  const handleQuizSelect = useCallback((globalIndex: number, choiceIndex: number) => {
    if (quizRevealed[globalIndex]) return;
    setQuizSelected((prev) => ({ ...prev, [globalIndex]: choiceIndex }));
  }, [quizRevealed]);

  const handleQuizRetry = useCallback((globalIndex: number) => {
    setQuizRevealed((prev) => {
      const next = { ...prev };
      delete next[globalIndex];
      return next;
    });
    setQuizSelected((prev) => {
      const next = { ...prev };
      delete next[globalIndex];
      return next;
    });
  }, []);

  const handleQuizReveal = useCallback((globalIndex: number) => {
    setQuizRevealed((prev) => {
      const next = { ...prev, [globalIndex]: true };
      checkCompletion(next, quizSelected, stepChecked);
      return next;
    });
  }, [quizSelected, stepChecked, checkCompletion]);

  const handleStepCheck = useCallback((stepIndex: number) => {
    setStepChecked((prev) => {
      const next = { ...prev, [stepIndex]: true };
      checkCompletion(quizRevealed, quizSelected, next);
      return next;
    });
  }, [quizRevealed, quizSelected, checkCompletion]);

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6">
      {/* ── LESSON 레이어 ── */}
      <div className="mb-4">
        {data.length > 1 ? (
          <ArrowNavigator
            items={lessonTitles}
            activeIndex={activeLessonIndex}
            onChange={setActiveLessonIndex}
            prefix="Lesson"
            compact
          />
        ) : (
          <div className="text-center">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">Lesson 1/1</span>
            <p className="text-sm font-bold tracking-[0.05em] text-[#d4af37]/80 sm:text-base">{lessonTitles[0]}</p>
          </div>
        )}
        {(isCompleted || savingLessonId === activeLesson.id) && (
          <div className="flex items-center justify-center gap-2 mt-1.5">
            {isCompleted && (
              <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300/80">
                {t("lesson.completedBadge")}
              </span>
            )}
            {savingLessonId === activeLesson.id && <Loader2 className="h-3 w-3 animate-spin text-white/45" />}
          </div>
        )}
      </div>

      {/* 레슨 정보 카드 (배지 + 설명 + 학습 목표) */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`lesson-${activeLesson.id}`}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25 }}
        >
          <div className="mb-5 rounded-xl border border-white/[0.10] bg-white/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] p-4 sm:p-5">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <DifficultyBadge difficulty={activeLesson.difficulty} />
              {isRecentLesson && (
                <span className="rounded-full border border-[#d4af37]/20 bg-[#d4af37]/10 px-2 py-0.5 text-[10px] font-medium text-[#d4af37]/80">
                  {t("lesson.recentBadge")}
                </span>
              )}
            </div>
            <p className="mb-3 text-sm leading-relaxed text-white/75 sm:text-[15px] line-clamp-2">{activeLesson.description}</p>
            <div>
              <h4 className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-white/50">
                {t("lesson.objectives")}
              </h4>
              <ul className="space-y-1.5">
                {activeLesson.objectives.map((objective, i) => (
                  <li key={i} className="flex items-start gap-2 text-[13px] text-white/80 sm:text-sm">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[#d4af37]/60" />
                    <span>{objective}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* ── STEP 레이어 ── */}
          <div className="mb-4">
            {steps.length > 1 ? (
              <ArrowNavigator
                items={stepTitles}
                activeIndex={activeStepIndex}
                onChange={setActiveStepIndex}
                prefix="Step"
              />
            ) : (
              <div className="text-center">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">Step 1/1</span>
                <p className="text-sm font-bold tracking-[0.05em] text-[#d4af37]/80 sm:text-base">{stepTitles[0]}</p>
              </div>
            )}
          </div>

          {/* 스텝 본문 */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`step-${activeLesson.id}-${activeStepIndex}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden rounded-2xl border border-white/[0.10] bg-white/[0.05] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] pb-24 xl:pb-8"
            >
              <div className="p-4 sm:p-5 flex flex-col gap-5">
                {/* 악보 예시 */}
                {currentStep.exampleId && exampleMap.has(currentStep.exampleId) && (
                  <SheetExampleCard example={exampleMap.get(currentStep.exampleId)!} />
                )}

                {/* 이미지 */}
                {currentStep.imageUrl && (
                  currentStep.imageUrl.startsWith("TODO:") ? (
                    <div className="flex items-center justify-center rounded-xl border-2 border-dashed border-white/10 bg-white/[0.02] p-6 text-center">
                      <span className="text-xs text-white/30">{currentStep.imageUrl.replace("TODO:", "").trim()}</span>
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-xl border border-white/[0.06]">
                      <img src={currentStep.imageUrl} alt={currentStep.imageAlt ?? ""} className="w-full" />
                      {currentStep.imageAlt && (
                        <p className="px-3 py-2 text-[11px] text-white/50 bg-white/[0.02]">{currentStep.imageAlt}</p>
                      )}
                    </div>
                  )
                )}

                {/* 본문 마크다운 */}
                <div>
                  {renderMarkdown(currentStep.contentMarkdown)}
                </div>

                {/* 프로그레스 바 */}
                {steps.length > 1 && (
                  <div className="flex gap-1.5">
                    {steps.map((_, index) => {
                      const hasQuiz = !!(quizByStep[index]?.length);
                      const quizDone = hasQuiz && quizByStep[index].every(
                        ({ globalIndex: gi }) => quizRevealed[gi] && quizSelected[gi] === quiz[gi]?.answerIndex,
                      );
                      const done = hasQuiz ? quizDone : stepChecked[index];
                      return (
                        <button
                          key={index}
                          onClick={() => setActiveStepIndex(index)}
                          className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                            index === activeStepIndex
                              ? "bg-[#d4af37]"
                              : done
                                ? "bg-emerald-400/60"
                                : "bg-white/[0.08]"
                          }`}
                          aria-label={`Step ${index + 1}`}
                        />
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 퀴즈 (스텝별 분배) 또는 이해 확인 체크 */}
              <div className="px-4 pb-4 sm:px-5 sm:pb-5">
                {currentStepHasQuiz ? (
                  currentStepQuiz.map(({ question, globalIndex }) => (
                    <StepQuizQuestion
                      key={globalIndex}
                      question={question}
                      questionIndex={globalIndex}
                      selected={quizSelected[globalIndex]}
                      revealed={quizRevealed[globalIndex] ?? false}
                      onSelect={(choiceIndex) => handleQuizSelect(globalIndex, choiceIndex)}
                      onReveal={() => handleQuizReveal(globalIndex)}
                      onRetry={() => handleQuizRetry(globalIndex)}
                    />
                  ))
                ) : (
                  <div className="mt-5 border-t border-white/[0.06] pt-4">
                    <button
                      type="button"
                      disabled={stepChecked[activeStepIndex]}
                      onClick={() => handleStepCheck(activeStepIndex)}
                      className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-[14px] font-medium transition-all sm:text-[15px] ${
                        stepChecked[activeStepIndex]
                          ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300/80 cursor-default"
                          : "border-[#d4af37]/30 bg-[#d4af37]/10 text-[#d4af37]/80 hover:bg-[#d4af37]/15 hover:text-[#d4af37]"
                      }`}
                    >
                      <CheckCircle2 className={`h-4 w-4 ${stepChecked[activeStepIndex] ? "text-emerald-400/70" : "text-[#d4af37]/60"}`} />
                      {stepChecked[activeStepIndex] ? t("lesson.completedBadge") : t("lesson.completionCheckbox")}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
