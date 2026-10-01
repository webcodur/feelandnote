/*
  파일명: components/features/game/hegemony/battle/Arena.tsx
  기능: 맞대결 무대
  책임: 가운데에 아군 출전(왼쪽)과 적군 출전(오른쪽)을 마주 세운다. 공개 연출은 뒷면 → 뒤집기 → 판정 순으로 진행한다.
        카드 크기는 무대 높이에 맞춰 줄어들고(컨테이너 높이 단위), 결과·선택 패널은 무대 위에 겹쳐 뜬다.
*/
"use client";

import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { BattleCard, Command } from "@/lib/game/types";
import type { Verdict } from "@/lib/game/hegemony/types";
import { BEATS } from "@/lib/game/hegemony/constants";
import { useHegemonyText } from "../text";
import CardBack from "../ui/CardBack";
import CommandSeal from "../ui/CommandSeal";
import HeroCard from "../ui/HeroCard";
import { VERDICT_TONE } from "../ui/tokens";

/** 공개 연출 단계: 0 뒷면 · 1 뒤집힘 · 2 판정 */
export type RevealStage = 0 | 1 | 2;

interface Props {
  playerCard: BattleCard | null;
  playerCommand: Command | null;
  enemyCard: BattleCard | null;
  enemyCommand: Command | null;
  stage: RevealStage;
  verdict: Verdict | null;
  hideEnemyStats: boolean;
  captains: { player: string | null; ai: string | null };
  /** 손패와 같은 값이 보이도록 주장·천명 보정을 더한 적성 */
  aptitudes: { player?: Record<Command, number>; ai?: Record<Command, number> };
  /** 무대 위에 겹쳐 띄울 패널 (결과·복귀·일기토) */
  overlay?: ReactNode;
  /** 좁은 화면: 패널이 무대보다 길어 넘치므로 겹치지 않고 무대 자리를 대신 차지한다 */
  inlineOverlay?: boolean;
  onSkip?: () => void;
}

/** 카드 폭: 최대 216px, 무대 높이가 모자라면 높이에서 이름·적성 칸(약 84px)을 뺀 만큼.
    넓은 배치는 가운데 열이 좁아지는 1024px 언저리에서 카드(32cqw×2)·VS 칸(26cqw)·틈(5cqw×2)이 함께 줄어
    합이 무대 폭을 넘지 않으므로 양옆 열을 덮지 않는다 */
const SLOT = "relative w-[min(216px,calc(100cqh_-_84px),36cqw)] shrink-0 lg:w-[min(216px,calc(100cqh_-_84px),32cqw)]";

function Seal({ command, side }: { command: Command | null; side: "player" | "ai" }) {
  return (
    <AnimatePresence>
      {command && (
        <motion.div
          key={command}
          initial={{ scale: 1.8, opacity: 0, rotate: side === "player" ? -12 : 12 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          exit={{ opacity: 0 }}
          transition={{ type: "spring", stiffness: 420, damping: 18 }}
          className={`absolute top-[28%] z-[2] ${side === "player" ? "-end-4 lg:-end-6" : "-start-4 lg:-start-6"}`}
        >
          <CommandSeal command={command} size="arena" solid />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function Arena({ playerCard, playerCommand, enemyCard, enemyCommand, stage, verdict, hideEnemyStats, captains, aptitudes, overlay, inlineOverlay = false, onSkip }: Props) {
  const text = useHegemonyText();
  const showVerdict = stage >= 2 && !!verdict && !!playerCommand && !!enemyCommand;
  const winner = verdict === "win" ? playerCommand : verdict === "lose" ? enemyCommand : null;

  if (overlay && inlineOverlay) return <div className="flex w-full justify-center">{overlay}</div>;

  return (
    <div className="relative h-full min-h-[200px] w-full [container-type:size] lg:min-h-[300px]" onClick={onSkip}>
      <div className="flex h-full items-center justify-center gap-3 lg:gap-[min(2.5rem,5cqw)]">
        <div className={SLOT}>
          {playerCard && <HeroCard card={playerCard} activeCommand={playerCommand} aptitudes={aptitudes.player} captain={playerCard.id === captains.player} showTitle />}
          {!playerCard && (
            <div className="flex aspect-[3/4] items-center justify-center rounded-xl border-2 border-dashed border-accent/40 p-3 text-center text-sm font-semibold text-text-secondary">
              {text.battle.chooseCard}
            </div>
          )}
          <Seal command={playerCommand} side="player" />
        </div>

        <div className="flex w-16 shrink-0 flex-col items-center gap-2 text-center sm:w-28 lg:w-[min(10rem,26cqw)]">
          {!showVerdict && <span className="text-3xl font-black italic text-hg-bright/80 lg:text-5xl">VS</span>}
          {!showVerdict && onSkip && <span className="text-sm font-semibold leading-tight text-text-secondary">{text.outcome.skip}</span>}
          {showVerdict && verdict && (
            <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 300, damping: 16 }}>
              <p className={`text-lg font-black sm:text-2xl lg:text-3xl ${VERDICT_TONE[verdict].text}`}>{text.verdict.name[verdict]}</p>
              {winner && <p className="mt-1 hidden text-sm font-semibold text-text-primary sm:block">{text.command.beats(winner, BEATS[winner])}</p>}
            </motion.div>
          )}
        </div>

        <div className={SLOT}>
          <AnimatePresence mode="wait" initial={false}>
            {(stage === 0 || !enemyCard) && (
              <motion.div key="back" exit={{ rotateY: 90, opacity: 0.6 }} transition={{ duration: 0.18 }}>
                <CardBack label={text.battle.enemyWaiting} />
              </motion.div>
            )}
            {stage >= 1 && enemyCard && (
              <motion.div key="front" initial={{ rotateY: -90 }} animate={{ rotateY: 0 }} transition={{ duration: 0.22 }}>
                <HeroCard card={enemyCard} activeCommand={enemyCommand} aptitudes={aptitudes.ai} hideStats={hideEnemyStats} captain={enemyCard.id === captains.ai} showTitle />
              </motion.div>
            )}
          </AnimatePresence>
          <Seal command={stage >= 1 ? enemyCommand : null} side="ai" />
        </div>
      </div>

      {overlay && (
        <div className="absolute inset-0 z-[3] flex items-center justify-center bg-hg-ink/55 p-2 backdrop-blur-[2px]" onClick={(e) => e.stopPropagation()}>
          {overlay}
        </div>
      )}
    </div>
  );
}
