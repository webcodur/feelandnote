/*
  파일명: /components/ui/pending/PendingBlock.tsx
  기능: 구획이 채워지기를 기다리는 자리 지킴이
  책임: 들어올 내용만큼 높이를 미리 잡아 레이아웃이 튀지 않게 하고, 그 위 가운데에 표식 하나만 둔다.
        고스트는 맥동하지 않는다. 훅을 쓰지 않으므로 서버·클라이언트 어디서나 그릴 수 있다.
*/ // ------------------------------

import { cn } from "@/lib/utils";
import PendingMark from "./PendingMark";

/** 고스트 한 칸. 잿빛 맥동 대신 아주 옅은 면과 테두리만 남긴다. */
const GHOST = "bg-white/[0.03] border border-white/[0.06] rounded-xl";

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
}

export default function PendingBlock({
  variant,
  count,
  cols = DEFAULT_COLS,
  aspect = "aspect-square",
  minHeight = "min-h-40",
  className,
  label,
}: Props) {
  const ghosts = Array.from(
    { length: count ?? DEFAULT_COUNT[variant] },
    (_, index) => index,
  );

  const body = {
    grid: (
      <div className={cn("grid gap-3", cols)}>
        {ghosts.map(index => (
          <div key={index} className={cn(GHOST, aspect)} />
        ))}
      </div>
    ),
    rows: (
      <div className="flex flex-col gap-3">
        {ghosts.map(index => (
          <div key={index} className={cn(GHOST, "h-16")} />
        ))}
      </div>
    ),
    panel: <div className={cn(GHOST, minHeight)} />,
  }[variant];

  return (
    <div role="status" aria-busy="true" className={cn("relative", className)}>
      {body}
      <div className="absolute inset-0 flex items-center justify-center">
        <PendingMark />
      </div>
      {label && <span className="sr-only">{label}</span>}
    </div>
  );
}
