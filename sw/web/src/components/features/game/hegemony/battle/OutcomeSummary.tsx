/*
  파일명: components/features/game/hegemony/battle/OutcomeSummary.tsx
  기능: 라운드 결과 요약
  책임: 판정(상성·맞대결 판정·일기토)과 양측 효과를 두 칸에 적고, 다음 라운드(또는 결과 보기) 단추를 둔다.
*/
"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import type { RoundRecord } from "@/lib/game/hegemony/types";
import { useHegemonyText } from "../text";
import GameButton from "../ui/GameButton";
import { PANEL, VERDICT_TONE } from "../ui/tokens";
import { LINE_TONE, mirrorNote, recordLines, roundBadge } from "./outcomeLines";

interface Props {
  record: RoundRecord;
  gameOver: boolean;
  nameOf: (id: string) => string;
  onNext: () => void;
}

export default function OutcomeSummary({ record, gameOver, nameOf, onNext }: Props) {
  const text = useHegemonyText();
  const badge = roundBadge(text, record, true);
  const tone = VERDICT_TONE[badge.tone];
  const note = mirrorNote(text, record);
  const columns = [
    { side: "player" as const, title: text.battle.you, titleTone: "text-accent" },
    { side: "ai" as const, title: text.battle.enemy, titleTone: "text-hg-enemy" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`${PANEL} w-full max-w-md p-4`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-bold text-text-secondary">{text.outcome.title(record.round)}</span>
        <span className={`whitespace-nowrap rounded-full border px-2.5 py-0.5 text-sm font-black ${tone.border} ${tone.soft} ${tone.text}`}>
          {badge.label}
        </span>
      </div>
      {note && <p className="mt-2 text-sm text-text-primary">{note}</p>}
      <div className="mt-3 grid grid-cols-2 gap-3">
        {columns.map(({ side, title, titleTone }) => (
          <div key={side} className="min-w-0 rounded-xl border border-hg-line/60 bg-hg-raised/70 p-2.5">
            {/* 긴 이름을 말줄임으로 자르면 천명 표시까지 잘려 나가므로, 진영과 이름을 두 줄로 나누고 이름은 접히게 둔다 */}
            <p className={`text-sm font-black ${titleTone}`}>
              {title}
              {record[side].mandate && (
                <span className="ms-1 text-hg-mandate">
                  <span aria-hidden="true">★</span>
                  <span className="sr-only">{text.outcome.mandate}</span>
                </span>
              )}
            </p>
            <p className="mb-1 break-words text-sm font-bold leading-snug text-hg-bright">{nameOf(record[side].cardId)}</p>
            <ul className="space-y-0.5">
              {recordLines(text, record, side, nameOf).map((line, i) => (
                <li key={i} className={`text-sm leading-snug ${LINE_TONE[line.tone]}`}>{line.text}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <GameButton variant="primary" size="md" block className="mt-4" hotkey="Enter" icon={<ArrowRight size={18} />} onClick={onNext}>
        {gameOver ? text.outcome.toResult : text.outcome.next}
      </GameButton>
    </motion.div>
  );
}
