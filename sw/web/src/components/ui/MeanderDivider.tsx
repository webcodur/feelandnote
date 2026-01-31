import React, { useId } from "react";

// #region Types
type Variant = "gold" | "silver" | "bronze";
type Size = "sm" | "md" | "lg";

interface MeanderDividerProps {
  className?: string;
  variant?: Variant;
  size?: Size;
}
// #endregion

// #region Constants
const COLORS: Record<Variant, { main: string; light: string; dark: string; bg: string }> = {
  gold: {
    main: "#d4af37",
    light: "#fcf6ba",
    dark: "#aa771c",
    bg: "#1a1a1a",
  },
  silver: {
    main: "#c0c0c0",
    light: "#e8e8e8",
    dark: "#808080",
    bg: "#1a1a1a",
  },
  bronze: {
    main: "#cd7f32",
    light: "#eecfa1",
    dark: "#8b4513",
    bg: "#1a1a1a",
  },
};

const SIZE_STYLES: Record<Size, string> = {
  sm: "h-10",
  md: "h-12",
  lg: "h-16",
};
// #endregion

export default function MeanderDivider({
  className = "",
  variant = "gold",
  size = "md",
}: MeanderDividerProps) {
  const id = useId();
  const theme = COLORS[variant];
  const sizeStyle = SIZE_STYLES[size];

  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      className={`w-full ${sizeStyle} ${className}`}
    >
      <svg
        width="100%"
        height="100%"
        preserveAspectRatio="none"
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={`meander-gradient-${id}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={theme.light} />
            <stop offset="50%" stopColor={theme.main} />
            <stop offset="100%" stopColor={theme.dark} />
          </linearGradient>

          <pattern
            id={`meander-pattern-${id}`}
            x="0"
            y="0"
            width="40"
            height="100%"
            patternUnits="userSpaceOnUse"
            viewBox="0 0 40 40"
            preserveAspectRatio="xMidYMid slice"
          >
            <rect width="40" height="40" fill={theme.bg} />
            <path d="M0 2 L40 2" stroke={theme.main} strokeWidth="2" />
            <path d="M0 38 L40 38" stroke={theme.main} strokeWidth="2" />
            <path
              d="M0 6 V34 H35 V6 H6 V26 H26 V14 H16 V20"
              fill="none"
              stroke={`url(#meander-gradient-${id})`}
              strokeWidth="3.5"
              strokeLinecap="square"
            />
          </pattern>
        </defs>

        <rect x="0" y="0" width="100%" height="100%" fill={`url(#meander-pattern-${id})`} />
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="none"
          stroke={theme.main}
          strokeWidth="2"
          opacity="0.5"
        />
      </svg>
    </div>
  );
}
