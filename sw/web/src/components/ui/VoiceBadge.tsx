/*
  파일명: components/ui/VoiceBadge.tsx
  기능: 음성 상태 뱃지
  책임: 스피커 아이콘을 유지하고, 실제 오디오가 있을 때 색과 음파 링을 활성화한다.
*/
"use client";

type BadgeSize = "sm" | "md" | "lg";

interface VoiceBadgeProps {
  /** 뱃지 크기 (sm: 20px, md: 카드 반응형, lg: 36px) */
  size?: BadgeSize;
  /** 실제 오디오가 있을 때만 색·발광·파동을 활성화한다 */
  active?: boolean;
  /** 음파 펄스 트리거 — 값이 바뀔 때마다 링 애니메이션 발동 */
  pulse?: number;
  className?: string;
}

/* md는 인물 카드 전용이다. 카드의 다른 표시(콘텐츠 수·조회수)와 같은 비율로 카드 폭을 따라
   연속으로 커지고 줄어든다. 화면 폭이 아니라 카드 폭이 기준이라 @container 안에서만 유효하다. */
const sizeConfig = {
  sm: { badge: "w-5 h-5", icon: "w-2.5 h-2.5", ring: "w-5 h-5" },
  md: {
    badge: "w-[clamp(18px,15cqw,28px)] h-[clamp(18px,15cqw,28px)]",
    icon: "w-[clamp(10px,8cqw,16px)] h-[clamp(10px,8cqw,16px)]",
    ring: "w-[clamp(18px,15cqw,28px)] h-[clamp(18px,15cqw,28px)]",
  },
  lg: { badge: "w-9 h-9", icon: "w-5 h-5", ring: "w-9 h-9" },
} as const;

export default function VoiceBadge({
  size = "md",
  active = true,
  pulse = 0,
  className = "",
}: VoiceBadgeProps) {
  const cfg = sizeConfig[size];
  const stateClass = active
    ? "bg-black/70 border-emerald-500/50 animate-[voiceGlow_2s_ease-in-out_infinite]"
    : "bg-black/60 border-white/15";

  return (
    <div className={`relative flex items-center justify-center ${cfg.badge} rounded-full border shadow-sm ${stateClass} ${className}`}>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className={`${cfg.icon} ${active ? "text-emerald-400" : "text-white/60"}`}>
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      </svg>
      {active && pulse > 0 && (
        <span
          key={pulse}
          className={`absolute ${cfg.ring} rounded-full border-2 border-emerald-400 animate-[voiceRing_800ms_ease-out_forwards] pointer-events-none`}
        />
      )}
    </div>
  );
}
