/*
  파일명: /components/ui/Card.tsx
  기능: 카드 컴포넌트
  책임: 콘텐츠를 감싸는 기본 컨테이너 스타일을 제공한다.
*/ // ------------------------------

import { ReactNode, HTMLAttributes } from "react";
import ClassicalBox from "./ClassicalBox";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hover?: boolean;
  variant?: "classical" | "sarcophagus";
}

export default function Card({
  children,
  className = "",
  hover = false,
  variant = "classical",
  onClick,
  ...rest
}: CardProps) {
  if (variant === "classical") {
    return (
      <ClassicalBox
        hover={hover}
        className={`${onClick ? "cursor-pointer" : ""} ${className}`}
        onClick={onClick}
        {...rest}
      >
        {children}
      </ClassicalBox>
    );
  }

  return (
    <div
      className={`card-sarcophagus p-4 md:p-6
        ${hover ? "hover:border-accent hover:shadow-[0_0_15px_rgba(212,175,55,0.3)] cursor-pointer" : ""}
        ${onClick ? "cursor-pointer" : ""}
        ${className}`}
      onClick={onClick}
      {...rest}
    >
      {children}
    </div>
  );
}
