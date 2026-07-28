/*
  파일명: /app/reading/components/RotatingQuote.tsx
  기능: 로테이션 명언 컴포넌트 및 관리 UI
  책임: 명언을 일정 시간마다 교체하여 보여주고, 사용자가 직접 편집할 수 있는 기능을 제공한다.
*/ // ------------------------------

"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Quote, Settings2, Plus, Trash2, X, ChevronLeft, ChevronRight } from "lucide-react";
import type { ReadingQuote } from "../types";
import { Z_INDEX } from "@/constants/zIndex";

interface Props {
  quotes: ReadingQuote[];
  onAdd: () => void;
  onUpdate: (id: string, updates: Partial<ReadingQuote>) => void;
  onDelete: (id: string) => void;
}

export default function RotatingQuote({ quotes, onAdd, onUpdate, onDelete }: Props) {
  const t = useTranslations("reading.quote");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isManaging, setIsManaging] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // 명언 로테이션 (10초마다)
  useEffect(() => {
    if (isManaging || quotes.length <= 1) return;

    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % quotes.length);
        setIsAnimating(false);
      }, 500);
    }, 10000);

    return () => clearInterval(interval);
  }, [quotes.length, isManaging]);

  const currentQuote = quotes[currentIndex] || { quote: t("fallbackQuote"), author: "" };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + quotes.length) % quotes.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % quotes.length);
  };

  return (
    <div className="relative mb-4 overflow-hidden rounded-xl border border-accent/20 bg-accent/5 p-4 transition-all hover:bg-accent/10">
      <div className="mb-4 flex items-center justify-between">
        {/* 좌측 빈 공간 (중앙 정렬 유지용) */}
        <div className="w-8" /> 

        {/* 네비게이션 (상단 중앙) */}
        <div className="flex items-center gap-3">
          <button 
            onClick={handlePrev} 
            className="rounded-full p-0.5 hover:bg-white/10 hover:text-accent transition-all active:scale-90"
            title={t("prevQuote")}
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="text-[10px] font-bold tracking-[0.2em] tabular-nums opacity-50">
            {currentIndex + 1} / {quotes.length}
          </span>
          <button 
            onClick={handleNext} 
            className="rounded-full p-0.5 hover:bg-white/10 hover:text-accent transition-all active:scale-90"
            title={t("nextQuote")}
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        {/* 관리 버튼 */}
        <button
          onClick={() => setIsManaging(true)}
          className="rounded-lg p-1.5 hover:bg-white/10 hover:text-accent transition-colors"
          title={t("manage")}
        >
          <Settings2 className="size-4" />
        </button>
      </div>

      {/* 명언 표시 영역 */}
      <div className={`min-h-[70px] flex flex-col justify-center transition-all duration-500 ${isAnimating ? "translate-x-4 opacity-0" : "translate-x-0 opacity-100"}`}>
        <p className="text-sm italic leading-relaxed text-text-primary px-2">
          {currentQuote.quote}
        </p>
        {currentQuote.author && (
          <p className="mt-2 text-end text-[10px] font-medium px-2">— {currentQuote.author}</p>
        )}
      </div>

      {/* 관리 모달 (중앙 집중형) */}
      {isManaging && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" style={{ zIndex: Z_INDEX.modal }}>
          <div className="flex h-[80vh] w-full max-w-lg flex-col rounded-2xl border border-border bg-[#1a1f27] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* 헤더 */}
            <div className="flex items-center justify-between border-b border-border bg-secondary/50 p-4">
              <div className="flex items-center gap-2">
                <Quote className="size-5 text-accent" />
                <h3 className="text-base font-bold text-text-primary">{t("manageTitle")}</h3>
              </div>
              <button
                onClick={() => setIsManaging(false)}
                className="rounded-lg p-2 text-text-secondary hover:bg-white/10 hover:text-text-primary transition-colors"
                title={t("close")}
              >
                <X className="size-5" />
              </button>
            </div>

            {/* 본문 (목록) */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {quotes.map((q) => (
                <div 
                  key={q.id} 
                  className="group relative rounded-xl border border-border/50 bg-white/[0.03] p-4 transition-all focus-within:border-accent/50 focus-within:bg-white/[0.05]"
                >
                  <textarea
                    value={q.quote}
                    onChange={(e) => onUpdate(q.id, { quote: e.target.value })}
                    placeholder={t("quotePlaceholder")}
                    className="w-full resize-none bg-transparent text-sm leading-relaxed text-text-primary placeholder: outline-none"
                    rows={3}
                  />
                  <div className="mt-2 flex items-center gap-2 border-t border-white/5 pt-2">
                    <span className="text-[10px] uppercase tracking-wider font-bold">BY</span>
                    <input
                      type="text"
                      value={q.author}
                      onChange={(e) => onUpdate(q.id, { author: e.target.value })}
                      placeholder={t("authorPlaceholder")}
                      className="flex-1 bg-transparent text-xs text-text-secondary outline-none placeholder:"
                    />
                  </div>
                  <button
                    onClick={() => onDelete(q.id)}
                    className="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full bg-red-500 text-white shadow-lg opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-600 active:scale-95"
                    title={t("deleteQuote")}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}
              
              <button
                onClick={onAdd}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-6 text-sm transition-all hover:border-accent hover:bg-accent/5 hover:text-accent group"
              >
                <Plus className="size-5 transition-transform group-hover:rotate-90" /> 
                <span className="font-semibold">{t("addNew")}</span>
              </button>
            </div>
            
            {/* 푸터 */}
            <div className="border-t border-border bg-secondary/30 p-4 text-center">
              <p className="text-xs">{t("storageNotice")}</p>
              <button
                onClick={() => setIsManaging(false)}
                className="mt-4 w-full rounded-xl bg-accent py-3 text-sm font-bold text-black transition-transform active:scale-95"
              >
                {t("doneButton")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
