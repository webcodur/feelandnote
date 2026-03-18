/*
  SVG 아이콘 — 명령별 (assault / stratagem / govern)
*/
import type { Command } from "@/lib/game/types";
import type { DuelAction } from "@/lib/game/duelEngine";
import type { IconComponent } from "../types";

// ─── Assault 아이콘 ───

function AssaultChargeIcon({ color, size = 28 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill={color} fillOpacity="0.15" />
    </svg>
  );
}

function AssaultStrikeIcon({ color, size = 28 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2L20 7.5 8 19.5 2.5 14 14.5 2z" fill={color} fillOpacity="0.1" />
      <path d="M16 8L2 22" />
      <path d="M8 2v4h4" />
    </svg>
  );
}

function AssaultBraceIcon({ color, size = 28 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3L4 9v6c0 4 3.5 7.5 8 9 4.5-1.5 8-5 8-9V9l-8-6z" fill={color} fillOpacity="0.1" />
    </svg>
  );
}

// ─── Stratagem 아이콘 ───

function StratagemChargeIcon({ color, size = 28 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" fill={color} fillOpacity="0.08" />
      <path d="M9 9c0-1.5 1.2-3 3-3s3 1.5 3 3c0 2-3 2.5-3 4.5" />
      <circle cx="12" cy="17.5" r="0.8" fill={color} />
    </svg>
  );
}

function StratagemStrikeIcon({ color, size = 28 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
      {/* 확성기 본체 */}
      <path
        d="M4 9h3l5-5v16l-5-5H4a1 1 0 01-1-1v-4a1 1 0 011-1z"
        fill={color} fillOpacity="0.12"
        stroke={color} strokeWidth="1.8"
      />
      {/* 음파 — 전방 확산 */}
      <path d="M16 8c1.5 1.2 2.2 2.8 2.2 4.5S17.5 15.3 16 16.5" stroke={color} strokeWidth="1.8" />
      <path d="M19 5.5c2.3 2 3.5 4.7 3.5 7s-1.2 5-3.5 7" stroke={color} strokeWidth="1.5" opacity="0.6" />
    </svg>
  );
}

function StratagemBraceIcon({ color, size = 28 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2C7 2 3 6 3 11v2c0 5 4 9 9 9s9-4 9-9v-2c0-5-4-9-9-9z" fill={color} fillOpacity="0.06" />
      <path d="M8 12c1.5-2 3-2 4 0s2.5 2 4 0" />
      <path d="M8 8c1.5-2 3-2 4 0s2.5 2 4 0" />
      <path d="M8 16c1.5-2 3-2 4 0s2.5 2 4 0" />
    </svg>
  );
}

// ─── 매핑 ───

export const ACTION_ICONS: Record<Command, Record<DuelAction, IconComponent>> = {
  assault: {
    charge: AssaultChargeIcon,
    strike: AssaultStrikeIcon,
    brace: AssaultBraceIcon,
  },
  stratagem: {
    charge: StratagemChargeIcon,
    strike: StratagemStrikeIcon,
    brace: StratagemBraceIcon,
  },
  govern: {
    charge: AssaultChargeIcon,
    strike: AssaultStrikeIcon,
    brace: AssaultBraceIcon,
  },
};
