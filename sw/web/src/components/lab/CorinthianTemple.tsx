import React from "react";

// 신전 파사드 (Temple Facade)
// 그리스 신전의 정면 모습, 대칭 구조

interface CorinthianTempleProps {
  className?: string;
  columns?: 4 | 6 | 8;
}

export default function CorinthianTemple({ className = "", columns = 6 }: CorinthianTempleProps) {
  const width = 40 + columns * 35;

  return (
    <div className={`relative ${className}`} style={{ width: `${width * 0.8}px`, height: "200px" }}>
      <svg
        viewBox={`0 0 ${width} 200`}
        className="w-full h-full drop-shadow-2xl"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="temple-marble" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#d4d4d4" />
            <stop offset="30%" stopColor="#f5f5f5" />
            <stop offset="50%" stopColor="#ffffff" />
            <stop offset="70%" stopColor="#f5f5f5" />
            <stop offset="100%" stopColor="#d4d4d4" />
          </linearGradient>

          <linearGradient id="temple-gold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#bf953f" />
            <stop offset="50%" stopColor="#d4af37" />
            <stop offset="100%" stopColor="#aa771c" />
          </linearGradient>

          <linearGradient id="temple-shadow" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1a1a1a" stopOpacity="0" />
            <stop offset="100%" stopColor="#1a1a1a" stopOpacity="0.3" />
          </linearGradient>

          <filter id="temple-depth" x="-5%" y="-5%" width="110%" height="110%">
            <feDropShadow dx="2" dy="2" stdDeviation="2" floodOpacity="0.3" />
          </filter>
        </defs>

        <g filter="url(#temple-depth)">
          {/* 페디먼트 (삼각형 지붕) */}
          <polygon
            points={`${width / 2} 10, ${width - 15} 60, 15 60`}
            fill="url(#temple-marble)"
            stroke="url(#temple-gold)"
            strokeWidth="2"
          />

          {/* 페디먼트 내부 장식 */}
          <circle cx={width / 2} cy="42" r="12" fill="url(#temple-gold)" />
          <circle cx={width / 2} cy="42" r="8" fill="url(#temple-marble)" />

          {/* 엔타블러처 (기둥 위 수평 구조) */}
          <rect x="10" y="55" width={width - 20} height="8" fill="url(#temple-gold)" />
          <rect x="5" y="63" width={width - 10} height="12" fill="url(#temple-marble)" stroke="url(#temple-gold)" strokeWidth="1" />

          {/* 트리글리프 (장식 패널) */}
          {Array.from({ length: columns + 1 }).map((_, i) => {
            const x = 20 + i * ((width - 40) / columns) - 8;
            return (
              <g key={`triglyph-${i}`}>
                <rect x={x} y="56" width="16" height="6" fill="url(#temple-gold)" />
                <line x1={x + 4} y1="56" x2={x + 4} y2="62" stroke="#aa771c" strokeWidth="2" />
                <line x1={x + 8} y1="56" x2={x + 8} y2="62" stroke="#aa771c" strokeWidth="2" />
                <line x1={x + 12} y1="56" x2={x + 12} y2="62" stroke="#aa771c" strokeWidth="2" />
              </g>
            );
          })}

          {/* 기둥들 */}
          {Array.from({ length: columns }).map((_, i) => {
            const x = 20 + i * ((width - 40) / (columns - 1));
            return (
              <g key={`column-${i}`}>
                {/* 기둥 본체 */}
                <rect x={x - 8} y="75" width="16" height="100" fill="url(#temple-marble)" />

                {/* 플루팅 (세로 홈) */}
                {Array.from({ length: 3 }).map((__, j) => (
                  <line
                    key={j}
                    x1={x - 5 + j * 5}
                    y1="78"
                    x2={x - 5 + j * 5}
                    y2="172"
                    stroke="#c0c0c0"
                    strokeWidth="1"
                  />
                ))}

                {/* 주두 (Capital) */}
                <rect x={x - 10} y="72" width="20" height="6" fill="url(#temple-gold)" />

                {/* 기단 */}
                <rect x={x - 10} y="175" width="20" height="5" fill="url(#temple-gold)" />
              </g>
            );
          })}

          {/* 스타일로베이트 (기단) */}
          <rect x="0" y="180" width={width} height="8" fill="url(#temple-marble)" stroke="url(#temple-gold)" strokeWidth="1" />
          <rect x="0" y="188" width={width} height="12" fill="url(#temple-marble)" />

          {/* 그림자 오버레이 */}
          <rect x="10" y="75" width={width - 20} height="105" fill="url(#temple-shadow)" />
        </g>
      </svg>
    </div>
  );
}
