/*
  파일명: components/features/game/hegemony/ui/GameButton.tsx
  기능: 패권 단추
  책임: 주 행동(금색)·보조·위험·옅은 단추를 같은 크기 체계로 그린다. 손을 올리면 색이 즉시 바뀐다(ui-hover).
*/

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { FOCUS_RING } from "./tokens";

const VARIANT = {
  primary: "bg-accent text-hg-ink border-accent hover:bg-accent-hover hover:border-accent-hover disabled:bg-hg-line disabled:border-hg-line disabled:text-text-tertiary",
  secondary: "bg-hg-raised text-hg-bright border-hg-line hover:border-accent hover:text-accent disabled:text-text-tertiary",
  danger: "bg-hg-enemy/15 text-hg-enemy border-hg-enemy/50 hover:bg-hg-enemy/25",
  ghost: "bg-transparent text-text-secondary border-transparent hover:text-hg-bright hover:bg-hg-line/40",
} as const;

const SIZE = {
  sm: "h-9 px-3 text-sm gap-1.5 rounded-lg",
  md: "h-11 px-5 text-base gap-2 rounded-xl",
  lg: "h-14 px-7 text-lg gap-2.5 rounded-2xl",
} as const;

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof VARIANT;
  size?: keyof typeof SIZE;
  icon?: ReactNode;
  /** 단축키 안내 (데스크톱에서만 보인다) */
  hotkey?: string;
  block?: boolean;
}

export default function GameButton({ variant = "secondary", size = "md", icon, hotkey, block = false, className = "", children, type = "button", ...rest }: Props) {
  return (
    <button
      type={type}
      // 글이 긴 단추에서 아이콘이 점처럼 눌리지 않게 아이콘은 줄어들지 않는다
      className={`inline-flex shrink-0 items-center justify-center whitespace-nowrap border font-bold disabled:cursor-not-allowed [&>svg]:shrink-0 ${VARIANT[variant]} ${SIZE[size]} ${block ? "w-full" : ""} ${FOCUS_RING} ${className}`}
      {...rest}
    >
      {icon}
      {children}
      {hotkey && (
        <kbd className="ms-1 hidden rounded border border-current/30 px-1.5 py-px text-xs font-bold lg:inline">{hotkey}</kbd>
      )}
    </button>
  );
}
