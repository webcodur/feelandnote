"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Music, CheckCircle2, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import type { LessonSection, SheetExample } from "@/constants/libraryMuseum";
import { setAcademyLessonCompletion, touchAcademyLessonProgress } from "@/actions/library/academyProgress";
import SheetMusic from "../SheetMusic";
import type { HarmonyLessonProps } from "./types";
import ArrowNavigator from "./sections/ArrowNavigator";
import StepContent from "./sections/StepContent";
import { StepQuizQuestion, distributeQuiz } from "./sections/StepQuiz";

/**
 * 과가 없을 때 쓰는 고정 빈 배열.
 * 매 렌더 새 `[]`를 만들면 아래 useMemo의 의존값이 계속 바뀌어 캐시가 무의미해진다.
 */
const EMPTY_STEPS: LessonSection["steps"] = [];
const EMPTY_QUIZ: NonNullable<LessonSection["quiz"]> = [];

const DIFFICULTY_STYLES = {
  beginner: { bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-400/80" },
  intermediate: { bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-400/80" },
  advanced: { bg: "bg-rose-500/10", border: "border-rose-500/20", text: "text-rose-400/80" },
} as const;

function DifficultyBadge({ difficulty }: { difficulty: keyof typeof DIFFICULTY_STYLES }) {
  const t = useTranslations("library.academy.lesson.difficulty");
  const style = DIFFICULTY_STYLES[difficulty];

  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${style.bg} ${style.border} ${style.text}`}>
      {t(difficulty)}
    </span>
  );
}

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
  const t = useTranslations("library.academy");

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
      .filter((p): p is NonNullable<typeof p> => Boolean(p))
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

  const exampleMap = useMemo(
    () => new Map((activeLesson?.sheetExamples ?? []).map((ex) => [ex.id, ex])),
    [activeLesson?.sheetExamples],
  );

  const [activeStepIndex, setActiveStepIndex] = useState(0);
  // 퀴즈 상태 (레슨 레벨에서 관리 — 스텝 이동해도 유지)
  const [quizSelected, setQuizSelected] = useState<Record<number, number>>({});
  const [quizRevealed, setQuizRevealed] = useState<Record<number, boolean>>({});
  // 문제 없는 스텝의 이해 확인 체크
  const [stepChecked, setStepChecked] = useState<Record<number, boolean>>({});
  const [lessonCompleted, setLessonCompleted] = useState(false);

  // 과를 넘길 때 스텝·퀴즈를 처음으로 되돌린다.
  // 이펙트가 아니라 렌더 도중에 맞춘다(리액트 권장 패턴) — 이펙트로 하면 앞 과의 스텝이
  // 한 번 그려진 뒤에야 초기화돼 화면이 깜빡이고, 그 사이 클릭이 옛 상태에 꽂힌다.
  const [lastLessonId, setLastLessonId] = useState(activeLesson?.id);
  if (activeLesson?.id !== lastLessonId) {
    setLastLessonId(activeLesson?.id);
    setActiveStepIndex(0);
    setQuizSelected({});
    setQuizRevealed({});
    setStepChecked({});
    setLessonCompleted(false);
  }

  const steps = activeLesson?.steps ?? EMPTY_STEPS;
  const stepTitles = useMemo(() => steps.map((s) => s.title), [steps]);

  const quiz = activeLesson?.quiz ?? EMPTY_QUIZ;
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
    if (lessonCompleted || !activeLesson) return;
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
  }, [quiz, noQuizStepIndices, lessonCompleted, activeLesson, handleQuizComplete]);

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

  // 훅을 전부 호출한 뒤에 반환한다. 이 줄을 위로 올리면 렌더마다 훅 호출 수가 달라져
  // 리액트가 상태를 엉뚱한 훅에 물린다(26.08.07 교정 — 그전까지 훅 15개가 이 줄 아래 있었다).
  if (!activeLesson || steps.length === 0) return null;

  const isCompleted = progressByLessonId[activeLesson.id]?.isCompleted ?? false;
  const isRecentLesson = recentLessonId === activeLesson.id;
  const currentStep = steps[activeStepIndex] ?? steps[0];

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

                {/* 본문 마크다운 + TTS */}
                <StepContent contentMarkdown={currentStep.contentMarkdown} />

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
