/*
  파일명: components/features/game/hegemony/title/RecordsPanel.tsx
  기능: 전적 화면
  책임: 난이도별 승·패·무, 연승, 최근 대전 다섯 판을 보여 준다.
*/
"use client";

import { DIFFICULTIES } from "@/lib/game/hegemony/constants";
import type { HegemonyRecords } from "../hooks/useHegemonyRecords";
import { totalsOf } from "../hooks/useHegemonyRecords";
import { useHegemonyText } from "../text";
import SubPanel from "./SubPanel";

const RESULT_TONE = { player: "text-accent", ai: "text-hg-enemy", draw: "text-text-secondary" } as const;

export default function RecordsPanel({ records, onBack }: { records: HegemonyRecords; onBack: () => void }) {
  const text = useHegemonyText();
  const totals = totalsOf(records);
  const rows = [
    { key: "total", label: text.records.total, w: totals.wins, l: totals.losses, d: totals.draws },
    ...DIFFICULTIES.map((d) => ({ key: d, label: text.difficulty.name[d], w: records.wins[d], l: records.losses[d], d: records.draws[d] })),
  ];

  return (
    <SubPanel title={text.records.title} backLabel={text.records.back} onBack={onBack}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {/* 굵은 숫자 옆 단위를 작고 흐리게 붙인다. 영어 "0W 0L"을 굵게 쓰면 0과 O가 구별되지 않는다 */}
        {rows.map((row) => (
          <div key={row.key} className="rounded-xl border border-hg-line/70 bg-hg-raised px-3 py-3">
            <p className="text-sm font-semibold text-text-secondary">{row.label}</p>
            <p className="mt-1 flex flex-wrap items-baseline gap-x-2 text-lg font-black tabular-nums text-hg-bright">
              {[
                { key: "w", n: row.w, unit: text.records.unit.win, show: true },
                { key: "l", n: row.l, unit: text.records.unit.loss, show: true },
                { key: "d", n: row.d, unit: text.records.unit.draw, show: row.d > 0 },
              ].filter((part) => part.show).map((part) => (
                <span key={part.key}>
                  {part.n}
                  <span className="ms-0.5 text-sm font-bold text-text-secondary">{part.unit}</span>
                </span>
              ))}
            </p>
          </div>
        ))}
      </div>
      {/* 한 번도 이기지 않았으면 "최고 0연승" 대신 줄을 비운다 */}
      {records.bestStreak > 0 && (
        <p className="mt-3 text-sm text-text-secondary">
          {records.streak > 0 && <span className="me-3 font-bold text-accent">{text.title.streak(records.streak)}</span>}
          {text.records.best(records.bestStreak)}
        </p>
      )}

      <h3 className="mb-2 mt-6 text-base font-black text-accent">{text.records.recent}</h3>
      {records.recent.length === 0 && <p className="text-sm text-text-secondary">{text.records.empty}</p>}
      <ul className="space-y-1.5">
        {records.recent.map((game) => (
          <li key={game.at} className="flex items-center gap-3 rounded-lg border border-hg-line/60 bg-hg-raised/70 px-3 py-2 text-sm">
            <span className={`w-14 shrink-0 font-black ${RESULT_TONE[game.winner]}`}>{text.records.result[game.winner]}</span>
            <span className="min-w-0 flex-1 truncate text-text-primary">{game.captainName}</span>
            <span className="shrink-0 tabular-nums text-text-secondary">{game.power.player} : {game.power.ai}</span>
            <span className="w-16 shrink-0 text-end text-text-secondary">{text.difficulty.name[game.difficulty]}</span>
            <span className="hidden w-16 shrink-0 text-end text-text-tertiary sm:block">{text.records.rounds(game.rounds)}</span>
          </li>
        ))}
      </ul>
    </SubPanel>
  );
}
