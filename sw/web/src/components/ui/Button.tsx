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

const variantStyles = {
  primary:
    "inline-flex items-center justify-center gap-2 bg-accent text-bg-main effect-bevel hover:bg-accent-hover hover:text-bg-secondary border border-transparent rounded-sm font-bold [&>svg]:drop-shadow-sm",
  secondary:
    "inline-flex items-center justify-center gap-2 bg-bg-card text-text-primary effect-engraved border border-accent-dim/30 hover:bg-accent/10 hover:border-accent hover:text-accent rounded-sm font-semibold",
  ghost:
    "inline-flex items-center justify-center bg-transparent text-text-secondary hover:text-accent hover:bg-accent/5 rounded-sm font-medium",
  danger:
    "inline-flex items-center justify-center gap-2 bg-red-900/80 text-white effect-bevel hover:bg-red-800 border border-red-700/50 rounded-sm font-cinzel font-bold",
};

const sizeStyles = {
  sm: "py-1.5 px-3 text-xs tracking-wide",
  md: "py-2 px-6 text-sm tracking-wide",
  lg: "py-3 px-8 text-base tracking-widest",
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
