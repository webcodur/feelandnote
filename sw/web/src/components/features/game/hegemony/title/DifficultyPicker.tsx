/*
  파일명: components/features/game/hegemony/title/DifficultyPicker.tsx
  기능: 난이도 고르기
  책임: 쉬움·보통·어려움 셋을 한 줄 단추로 두고 고른 난이도의 설명을 아래에 보여 준다.
*/
"use client";

import { DIFFICULTIES, type Difficulty } from "@/lib/game/hegemony/constants";
import { useHegemonyText } from "../text";
import { FOCUS_RING } from "../ui/tokens";

const ACTIVE: Record<Difficulty, string> = {
  easy: "bg-hg-govern/15 border-hg-govern text-hg-govern",
  normal: "bg-accent/15 border-accent text-accent",
  hard: "bg-hg-enemy/15 border-hg-enemy text-hg-enemy",
};

interface Props {
  value: Difficulty;
  onChange: (value: Difficulty) => void;
  disabled?: boolean;
}

export default function DifficultyPicker({ value, onChange, disabled = false }: Props) {
  const text = useHegemonyText();
  return (
    <div>
      <div role="radiogroup" aria-label={text.title.start} className="grid grid-cols-3 gap-2">
        {DIFFICULTIES.map((d) => {
          const on = d === value;
          return (
            <button
              key={d}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={disabled}
              onClick={() => onChange(d)}
              className={`h-11 rounded-xl border text-sm font-bold ${FOCUS_RING} ${on ? ACTIVE[d] : "border-hg-line bg-hg-panel/70 text-text-secondary hover:border-hg-bright/40 hover:text-hg-bright"}`}
            >
              {text.difficulty.name[d]}
            </button>
          );
        })}
      </div>
      <p className="mt-2.5 min-h-10 text-sm leading-relaxed text-text-secondary">{text.difficulty.desc[value]}</p>
    </div>
  );
}
