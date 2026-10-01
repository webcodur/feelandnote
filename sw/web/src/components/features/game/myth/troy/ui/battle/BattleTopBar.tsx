/*
  파일명: components/features/game/myth/troy/ui/battle/BattleTopBar.tsx
  기능: 트로이 전쟁 싸움판 윗줄
  책임: 메뉴(저장하고 나가기), 장 이름, 차례·편, 목표 펼침, 적이 닿는 칸 켜기, 차례 끝내기를 한 줄에 둔다.
        목표 펼침에는 이기는 조건·지는 조건과 장 규칙 진행(탄 배·남은 차례)을 적고, 싸우는 법을 다시 여는 단추를 둔다.
        아직 움직이지 않은 장수가 있으면 차례 끝내기를 한 번 더 눌러야 끝난다(잘못 눌러 한 차례를 날리지 않게).
*/ // ------------------------------
"use client";

import { useState } from "react";
import { BookOpen, Flag, LogOut, ShieldAlert, SkipForward, Target } from "lucide-react";
import { useTranslations } from "next-intl";
import type { BattleState } from "../../engine";
import type { ChapterStory } from "../../story/types";

interface Props {
  state: BattleState;
  story: ChapterStory;
  no: number;
  danger: boolean;
  busy: boolean;
  onDanger: () => void;
  onEndTurn: () => void;
  onQuit: () => void;
  onHelp: () => void;
}

const ICON_BTN = "inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-lg border px-3 text-sm font-semibold";
const OFF = `${ICON_BTN} border-border bg-bg-main/85 text-text-secondary hover:border-accent hover:text-accent`;
const ON = `${ICON_BTN} border-accent bg-accent/15 text-accent`;
const PHASE_TEXT = { player: "text-hg-morale", ally: "text-status-watching", enemy: "text-status-paused" } as const;
// 한 번 누른 끝내기가 저절로 풀리기까지(게임이 지은 값)
const ARM_MS = 4000;

function progress(state: BattleState, t: ReturnType<typeof useTranslations>): string[] {
  const lines: string[] = [];
  for (const rule of state.rules) {
    if (rule.kind === "burnShips") lines.push(t("hud.ships", { count: state.burned.length, max: rule.lossAt }));
  }
  const limit = state.objective.kind === "survive" ? state.objective.turns : state.loss.find((r) => r.kind === "turnLimit")?.turns;
  if (limit) lines.push(t("hud.turnsLeft", { left: Math.max(0, limit - state.turn + 1) }));
  return lines;
}

export default function BattleTopBar({ state, story, no, danger, busy, onDanger, onEndTurn, onQuit, onHelp }: Props) {
  const t = useTranslations("gameMythTroy");
  const [open, setOpen] = useState(false);
  // 끝내기를 한 번 누른 판(그 뒤 판이 바뀌면 — 누가 움직이면 — 저절로 풀린다)
  const [armedFor, setArmedFor] = useState<BattleState | null>(null);
  const mine = state.phase === "player" && !busy;
  const left = state.units.filter((u) => u.side === "player" && !u.acted).length;
  const armed = mine && armedFor === state;
  const endTurn = () => {
    if (left > 0 && !armed) {
      setArmedFor(state);
      window.setTimeout(() => setArmedFor((s) => (s === state ? null : s)), ARM_MS);
      return;
    }
    setArmedFor(null);
    onEndTurn();
  };
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 px-2 pt-[max(0.5rem,env(safe-area-inset-top))] sm:px-4">
      <div className="pointer-events-auto flex items-center gap-2 rounded-2xl border border-border bg-bg-main/85 p-1.5 backdrop-blur-sm">
        <button type="button" onClick={onQuit} className={OFF} aria-label={t("hud.saveQuit")} title={t("hud.saveQuit")}>
          <LogOut className="h-4 w-4 rtl:rotate-180" aria-hidden />
        </button>
        <div className="min-w-0 flex-1 px-1">
          <p className="truncate text-sm font-semibold text-accent">{t("chapters.chapterNo", { no })} · {story.title}</p>
          <p className="truncate text-sm text-text-primary">
            {t("hud.turn", { turn: state.turn })}
            {" · "}
            <span className={`font-bold ${PHASE_TEXT[state.phase]}`}>{t(`hud.phase.${state.phase}`)}</span>
          </p>
        </div>
        <button type="button" onClick={() => setOpen((v) => !v)} className={open ? ON : OFF} aria-expanded={open} aria-label={t("hud.objective")}>
          <Target className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">{t("hud.objective")}</span>
        </button>
        <button type="button" onClick={onDanger} className={danger ? ON : OFF} aria-pressed={danger} aria-label={t("hud.danger")} title={t("hud.danger")}>
          <ShieldAlert className="h-4 w-4" aria-hidden />
          <span className="hidden lg:inline">{t("hud.danger")}</span>
        </button>
        <button type="button" onClick={endTurn} disabled={!mine} aria-label={armed ? t("hud.endConfirm") : t("hud.endTurn")}
          className={`${ICON_BTN} ${armed ? "border-status-paused bg-status-paused text-bg-main" : "border-accent-hover/40 bg-accent text-bg-main hover:bg-accent-hover"} disabled:cursor-not-allowed disabled:opacity-50`}>
          <SkipForward className="h-4 w-4" aria-hidden />
          <span className={armed ? "inline" : "hidden sm:inline"}>{armed ? t("hud.endConfirm") : t("hud.endTurn")}</span>
        </button>
      </div>
      {armed && (
        <p className="pointer-events-none ms-auto mt-2 w-fit max-w-full break-keep rounded-xl border border-status-paused bg-bg-main/95 px-4 py-2 text-sm font-semibold text-text-primary" role="status">
          {t("hud.unmoved", { count: left })}
        </p>
      )}
      {open && (
        <div className="pointer-events-auto mt-2 w-full rounded-2xl border border-border-gold bg-bg-main/95 p-4 shadow-[0_18px_40px_-16px_var(--color-bg-main)] sm:ms-auto sm:w-96">
          <p className="flex items-center gap-2 text-sm font-bold text-accent"><Flag className="h-4 w-4" aria-hidden />{t("prep.objective")}</p>
          <p className="mt-1 break-keep text-sm text-text-primary">{story.objective}</p>
          <p className="mt-3 text-sm font-bold text-status-paused">{t("prep.loss")}</p>
          <p className="mt-1 break-keep text-sm text-text-primary">{story.loss}</p>
          {progress(state, t).map((line) => <p key={line} className="mt-2 text-sm font-semibold text-text-secondary">{line}</p>)}
          <button type="button" onClick={() => { setOpen(false); onHelp(); }} className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-bg-card text-sm font-semibold text-text-secondary hover:border-accent hover:text-accent">
            <BookOpen className="h-4 w-4" aria-hidden />{t("help.heading")}
          </button>
        </div>
      )}
    </div>
  );
}
