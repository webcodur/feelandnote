/*
  파일명: /components/shared/CardImageToggle.tsx
  기능: 인물 카드 사진 보기 전환 단추
  책임: 아바타(누끼) ↔ 대표사진(4:5 화보)을 누를 때마다 바로 바꾼다. 탐색 조작 줄과
        신화·세력 구성원 머리가 같은 정사각형 아이콘 단추를 쓴다.
*/ // ------------------------------

"use client";

import { Image as ImageIcon, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import type { CelebCardImage } from "./CelebCard";
import { cn } from "@/lib/utils";
import { EXPLORE_CONTROL_CLASS, EXPLORE_CONTROL_CHANGED_CLASS } from "./ExploreSearchControls";

interface CardImageToggleProps {
  mode: CelebCardImage;
  onChange: (mode: CelebCardImage) => void;
  className?: string;
}

export default function CardImageToggle({ mode, onChange, className = "" }: CardImageToggleProps) {
  const t = useTranslations("home.ui");
  const label = `${t("cardImage.label")}: ${t(`cardImage.modes.${mode}`)}`;
  return (
    <button
      type="button"
      onClick={() => onChange(mode === "avatar" ? "portrait" : "avatar")}
      aria-pressed={mode === "portrait"}
      aria-label={`${t("cardImage.label")}: ${t("cardImage.modes.portrait")}`}
      title={label}
      className={cn(EXPLORE_CONTROL_CLASS, "size-11 shrink-0 p-0", mode === "portrait" && EXPLORE_CONTROL_CHANGED_CLASS, className)}
    >
      {mode === "portrait"
        ? <ImageIcon size={19} className="shrink-0" aria-hidden />
        : <UserRound size={19} className="shrink-0" aria-hidden />}
    </button>
  );
}
