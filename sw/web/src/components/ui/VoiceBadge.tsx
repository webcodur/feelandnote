/*
  파일명: components/ui/VoiceBadge.tsx
  기능: 음성 지원 뱃지
  책임: 음성 보유 인물에 스피커 아이콘 + 음파 링 애니메이션을 표시한다.
*/
"use client";

type BadgeSize = "sm" | "md";

interface VoiceBadgeProps {
  /** 뱃지 크기 (sm: 20px, md: 24px) */
  size?: BadgeSize;
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
} as const;

export default function VoiceBadge({ size = "md", pulse = 0, className = "" }: VoiceBadgeProps) {
  const cfg = sizeConfig[size];

  return (
    <div className={`relative flex items-center justify-center ${cfg.badge} rounded-full bg-black/70 shadow-sm border border-emerald-500/50 animate-[voiceGlow_2s_ease-in-out_infinite] ${className}`}>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className={`${cfg.icon} text-emerald-400`}>
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      </svg>
      {pulse > 0 && (
        <span
          key={pulse}
          className={`absolute ${cfg.ring} rounded-full border-2 border-emerald-400 animate-[voiceRing_800ms_ease-out_forwards] pointer-events-none`}
        />
      )}
    </div>
  );
}
