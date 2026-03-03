/*
  파일명: /app/reading/components/MainNoteEditor.tsx
  기능: 메인 글쓰기 에디터
  책임: 긴 글을 작성할 수 있는 TextArea를 제공한다.
*/ // ------------------------------

"use client";

import { FileText, X, Maximize2, Minimize2 } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export default function MainNoteEditor({ value, onChange }: Props) {
  const t = useTranslations("reading.mainNote");
  const [isExpanded, setIsExpanded] = useState(false);

  if (isExpanded) {
    return (
      <div className="fixed inset-0 z-40 flex flex-col bg-main">
        {/* 헤더 */}
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-secondary px-4">
          <div className="flex items-center gap-2">
            <FileText className="size-4 text-accent" />
            <span className="text-sm font-medium">{t("title")}</span>
          </div>
          <button
            onClick={() => setIsExpanded(false)}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-text-secondary hover:bg-white/5"
          >
            <Minimize2 className="size-4" />
            <span>{t("collapse")}</span>
          </button>
        </div>

        {/* 에디터 */}
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t("placeholderExpanded")}
          className="flex-1 resize-none bg-transparent p-6 text-base leading-relaxed placeholder:text-text-secondary/50 focus:outline-none"
          autoFocus
        />

        {/* 글자 수 */}
        <div className="shrink-0 border-t border-border bg-secondary px-4 py-2 text-end text-xs text-text-secondary">
          {t("charCount", { count: value.length.toLocaleString() })}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-secondary/50">
      {/* 헤더 */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-2">
          <FileText className="size-4 text-accent" />
          <span className="text-sm font-medium">{t("title")}</span>
        </div>
        <button
          onClick={() => setIsExpanded(true)}
          className="rounded p-1 text-text-secondary hover:bg-white/5 hover:text-text-primary"
          title={t("fullscreen")}
        >
          <Maximize2 className="size-4" />
        </button>
      </div>

      {/* 에디터 */}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t("placeholderCompact")}
        className="min-h-[120px] w-full resize-none bg-transparent p-3 text-sm leading-relaxed placeholder:text-text-secondary/50 focus:outline-none"
      />

      {/* 글자 수 */}
      {value.length > 0 && (
        <div className="border-t border-border/50 px-3 py-1.5 text-end text-xs text-text-secondary">
          {t("charCount", { count: value.length.toLocaleString() })}
        </div>
      )}
    </div>
  );
}
