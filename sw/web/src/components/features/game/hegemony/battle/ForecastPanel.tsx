/*
  파일명: components/features/game/hegemony/battle/ForecastPanel.tsx
  기능: 예상 전과
  책임: 고른 인물·명령으로 상대가 전투·책략·내정을 냈을 때의 결과를 줄마다 보여 준다.
        상대 인물이 여럿이면 범위로 적고, 어려움에서는 상대 쪽 크기를 가린다.
*/
"use client";

import type { ForecastRow, Range } from "@/lib/game/hegemony/forecast";
import { useHegemonyText, type HegemonyText } from "../text";
import CommandSeal from "../ui/CommandSeal";
import { PANEL, VERDICT_TONE } from "../ui/tokens";

interface Props {
  rows: ForecastRow[];
  hidden: boolean;
}

const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : "0");

/** 줄어드는 범위는 작은 폭부터 적는다: "−11~−3" 대신 "−3~−11" */
function rangeText(text: HegemonyText, r: Range): string {
  if (r.min === r.max) return signed(r.min);
  return r.max <= 0 ? text.forecast.range(signed(r.max), signed(r.min)) : text.forecast.range(signed(r.min), signed(r.max));
}

/** ["국력 −7", "민심 −3"] — 변화가 없는 항목은 뺀다. " · "로 이으면 좁은 칸에서 점이 줄 끝에 매달려 항목마다 따로 돌려준다 */
function changeParts(text: HegemonyText, power: Range, morale: Range): string[] {
  const parts = [
    power.min !== 0 || power.max !== 0 ? `${text.stat.power}\u00a0${rangeText(text, power)}` : null,
    morale.min !== 0 || morale.max !== 0 ? `${text.stat.morale}\u00a0${rangeText(text, morale)}` : null,
  ].filter((part): part is string => part !== null);
  return parts.length > 0 ? parts : [text.forecast.none];
}

/** 항목 사이는 점 대신 간격으로 가르고, 항목 하나는 줄이 갈리지 않게 둔다 */
function Change({ parts, masked }: { parts: string[]; masked: boolean }) {
  return (
    <dd className="flex flex-wrap gap-x-3 tabular-nums text-hg-bright">
      {masked && "?"}
      {!masked && parts.map((part) => <span key={part} className="whitespace-nowrap">{part}</span>)}
    </dd>
  );
}

/**
 * 어려움에서 상대 적성에 달린 칸만 가린다. 내가 이기면 둘 다 보이고, 같은 명령이면 누가 통할지 몰라 둘 다 가린다.
 * 지면 상대 명령만 통한다: 상대가 내정이면 상대 회복량이, 전투·책략이면 내가 받는 피해가 상대 적성에 달렸다.
 */
function maskOf(row: ForecastRow, hidden: boolean): { mine: boolean; theirs: boolean } {
  if (!hidden || row.verdict === "win") return { mine: false, theirs: false };
  if (row.verdict === "draw") return { mine: true, theirs: true };
  const enemyHeals = row.enemyCommand === "govern";
  return { mine: !enemyHeals, theirs: enemyHeals };
}

function Row({ row, hidden }: { row: ForecastRow; hidden: boolean }) {
  const text = useHegemonyText();
  const tone = VERDICT_TONE[row.verdict];
  const mask = maskOf(row, hidden);
  const hiddenNote = { win: null, lose: text.forecast.loseHidden, draw: text.forecast.drawHidden }[row.verdict];
  return (
    <li className={`rounded-xl border ${tone.border} ${tone.soft} px-2.5 py-2`}>
      <div className="flex items-center gap-2">
        <CommandSeal command={row.enemyCommand} size="xs" />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-text-primary">{text.forecast.ifEnemy(row.enemyCommand)}</span>
        <span className={`shrink-0 whitespace-nowrap text-sm font-black ${tone.text}`}>{text.verdict.short[row.verdict]}</span>
      </div>
      <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-sm">
        <dt className="font-bold text-accent">{text.forecast.you}</dt>
        <Change parts={changeParts(text, row.myPower, row.myMorale)} masked={mask.mine} />
        <dt className="font-bold text-hg-enemy">{text.forecast.them}</dt>
        <Change parts={changeParts(text, row.enemyPower, row.enemyMorale)} masked={mask.theirs} />
      </dl>
      {hidden && hiddenNote && <p className="mt-0.5 text-sm text-text-secondary">{hiddenNote}</p>}
      {!hidden && row.mirror && <p className="mt-0.5 text-sm text-text-secondary">{text.forecast.mirror(row.mirror.stronger, row.total)}</p>}
      <div className="mt-1 flex gap-1.5 empty:hidden">
        {/* 끝내기·패배 위험도 그 칸이 보일 때만 알린다 — 어려움에서도 이기는 줄의 끝내기는 알 수 있다 */}
        {!mask.theirs && row.lethal > 0 && <span className="rounded bg-accent px-1.5 text-sm font-black text-hg-ink">{text.forecast.lethal}</span>}
        {!mask.mine && row.fatal > 0 && <span className="rounded bg-hg-enemy px-1.5 text-sm font-black text-hg-ink">{text.forecast.fatal}</span>}
      </div>
    </li>
  );
}

export default function ForecastPanel({ rows, hidden }: Props) {
  const text = useHegemonyText();
  return (
    <section className={`${PANEL} p-3`}>
      <h3 className="mb-1.5 text-sm font-black text-hg-bright">{text.forecast.title}</h3>
      {rows.length === 0 && <p className="text-sm leading-relaxed text-text-secondary">{text.forecast.noPlay}</p>}
      {hidden && rows.length > 0 && <p className="mb-1.5 text-sm text-text-secondary">{text.forecast.hidden}</p>}
      <ul className="space-y-1.5">
        {rows.map((row) => (
          <Row key={row.enemyCommand} row={row} hidden={hidden} />
        ))}
      </ul>
    </section>
  );
}
