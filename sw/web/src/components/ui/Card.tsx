/*
  파일명: /components/ui/Card.tsx
  기능: 카드 컴포넌트
  책임: 콘텐츠를 감싸는 기본 컨테이너 스타일을 제공한다.
*/ // ------------------------------

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
      className={`bg-bg-card border border-border rounded-lg md:rounded-xl p-3 md:p-4 shadow-md hover:shadow-lg hover:border-accent/30
        ${hover ? "hover:-translate-y-0.5 hover:border-accent hover:shadow-xl" : ""}
        ${onClick ? "cursor-pointer" : ""}
        ${className}`}
      onClick={onClick}
      {...rest}
    >
      {children}
    </div>
  );
}
