/*
  파일명: components/features/game/duel/SimonArena/SimonGrid.tsx
  기능: 지략전 여섯 칸
  책임: 칸마다 제 색을 옅게 깔아 자리를 익히게 하고, 켜질 때는 밝게, 틀린 칸은 X로 보인다.
        누를 수 있을 때만 손을 올리면 테두리가 즉시 밝아진다(ui-hover). 데스크톱은 칸 구석에 단축키를 적는다.
*/
"use client";

import { X } from "lucide-react";
import { GRID_SIZE } from "@/lib/game/simonEngine";
import { FOCUS_RING } from "@/components/features/game/hegemony/ui/tokens";

/** 칸 순서대로 빨강·파랑·초록·노랑·보라·주황 (소리는 도→라) */
const CELL_TONE = [
  { idle: "border-hg-enemy/35 bg-hg-enemy/10", lit: "border-hg-bright bg-hg-enemy shadow-hg-enemy/60" },
  { idle: "border-hg-morale/35 bg-hg-morale/10", lit: "border-hg-bright bg-hg-morale shadow-hg-morale/60" },
  { idle: "border-hg-govern/35 bg-hg-govern/10", lit: "border-hg-bright bg-hg-govern shadow-hg-govern/60" },
  { idle: "border-hg-mandate/35 bg-hg-mandate/10", lit: "border-hg-bright bg-hg-mandate shadow-hg-mandate/60" },
  { idle: "border-hg-stratagem/35 bg-hg-stratagem/10", lit: "border-hg-bright bg-hg-stratagem shadow-hg-stratagem/60" },
  { idle: "border-hg-assault/35 bg-hg-assault/10", lit: "border-hg-bright bg-hg-assault shadow-hg-assault/60" },
] as const;

export const CELL_KEYS = ["Q", "W", "E", "A", "S", "D"] as const;

interface Props {
  lit: number;
  wrong: number;
  enabled: boolean;
  /** 3·2·1 동안 흐리게 */
  dim: boolean;
  label: (cell: number) => string;
  onPress: (cell: number) => void;
}

export default function SimonGrid({ lit, wrong, enabled, dim, label, onPress }: Props) {
  return (
    <div className={`grid grid-cols-3 gap-3 ${dim ? "opacity-40" : ""}`}>
      {Array.from({ length: GRID_SIZE }, (_, i) => {
        const tone = CELL_TONE[i];
        const state = wrong === i ? "border-hg-enemy bg-hg-enemy/80 ring-4 ring-hg-enemy/40" : lit === i ? `shadow-lg ${tone.lit}` : tone.idle;
        return (
          <button
            key={i}
            type="button"
            aria-label={label(i)}
            disabled={!enabled}
            onClick={(e) => {
              e.stopPropagation();
              onPress(i);
            }}
            className={`relative flex size-20 items-center justify-center rounded-2xl border-2 enabled:hover:border-hg-bright/70 disabled:cursor-default md:size-22 ${state} ${FOCUS_RING}`}
          >
            {wrong === i && <X size={30} strokeWidth={3} className="text-hg-bright" />}
            {/* 켜진 칸·틀린 칸은 밝은 바탕이라 흐린 단축키 글자가 묻히므로 그 순간만 감춘다 */}
            {lit !== i && wrong !== i && <kbd className="absolute bottom-1.5 end-2 hidden text-sm font-bold text-text-secondary lg:block">{CELL_KEYS[i]}</kbd>}
          </button>
        );
      })}
    </div>
  );
}
