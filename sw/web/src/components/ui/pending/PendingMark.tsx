/*
  파일명: /components/ui/pending/PendingMark.tsx
  기능: 대기 표식 — 금색 헤어라인 양옆 + 가운데 45° 마름모
  책임: 아직 채워지지 않은 자리에 브랜드 장식 어휘(SectionHeader 상단 장식)를 그대로 놓는다.
        헤어라인이 그려졌다 사라지고 마름모는 밝기만 오간다. 맥동하는 잿빛 덩어리를 대신한다.
*/ // ------------------------------

import { cn } from "@/lib/utils";

const SIZE_CLASS = {
  sm: "w-16", // 4rem
  md: "w-28", // 7rem
} as const;

interface Props {
  size?: keyof typeof SIZE_CLASS;
  className?: string;
}

export default function PendingMark({ size = "md", className }: Props) {
  return (
    <div
      aria-hidden
      className={cn(
        "flex items-center justify-center gap-2",
        SIZE_CLASS[size],
        className,
      )}
    >
      <span className="h-px flex-1 animate-pending-line bg-gradient-to-r from-transparent to-accent motion-reduce:animate-none" />
      <span className="h-1.5 w-1.5 shrink-0 rotate-45 animate-pending-mark border border-accent motion-reduce:animate-none" />
      <span className="h-px flex-1 animate-pending-line bg-gradient-to-l from-transparent to-accent motion-reduce:animate-none" />
    </div>
  );
}
