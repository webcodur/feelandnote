/*
  파일명: components/features/game/hegemony/battle/BattleLog.tsx
  기능: 전황 기록
  책임: 지난 라운드마다 첫 줄에 양측 출전·명령·판정을, 둘째 줄에 양쪽 국력·민심 변화를 적는다.
        대전 중 창·결과 화면은 이름까지, 대전 화면 옆 칸은 이름을 뺀 짧은 줄(compact)로 쓴다.
*/
"use client";

import type { RoundRecord } from "@/lib/game/hegemony/types";
import { useHegemonyText } from "../text";
import CommandSeal from "../ui/CommandSeal";
import { VERDICT_TONE } from "../ui/tokens";
import { changeText, roundBadge, visibleChange } from "./outcomeLines";

interface Props {
  records: RoundRecord[];
  nameOf: (id: string) => string;
  compact?: boolean;
}

export default function BattleLog({ records, nameOf, compact = false }: Props) {
  const text = useHegemonyText();
  if (records.length === 0) return <p className="text-sm text-text-secondary">{text.battle.logEmpty}</p>;
  const cols = compact ? "grid-cols-[1.5rem_auto_auto_auto] justify-start" : "grid-cols-[1.75rem_minmax(0,1fr)_auto_minmax(0,1fr)]";
  return (
    <ol className="space-y-1.5">
      {records.map((r) => {
        const badge = roundBadge(text, r, false);
        const tone = VERDICT_TONE[badge.tone];
        const mine = changeText(text, visibleChange(r.change.player, r.after.player));
        const theirs = changeText(text, visibleChange(r.change.ai, r.after.ai));
        return (
          <li key={r.round} className="rounded-lg border border-hg-line/60 bg-hg-raised/70 px-2.5 py-2 text-sm">
            <div className={`grid ${cols} items-center gap-2`}>
              <span className="font-black tabular-nums text-text-secondary">{r.round}</span>
              <span className="flex min-w-0 items-center gap-1.5">
                <CommandSeal command={r.player.command} size="xs" />
                {!compact && <span className="min-w-0 break-words leading-snug text-text-primary">{nameOf(r.player.cardId)}</span>}
              </span>
              <span className={`whitespace-nowrap rounded px-1.5 text-center font-black ${tone.soft} ${tone.text}`}>{badge.label}</span>
              <span className="flex min-w-0 items-center justify-end gap-1.5">
                {!compact && <span className="min-w-0 break-words text-end leading-snug text-text-primary">{nameOf(r.ai.cardId)}</span>}
                <CommandSeal command={r.ai.command} size="xs" />
              </span>
            </div>
            <p className={`mt-1 flex flex-wrap gap-x-3 gap-y-0.5 tabular-nums ${compact ? "ps-8" : "ps-9"}`}>
              {mine && (
                <span>
                  <span className="font-bold text-accent">{text.battle.you}</span> <span className="text-text-primary">{mine}</span>
                </span>
              )}
              {theirs && (
                <span>
                  <span className="font-bold text-hg-enemy">{text.battle.enemy}</span> <span className="text-text-primary">{theirs}</span>
                </span>
              )}
              {!mine && !theirs && <span className="text-text-secondary">{text.forecast.none}</span>}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
