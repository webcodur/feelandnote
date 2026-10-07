/*
  파일명: /components/ui/pending/PendingBlock.tsx
  기능: 구획이 채워지기를 기다리는 자리 지킴이
  책임: 들어올 내용의 윤곽과 높이를 미리 잡고 작은 대기 표시를 둔다.
        윤곽은 움직이지 않는다. 서버·클라이언트 어디서나 그릴 수 있다.
*/ // ------------------------------

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import PendingMark from "./PendingMark";

const GHOST = "relative overflow-hidden rounded-xl border border-border/60 bg-bg-card";
const LINE = "h-1.5 rounded-full bg-text-secondary/[0.08]";

const DEFAULT_COLS = "grid-cols-3 sm:grid-cols-4 md:grid-cols-6";

const DEFAULT_COUNT = {
  grid: 12,
  rows: 4,
  panel: 1,
} as const;

interface Props {
  /** grid: 격자 칸 · rows: 가로줄 목록 · panel: 넓은 한 판 */
  variant: keyof typeof DEFAULT_COUNT;
  /** 고스트 개수. 기본값은 격자 12칸 · 목록 4줄 */
  count?: number;
  /** 격자 열 수를 정하는 tailwind 클래스 문자열 */
  cols?: string;
  /** 격자 한 칸의 비율 */
  aspect?: string;
  /** panel 최소 높이 */
  minHeight?: string;
  className?: string;
  /** 화면 낭독기에만 읽히는 안내 문구 */
  label?: string;
  /** 구획 고유의 윤곽. 대기 표식과 접근성 처리는 공용으로 유지한다. */
  children?: ReactNode;
}

export default function PendingBlock({
  variant,
  count,
  cols = DEFAULT_COLS,
  aspect = "aspect-square",
  minHeight = "min-h-40",
  className,
  label,
  children,
}: Props) {
  const ghosts = Array.from(
    { length: count ?? DEFAULT_COUNT[variant] },
    (_, index) => index,
  );

  const body = {
    grid: (
      <div className={cn("grid gap-3", cols)}>
        {ghosts.map(index => (
          <div key={index} className={cn(GHOST, aspect)}>
            <div className="absolute inset-x-3 bottom-3 space-y-2" aria-hidden="true">
              <div className={cn(LINE, "w-2/3")} />
              <div className={cn(LINE, "w-2/5")} />
            </div>
          </div>
        ))}
      </div>
    ),
    rows: (
      <div className="flex flex-col gap-3">
        {ghosts.map(index => (
          <div key={index} className={cn(GHOST, "flex h-16 items-center gap-3 px-4")} aria-hidden="true">
            <div className="h-8 w-8 shrink-0 rounded-lg bg-text-secondary/[0.05]" />
            <div className="flex-1 space-y-2.5">
              <div className={cn(LINE, index % 2 ? "w-1/2" : "w-2/3")} />
              <div className={cn(LINE, "w-1/4")} />
            </div>
          </div>
        ))}
      </div>
    ),
    panel: <div className={cn(GHOST, minHeight)} />,
  }[variant];

  return (
    <div role="status" aria-busy="true" aria-label={label ?? "Loading"} className={cn("relative", className)}>
      <div aria-hidden="true" className="h-full">{children ?? body}</div>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <PendingMark className="rounded-full border border-border/60 bg-bg-main/95" />
      </div>
    </div>
  );
}
