import { ReactNode, ElementType, HTMLAttributes } from "react";

// #region 스타일 상수
const variantStyles = {
  default: "bg-gradient-to-br from-bg-card/60 to-bg-secondary/80 border-line hover:border-line-strong",
  subtle: "bg-bg-card/40 border-line hover:border-line-strong",
  dark: "bg-bg-secondary/80 border-line hover:border-line-strong",
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
        relative rounded-sm border
        ${variantStyles[variant]}
        ${hover ? "" : "hover:!border-line"}
        ${className}
      `}
      {...rest}
    >
      {/* 내부 하이라이트 라인 */}
      <div className="absolute inset-[1px] border border-stone-700/10 rounded-sm pointer-events-none" />
      {children}
    </Component>
  );
}
