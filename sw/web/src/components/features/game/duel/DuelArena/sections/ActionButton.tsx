/*
  액션 버튼 컴포넌트 — 석재 스타일
*/
import type { DuelAction } from "@/lib/game/duelEngine";
import type { IconComponent, ActionStyleMap } from "../types";

// ─── 액션 버튼 스타일 설정 ───

export const ACTION_STYLE: ActionStyleMap = {
  charge: {
    activeClass: "text-[#d4af37]",
    color: "#d4af37",
    glowColor: "rgba(212,175,55,0.3)",
    bgTint: "rgba(212,175,55,0.10)",
    borderColor: "rgba(212,175,55,0.45)",
  },
  strike: {
    activeClass: "text-[#e8734a]",
    color: "#e8734a",
    glowColor: "rgba(232,115,74,0.35)",
    bgTint: "rgba(232,115,74,0.12)",
    borderColor: "rgba(232,115,74,0.55)",
  },
  brace: {
    activeClass: "text-[#7a9ab0]",
    color: "#7a9ab0",
    glowColor: "rgba(122,154,176,0.3)",
    bgTint: "rgba(122,154,176,0.10)",
    borderColor: "rgba(122,154,176,0.45)",
  },
};

// ─── 인트로 액션 색상 ───

export const INTRO_ACTION_COLOR: Record<DuelAction, string> = {
  charge: "text-[#d4af37]",
  strike: "text-[#c0805a]",
  brace: "text-[#7a9ab0]",
};

// ─── 컴포넌트 ───

export default function ActionButton({
  action,
  label,
  Icon,
  sub,
  canAct,
  highlight,
  onClick,
}: {
  action: DuelAction;
  label: string;
  Icon: IconComponent;
  sub: string;
  canAct: boolean;
  highlight: boolean;
  onClick: () => void;
}) {
  const cfg = ACTION_STYLE[action];
  const iconColor = canAct ? cfg.color : "rgba(255,255,255,0.25)";

  return (
    <button
      onClick={onClick}
      disabled={!canAct}
      className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-5 md:py-6 rounded-lg min-h-[84px] md:min-h-[96px] transition-colors
        ${canAct
          ? "scale-[0.97] cursor-pointer"
          : "cursor-not-allowed"
        }
        ${highlight ? "animate-pulse" : ""}
      `}
      style={{
        background: canAct
          ? `linear-gradient(to bottom, ${cfg.bgTint}, rgba(18,16,12,0.95))`
          : "linear-gradient(to bottom, rgba(24,22,18,0.5), rgba(16,14,12,0.7))",
        borderTop: canAct ? `3px solid ${cfg.borderColor}` : "1px solid rgba(255,255,255,0.06)",
        borderLeft: canAct ? `1px solid ${highlight ? cfg.color + "40" : "rgba(255,255,255,0.08)"}` : "1px solid rgba(255,255,255,0.06)",
        borderRight: canAct ? `1px solid ${highlight ? cfg.color + "40" : "rgba(255,255,255,0.08)"}` : "1px solid rgba(255,255,255,0.06)",
        borderBottom: canAct ? `1px solid rgba(255,255,255,0.05)` : "1px solid rgba(255,255,255,0.06)",
        boxShadow: canAct
          ? `inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -2px 6px rgba(0,0,0,0.5), 0 4px 12px rgba(0,0,0,0.5)${highlight ? `, 0 0 20px ${cfg.glowColor}` : ""}`
          : "inset 0 1px 3px rgba(0,0,0,0.5)",
      }}
    >
      <div style={{ opacity: canAct ? 1 : 0.3, filter: canAct ? `drop-shadow(0 0 4px ${cfg.glowColor})` : "none" }}>
        <Icon color={iconColor} size={30} />
      </div>
      <span className={`text-sm md:text-base font-bold tracking-wide ${canAct ? cfg.activeClass : "text-white/25"}`}>
        {label}
      </span>
      <span className={`text-[11px] md:text-xs font-mono ${canAct ? "text-white/45" : "text-white/20"}`}>
        {sub}
      </span>
    </button>
  );
}
