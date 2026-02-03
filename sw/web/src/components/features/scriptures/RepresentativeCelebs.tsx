/*
  파일명: /components/features/scriptures/RepresentativeCelebs.tsx
  기능: 대표 셀럽 표시 컴포넌트
  책임: 셀럽 목록을 다양한 레이아웃으로 표시한다.
*/ // ------------------------------

"use client";

import CelebCard from "@/components/shared/CelebCard";
import { DecorativeLabel } from "@/components/ui";

interface Celeb {
  id: string;
  nickname: string;
  avatar_url?: string | null;
  title?: string | null;
  count?: number;
}

interface Props {
  celebs: Celeb[];
  title?: string;
  type?: "modern" | "classic";
  centered?: boolean;
}

// #region Container Styles
const containerStyles = {
  card: "flex gap-4 overflow-x-auto pb-4 scrollbar-hidden snap-x snap-mandatory sm:grid sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 sm:pb-0 sm:overflow-visible",
  circle: "flex justify-center gap-8 sm:gap-12",
  medallion: "flex justify-center gap-2",
};

const cardWidthStyles = "snap-start shrink-0 w-[120px] sm:w-auto";
// #endregion

export default function RepresentativeCelebs({ celebs, title, type = "modern", centered = false }: Props) {
  if (!celebs || celebs.length === 0) return null;

  const variant = type === "classic" ? "medallion" : centered ? "circle" : "card";
  const containerStyle = containerStyles[variant];

  return (
    <div className={centered ? "" : "w-full"}>
      {title && (
        <div className={`mb-4 ${centered || type === "classic" ? "flex justify-center" : ""}`}>
          <DecorativeLabel label={title} />
        </div>
      )}

      <div className={containerStyle}>
        {celebs.slice(0, variant === "circle" ? 3 : undefined).map((celeb) => (
          <CelebCard
            key={celeb.id}
            variant={variant}
            id={celeb.id}
            nickname={celeb.nickname}
            avatar_url={celeb.avatar_url}
            title={variant === "card" ? celeb.title : undefined}
            count={celeb.count}
            className={variant === "card" ? cardWidthStyles : ""}
          />
        ))}
      </div>
    </div>
  );
}
