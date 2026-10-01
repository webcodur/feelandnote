/*
  파일명: components/features/game/duel/SimonArena/SimonArena.tsx
  기능: 지략전(내정 일기토) 화면
  책임: 머리 표시줄(라운드)·상태 글·여섯 칸·기권 줄과 시작 안내·결과 창을 배치하고 자판을 붙인다.
        진행은 useSimonMatch가 쥔다. Q W E / A S D는 여섯 칸, Enter·Space는 시작·계속이다.
*/
"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Eye, ListOrdered, MousePointerClick } from "lucide-react";
import { useTranslations } from "next-intl";
import { MAX_ROUNDS } from "@/lib/game/simonEngine";
import { useHotkeys } from "@/components/features/game/hegemony/hooks/useHotkeys";
import ArenaFooter from "../shared/ArenaFooter";
import ArenaHud from "../shared/ArenaHud";
import ArenaIntro from "../shared/ArenaIntro";
import ArenaLayout from "../shared/ArenaLayout";
import ArenaResult from "../shared/ArenaResult";
import type { ArenaProps } from "../shared/types";
import SimonGrid, { CELL_KEYS } from "./SimonGrid";
import { useSimonMatch, type SimonPhase } from "./useSimonMatch";

/** 칸 아래에 적는 지금 상태 (없는 단계는 비운다) */
const STATUS_KEY: Partial<Record<SimonPhase, "ready" | "watch" | "input" | "wrong" | "enemyTurn">> = {
  countdown: "ready",
  showing: "watch",
  input: "input",
  wrongFlash: "wrong",
  aiDecide: "enemyTurn",
};

export default function SimonArena({ playerCard, aiCard, muted = false, onComplete }: ArenaProps) {
  const t = useTranslations("shared.game.duel");
  const m = useSimonMatch(aiCard, muted, onComplete);
  const primary = m.phase === "intro" ? m.start : m.phase === "result" ? m.finish : () => {};
  useHotkeys({
    ...Object.fromEntries(CELL_KEYS.map((key, i) => [key.toLowerCase(), () => (m.phase === "intro" ? m.start() : m.press(i))])),
    Enter: primary,
    " ": primary,
  });

  const statusKey = STATUS_KEY[m.phase];
  const board = m.phase !== "intro" && m.phase !== "roundResult" && m.phase !== "result";
  const hint = m.phase === "showing" ? t("simon.remember") : t("simon.instructions");
  const center = (
    <>
      <span className="text-sm font-bold text-text-secondary">{t("simon.round")}</span>
      <span className="text-xl font-black leading-tight tabular-nums text-hg-bright">{m.round}/{MAX_ROUNDS}</span>
    </>
  );
  const rules = [
    { key: "remember", icon: <Eye size={18} />, text: t("simon.rules.remember") },
    { key: "repeat", icon: <MousePointerClick size={18} />, text: t("simon.rules.repeat") },
    { key: "grows", icon: <ListOrdered size={18} />, text: t("simon.rules.grows", { max: MAX_ROUNDS }) },
  ];
  const overlay = (
    <>
      <ArenaIntro isVisible={m.phase === "intro"} title={t("clash.info.govern.label")} playerCard={playerCard} aiCard={aiCard} rules={rules} footerText={t("simon.controls")} onDismiss={m.start} />
      <ArenaResult isVisible={m.phase === "result"} winner={m.winner} message={m.outcome && t(`simon.outcomes.${m.outcome}`, { round: m.round })} />
    </>
  );

  return (
    <ArenaLayout onClick={m.phase === "result" ? m.finish : undefined}>
      {overlay}
      <ArenaHud playerCard={playerCard} aiCard={aiCard} centerContent={center} />
      <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center gap-5 overflow-hidden px-4">
        {board && (
          <>
            <p aria-live="polite" className="min-h-6 text-base font-bold text-text-primary">
              {statusKey === "input" && t("simon.status.input", { current: m.input.length, total: m.pattern.length })}
              {statusKey && statusKey !== "input" && t(`simon.status.${statusKey}`)}
            </p>
            <div className="relative">
              <SimonGrid
                lit={m.lit}
                wrong={m.wrong}
                enabled={m.phase === "input"}
                dim={m.phase === "countdown"}
                label={(cell) => t("simon.cell", { n: cell + 1 })}
                onPress={m.press}
              />
              {m.phase === "countdown" && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={m.countdown}
                      className="text-7xl font-black tabular-nums text-accent"
                      initial={{ scale: 1.4, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.6, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      {m.countdown}
                    </motion.span>
                  </AnimatePresence>
                </div>
              )}
            </div>
            <p className="min-h-6 text-base text-text-secondary">{hint}</p>
          </>
        )}
        <AnimatePresence>
          {m.phase === "roundResult" && m.outcome && (
            <motion.p
              className="text-xl font-black text-hg-bright"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
            >
              {t(`simon.outcomes.${m.outcome}`, { round: m.round })}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
      <ArenaFooter onForfeit={() => onComplete("ai")} />
    </ArenaLayout>
  );
}
