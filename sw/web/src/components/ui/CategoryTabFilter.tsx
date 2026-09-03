/*
  파일명: /components/ui/CategoryTabFilter.tsx
  기능: 카테고리·필터·모드 선택 pill (공용)
  책임: 한 줄짜리 선택지를 일관된 디자인 시스템으로 그린다.
        1단 메인 모드와 2단 서브 필터가 통일된 형태를 유지하되, 
        2단(subtle)은 은은한 글래시 악센트로 시각적 계층을 세련되게 분리한다.
*/ // ------------------------------

"use client";

import { Link } from "@/i18n/navigation";

export interface CategoryTabOption<T extends string = string> {
  value: T;
  label: string;
  /** 옆에 작게 붙는 수치(목록 수 등) — 없으면 안 붙는다 */
  count?: number;
}

interface CategoryTabFilterProps<T extends string> {
  options: CategoryTabOption<T>[];
  value: T;
  /** 클릭 콜백 — 이게 있으면 버튼 모드다 */
  onChange?: (value: T) => void;
  /** 주소를 돌려주는 콜백 — 돌려준 값이 있으면 항목이 그 주소로 이동한다. 없으면 버튼 모드다 */
  linkTo?: (value: T) => string | undefined;
  /** 아래 줄에 놓이는 세부 선택 — 은은한 글래시 악센트 칩으로 1단과 통일감 있는 계층을 만든다 */
  subtle?: boolean;
  /** 작은 크기 — 세부 줄에서 pill이 눌릴 때 쓰면 된다 */
  size?: "md" | "sm";
  align?: "center" | "left";
  /** 칩이 많을 때 한 줄 스크롤 대신 여러 줄로 감싸 중앙에 모은다 (직군 필터 등) */
  wrap?: boolean;
  /** 고정 열 그리드로 렌더 — 직군 3열 등 공통 모듈로 레이아웃을 강제한다 */
  gridCols?: 2 | 3 | 4 | 5 | 6;
  className?: string;
  /** 고른 값이 없을 때(전체 모드) 모든 칩을 은은한 선택 상태로 보여준다 — 별도 전체 칩을 두지 않는 둘러보기용 */
  faintAllActive?: boolean;
}

// 1단 메인 모드용 솔리드 골드 그라디언트 pill
const ACTIVE_PRIMARY_PILL =
  "text-neutral-950 bg-gradient-to-br from-accent via-yellow-200 to-accent font-bold shadow-[0_0_16px_rgba(212,175,55,0.4)] border border-transparent";

// 2단 서브 칩용 글래시 악센트 pill — 선택은 쨍하게, 전체 모드의 절반 농도 faint와 대비된다
const ACTIVE_SUBTLE_PILL =
  "text-accent bg-accent/25 border border-accent/60 font-semibold shadow-[0_0_16px_rgba(212,175,55,0.35)]";

// 전체 모드용 절반 농도 pill — 선택 상태의 절반 느낌으로만 살짝 깔아준다
const FAINT_ALL_PILL =
  "text-accent/60 bg-accent/[0.07] border border-accent/20 font-medium";

export function CategoryTabFilter<T extends string>({
  options,
  value,
  onChange,
  linkTo,
  subtle = false,
  size = "md",
  align = "center",
  wrap = false,
  gridCols,
  className = "",
  faintAllActive = false,
}: CategoryTabFilterProps<T>) {
  // 전체 모드(고른 값이 옵션에 없음)에서는 모든 칩을 은은한 선택 상태로 보여준다
  const showFaintAll = faintAllActive && !options.some((o) => o.value === value);
  const pad = size === "sm" ? "px-3 py-1.5 text-xs sm:text-sm" : "px-4 sm:px-5 py-2 text-sm md:text-base";
  const isGrid = !!gridCols;
  const justify = align === "left" ? "justify-start" : isGrid ? "justify-center" : "";
  const gridClass =
    gridCols === 2
      ? "grid grid-cols-2"
      : gridCols === 3
        ? "grid grid-cols-3"
        : gridCols === 4
          ? "grid grid-cols-4"
          : gridCols === 5
            ? "grid grid-cols-5"
            : gridCols === 6
              ? "grid grid-cols-6"
              : "";

  return (
    <div
      className={`flex min-w-0 max-w-full ${isGrid ? "pb-0" : wrap ? "flex-wrap pb-0" : "overflow-x-auto pb-1 scrollbar-hidden"} ${justify} ${className}`}
    >
      <div
        className={`${isGrid ? `${gridClass} gap-1.5 p-1.5 max-w-md w-full` : wrap ? "flex flex-wrap justify-center gap-1.5 p-1.5 max-w-4xl" : "inline-flex min-w-max items-center gap-1 p-1"} ${align === "center" && !isGrid ? "mx-auto" : ""} ${
          subtle
            ? "bg-neutral-950/60 backdrop-blur-sm border border-white/[0.08] rounded-xl shadow-inner"
            : "bg-neutral-900/80 backdrop-blur-md rounded-2xl border border-white/10 shadow-lg p-1.5"
        }`}
      >
        {options.map((option) => {
          const isActive = value === option.value;
          // 전체 모드에서는 개별 하이라이트 없이 모든 칩이 은은한 선택 상태로 보인다
          const faint = showFaintAll;

          const cls = [
            "rounded-xl whitespace-nowrap border",
            pad,
            isActive
              ? subtle
                ? ACTIVE_SUBTLE_PILL
                : ACTIVE_PRIMARY_PILL
              : faint
                ? `${FAINT_ALL_PILL} hover:text-accent hover:border-accent/40 hover:bg-accent/[0.12]`
                : "border-transparent text-text-secondary hover:bg-white/[0.06] hover:text-white",
            !linkTo && "active:scale-95",
          ]
            .filter(Boolean)
            .join(" ");

          const content = (
            <span className={isActive && !subtle ? "font-serif" : undefined}>
              {option.label}
              {option.count !== undefined && (
                <span className={`ml-1.5 text-xs ${isActive ? (subtle ? "text-accent/80" : "text-black/60") : faint ? "text-accent/40" : "text-text-tertiary"}`}>
                  {option.count.toLocaleString()}
                </span>
              )}
            </span>
          );

          const href = linkTo ? linkTo(option.value) : undefined;
          return href ? (
            <Link key={option.value} href={href} aria-current={isActive ? "page" : undefined} className={cls}>
              {content}
            </Link>
          ) : (
            <button
              key={option.value}
              type="button"
              aria-pressed={isActive}
              onClick={() => onChange?.(option.value)}
              className={cls}
            >
              {content}
            </button>
          );
        })}
      </div>
    </div>
  );
}
