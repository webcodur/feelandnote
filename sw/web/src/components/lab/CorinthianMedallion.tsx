import React from "react";

// 원형 메달리온 장식 (Medallion)
// 프로필 테두리, 뱃지 등에 활용 가능

interface CorinthianMedallionProps {
  className?: string;
  children?: React.ReactNode;
  size?: "sm" | "md" | "lg";
}

export default function CorinthianMedallion({ className = "", children, size = "md" }: CorinthianMedallionProps) {
  const sizeStyles = {
    sm: "w-24 h-24",
    md: "w-36 h-36",
    lg: "w-48 h-48",
  };

  return (
    <div className={`relative ${sizeStyles[size]} ${className}`}>
      <svg
        viewBox="0 0 200 200"
        className="w-full h-full drop-shadow-2xl"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="medallion-gold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#bf953f" />
            <stop offset="25%" stopColor="#fcf6ba" />
            <stop offset="50%" stopColor="#d4af37" />
            <stop offset="75%" stopColor="#fcf6ba" />
            <stop offset="100%" stopColor="#aa771c" />
          </linearGradient>

          <radialGradient id="medallion-inner" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#1a1a1a" />
            <stop offset="100%" stopColor="#0a0a0a" />
          </radialGradient>

          <filter id="medallion-emboss" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.3" numOctaves="2" result="noise" />
            <feComposite in="SourceGraphic" in2="noise" operator="arithmetic" k1="0.1" k2="0.9" k3="0.1" k4="0" />
          </filter>
        </defs>

        {/* 외곽 테두리 */}
        <circle cx="100" cy="100" r="95" fill="url(#medallion-gold)" />

        {/* 외곽 장식 패턴 - 점 */}
        {Array.from({ length: 24 }).map((_, i) => {
          const angle = (i * 15) * Math.PI / 180;
          const x = 100 + 88 * Math.cos(angle);
          const y = 100 + 88 * Math.sin(angle);
          return <circle key={i} cx={x} cy={y} r="3" fill="#aa771c" />;
        })}

        {/* 두 번째 테두리 */}
        <circle cx="100" cy="100" r="80" fill="url(#medallion-gold)" stroke="#5c4033" strokeWidth="1" />

        {/* 그리스 키 패턴 링 */}
        <circle cx="100" cy="100" r="75" fill="none" stroke="#aa771c" strokeWidth="8" strokeDasharray="10 5" />

        {/* 세 번째 테두리 */}
        <circle cx="100" cy="100" r="68" fill="url(#medallion-gold)" />

        {/* 내부 장식 링 */}
        <circle cx="100" cy="100" r="63" fill="none" stroke="#fcf6ba" strokeWidth="1" opacity="0.5" />

        {/* 중앙 배경 */}
        <circle cx="100" cy="100" r="58" fill="url(#medallion-inner)" />
        <circle cx="100" cy="100" r="58" fill="none" stroke="url(#medallion-gold)" strokeWidth="2" />

        {/* 중앙 장식 */}
        {!children && (
          <g opacity="0.3">
            {/* 중앙 별 문양 */}
            {Array.from({ length: 8 }).map((_, i) => {
              const angle = (i * 45) * Math.PI / 180;
              const x1 = 100 + 20 * Math.cos(angle);
              const y1 = 100 + 20 * Math.sin(angle);
              const x2 = 100 + 45 * Math.cos(angle);
              const y2 = 100 + 45 * Math.sin(angle);
              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="url(#medallion-gold)"
                  strokeWidth="2"
                />
              );
            })}
            <circle cx="100" cy="100" r="15" fill="none" stroke="url(#medallion-gold)" strokeWidth="1" />
          </g>
        )}
      </svg>

      {/* 중앙 콘텐츠 영역 */}
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-[50%] h-[50%] flex items-center justify-center">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
