/*
  파일명: /components/ui/CategoryTabFilter.tsx
  기능: 카테고리·필터 선택 칩 묶음
  책임: 랭킹 계열의 CategoryChip을 배치한다. 매체 줄은 media로 아이콘·대표색을 켠다.
*/ // ------------------------------

"use client";

import CategoryChip from "./CategoryChip";

export interface CategoryTabOption<T extends string = string> {
  value: T;
  label: string;
  disabled?: boolean;
}

interface CategoryTabFilterProps<T extends string> {
  options: CategoryTabOption<T>[];
  value: T;
  /** 도서·영상·게임·음악의 아이콘과 대표색을 쓴다. */
  media?: boolean;
  /** 클릭 콜백 — 이게 있으면 버튼 모드다 */
  onChange?: (value: T) => void;
  /** 주소를 돌려주는 콜백 — 돌려준 값이 있으면 항목이 그 주소로 이동한다. 없으면 버튼 모드다 */
  linkTo?: (value: T) => string | undefined;
  /** 아래 줄의 세부 선택은 글자 굵기를 낮춘다. */
  subtle?: boolean;
  /** 세부 줄에 쓰는 작은 칩. */
  size?: "md" | "sm";
  /** 글자 크기는 그대로 두고 칩 여백만 줄인다. */
  compact?: boolean;
  align?: "center" | "left";
  /** 칩이 많을 때 한 줄 스크롤 대신 여러 줄로 감싸 중앙에 모은다 (직군 필터 등) */
  wrap?: boolean;
  /** 고정 열 그리드로 렌더 — 직군 3열 등 공통 모듈로 레이아웃을 강제한다 */
  gridCols?: 2 | 3 | 4 | 5 | 6;
  className?: string;
  /** 고른 값이 없을 때(전체 모드) 모든 칩을 은은한 선택 상태로 보여준다 — 별도 전체 칩을 두지 않는 둘러보기용 */
  faintAllActive?: boolean;
}

export function CategoryTabFilter<T extends string>({
  options,
  value,
  media = false,
  onChange,
  linkTo,
  subtle = false,
  size = "md",
  compact = false,
  align = "center",
  wrap = false,
  gridCols,
  className = "",
  faintAllActive = false,
}: CategoryTabFilterProps<T>) {
  // 전체 모드(고른 값이 옵션에 없음)에서는 모든 칩을 은은한 선택 상태로 보여준다
  const showFaintAll = faintAllActive && !options.some((o) => o.value === value);
  const pad =
    size === "sm"
      ? compact ? "px-2 py-0.5 text-xs sm:text-sm" : "px-3 py-1.5 text-xs sm:text-sm"
      : compact ? "px-2.5 sm:px-3 py-0.5 text-sm" : "min-h-11 px-4 py-2 text-sm";
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
        className={`${isGrid ? `${gridClass} gap-1.5 p-1 max-w-md w-full` : wrap ? `flex flex-wrap ${align === "left" ? "justify-start" : "justify-center"} gap-1.5 p-1 max-w-4xl` : "inline-flex min-w-max items-center gap-1 p-1"} ${align === "center" && !isGrid ? "mx-auto" : ""}`}
      >
        {options.map((option) => {
          const isActive = value === option.value;
          // 전체 모드에서는 개별 하이라이트 없이 모든 칩이 은은한 선택 상태로 보인다
          const faint = showFaintAll;

          const cls = ["h-auto whitespace-nowrap", pad, subtle && "font-medium",
            faint && "border-accent/20 bg-accent/[0.07] text-accent hover:border-accent/40 hover:bg-accent/[0.12]"].filter(Boolean).join(" ");

          const href = linkTo && !option.disabled ? linkTo(option.value) : undefined;
          // 주소와 손잡이를 함께 받으면 링크로 그리되 누름은 가로챈다.
          // 화면은 그대로 갈아 끼우면서, 서버가 보내는 HTML 에는 그 탭으로 가는 길이 남는다.
          return (
            <CategoryChip key={option.value} href={href} selected={isActive} disabled={option.disabled}
              media={media ? option.value : undefined} className={cls}
              onClick={onChange ? (e) => {
                if (href && (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)) return;
                if (href) e.preventDefault();
                onChange(option.value);
              } : undefined}>
              {option.label}
            </CategoryChip>
          );
        })}
      </div>
    </div>
  );
}
