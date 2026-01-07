/*
  파일명: /components/ui/Badge.tsx
  기능: 배지 컴포넌트
  책임: variant에 따른 스타일로 태그/라벨을 표시한다.
*/ // ------------------------------

import { ReactNode } from "react";

interface BadgeProps {
  children: ReactNode;
  variant?: "default" | "primary" | "success" | "warning" | "error";
  className?: string;
}

const variantStyles = {
  default: "bg-white/10 text-text-secondary",
  primary: "bg-accent/20 text-accent",
  success: "bg-green-500/20 text-green-400",
  warning: "bg-yellow-500/20 text-yellow-400",
  error: "bg-red-500/20 text-red-400",
};

export default function Badge({
  children,
  variant = "default",
  className = "",
}: BadgeProps) {
  return (
    <span
      className={`inline-block py-1 px-3 rounded-xl text-xs font-semibold ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
