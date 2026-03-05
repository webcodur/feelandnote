/*
  파일명: /components/features/scriptures/academy/HarmonyLesson.tsx
  기능: 화성학 레슨 뷰
  책임: 12개 레슨 카드를 렌더하고, 악보 예시와 마크다운 본문을 보여준다.
*/ // ------------------------------

"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Music, ChevronDown, BookOpen, CheckCircle2, Clock, Scroll } from "lucide-react";
import { useTranslations } from "next-intl";
import type { LessonSection, SheetExample } from "@/constants/scripturesMuseum";
import dynamic from "next/dynamic";

const SheetMusic = dynamic(() => import("./SheetMusic"), { ssr: false });

// #region 인라인 마크다운 파서 (**볼드**, `코드`)
function InlineMarkdown({ text }: { text: string }) {
  const parts = text.split(/(\*\*.*?\*\*|`[^`]+`)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i} className="text-white font-semibold">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith("`") && part.endsWith("`")) {
          return <code key={i} className="text-[#d4af37]/80 bg-[#d4af37]/10 px-1 py-0.5 rounded text-[12px] font-mono">{part.slice(1, -1)}</code>;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
// #endregion

// #region 마크다운 본문 렌더러
function LessonContent({ markdown }: { markdown: string }) {
  const paragraphs = markdown.split("\n\n");
  return (
    <div className="space-y-3 sm:space-y-4">
      {paragraphs.map((para, i) => {
        if (para.startsWith("## ")) {
          return (
            <h3 key={i} className="text-base sm:text-lg font-serif font-bold text-white mt-4 mb-2">
              <InlineMarkdown text={para.replace("## ", "")} />
            </h3>
          );
        }
        if (para.startsWith("### ")) {
          return (
            <h4 key={i} className="text-sm sm:text-base font-serif font-bold text-white/90 mt-3 mb-1">
              <InlineMarkdown text={para.replace("### ", "")} />
            </h4>
          );
        }
        // 마크다운 테이블
        if (para.includes("|") && para.split("\n").every((l) => l.trim().startsWith("|"))) {
          const rows = para.split("\n").filter((l) => l.trim());
          const parseRow = (row: string) =>
            row.split("|").slice(1, -1).map((c) => c.trim());
          const header = parseRow(rows[0]);
          // rows[1]은 구분선 (|---|---|)
          const body = rows.slice(2).map(parseRow);
          return (
            <div key={i} className="overflow-x-auto rounded-xl border border-white/[0.08]">
              <table className="w-full text-[12px] sm:text-[13px]">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-white/[0.03]">
                    {header.map((cell, ci) => (
                      <th key={ci} className="text-left text-white/80 font-semibold px-3 py-2">
                        <InlineMarkdown text={cell} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {body.map((row, ri) => (
                    <tr key={ri} className="border-b border-white/[0.04] last:border-0">
                      {row.map((cell, ci) => (
                        <td key={ci} className="text-white/65 px-3 py-2">
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
        if (para.startsWith("- ")) {
          const items = para.split("\n").filter((l) => l.startsWith("- "));
          return (
            <ul key={i} className="space-y-1 pl-1">
              {items.map((item, j) => (
                <li key={j} className="text-white/75 text-[13px] sm:text-sm leading-[1.75] flex items-start gap-2">
                  <span className="text-[#d4af37]/40 mt-[7px] flex-shrink-0">•</span>
                  <InlineMarkdown text={item.replace("- ", "")} />
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="text-white/75 text-[13px] sm:text-sm leading-[1.75] sm:leading-[1.8]">
            <InlineMarkdown text={para} />
          </p>
        );
      })}
    </div>
  );
}
// #endregion

// #region 악보 예시 카드
function SheetExampleCard({ example }: { example: SheetExample }) {
  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3 sm:p-4">
      <div className="flex items-center gap-2 mb-2">
        <Music className="w-3.5 h-3.5 text-[#d4af37]/60" />
        <span className="text-xs font-medium text-white/80">{example.label}</span>
      </div>
      <SheetMusic abc={example.abc} playable={example.playable} />
      {example.caption && (
        <p className="mt-2 text-[11px] text-white/50 leading-relaxed">
          {example.caption}
        </p>
      )}
    </div>
  );
}
// #endregion

// #region 난이도 배지
const DIFFICULTY_STYLES = {
  beginner: { label: "beginner", bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-400/80" },
  intermediate: { label: "intermediate", bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-400/80" },
  advanced: { label: "advanced", bg: "bg-rose-500/10", border: "border-rose-500/20", text: "text-rose-400/80" },
} as const;

function DifficultyBadge({ difficulty }: { difficulty: keyof typeof DIFFICULTY_STYLES }) {
  const t = useTranslations("scriptures.academy.lesson.difficulty");
  const style = DIFFICULTY_STYLES[difficulty];
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full ${style.bg} border ${style.border} ${style.text} font-medium`}>
      {t(difficulty)}
    </span>
  );
}
// #endregion

