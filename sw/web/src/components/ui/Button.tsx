/*
  파일명: /components/ui/Button.tsx
  기능: 기본 버튼 컴포넌트
  책임: variant/size에 따른 스타일을 적용한 버튼을 제공한다.
*/ // ------------------------------

"use client";

import { ReactNode, ButtonHTMLAttributes } from "react";

// #region Base Button
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  unstyled?: boolean;
}

/*
  평평한 면과 색 한 가지로 역할을 가른다 — 입체 그림자(bevel·engraved)와 금 테두리는 두지 않는다.
  primary(금색 면)는 화면당 가장 중요한 행동 하나에만 쓴다. 나머지는 secondary·ghost다.
  hover는 배경·글자색이 즉시 바뀐다(transition 없음).
*/
const BASE = "inline-flex items-center justify-center gap-2 rounded-control border select-none";

const variantStyles = {
  primary: `${BASE} border-transparent bg-accent text-bg-secondary font-semibold hover:bg-accent-hover`,
  secondary: `${BASE} border-line bg-bg-raised text-text-primary font-medium hover:border-line-strong hover:bg-bg-stone-light`,
  ghost: `${BASE} border-transparent bg-transparent text-text-secondary font-medium hover:bg-white/5 hover:text-text-primary`,
  danger: `${BASE} border-transparent bg-status-paused/90 text-text-primary font-semibold hover:bg-status-paused`,
};

// 높이를 최소값으로 잡아 아이콘·글자 어느 쪽이 들어와도 누르는 칸이 줄지 않는다
const sizeStyles = {
  sm: "min-h-9 px-3 text-[13px]",
  md: "min-h-10 px-5 text-sm",
  lg: "min-h-12 px-7 text-base",
};

export default function Button({
  children,
  variant = "secondary",
  size,
  className = "",
  disabled,
  unstyled,
  onClick,
  ...props
}: ButtonProps) {
  const disabledStyles = disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer";

  // unstyled가 true이면 기본 스타일을 적용하지 않음
  const variantStyle = !unstyled && variant ? variantStyles[variant] : "";
  const sizeStyle = !unstyled && size ? sizeStyles[size] : "";

  return (
    <button
      className={`${disabledStyles} ${variantStyle} ${sizeStyle} ${className}`}
      disabled={disabled}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
}
// #endregion
