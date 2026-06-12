// #region Visual Constants
export const TIER_STYLES: Record<string, { bg: string; border: string; text: string; shadow: string; glow?: string; iconBg?: string }> = {
  common: {
    bg: "bg-[#2a2a2a]",
    border: "border-stone-600/30",
    text: "text-text-secondary",
    shadow: "shadow-inner",
    iconBg: "bg-stone-500/10",
  },
  uncommon: {
    bg: "bg-gradient-to-br from-[#5d4037] to-[#3e2723]",
    border: "border-[#8d6e63]/50",
    text: "text-[#d7ccc8]",
    shadow: "shadow-md",
    iconBg: "bg-[#8d6e63]/20",
  },
  rare: {
    bg: "bg-gradient-to-br from-[#eceff1] to-[#cfd8dc]",
    border: "border-white/80",
    text: "text-[#263238]",
    shadow: "shadow-lg shadow-slate-500/20",
    glow: "after:absolute after:inset-0 after:rounded-lg after:bg-gradient-to-br after:from-white/40 after:to-transparent after:opacity-50 pointer-events-none",
    iconBg: "bg-white/50 backdrop-blur-sm",
  },
  epic: {
    bg: "bg-gradient-to-br from-[#ffecb3] via-[#ffca28] to-[#ff6f00]",
    border: "border-[#ffecb3]",
    text: "text-[#3e2723]",
    shadow: "shadow-[0_0_20px_rgba(255,193,7,0.4)]",
    glow: "after:absolute after:inset-0 after:rounded-lg after:bg-gradient-to-t after:from-white/40 after:to-transparent after:opacity-60 overflow-hidden pointer-events-none",
    iconBg: "bg-white/40 backdrop-blur-md",
  },
};
// #endregion
