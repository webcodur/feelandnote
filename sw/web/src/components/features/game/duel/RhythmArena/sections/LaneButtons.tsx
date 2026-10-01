/*
  파일명: components/features/game/duel/RhythmArena/sections/LaneButtons.tsx
  기능: 격돌 칸 단추 줄
  책임: 놀이 칸과 같은 세 칸 격자로 단추를 둔다. 누르는 순간(pointerdown) 판정해 늦음을 줄이고,
        지금 칠 원이 가까운 칸은 useRhythmLoop가 단 data-state로 즉시 밝힌다.
*/
"use client";

import type { MutableRefObject } from "react";
import type { Lane } from "@/lib/game/rhythmEngine";
import { FOCUS_RING } from "@/components/features/game/hegemony/ui/tokens";
import { LANES, LANE_KEYS } from "../types";

interface Props {
  buttons: MutableRefObject<(HTMLButtonElement | null)[]>;
  /** 3·2·1 동안은 누를 수 없음을 흐리게 보인다 */
  waiting: boolean;
  onHit: (lane: Lane) => void;
}

export default function LaneButtons({ buttons, waiting, onHit }: Props) {
  return (
    <div className={`grid shrink-0 grid-cols-3 gap-3 px-4 pt-3 md:px-5 ${waiting ? "opacity-50" : ""}`}>
      {LANES.map((lane) => (
        <button
          key={lane}
          ref={(el) => {
            buttons.current[lane] = el;
          }}
          type="button"
          aria-label={LANE_KEYS[lane]}
          className={`flex h-18 select-none items-center justify-center rounded-xl border border-hg-line bg-hg-raised text-2xl font-black text-text-secondary hover:border-hg-bright/50 active:bg-hg-line data-[state=near]:border-hg-mandate/60 data-[state=near]:text-hg-mandate data-[state=hot]:border-hg-mandate data-[state=hot]:bg-hg-mandate/15 data-[state=hot]:text-hg-mandate ${FOCUS_RING}`}
          onPointerDown={(e) => {
            e.stopPropagation();
            onHit(lane);
          }}
        >
          {LANE_KEYS[lane]}
        </button>
      ))}
    </div>
  );
}
