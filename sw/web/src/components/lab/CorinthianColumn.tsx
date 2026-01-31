import React from "react";

// 그리스 기둥 - 도리아, 이오니아, 코린트식 기둥

interface CorinthianColumnProps {
  className?: string;
  order?: "doric" | "ionic" | "corinthian";
}

export default function CorinthianColumn({ className = "", order = "corinthian" }: CorinthianColumnProps) {
  return (
    <div className={`relative w-24 h-72 ${className}`}>
      <svg
        viewBox="0 0 100 300"
        className="w-full h-full drop-shadow-2xl"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={`column-gradient-${order}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#aa771c" />
            <stop offset="20%" stopColor="#fcf6ba" />
            <stop offset="50%" stopColor="#d4af37" />
            <stop offset="80%" stopColor="#fcf6ba" />
            <stop offset="100%" stopColor="#aa771c" />
          </linearGradient>

          <linearGradient id={`column-shadow-${order}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1a1a1a" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#1a1a1a" stopOpacity="0" />
            <stop offset="100%" stopColor="#1a1a1a" stopOpacity="0.3" />
          </linearGradient>
        </defs>

        {/* 기단 (Base/Stylobate) */}
        <rect x="5" y="280" width="90" height="20" fill={`url(#column-gradient-${order})`} />
        <rect x="10" y="270" width="80" height="10" fill={`url(#column-gradient-${order})`} />

        {/* 기둥 몸통 (Shaft) - 플루팅(홈) 표현 */}
        <g>
          {/* 기둥 본체 */}
          <path
            d="M20 270 L15 80 Q50 75, 85 80 L80 270 Z"
            fill={`url(#column-gradient-${order})`}
          />

          {/* 플루팅 (세로 홈) */}
          {Array.from({ length: 7 }).map((_, i) => (
            <line
              key={i}
              x1={22 + i * 8}
              y1="268"
              x2={19 + i * 8}
              y2="82"
              stroke="#aa771c"
              strokeWidth="1"
              opacity="0.3"
            />
          ))}

          {/* 그림자 오버레이 */}
          <path
            d="M20 270 L15 80 Q50 75, 85 80 L80 270 Z"
            fill={`url(#column-shadow-${order})`}
          />
        </g>

        {/* 주두 (Capital) - 양식에 따라 다름 */}
        {order === "doric" && (
          <g>
            {/* 에키누스 (둥근 부분) */}
            <ellipse cx="50" cy="75" rx="40" ry="8" fill={`url(#column-gradient-${order})`} />
            {/* 아바쿠스 (상단 평판) */}
            <rect x="5" y="55" width="90" height="15" fill={`url(#column-gradient-${order})`} />
          </g>
        )}

        {order === "ionic" && (
          <g>
            {/* 볼류트 (소용돌이) - 단순화 */}
            <ellipse cx="50" cy="70" rx="42" ry="6" fill={`url(#column-gradient-${order})`} />
            {/* 왼쪽 소용돌이 */}
            <circle cx="10" cy="65" r="12" fill="none" stroke={`url(#column-gradient-${order})`} strokeWidth="3" />
            <circle cx="10" cy="65" r="6" fill={`url(#column-gradient-${order})`} />
            {/* 오른쪽 소용돌이 */}
            <circle cx="90" cy="65" r="12" fill="none" stroke={`url(#column-gradient-${order})`} strokeWidth="3" />
            <circle cx="90" cy="65" r="6" fill={`url(#column-gradient-${order})`} />
            {/* 아바쿠스 */}
            <rect x="5" y="45" width="90" height="12" fill={`url(#column-gradient-${order})`} />
          </g>
        )}

        {order === "corinthian" && (
          <g>
            {/* 아칸서스 잎 (단순화된 형태) */}
            {/* 하단 잎 */}
            {[-1, 1].map((dir) => (
              <g key={dir}>
                <path
                  d={`M50 75 Q${50 + dir * 30} 65, ${50 + dir * 35} 55 Q${50 + dir * 25} 50, ${50 + dir * 20} 60 Q${50 + dir * 15} 55, 50 75`}
                  fill={`url(#column-gradient-${order})`}
                />
              </g>
            ))}
            {/* 중단 잎 */}
            {[-1, 1].map((dir) => (
              <g key={`mid-${dir}`}>
                <path
                  d={`M50 60 Q${50 + dir * 25} 50, ${50 + dir * 30} 40 Q${50 + dir * 20} 35, ${50 + dir * 15} 45 Q${50 + dir * 10} 40, 50 60`}
                  fill={`url(#column-gradient-${order})`}
                />
              </g>
            ))}
            {/* 상단 볼류트 */}
            <circle cx="20" cy="35" r="8" fill="none" stroke={`url(#column-gradient-${order})`} strokeWidth="2" />
            <circle cx="80" cy="35" r="8" fill="none" stroke={`url(#column-gradient-${order})`} strokeWidth="2" />
            <circle cx="20" cy="35" r="3" fill={`url(#column-gradient-${order})`} />
            <circle cx="80" cy="35" r="3" fill={`url(#column-gradient-${order})`} />
            {/* 아바쿠스 */}
            <rect x="5" y="20" width="90" height="12" fill={`url(#column-gradient-${order})`} />
          </g>
        )}
      </svg>
    </div>
  );
}
