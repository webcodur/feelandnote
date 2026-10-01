/*
  파일명: components/features/game/hegemony/result/PowerChart.tsx
  기능: 국력 흐름 그래프
  책임: 라운드마다 양측 국력을 두 줄로 그려 판의 흐름(역전·결정타)을 한눈에 보여 준다. 폭은 칸에 맞춰 늘어난다.
*/

import { RULES } from "@/lib/game/hegemony/constants";
import type { RoundRecord } from "@/lib/game/hegemony/types";

const W = 600;
const H = 140;
const PAD_X = 8;
const PAD_Y = 10;

function point(v: number, i: number, count: number) {
  const step = count > 1 ? (W - PAD_X * 2) / (count - 1) : 0;
  const clamped = Math.max(0, Math.min(v, RULES.maxPower));
  return { x: PAD_X + i * step, y: PAD_Y + (1 - clamped / RULES.maxPower) * (H - PAD_Y * 2) };
}

function path(values: number[]): string {
  return values
    .map((v, i) => {
      const p = point(v, i, values.length);
      return `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    })
    .join(" ");
}

interface Props {
  records: RoundRecord[];
  label: string;
  you: string;
  enemy: string;
}

export default function PowerChart({ records, label, you, enemy }: Props) {
  const player = [RULES.initialPower, ...records.map((r) => r.after.player.power)];
  const ai = [RULES.initialPower, ...records.map((r) => r.after.ai.power)];
  const last = player.length - 1;
  return (
    <figure className="min-w-0">
      <figcaption className="mb-2 flex items-center gap-4 text-sm">
        <span className="font-black text-hg-bright">{label}</span>
        <span className="flex items-center gap-1.5 text-text-secondary"><span className="h-0.5 w-4 rounded bg-accent" />{you} {Math.max(0, player[last])}</span>
        <span className="flex items-center gap-1.5 text-text-secondary"><span className="h-0.5 w-4 rounded bg-hg-enemy" />{enemy} {Math.max(0, ai[last])}</span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-36 w-full" role="img" aria-label={label}>
        {player.map((_, i) => (
          <line key={i} x1={point(0, i, player.length).x} x2={point(0, i, player.length).x} y1={PAD_Y} y2={H - PAD_Y} className="stroke-hg-line/40" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        ))}
        <line x1={PAD_X} x2={W - PAD_X} y1={H - PAD_Y} y2={H - PAD_Y} className="stroke-hg-line" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        <path d={path(ai)} fill="none" className="stroke-hg-enemy" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <path d={path(player)} fill="none" className="stroke-accent" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>
    </figure>
  );
}
