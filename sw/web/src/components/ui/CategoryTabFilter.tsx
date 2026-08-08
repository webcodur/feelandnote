/*
  파일명: /components/ui/CategoryTabFilter.tsx
  기능: 카테고리·필터·모드 선택 pill (공용)
  책임: 한 줄짜리 선택지를 금색 pill 줄로 그린다.
        홈 검색 카테고리·인기 작품 기준/카테고리·기관 선정 둘러보기가 모두 이 파일 하나를 쓴다.
        마우스를 올리면 즉시 색이 강해지고(지연 없는 hover), 고른 항목만 금색 pill로 채운다.
  통일 규칙: 이 파일이 밖과 안을 가리지 않는다. 화면마다 독자 필터를 새로 만들지 않는다.
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
  /** 아래 줄에 놓이는 세부 선택 — 활성 pill을 금색 그대로 두되 줄 자체는 옅게 표시한다 */
  subtle?: boolean;
  /** 작은 크기 — 세부 줄에서 pill이 눌릴 때 쓰면 된다 */
  size?: "md" | "sm";
  align?: "center" | "left";
  className?: string;
}

const ACTIVE_PILL =
  "text-neutral-900 bg-gradient-to-br from-accent via-yellow-200 to-accent shadow-[0_0_15px_rgba(212,175,55,0.4)]";

export function CategoryTabFilter<T extends string>({
  options,
  value,
  onChange,
  linkTo,
  subtle = false,
  size = "md",
  align = "center",
  className = "",
}: CategoryTabFilterProps<T>) {
  const pad = size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm";

  return (
    <div
      className={`flex overflow-x-auto pb-1 scrollbar-hidden ${
        align === "left" ? "justify-start" : "justify-center"
      } ${className}`}
    >
      <div
        className={`inline-flex min-w-max items-center gap-1 p-1 ${
          subtle
            ? "bg-black/20 border border-white/[0.04] rounded-lg"
            : "bg-neutral-900/80 backdrop-blur-md rounded-xl border border-white/10 shadow-inner"
        }`}
      >
        {options.map((option) => {
          const isActive = value === option.value;

          const cls = [
            "rounded-lg font-bold whitespace-nowrap transition-colors",
            pad,
            isActive
              ? ACTIVE_PILL
              : "text-text-secondary hover:bg-white/5 hover:text-white",
            !linkTo && "active:scale-95",
          ]
            .filter(Boolean)
            .join(" ");

          // 활성화라고 글자를 키우거나 줄이지 않는다 — 온·오프는 배경과 색으로만 말한다
          const content = (
            <span className={isActive && !subtle ? "font-serif" : undefined}>
              {option.label}
              {option.count !== undefined && (
                <span className={`ml-1.5 ${isActive ? "text-black/60" : "text-text-tertiary"}`}>
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