// #region 레슨 카드
function LessonCard({ lesson, index }: { lesson: LessonSection; index: number }) {
  const [open, setOpen] = useState(false);
  const t = useTranslations("scriptures.academy.lesson");

  return (
    <motion.div
      id={`lesson-${lesson.id}`}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5 }}
      className="bg-white/[0.03] border border-white/[0.08] rounded-2xl overflow-hidden hover:border-white/15 transition-colors duration-300 scroll-mt-4"
    >
      <div className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#d4af37]/60 uppercase tracking-[0.1em] font-semibold">
              {lesson.partLabel}
            </span>
            <DifficultyBadge difficulty={lesson.difficulty} />
          </div>
          <div className="flex items-center gap-1 text-white/30">
            <Clock className="w-3 h-3" />
            <span className="text-[10px]">{lesson.readTime}{t("min")}</span>
          </div>
        </div>

        <div className="flex items-baseline gap-2.5 mb-2">
          <span className="text-lg sm:text-xl font-mono font-bold text-[#d4af37]/40">
            {String(index + 1).padStart(2, "0")}
          </span>
          <h3 className="text-lg sm:text-xl font-serif font-bold text-white leading-tight">
            {lesson.title}
          </h3>
        </div>

        <p className="text-white/60 text-xs sm:text-[13px] leading-relaxed mb-3">
          {lesson.description}
        </p>

        <div className="mb-3">
          <h4 className="text-[10px] text-white/30 uppercase tracking-widest mb-1.5 font-semibold">
            {t("objectives")}
          </h4>
          <ul className="space-y-1">
            {lesson.objectives.map((obj, i) => (
              <li key={i} className="flex items-start gap-2 text-[11px] sm:text-xs text-white/60">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#d4af37]/40 flex-shrink-0 mt-0.5" />
                <span>{obj}</span>
              </li>
            ))}
          </ul>
        </div>

        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-center gap-1.5 py-2 border-t border-white/[0.06] text-white/40 hover:text-white/70 transition-colors text-[11px] font-medium"
        >
          <span>{open ? t("foldContent") : t("unfoldContent")}</span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
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
            <div className="px-4 sm:px-5 pb-4 sm:pb-5 border-t border-white/[0.06] pt-4">
              <LessonContent markdown={lesson.contentMarkdown} />

              {lesson.sheetExamples.length > 0 && (
                <div className="mt-5 space-y-3">
                  <h4 className="text-[10px] text-white/30 uppercase tracking-widest font-semibold flex items-center gap-1.5">
                    <Music className="w-3 h-3" />
                    {t("sheetExamples")}
                  </h4>
                  {lesson.sheetExamples.map((ex) => (
                    <SheetExampleCard key={ex.id} example={ex} />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
// #endregion

// #region 레슨 목차 (데스크톱 사이드바)
function LessonTableOfContents({ lessons, activeId, contentTopRef }: { lessons: LessonSection[]; activeId: string; contentTopRef: React.RefObject<HTMLDivElement | null> }) {
  const listRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  const handleClick = useCallback((id: string) => {
    const el = document.getElementById(`lesson-${id}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const activeIndex = lessons.findIndex((l) => l.id === activeId);

  useEffect(() => {
    const check = () => {
      if (!contentTopRef.current) return;
      const rect = contentTopRef.current.getBoundingClientRect();
      setVisible(rect.top <= window.innerHeight * 0.5);
    };
    window.addEventListener("scroll", check, { passive: true });
    check();
    return () => window.removeEventListener("scroll", check);
  }, [contentTopRef]);

  useEffect(() => {
    if (!listRef.current) return;
    const btn = listRef.current.querySelector(`[data-toc="${activeId}"]`) as HTMLElement;
    if (btn) btn.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [activeId]);

  return (
    <nav className={`hidden xl:flex flex-col fixed left-[calc(50%-736px)] top-[calc(50%+32px)] -translate-y-1/2 z-30 w-52 transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
      <div className="bg-black/70 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-2 mb-4 pl-1">
          <Scroll className="w-3.5 h-3.5 text-[#d4af37]/70" />
          <span className="text-[10px] text-[#d4af37]/60 uppercase tracking-[0.2em] font-semibold">
            Lessons
          </span>
        </div>

        <div ref={listRef} className="relative max-h-[60vh] overflow-y-auto scrollbar-hidden pl-1">
          <div className="absolute left-[13px] top-2 bottom-2 w-px bg-white/10" />
          <div
            className="absolute left-[13px] w-px bg-[#d4af37]/50 transition-all duration-500"
            style={{
              top: "8px",
              height: lessons.length > 1
                ? `${(activeIndex / (lessons.length - 1)) * 100}%`
                : "0px",
            }}
          />

          <div className="flex flex-col gap-0.5">
            {lessons.map((lesson, index) => {
              const isActive = activeId === lesson.id;
              return (
                <button
                  key={lesson.id}
                  data-toc={lesson.id}
                  onClick={() => handleClick(lesson.id)}
                  className={`group relative flex items-center gap-2.5 text-left text-[11px] pl-0.5 pr-2 py-2 rounded-lg transition-all duration-300 ${isActive ? "text-[#d4af37]" : "text-white/60 hover:text-white/90"}`}
                >
                  <div className={`relative z-10 flex-shrink-0 w-[19px] h-[19px] rounded-full flex items-center justify-center transition-all duration-300 text-[8px] font-mono font-bold leading-none border ${isActive ? "bg-[#1a1500] border-[#d4af37]/50 scale-110 text-[#d4af37]" : "bg-[#0a0a0a] border-white/10 text-white/40 group-hover:text-white/70 group-hover:border-white/20"}`}>
                    {index + 1}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className={`truncate transition-all duration-300 leading-tight ${isActive ? "font-bold text-[#d4af37]" : "font-medium text-white/70"}`}>
                      {lesson.title}
                    </span>
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
// #endregion

// #region 모바일 레슨 네비게이터
function MobileLessonNav({ lessons, activeId }: { lessons: LessonSection[]; activeId: string }) {
  const activeIndex = lessons.findIndex((l) => l.id === activeId);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (navRef.current) {
      const btn = navRef.current.querySelector(`[data-lesson-id="${activeId}"]`) as HTMLElement;
      if (btn) btn.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [activeId]);

  const handleClick = useCallback((id: string) => {
    const el = document.getElementById(`lesson-${id}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <div className="xl:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#121212]/90 backdrop-blur-md border-t border-white/[0.08] safe-area-bottom">
      <div className="h-[3px] bg-white/5">
        <div
          className="h-full bg-gradient-to-r from-[#d4af37]/50 to-[#d4af37]/80 transition-all duration-500"
          style={{ width: `${((activeIndex + 1) / lessons.length) * 100}%` }}
        />
      </div>
      <div ref={navRef} className="flex gap-1 px-2 py-2.5 overflow-x-auto scrollbar-hidden">
        {lessons.map((lesson, index) => {
          const isActive = activeId === lesson.id;
          const isPast = index < activeIndex;
          return (
            <button
              key={lesson.id}
              data-lesson-id={lesson.id}
              onClick={() => handleClick(lesson.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 text-[10px] sm:text-[11px] px-3 py-2 rounded-full transition-all duration-300 whitespace-nowrap ${isActive ? "text-[#d4af37] bg-[#d4af37]/15 font-semibold shadow-[0_0_8px_rgba(212,175,55,0.15)]" : isPast ? "text-white/50" : "text-white/30"}`}
            >
              <span className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 transition-all duration-300 ${isActive ? "bg-[#d4af37] shadow-[0_0_4px_rgba(212,175,55,0.6)]" : isPast ? "bg-white/30" : "bg-white/15"}`} />
              {String(index + 1).padStart(2, "0")}. {lesson.title}
            </button>
          );
        })}
      </div>
    </div>
  );
}
// #endregion

// #region 메인 컴포넌트
export default function HarmonyLesson({ data }: { data: LessonSection[] }) {
  const [activeLessonId, setActiveLessonId] = useState(data[0]?.id ?? "");
  const contentTopRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const trigger = window.innerHeight * 0.3;
        let current = data[0]?.id ?? "";
        for (const lesson of data) {
          const el = document.getElementById(`lesson-${lesson.id}`);
          if (!el) continue;
          if (el.getBoundingClientRect().top <= trigger) {
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
      <LessonTableOfContents lessons={data} activeId={activeLessonId} contentTopRef={contentTopRef} />
      <MobileLessonNav lessons={data} activeId={activeLessonId} />

      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-2 mb-6">
          <BookOpen className="w-4 h-4 text-[#d4af37]/60" />
          <span className="text-xs text-[#d4af37]/60 uppercase tracking-[0.15em] font-semibold">
            Harmony & Notation
          </span>
        </div>

        <div ref={contentTopRef} className="flex flex-col gap-4 pb-24 xl:pb-8">
          {data.map((lesson, index) => (
            <LessonCard key={lesson.id} lesson={lesson} index={index} />
          ))}
        </div>
      </div>
    </>
  );
}
// #endregion
