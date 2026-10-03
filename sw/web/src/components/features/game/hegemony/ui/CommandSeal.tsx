/*
  파일명: components/features/game/hegemony/ui/CommandSeal.tsx
  기능: 명령 도장
  책임: 명령을 공용 아이콘과 색으로 보여 준다. 카드 모서리·명령 단추·기록 줄이 함께 쓴다.
*/

import type { Command } from "@/lib/game/types";
import { COMMAND_TONE } from "./tokens";

const SIZE = {
  xs: "size-5 text-xs rounded-md",
  sm: "size-7 text-sm rounded-lg",
  md: "size-10 text-lg rounded-xl",
  lg: "size-14 text-2xl rounded-2xl",
  /** 무대 위 도장 — 좁은 화면에서는 한 단 작게 */
  arena: "size-10 text-lg rounded-xl lg:size-14 lg:text-2xl lg:rounded-2xl",
} as const;

interface Props {
  command: Command;
  size?: keyof typeof SIZE;
  /** 채워진 도장(선택·강조)인가 */
  solid?: boolean;
  className?: string;
}

export default function CommandSeal({ command, size = "sm", solid = false, className = "" }: Props) {
  const tone = COMMAND_TONE[command];
  const Icon = tone.icon;
  const look = solid ? `${tone.fill} text-hg-ink border-transparent` : `${tone.soft} ${tone.text} ${tone.border}`;
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center border font-black leading-none ${SIZE[size]} ${look} ${className}`}
    >
      <Icon className="size-[55%]" strokeWidth={2.5} />
    </span>
  );
}
