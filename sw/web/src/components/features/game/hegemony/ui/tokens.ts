/*
  파일명: components/features/game/hegemony/ui/tokens.ts
  기능: 패권 화면 색·아이콘 표
  책임: 명령·진영별 클래스를 한 곳에 둔다. Tailwind가 읽을 수 있게 클래스는 문자열을 통째로 적는다.
*/

import { Landmark, ScrollText, Swords, type LucideIcon } from "lucide-react";
import type { Command } from "@/lib/game/types";
import type { Side, Verdict } from "@/lib/game/hegemony/types";

export interface CommandTone {
  text: string;
  soft: string;
  border: string;
  ring: string;
  ringSoft: string;
  fill: string;
  glow: string;
  icon: LucideIcon;
  /** 단축키 */
  key: string;
}

export const COMMAND_TONE: Record<Command, CommandTone> = {
  assault: {
    text: "text-hg-assault",
    soft: "bg-hg-assault/10",
    border: "border-hg-assault/60",
    ring: "ring-hg-assault",
    ringSoft: "ring-hg-assault/40",
    fill: "bg-hg-assault",
    glow: "shadow-hg-assault/40",
    icon: Swords,
    key: "q",
  },
  stratagem: {
    text: "text-hg-stratagem",
    soft: "bg-hg-stratagem/10",
    border: "border-hg-stratagem/60",
    ring: "ring-hg-stratagem",
    ringSoft: "ring-hg-stratagem/40",
    fill: "bg-hg-stratagem",
    glow: "shadow-hg-stratagem/40",
    icon: ScrollText,
    key: "w",
  },
  govern: {
    text: "text-hg-govern",
    soft: "bg-hg-govern/10",
    border: "border-hg-govern/60",
    ring: "ring-hg-govern",
    ringSoft: "ring-hg-govern/40",
    fill: "bg-hg-govern",
    glow: "shadow-hg-govern/40",
    icon: Landmark,
    key: "e",
  },
};

export const SIDE_TONE: Record<Side, { text: string; fill: string; border: string; soft: string }> = {
  player: { text: "text-accent", fill: "bg-accent", border: "border-accent/60", soft: "bg-accent/10" },
  ai: { text: "text-hg-enemy", fill: "bg-hg-enemy", border: "border-hg-enemy/60", soft: "bg-hg-enemy/10" },
};

export const VERDICT_TONE: Record<Verdict, { text: string; soft: string; border: string }> = {
  win: { text: "text-accent", soft: "bg-accent/10", border: "border-accent/50" },
  lose: { text: "text-hg-enemy", soft: "bg-hg-enemy/10", border: "border-hg-enemy/50" },
  draw: { text: "text-hg-bright", soft: "bg-hg-bright/10", border: "border-hg-bright/30" },
};

/** 조작 요소 공통 포커스 표시 (ui-focus) */
export const FOCUS_RING = "outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-hg-ink";

/** 패널 바탕 */
export const PANEL = "rounded-2xl border border-hg-line/80 bg-hg-panel/85 backdrop-blur-md shadow-2xl shadow-black/40";
