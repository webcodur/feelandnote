import type { ReactNode } from "react";

/** 음원이 실제로 올라간 항목은 라벨 뒤에 초록 배경이 맥박해 듣기 가능을 표시한다 */
export default function AudioAvailableLabel({ children }: { children: ReactNode }) {
  return (
    <span className="relative inline-flex items-center">
      <span
        aria-hidden
        className="absolute -inset-x-2 -inset-y-1 rounded-md bg-emerald-400/15 motion-safe:animate-pulse"
      />
      <span className="relative text-emerald-400">{children}</span>
    </span>
  );
}
