/*
  파일명: /components/features/user/contentLibrary/expand/ExpandModeTabs.tsx
  기능: 펼침 보기 카드의 본문 모드 전환 — 작품 소개와 감상 배경을 탭으로 가른다.
  책임: 두 본문을 겹쳐 쌓지 않고 하나씩 보여 준다. 칸은 균등 분할하고 고른 칸 밑에
        강조 밑줄을 깐다. 모드 상태는 작품을 넘겨도 유지되게 카드 밖(ExpandDetailView)이 쥔다.
*/ // ------------------------------
"use client";

export type ExpandCardMode = "intro" | "review";

interface ExpandModeTabsProps {
  introLabel: string;
  reviewLabel: string;
  ariaLabel: string;
  active: ExpandCardMode;
  onChange: (mode: ExpandCardMode) => void;
}

const MODES: readonly ExpandCardMode[] = ["intro", "review"];

export default function ExpandModeTabs({
  introLabel,
  reviewLabel,
  ariaLabel,
  active,
  onChange,
}: ExpandModeTabsProps) {
  const activeIndex = MODES.indexOf(active);

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="relative grid grid-cols-2 border-b border-white/10"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-1/2 border-b-2 border-accent bg-accent/[0.06] transition-transform duration-150 ease-out motion-reduce:transition-none"
        style={{ transform: `translateX(${activeIndex * 100}%)` }}
      />
      {MODES.map((mode) => {
        const isActive = mode === active;
        return (
          <button
            key={mode}
            id={`expand-tab-${mode}`}
            type="button"
            role="tab"
            data-testid={`expand-mode-${mode}`}
            aria-selected={isActive}
            aria-controls={`expand-panel-${mode}`}
            onClick={() => onChange(mode)}
            className={`relative flex h-10 items-center justify-center px-2 text-center text-sm font-medium leading-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/70 sm:h-11 sm:text-base ${
              isActive ? "text-accent" : "text-text-tertiary hover:text-text-primary"
            }`}
          >
            <span className="min-w-0 truncate">{mode === "intro" ? introLabel : reviewLabel}</span>
          </button>
        );
      })}
    </div>
  );
}
