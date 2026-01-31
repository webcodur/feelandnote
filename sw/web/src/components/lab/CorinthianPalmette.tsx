import React from "react";

// 팔메트 문양 (Palmette)
// 그리스 건축과 도자기에서 흔히 볼 수 있는 부채꼴 장식

interface CorinthianPalmetteProps {
  className?: string;
  variant?: "single" | "anthemion";
}

export default function CorinthianPalmette({ className = "", variant = "single" }: CorinthianPalmetteProps) {
  return (
    <div className={`relative ${variant === "single" ? "w-32 h-40" : "w-64 h-24"} ${className}`}>
      <svg
        viewBox={variant === "single" ? "0 0 130 160" : "0 0 260 100"}
        className="w-full h-full drop-shadow-2xl"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="palmette-gold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#bf953f" />
            <stop offset="25%" stopColor="#fcf6ba" />
            <stop offset="50%" stopColor="#d4af37" />
            <stop offset="75%" stopColor="#fcf6ba" />
            <stop offset="100%" stopColor="#aa771c" />
          </linearGradient>

          <filter id="palmette-glow" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="1" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {variant === "single" ? (
          <g filter="url(#palmette-glow)" transform="translate(65, 150)">
            {/* 중앙 잎 */}
            <path
              d="M0 0 Q-5 -60, 0 -120 Q5 -60, 0 0"
              fill="url(#palmette-gold)"
            />

            {/* 좌우 잎들 */}
            {[-1, 1].map((dir) => (
              <g key={dir}>
                {/* 첫 번째 잎 */}
                <path
                  d={`M0 0 Q${dir * 15} -50, ${dir * 20} -100 Q${dir * 25} -50, ${dir * 10} -10 Q${dir * 5} 0, 0 0`}
                  fill="url(#palmette-gold)"
                />
                {/* 두 번째 잎 */}
                <path
                  d={`M0 0 Q${dir * 30} -40, ${dir * 40} -80 Q${dir * 45} -35, ${dir * 25} -5 Q${dir * 15} 5, 0 0`}
                  fill="url(#palmette-gold)"
                />
                {/* 세 번째 잎 (바깥쪽) */}
                <path
                  d={`M0 0 Q${dir * 45} -25, ${dir * 55} -55 Q${dir * 55} -20, ${dir * 35} 0 Q${dir * 20} 10, 0 0`}
                  fill="url(#palmette-gold)"
                />
              </g>
            ))}

            {/* 받침대 */}
            <ellipse cx="0" cy="5" rx="20" ry="8" fill="url(#palmette-gold)" />
            <rect x="-15" y="5" width="30" height="5" fill="url(#palmette-gold)" />
          </g>
        ) : (
          <g filter="url(#palmette-glow)">
            {/* 안테미온 패턴 - 팔메트와 연꽃의 반복 */}
            {[0, 1, 2].map((i) => (
              <g key={i} transform={`translate(${65 + i * 65}, 90)`}>
                {/* 팔메트 */}
                <path d="M0 0 Q-3 -35, 0 -70 Q3 -35, 0 0" fill="url(#palmette-gold)" />
                {[-1, 1].map((dir) => (
                  <g key={dir}>
                    <path
                      d={`M0 0 Q${dir * 10} -30, ${dir * 15} -55 Q${dir * 18} -25, ${dir * 8} -5 Q${dir * 3} 0, 0 0`}
                      fill="url(#palmette-gold)"
                    />
                    <path
                      d={`M0 0 Q${dir * 20} -20, ${dir * 28} -40 Q${dir * 28} -15, ${dir * 18} 0 Q${dir * 10} 5, 0 0`}
                      fill="url(#palmette-gold)"
                    />
                  </g>
                ))}
                <ellipse cx="0" cy="5" rx="12" ry="5" fill="url(#palmette-gold)" />
              </g>
            ))}

            {/* 연결 볼류트 (소용돌이) */}
            {[0, 1].map((i) => (
              <g key={`volute-${i}`} transform={`translate(${97 + i * 65}, 90)`}>
                <path
                  d="M-15 0 Q-15 -15, 0 -15 Q15 -15, 15 0"
                  fill="none"
                  stroke="url(#palmette-gold)"
                  strokeWidth="3"
                />
                <circle cx="-15" cy="0" r="5" fill="url(#palmette-gold)" />
                <circle cx="15" cy="0" r="5" fill="url(#palmette-gold)" />
              </g>
            ))}

            {/* 하단 베이스 라인 */}
            <rect x="0" y="92" width="260" height="8" fill="url(#palmette-gold)" />
          </g>
        )}
      </svg>
    </div>
  );
}
