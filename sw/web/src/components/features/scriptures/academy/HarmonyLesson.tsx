"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Music, ChevronDown, BookOpen, CheckCircle2, Scroll, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import type { LessonSection, SheetExample } from "@/constants/scripturesMuseum";
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
              className="rounded bg-[#d4af37]/10 px-1 py-0.5 font-mono text-[12px] text-[#d4af37]/80"
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

function LessonStepCarousel({ steps, examples = [] }: { steps: import("@/constants/scripturesMuseum").LessonStep[]; examples?: SheetExample[] }) {
  const t = useTranslations("scriptures.academy");
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const exampleMap = new Map(examples.map((example) => [example.id, example]));
  const currentStep = steps[currentStepIndex];
  
  // Parse inline Markdown structure and table if needed
  const renderMarkdown = (markdown: string) => {
    const paragraphs = markdown.split("\n\n");
    return paragraphs.map((paragraph, paragraphIndex) => {
      if (paragraph.startsWith("- ")) {
        const items = paragraph.split("\n").filter((line) => line.startsWith("- "));
        return (
          <ul key={paragraphIndex} className="space-y-1 pl-1">
            {items.map((item, itemIndex) => (
              <li
                key={itemIndex}
                className="flex items-start gap-2 text-[13px] leading-[1.75] text-white/75 sm:text-sm"
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
            <table className="w-full text-[12px] sm:text-[13px]">
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
                      <td key={cellIndex} className="px-3 py-2 text-white/65">
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
          className="text-[14px] leading-[1.8] text-white/80 sm:text-[15px] mb-4 last:mb-0"
        >
          <InlineMarkdown text={paragraph} />
        </p>
      );
    });
  };

  return (
    <div className="flex flex-col">
      {/* Consolidated Header & Navigation Area */}
      <div className="mb-6 flex flex-col gap-4">
        {/* Title and Nav Buttons */}
        <div className="flex items-start justify-between">
          <div className="flex flex-col pr-4">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-[#d4af37]/60 mb-1">
              {currentStepIndex === 0 ? "개요 (Overview)" : `Step ${currentStepIndex} / ${steps.length - 1}`}
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-white leading-tight">
              {currentStep.title}
            </h3>
          </div>
          
          <div className="flex items-center gap-1.5 shrink-0 pt-1">
            <button
              onClick={() => setCurrentStepIndex(prev => Math.max(0, prev - 1))}
              disabled={currentStepIndex === 0}
              className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                currentStepIndex === 0 
                  ? "text-white/10 cursor-not-allowed" 
                  : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
              }`}
              aria-label={t("previousBtn") || "이전"}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setCurrentStepIndex(prev => Math.min(steps.length - 1, prev + 1))}
              disabled={currentStepIndex === steps.length - 1}
              className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                currentStepIndex === steps.length - 1 
                  ? "text-white/10 cursor-not-allowed" 
                  : "bg-[#d4af37]/10 text-[#d4af37] hover:bg-[#d4af37]/20"
              }`}
              aria-label={t("nextBtn") || "다음"}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Progress Indicators */}
        <div className="flex gap-1.5">
          {steps.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentStepIndex(index)}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                index === currentStepIndex
                  ? "bg-[#d4af37]"
                  : index < currentStepIndex
                    ? "bg-[#d4af37]/40"
                    : "bg-white/10"
              }`}
              aria-label={`Go to step ${index + 1}`}
            />
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentStepIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col gap-6"
        >
          {/* Example Sheet Music Card if present */}
          {currentStep.exampleId && exampleMap.has(currentStep.exampleId) && (
            <div className="order-last lg:order-none sticky top-4">
               <SheetExampleCard example={exampleMap.get(currentStep.exampleId)!} />
            </div>
          )}

          {/* Content Markdown */}
          <div className="bg-white/[0.02] p-4 sm:p-5 rounded-xl border border-white/[0.04]">
            {renderMarkdown(currentStep.contentMarkdown)}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
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
      {example.caption && <p className="mt-2 text-[11px] leading-relaxed text-white/50">{example.caption}</p>}
    </div>
  );
}

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

interface LessonCardProps {
  lesson: LessonSection;
  index: number;
  open: boolean;
  progress?: AcademyLessonProgress;
  isRecentLesson: boolean;
  isSignedIn: boolean;
  isCompletionPending: boolean;
  onToggle: (lessonId: string, nextOpen: boolean) => void;
  onToggleCompletion: (lesson: LessonSection, nextCompleted: boolean) => void;
}

function LessonCard({
  lesson,
  index,
  open,
  progress,
  isRecentLesson,
  isSignedIn,
  isCompletionPending,
  onToggle,
  onToggleCompletion,
}: LessonCardProps) {
  const t = useTranslations("scriptures.academy.lesson");
  const panelId = `academy-lesson-panel-${lesson.id}`;
  const buttonId = `academy-lesson-toggle-${lesson.id}`;
  const isCompleted = progress?.isCompleted ?? false;

  return (
    <motion.div
      id={`lesson-${lesson.id}`}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5 }}
      className="scroll-mt-4 overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] transition-colors duration-300 hover:border-white/15"
    >
      <div className="p-4 sm:p-5">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#d4af37]/60">
              {lesson.partLabel}
            </span>
            <DifficultyBadge difficulty={lesson.difficulty} />
            {isRecentLesson && (
              <span className="rounded-full border border-[#d4af37]/20 bg-[#d4af37]/10 px-2 py-0.5 text-[10px] font-medium text-[#d4af37]/80">
                {t("recentBadge")}
              </span>
            )}
            {isCompleted && (
              <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300/80">
                {t("completedBadge")}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <label
              className={`flex items-center gap-1.5 text-[10px] font-medium ${
                isSignedIn ? "cursor-pointer text-white/68" : "cursor-not-allowed text-white/32"
              }`}
            >
              <input
                checked={isCompleted}
                className="h-3.5 w-3.5 rounded border-white/20 bg-transparent accent-emerald-400"
                disabled={!isSignedIn || isCompletionPending}
                onChange={(event) => onToggleCompletion(lesson, event.target.checked)}
                type="checkbox"
              />
              <span>{t("completionCheckbox")}</span>
            </label>
            {isCompletionPending && <Loader2 className="h-3.5 w-3.5 animate-spin text-white/45" />}
          </div>
        </div>

        <div className="mb-2 flex items-baseline gap-2.5">
          <span className="font-mono text-lg font-bold text-[#d4af37]/40 sm:text-xl">
            {String(index + 1).padStart(2, "0")}
          </span>
          <h3 className="font-serif text-lg font-bold leading-tight text-white sm:text-xl">{lesson.title}</h3>
        </div>

        <p className="mb-3 text-xs leading-relaxed text-white/60 sm:text-[13px]">{lesson.description}</p>

        <div className="mb-3">
          <h4 className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/30">
            {t("objectives")}
          </h4>
          <ul className="space-y-1">
            {lesson.objectives.map((objective, objectiveIndex) => (
              <li key={objectiveIndex} className="flex items-start gap-2 text-[11px] text-white/60 sm:text-xs">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[#d4af37]/40" />
                <span>{objective}</span>
              </li>
            ))}
          </ul>
        </div>

        <button
          aria-controls={panelId}
          aria-expanded={open}
          id={buttonId}
          onClick={() => onToggle(lesson.id, !open)}
          type="button"
          className="flex w-full items-center justify-center gap-1.5 border-t border-white/[0.06] py-2 text-[11px] font-medium text-white/40 transition-colors hover:text-white/70"
        >
          <span>{open ? t("foldContent") : t("unfoldContent")}</span>
          <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div
              aria-labelledby={buttonId}
              className="border-t border-white/[0.06] px-4 pt-4 pb-4 sm:px-5 sm:pb-5"
              id={panelId}
              role="region"
            >
              <LessonStepCarousel steps={lesson.steps} examples={lesson.sheetExamples} />

              <div className="mt-6 flex items-center justify-end gap-3 border-t border-white/[0.06] pt-4">
                <button
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-[11px] font-medium text-white/55 transition-colors hover:text-white/80"
                  onClick={() => onToggle(lesson.id, false)}
                  type="button"
                >
                  <span>{t("foldContent")}</span>
                  <ChevronDown className="h-3.5 w-3.5 rotate-180" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function LessonTableOfContents({
  lessons,
  activeId,
  recentLessonId,
  progressByLessonId,
  contentTopRef,
}: {
  lessons: LessonSection[];
  activeId: string;
  recentLessonId: string | null;
  progressByLessonId: Record<string, AcademyLessonProgress>;
  contentTopRef: React.RefObject<HTMLDivElement | null>;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const t = useTranslations("scriptures.academy");

  const handleClick = useCallback((id: string) => {
    const element = document.getElementById(`lesson-${id}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const activeIndex = lessons.findIndex((lesson) => lesson.id === activeId);

  useEffect(() => {
    const check = () => {
      if (!contentTopRef.current) {
        return;
      }

      const rect = contentTopRef.current.getBoundingClientRect();
      setVisible(rect.top <= window.innerHeight * 0.5);
    };

    window.addEventListener("scroll", check, { passive: true });
    check();

    return () => window.removeEventListener("scroll", check);
  }, [contentTopRef]);

  useEffect(() => {
    if (!listRef.current) {
      return;
    }

    const button = listRef.current.querySelector(`[data-toc="${activeId}"]`) as HTMLElement | null;
    if (button) {
      button.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [activeId]);

  return (
    <nav
      aria-label={t("lessonNavigationLabel")}
      className={`fixed left-[calc(50%-736px)] top-[calc(50%+32px)] z-30 hidden w-52 -translate-y-1/2 flex-col transition-opacity duration-300 xl:flex ${
        visible ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      <div className="rounded-2xl border border-white/10 bg-black/70 p-4 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-xl">
        <div className="mb-4 flex items-center gap-2 pl-1">
          <Scroll className="h-3.5 w-3.5 text-[#d4af37]/70" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#d4af37]/60">
            {t("lessonNavigationTitle")}
          </span>
        </div>

        <div ref={listRef} className="relative max-h-[60vh] overflow-y-auto pl-1 scrollbar-hidden">
          <div className="absolute left-[13px] top-2 bottom-2 w-px bg-white/10" />
          <div
            className="absolute left-[13px] w-px bg-[#d4af37]/50 transition-all duration-500"
            style={{
              top: "8px",
              height: lessons.length > 1 ? `${(activeIndex / (lessons.length - 1)) * 100}%` : "0px",
            }}
          />

          <div className="flex flex-col gap-0.5">
            {lessons.map((lesson, index) => {
              const isActive = activeId === lesson.id;
              const isCompleted = progressByLessonId[lesson.id]?.isCompleted ?? false;
              const isRecent = recentLessonId === lesson.id;

              return (
                <button
                  aria-pressed={isActive}
                  key={lesson.id}
                  data-toc={lesson.id}
                  onClick={() => handleClick(lesson.id)}
                  type="button"
                  className={`group relative flex items-center gap-2.5 rounded-lg py-2 pl-0.5 pr-2 text-left text-[11px] transition-all duration-300 ${
                    isActive ? "text-[#d4af37]" : "text-white/60 hover:text-white/90"
                  }`}
                >
                  <div
                    className={`relative z-10 flex h-[19px] w-[19px] flex-shrink-0 items-center justify-center rounded-full border font-mono text-[8px] font-bold leading-none transition-all duration-300 ${
                      isActive
                        ? "scale-110 border-[#d4af37]/50 bg-[#1a1500] text-[#d4af37]"
                        : isCompleted
                          ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                          : isRecent
                            ? "border-[#d4af37]/30 bg-[#1a1500] text-[#d4af37]/75"
                            : "border-white/10 bg-[#0a0a0a] text-white/40 group-hover:border-white/20 group-hover:text-white/70"
                    }`}
                  >
                    {index + 1}
                  </div>
                  <div className="flex min-w-0 flex-col">
                    <span
                      className={`truncate leading-tight transition-all duration-300 ${
                        isActive ? "font-bold text-[#d4af37]" : "font-medium text-white/70"
                      }`}
                    >
                      {lesson.title}
                    </span>
                    {(isCompleted || isRecent) && (
                      <span className="mt-0.5 text-[9px] uppercase tracking-[0.14em] text-white/30">
                        {isCompleted ? t("lesson.completedBadge") : t("lesson.recentBadge")}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}

function MobileLessonNav({
  lessons,
  activeId,
  recentLessonId,
  progressByLessonId,
}: {
  lessons: LessonSection[];
  activeId: string;
  recentLessonId: string | null;
  progressByLessonId: Record<string, AcademyLessonProgress>;
}) {
  const activeIndex = lessons.findIndex((lesson) => lesson.id === activeId);
  const navRef = useRef<HTMLDivElement>(null);
  const t = useTranslations("scriptures.academy");

  useEffect(() => {
    if (!navRef.current) {
      return;
    }

    const button = navRef.current.querySelector(`[data-lesson-id="${activeId}"]`) as HTMLElement | null;
    if (button) {
      button.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [activeId]);

  const handleClick = useCallback((id: string) => {
    const element = document.getElementById(`lesson-${id}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  return (
    <div
      aria-label={t("mobileLessonNavigationLabel")}
      className="safe-area-bottom fixed bottom-0 left-0 right-0 z-30 border-t border-white/[0.08] bg-[#121212]/90 backdrop-blur-md xl:hidden"
      role="navigation"
    >
      <div className="h-[3px] bg-white/5">
        <div
          className="h-full bg-gradient-to-r from-[#d4af37]/50 to-[#d4af37]/80 transition-all duration-500"
          style={{ width: `${((activeIndex + 1) / lessons.length) * 100}%` }}
        />
      </div>

      <div ref={navRef} className="flex gap-1 overflow-x-auto px-2 py-2.5 scrollbar-hidden">
        {lessons.map((lesson, index) => {
          const isActive = activeId === lesson.id;
          const isPast = index < activeIndex;
          const isCompleted = progressByLessonId[lesson.id]?.isCompleted ?? false;
          const isRecent = recentLessonId === lesson.id;

          return (
            <button
              aria-pressed={isActive}
              key={lesson.id}
              data-lesson-id={lesson.id}
              onClick={() => handleClick(lesson.id)}
              type="button"
              className={`flex-shrink-0 whitespace-nowrap rounded-full px-3 py-2 text-[10px] transition-all duration-300 sm:text-[11px] ${
                isActive
                  ? "bg-[#d4af37]/15 font-semibold text-[#d4af37] shadow-[0_0_8px_rgba(212,175,55,0.15)]"
                  : isCompleted
                    ? "bg-emerald-500/10 text-emerald-200/80"
                    : isRecent
                      ? "bg-[#d4af37]/10 text-[#d4af37]/75"
                      : isPast
                        ? "text-white/50"
                        : "text-white/30"
              }`}
            >
              <span className="flex items-center gap-1.5">
                <span
                  className={`inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full transition-all duration-300 ${
                    isActive
                      ? "bg-[#d4af37] shadow-[0_0_4px_rgba(212,175,55,0.6)]"
                      : isCompleted
                        ? "bg-emerald-300"
                        : isRecent
                          ? "bg-[#d4af37]/80"
                          : isPast
                            ? "bg-white/30"
                            : "bg-white/15"
                  }`}
                />
                {String(index + 1).padStart(2, "0")}. {lesson.title}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LessonProgressBanner({
  lessons,
  isSignedIn,
  progressByLessonId,
  recentLessonId,
  onContinue,
}: {
  lessons: LessonSection[];
  isSignedIn: boolean;
  progressByLessonId: Record<string, AcademyLessonProgress>;
  recentLessonId: string | null;
  onContinue: (lessonId: string) => void;
}) {
  const t = useTranslations("scriptures.academy");
  const completedCount = lessons.filter((lesson) => progressByLessonId[lesson.id]?.isCompleted).length;
  const recentLesson = recentLessonId ? lessons.find((lesson) => lesson.id === recentLessonId) ?? null : null;
  const progressRatio = lessons.length > 0 ? (completedCount / lessons.length) * 100 : 0;

  return (
    <div className="mb-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 sm:mb-5 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#d4af37]/60">
            {t("progressTitle")}
          </div>
          <div className="text-sm font-medium text-white sm:text-base">
            {t("progressSummary", { completed: completedCount, total: lessons.length })}
          </div>
          <div className="mt-1 text-[11px] text-white/50 sm:text-xs">
            {isSignedIn
              ? recentLesson
                ? t("progressRecentLesson", { title: recentLesson.title })
                : t("progressEmpty")
              : t("progressGuest")}
          </div>
        </div>

        {isSignedIn && recentLesson && (
          <button
            className="inline-flex items-center justify-center gap-1.5 rounded-full border border-[#d4af37]/20 bg-[#d4af37]/12 px-3.5 py-2 text-[11px] font-medium text-[#d4af37]/85 transition-colors hover:text-[#f2dc8c]"
            onClick={() => onContinue(recentLesson.id)}
            type="button"
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>{t("continueLesson")}</span>
          </button>
        )}
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full bg-gradient-to-r from-[#d4af37]/50 via-[#d4af37]/70 to-emerald-300/70 transition-all duration-500"
          style={{ width: `${progressRatio}%` }}
        />
      </div>
    </div>
  );
}

interface HarmonyLessonProps {
  data: LessonSection[];
  categoryId: string;
  subCategoryId: string;
  isSignedIn: boolean;
  progressByLessonId: Record<string, AcademyLessonProgress>;
  onProgressChange: (progress: AcademyLessonProgress) => void;
}

export default function HarmonyLesson({
  data,
  categoryId,
  subCategoryId,
  isSignedIn,
  progressByLessonId,
  onProgressChange,
}: HarmonyLessonProps) {
  const [activeLessonId, setActiveLessonId] = useState(data[0]?.id ?? "");
  const [openLessonIds, setOpenLessonIds] = useState<Record<string, boolean>>({});
  const [savingLessonId, setSavingLessonId] = useState<string | null>(null);
  const [, startProgressTransition] = useTransition();
  const contentTopRef = useRef<HTMLDivElement>(null);
  const t = useTranslations("scriptures.academy");

  const recentLessonId = useMemo(() => {
    const visibleProgress = data
      .map((lesson) => progressByLessonId[lesson.id])
      .filter((progress): progress is AcademyLessonProgress => Boolean(progress))
      .sort((a, b) => new Date(b.lastStudiedAt).getTime() - new Date(a.lastStudiedAt).getTime());

    return visibleProgress[0]?.lessonId ?? null;
  }, [data, progressByLessonId]);

  const scrollToLesson = useCallback((lessonId: string) => {
    const lessonElement = document.getElementById(`lesson-${lessonId}`);
    if (lessonElement) {
      lessonElement.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const handleToggleLesson = useCallback((lessonId: string, nextOpen: boolean) => {
    setOpenLessonIds((prev) => ({
      ...prev,
      [lessonId]: nextOpen,
    }));

    if (!nextOpen || !isSignedIn) {
      return;
    }

    startProgressTransition(async () => {
      const result = await touchAcademyLessonProgress({
        categoryId,
        lessonId,
        subCategoryId,
      });

      if (result.success && result.data) {
        onProgressChange(result.data);
      }
    });
  }, [categoryId, isSignedIn, onProgressChange, startProgressTransition, subCategoryId]);

  const handleToggleCompletion = useCallback((lesson: LessonSection, nextCompleted: boolean) => {
    if (!isSignedIn) {
      return;
    }

    setSavingLessonId(lesson.id);

    startProgressTransition(async () => {
      const result = await setAcademyLessonCompletion({
        categoryId,
        isCompleted: nextCompleted,
        lessonId: lesson.id,
        subCategoryId,
      });

      if (result.success && result.data) {
        onProgressChange(result.data);
      }

      setSavingLessonId((current) => (current === lesson.id ? null : current));
    });
  }, [categoryId, isSignedIn, onProgressChange, startProgressTransition, subCategoryId]);

  const handleContinueLesson = useCallback((lessonId: string) => {
    handleToggleLesson(lessonId, true);
    window.setTimeout(() => scrollToLesson(lessonId), 40);
  }, [handleToggleLesson, scrollToLesson]);

  useEffect(() => {
    let ticking = false;

    const onScroll = () => {
      if (ticking) {
        return;
      }

      ticking = true;

      requestAnimationFrame(() => {
        const trigger = window.innerHeight * 0.3;
        let current = data[0]?.id ?? "";

        for (const lesson of data) {
          const element = document.getElementById(`lesson-${lesson.id}`);
          if (!element) {
            continue;
          }

          if (element.getBoundingClientRect().top <= trigger) {
            current = lesson.id;
          } else {
            break;
          }
        }

        setActiveLessonId(current);
        ticking = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => window.removeEventListener("scroll", onScroll);
  }, [data]);

  return (
    <>
      <LessonTableOfContents
        activeId={activeLessonId}
        contentTopRef={contentTopRef}
        lessons={data}
        progressByLessonId={progressByLessonId}
        recentLessonId={recentLessonId}
      />
      <MobileLessonNav
        activeId={activeLessonId}
        lessons={data}
        progressByLessonId={progressByLessonId}
        recentLessonId={recentLessonId}
      />

      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="mb-6 flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-[#d4af37]/60" />
          <span className="text-xs font-semibold uppercase tracking-[0.15em] text-[#d4af37]/60">
            {t("lessonSectionTitle")}
          </span>
        </div>

        <LessonProgressBanner
          isSignedIn={isSignedIn}
          lessons={data}
          onContinue={handleContinueLesson}
          progressByLessonId={progressByLessonId}
          recentLessonId={recentLessonId}
        />

        <div ref={contentTopRef} className="flex flex-col gap-4 pb-24 xl:pb-8">
          {data.map((lesson, index) => (
            <LessonCard
              key={lesson.id}
              index={index}
              isCompletionPending={savingLessonId === lesson.id}
              isRecentLesson={recentLessonId === lesson.id}
              isSignedIn={isSignedIn}
              lesson={lesson}
              onToggle={handleToggleLesson}
              onToggleCompletion={handleToggleCompletion}
              open={Boolean(openLessonIds[lesson.id])}
              progress={progressByLessonId[lesson.id]}
            />
          ))}
        </div>
      </div>
    </>
  );
}
