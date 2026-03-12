import { ReactNode, ElementType, HTMLAttributes } from "react";

// #region 스타일 상수
const variantStyles = {
  default: "bg-transparent md:bg-gradient-to-br md:from-stone-900/60 md:to-stone-950/80 border-0 md:border md:border-stone-800/50 md:hover:border-stone-700/70",
  subtle: "bg-transparent md:bg-stone-900/40 border-0 md:border md:border-stone-800/40 md:hover:border-stone-700/60",
  dark: "bg-transparent md:bg-black/40 border-0 md:border md:border-stone-800/30 md:hover:border-stone-700/50",
} as const;
// #endregion

interface InnerBoxProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  as?: ElementType;
  variant?: keyof typeof variantStyles;
  hover?: boolean;
}

export default function InnerBox({
  children,
  className = "",
  as: Component = "div",
  variant = "default",
  hover = true,
  ...rest
}: InnerBoxProps) {
  return (
    <Component
      className={`
        relative md:rounded-sm border-0 md:border
        ${variantStyles[variant]}
        ${hover ? "" : "md:hover:border-stone-800/50"}
        ${className}
      `}
      {...rest}
    >
      {/* 내부 하이라이트 라인 */}
      <div className="absolute inset-[1px] border border-stone-700/10 rounded-sm pointer-events-none hidden md:block" />
      {children}
    </Component>
  );
}
