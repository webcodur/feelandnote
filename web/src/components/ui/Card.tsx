import { ReactNode, HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hover?: boolean;
}

export default function Card({
  children,
  className = "",
  hover = false,
  onClick,
  ...rest
}: CardProps) {
  return (
    <div
      className={`bg-bg-card border border-border rounded-2xl p-6 shadow-lg transition-all duration-300 hover:shadow-xl hover:border-accent/30
        ${hover ? "hover:-translate-y-1 hover:border-accent hover:shadow-2xl" : ""}
        ${onClick ? "cursor-pointer" : ""}
        ${className}`}
      onClick={onClick}
      {...rest}
    >
      {children}
    </div>
  );
}
