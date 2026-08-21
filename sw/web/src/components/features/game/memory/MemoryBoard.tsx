"use client";

import { RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import MemoryCard from "./MemoryCard";
import type { MemoryCardData, MemoryPairResult } from "./types";

interface Props {
  board: MemoryCardData[];
  maxWidthClassName: string;
  gridClassName: string;
  openIds: string[];
  matchedIds: Set<string>;
  pairResult: MemoryPairResult;
  resultEffectActive: boolean;
  moves: number;
  elapsedSeconds: number;
  onSelect: (card: MemoryCardData) => void;
  onRestart: () => void;
}

/*
  배치 — 격자는 언제나 화면 한가운데 두고, 안내는 남는 쪽으로 흩는다.
  가로 화면: 왼쪽에 난이도·진행, 오른쪽에 기록·다시 섞기. 격자가 높이를 다 쓴다.
  세로 화면: 위에 난이도·진행, 아래에 기록·다시 섞기. 남던 위아래 공간을 안내가 채운다.
  이름 줄: 세로에서는 격자 위(카드를 짚는 손에 가리지 않게), 가로에서는 격자 아래(눈이 멀리 올라가지 않게).
*/
export default function MemoryBoard({
  board,
  maxWidthClassName,
  gridClassName,
  openIds,
  matchedIds,
  pairResult,
  resultEffectActive,
  moves,
  elapsedSeconds,
  onSelect,
  onRestart,
}: Props) {
  const t = useTranslations("rest.arena.memory");

  // 카드는 얼굴만 보여준다 — 열린 카드의 이름은 아래 두 칸이 순서대로 대신 읽어준다
  const openNames = openIds.map(
    (id) => board.find((card) => card.instanceId === id)?.figure.name ?? ""
  );
  const nameTone = pairResult === "mismatch" ? "text-red-300" : "text-accent";

  const sideClassName = "flex w-full shrink-0 landscape:w-32 landscape:flex-col landscape:justify-center lg:landscape:w-40";

  return (
    <div className={`mx-auto flex min-h-0 w-full flex-1 flex-col gap-3 py-2 landscape:flex-row landscape:items-stretch landscape:justify-center landscape:gap-4 landscape:py-1 ${maxWidthClassName}`}>
      {/* 기록 — 세로 화면은 위에 한 줄, 가로 화면은 왼쪽에 세운다 */}
      <div className={`${sideClassName} items-center justify-between gap-4 landscape:items-stretch landscape:justify-center landscape:gap-3`}>
        <div className="flex items-baseline gap-2 landscape:justify-between">
          <span className="text-sm text-text-secondary">{t("moves")}</span>
          <strong className="font-cinzel text-lg text-text-primary">{moves}</strong>
        </div>
        <div className="flex items-baseline gap-2 landscape:justify-between">
          <span className="text-sm text-text-secondary">{t("time")}</span>
          <strong className="font-cinzel text-lg text-text-primary">
            {t("seconds", { seconds: elapsedSeconds })}
          </strong>
        </div>
      </div>

      {/* 격자 — 남은 높이를 기준으로 크기를 잡는다. 폭이 모자라면 폭에 맞춰 줄어들 뿐 넘치지 않는다 */}
      <div className="mx-auto flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-2 landscape:mx-0">
        {/* 이름 자리 — 비어 있을 때도 테두리로 자리를 잡아둬야 이름이 뜰 때 눈이 곧장 간다.
            뒤집은 순서대로 왼쪽·오른쪽 칸에 나눠 담아 이름 길이가 달라도 자리가 흔들리지 않는다 */}
        <div
          className="grid h-11 w-full max-w-lg shrink-0 grid-cols-2 overflow-hidden rounded-lg border border-white/10 bg-bg-main/60 landscape:order-last landscape:[@media(min-height:600px)]:hidden"
          aria-live="polite"
        >
          {[0, 1].map((slot) => (
            <p
              key={slot}
              className={`flex items-center justify-center truncate px-2 font-serif text-sm font-bold ${nameTone} ${
                slot === 1 ? "border-s border-white/10" : ""
              }`}
            >
              {openNames[slot] ?? ""}
            </p>
          ))}
        </div>

        <div
          className={`grid w-auto min-h-0 max-w-full flex-1 content-center gap-1.5 sm:gap-2.5 ${gridClassName}`}
        >
          {board.map((card) => (
            <MemoryCard
              key={card.instanceId}
              card={card}
              isFlipped={openIds.includes(card.instanceId)}
              isMatched={matchedIds.has(card.instanceId)}
              pairResult={openIds.includes(card.instanceId) ? pairResult : null}
              resultEffectActive={resultEffectActive}
              backLabel={t("cardBack")}
              onSelect={onSelect}
            />
          ))}
        </div>
      </div>

      {/* 다시 섞기 — 세로 화면은 아래, 가로 화면은 오른쪽 */}
      <div className={`${sideClassName} items-center justify-center`}>
        <button
          type="button"
          onClick={onRestart}
          aria-label={t("restart")}
          title={t("restart")}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-bg-main/70 text-text-secondary hover:border-accent/60 hover:bg-white/[0.08] hover:text-accent landscape:mt-1 landscape:w-full"
        >
          <RotateCcw className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
