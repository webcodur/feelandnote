/*
  파일명: components/features/game/myth/troy/ui/DifficultyPicker.tsx
  기능: 트로이 전쟁 난이도 고르기
  책임: 쉬움·보통·어려움을 칩으로 보이고 고른 난이도의 한 줄 설명을 붙인다. 난이도는 적의 힘만 바꾸며 출진 준비에서 언제든 바꿀 수 있다.
*/ // ------------------------------
"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import { CHIP, CHIP_OFF, CHIP_ON } from "../../shared/ui";
import { DIFFICULTIES } from "../campaign/difficulty";
import type { Difficulty } from "../model";

interface Props {
  value: Difficulty;
  onChange: (difficulty: Difficulty) => void;
}

export default function DifficultyPicker({ value, onChange }: Props) {
  const t = useTranslations("gameMythTroy");
  const labelId = useId();
  return (
    <div className="mt-4">
      <p id={labelId} className="text-sm font-bold text-text-primary">{t("prep.difficulty")}</p>
      <div role="group" aria-labelledby={labelId} className="mt-2 grid grid-cols-3 gap-2">
        {DIFFICULTIES.map((key) => (
          <button key={key} type="button" aria-pressed={key === value} onClick={() => onChange(key)} className={`${CHIP} ${key === value ? CHIP_ON : CHIP_OFF}`}>
            {t(`difficulty.${key}`)}
          </button>
        ))}
      </div>
      <p className="mt-1.5 break-keep text-sm text-text-secondary">{t(`difficulty.${value}Hint`)}</p>
    </div>
  );
}
