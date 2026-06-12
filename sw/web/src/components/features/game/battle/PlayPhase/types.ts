/*
  PlayPhase 공유 타입 및 상수
*/
import { Swords, ScrollText, Landmark, AlertTriangle } from "lucide-react";
import { createElement } from "react";
import type { Command } from "@/lib/game/types";
import type { getBattleText } from "../i18n";

/* ─── 명령 아이콘 / 스타일 ─── */

export const CMD_ICON: Record<Command, React.ReactNode> = {
  assault: createElement(Swords, { size: 20 }),
  stratagem: createElement(ScrollText, { size: 20 }),
  govern: createElement(Landmark, { size: 20 }),
};

export const CMD_STYLE: Record<Command, { border: string; bg: string; text: string; selectedBg: string }> = {
  assault: { border: "border-red-500/20", bg: "bg-red-500/[0.03]", text: "text-red-400", selectedBg: "bg-red-500/15 border-red-500/40" },
  stratagem: { border: "border-purple-500/20", bg: "bg-purple-500/[0.03]", text: "text-purple-400", selectedBg: "bg-purple-500/15 border-purple-500/40" },
  govern: { border: "border-amber-500/20", bg: "bg-amber-500/[0.03]", text: "text-amber-400", selectedBg: "bg-amber-500/15 border-amber-500/40" },
};

/* ─── 충돌 애니메이션 키프레임 ─── */

export const CLASH_KEYFRAMES = `
@keyframes clash-left {
  0% { transform: translateX(-120%); opacity: 0; }
  60% { transform: translateX(8%); opacity: 1; }
  80% { transform: translateX(-3%); }
  100% { transform: translateX(0); opacity: 1; }
}
@keyframes clash-right {
  0% { transform: translateX(120%); opacity: 0; }
  60% { transform: translateX(-8%); opacity: 1; }
  80% { transform: translateX(3%); }
  100% { transform: translateX(0); opacity: 1; }
}
@keyframes clash-flash {
  0% { opacity: 0; transform: scale(0.5); }
  50% { opacity: 1; transform: scale(1.3); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes clash-shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-4px); }
  40% { transform: translateX(4px); }
  60% { transform: translateX(-2px); }
  80% { transform: translateX(2px); }
}
@keyframes result-reveal {
  0% { opacity: 0; transform: translateY(8px); }
  100% { opacity: 1; transform: translateY(0); }
}
@keyframes deploy-pulse {
  0%, 100% { box-shadow: 0 0 12px 2px rgba(180,40,40,0.3), inset 0 0 20px rgba(180,40,40,0.1); }
  50% { box-shadow: 0 0 24px 6px rgba(200,50,50,0.5), inset 0 0 30px rgba(200,60,60,0.2); }
}
@keyframes deploy-ripple {
  0% { transform: scale(1); opacity: 0.6; }
  100% { transform: scale(2.2); opacity: 0; }
}
`;

/* ─── 내러티브 파싱 ─── */

type NarrativeSide = "player" | "ai" | "system";
export type NarrativeType = "normal" | "rebellion" | "mandate";
export interface ParsedNarrative {
  side: NarrativeSide;
  type: NarrativeType;
  text: string;
}

export const NARRATIVE_STYLE: Record<NarrativeType, { icon: React.ReactNode | null; cls: string; mobileCls: string }> = {
  rebellion: {
    icon: createElement(AlertTriangle, { size: 14, className: "text-red-400 shrink-0" }),
    cls: "bg-red-500/15 border-red-400/30 text-red-300",
    mobileCls: "border-red-400/20 bg-red-500/10 text-red-300",
  },
  mandate: { icon: null, cls: "text-amber-300", mobileCls: "text-amber-300" },
  normal: { icon: null, cls: "text-white/70", mobileCls: "text-white/70" },
};

/* ─── BattleText 타입 헬퍼 ─── */

export type BattleText = ReturnType<typeof getBattleText>;
