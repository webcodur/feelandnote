import React from "react";

interface MeanderDividerProps {
  className?: string;
  variant?: "gold" | "silver" | "bronze";
}

export default function MeanderDivider({ className = "", variant = "gold" }: MeanderDividerProps) {
  // 기본 높이는 패턴 비율에 맞춰 설정하지만 클래스로 오버라이드 가능
  // 패턴 1유닛: 40x40 (가로 반복)
  
  const colors = {
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
    }
  };

  const theme = colors[variant];

  return (
    <div className={`w-full h-12 ${className}`}>
      <svg
        width="100%"
        height="100%"
        preserveAspectRatio="none" // 가로로 늘어나도 비율 유지보다는 패턴 반복이 중요하므로 none이 아니라 fill로 처리하되 pattern 사용
        className="w-full h-full drop-shadow-lg"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={`meander-${variant}-gradient`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={theme.light} />
            <stop offset="50%" stopColor={theme.main} />
            <stop offset="100%" stopColor={theme.dark} />
          </linearGradient>

          {/* 
            그리스 키 (Meander) 패턴 유닛 
            40x40 뷰박스 기준
            선 두께 4
          */}
          <pattern
            id={`meander-pattern-${variant}`}
            x="0"
            y="0"
            width="40"
            height="100%"
            patternUnits="userSpaceOnUse"
            viewBox="0 0 40 40"
            preserveAspectRatio="xMidYMid slice"
          >
            <rect width="40" height="40" fill={theme.bg} />
            
            {/* 상단/하단 가로줄 */}
            <path d="M0 2 L40 2" stroke={theme.main} strokeWidth="2" />
            <path d="M0 38 L40 38" stroke={theme.main} strokeWidth="2" />

            {/* 미로 패턴 본체 - 내부 공간을 더 넉넉하게 수정 */}
            {/* 
               단순화된 경로: 덜 감기게 하여 내부 여백 확보
               (0,34) -> (34,34) -> (34,6) -> (6,6) -> (6,26) -> (24,26) -> (24,16) -> (16,16) -> (16,20)
            */}
             <path 
              d="M0 34 H35 V6 H6 V26 H26 V14 H16 V20" 
              fill="none" 
              stroke={`url(#meander-${variant}-gradient)`} 
              strokeWidth="3.5" 
              strokeLinecap="square"
            />
          </pattern>
        </defs>

        {/* 패턴으로 채운 사각형 */}
        <rect x="0" y="0" width="100%" height="100%" fill={`url(#meander-pattern-${variant})`} />
        
        {/* 양옆 그라데이션 오버레이 (자연스러운 페이드아웃) */}
        <rect x="0" y="0" width="100%" height="100%" fill="none" stroke={theme.main} strokeWidth="2" opacity="0.5" />
      </svg>
    </div>
  );
}
