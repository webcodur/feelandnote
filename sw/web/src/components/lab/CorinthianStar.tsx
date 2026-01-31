import React from "react";

// 베르기나 태양 (Vergina Sun) - 마케도니아 왕가의 상징
// 방사형 대칭 구조로 구현이 쉬움

interface CorinthianStarProps {
  className?: string;
  rays?: 8 | 12 | 16;
}

export default function CorinthianStar({ className = "", rays = 16 }: CorinthianStarProps) {
  const rayAngles = Array.from({ length: rays }, (_, i) => (360 / rays) * i);

  return (
    <div className={`relative w-48 h-48 ${className}`}>
      <svg
        viewBox="0 0 200 200"
        className="w-full h-full drop-shadow-2xl"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="star-gold-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#bf953f" />
            <stop offset="25%" stopColor="#fcf6ba" />
            <stop offset="50%" stopColor="#d4af37" />
            <stop offset="75%" stopColor="#fcf6ba" />
            <stop offset="100%" stopColor="#aa771c" />
          </linearGradient>

          <radialGradient id="star-center-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fcf6ba" />
            <stop offset="50%" stopColor="#d4af37" />
            <stop offset="100%" stopColor="#aa771c" />
          </radialGradient>

          <filter id="star-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g filter="url(#star-glow)">
          {/* 광선들 (Rays) */}
          {rayAngles.map((angle, i) => (
            <g key={i} transform={`rotate(${angle}, 100, 100)`}>
              {/* 주 광선 - 삼각형 */}
              <path
                d="M100 100 L95 20 L100 5 L105 20 Z"
                fill="url(#star-gold-gradient)"
              />
              {/* 보조 광선 (더 가늘고 짧게) */}
              {rays >= 12 && (
                <path
                  d="M100 100 L98 40 L100 30 L102 40 Z"
                  fill="url(#star-gold-gradient)"
                  opacity="0.6"
                  transform={`rotate(${180 / rays}, 100, 100)`}
                />
              )}
            </g>
          ))}

          {/* 중앙 원 */}
          <circle cx="100" cy="100" r="25" fill="url(#star-center-glow)" />
          <circle cx="100" cy="100" r="20" fill="none" stroke="#fcf6ba" strokeWidth="1" opacity="0.5" />
          <circle cx="100" cy="100" r="8" fill="#fcf6ba" fillOpacity="0.8" />
        </g>
      </svg>
    </div>
  );
}
