/*
  파일명: /app/reading/components/ReadingWorkspace/SupportSidebar.tsx
  기능: 우측 독서 지원 사이드바
  책임: 로테이션 명언, 독서 질문/이유/방법론, 안내 버튼을 표시한다.
*/ // ------------------------------

"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  HelpCircle,
  BookMarked,
  Lightbulb,
  Info,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import RotatingQuote from "../RotatingQuote";
import {
  READING_QUESTIONS,
  READING_REASONS,
  READING_METHODS,
} from "../../constants";
import type { ReadingQuote } from "../../types";

interface Props {
  width: number;
  customQuotes: ReadingQuote[];
  onResizeStart: (e: React.MouseEvent) => void;
  onAddQuote: () => void;
  onUpdateQuote: (id: string, updates: Partial<ReadingQuote>) => void;
  onDeleteQuote: (id: string) => void;
  onReopenGuide: () => void;
}

export default function SupportSidebar({
  width,
  customQuotes,
  onResizeStart,
  onAddQuote,
  onUpdateQuote,
  onDeleteQuote,
  onReopenGuide,
}: Props) {
  const t = useTranslations("reading.workspace");
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div className="relative hidden shrink-0 lg:flex" style={{ width }}>
      {/* 우측 리사이즈 핸들 */}
      <div
        onMouseDown={onResizeStart}
        className="absolute -start-1 top-0 z-20 h-full w-2 cursor-col-resize hover:bg-accent/30"
      />
      <aside className="flex-1 overflow-y-auto border-s border-border bg-secondary p-4">
        {/* 로테이션 명언 */}
        <RotatingQuote
          quotes={customQuotes}
          onAdd={onAddQuote}
          onUpdate={onUpdateQuote}
          onDelete={onDeleteQuote}
        />

        {/* 저장소 안내 */}
        <div className="mb-4 flex items-start gap-2 rounded-lg bg-yellow-500/10 p-3 text-xs text-yellow-200/80">
          <Info className="mt-0.5 size-4 shrink-0" />
          <p>
            {t("storageNotice")}
          </p>
        </div>

        {/* 독서 질문 */}
        <CollapsibleSection
          title={t("questionsTitle")}
          icon={<HelpCircle className="size-4" />}
          isExpanded={expandedSection === "questions"}
          onToggle={() => toggleSection("questions")}
        >
          {READING_QUESTIONS.map((group) => (
            <div key={group.category} className="mb-3">
              <p className="mb-1.5 text-xs font-semibold text-accent">{group.category}</p>
              <ul className="space-y-1">
                {group.questions.map((q, i) => (
                  <li key={i} className="text-xs leading-relaxed text-text-secondary">
                    • {q}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </CollapsibleSection>

        {/* 독서의 이유 */}
        <CollapsibleSection
          title={t("reasonsTitle")}
          icon={<Lightbulb className="size-4" />}
          isExpanded={expandedSection === "reasons"}
          onToggle={() => toggleSection("reasons")}
        >
          <ul className="space-y-2">
            {READING_REASONS.map((reason, i) => (
              <li key={i}>
                <p className="text-xs font-medium text-text-primary">{reason.title}</p>
                <p className="text-xs text-text-secondary">{reason.description}</p>
              </li>
            ))}
          </ul>
        </CollapsibleSection>

        {/* 독서 방법론 */}
        <CollapsibleSection
          title={t("methodsTitle")}
          icon={<BookMarked className="size-4" />}
          isExpanded={expandedSection === "methods"}
          onToggle={() => toggleSection("methods")}
        >
          {READING_METHODS.map((method, i) => (
            <div key={i} className="mb-3">
              <p className="text-xs font-semibold text-accent">{method.name}</p>
              <p className="mb-1 text-xs text-text-secondary">{method.description}</p>
              <ol className="list-inside list-decimal text-xs text-text-secondary">
                {method.steps.map((step, j) => (
                  <li key={j}>{step}</li>
                ))}
              </ol>
            </div>
          ))}
        </CollapsibleSection>

        {/* 사용 안내 다시 보기 버튼 */}
        <button
          onClick={onReopenGuide}
          className="mt-4 w-full rounded-lg bg-white/5 py-2 text-sm text-text-secondary hover:bg-white/10"
        >
          {t("reopenGuide")}
        </button>
      </aside>
    </div>
  );
}

// #region 접이식 섹션 컴포넌트
interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function CollapsibleSection({
  title,
  icon,
  isExpanded,
  onToggle,
  children,
}: CollapsibleSectionProps) {
  return (
    <div className="mb-3 rounded-xl bg-white/5">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between p-3 text-start"
      >
        <div className="flex items-center gap-2 text-sm font-medium">
          {icon}
          {title}
        </div>
        {isExpanded ? (
          <ChevronUp className="size-4 text-text-secondary" />
        ) : (
          <ChevronDown className="size-4 text-text-secondary" />
        )}
      </button>
      {isExpanded && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
}
// #endregion
