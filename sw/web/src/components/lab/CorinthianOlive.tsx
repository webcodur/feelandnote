import React from "react";

// 올리브 가지 (Olive Branch)
// 평화와 승리의 상징, 올림픽 관 제작에 사용

interface CorinthianOliveProps {
  className?: string;
  variant?: "branch" | "wreath";
}

export default function CorinthianOlive({ className = "", variant = "branch" }: CorinthianOliveProps) {
  return (
    <div className={`relative ${variant === "branch" ? "w-56 h-32" : "w-48 h-48"} ${className}`}>
      <svg
        viewBox={variant === "branch" ? "0 0 240 130" : "0 0 200 200"}
        className="w-full h-full drop-shadow-2xl"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="olive-leaf" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6b8e23" />
            <stop offset="50%" stopColor="#9acd32" />
            <stop offset="100%" stopColor="#556b2f" />
          </linearGradient>

          <linearGradient id="olive-gold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#bf953f" />
            <stop offset="50%" stopColor="#d4af37" />
            <stop offset="100%" stopColor="#aa771c" />
          </linearGradient>

          <linearGradient id="olive-stem" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#8b7355" />
            <stop offset="100%" stopColor="#5c4033" />
          </linearGradient>

          <filter id="olive-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {variant === "branch" ? (
          <g filter="url(#olive-glow)">
            {/* 가지 줄기 */}
            <path
              d="M10 65 Q60 70, 120 65 Q180 60, 230 65"
              fill="none"
              stroke="url(#olive-stem)"
              strokeWidth="4"
              strokeLinecap="round"
            />

            {/* 잎사귀들 - 위쪽 */}
            {[30, 60, 90, 120, 150, 180, 210].map((x, i) => (
              <g key={`top-${i}`}>
                <path
                  d={`M${x} 62 Q${x - 5} 40, ${x + 10} 30 Q${x + 15} 45, ${x} 62`}
                  fill="url(#olive-leaf)"
                />
              </g>
            ))}

            {/* 잎사귀들 - 아래쪽 */}
            {[45, 75, 105, 135, 165, 195].map((x, i) => (
              <g key={`bottom-${i}`}>
                <path
                  d={`M${x} 68 Q${x - 5} 90, ${x + 10} 100 Q${x + 15} 85, ${x} 68`}
                  fill="url(#olive-leaf)"
                />
              </g>
            ))}

            {/* 올리브 열매 */}
            {[50, 110, 170].map((x, i) => (
              <ellipse key={`fruit-${i}`} cx={x} cy={65} rx="6" ry="8" fill="#2e4a1e" />
            ))}
          </g>
        ) : (
          <g filter="url(#olive-glow)">
            {/* 왼쪽 가지 */}
            <g transform="translate(100, 180) rotate(-15)">
              <path
                d="M0 0 Q-20 -80, -10 -160"
                fill="none"
                stroke="url(#olive-stem)"
                strokeWidth="3"
              />
              {Array.from({ length: 8 }).map((_, i) => (
                <g key={`l-${i}`} transform={`translate(${-5 - i * 1}, ${-20 - i * 18})`}>
                  <path d="M0 0 Q-15 -5, -20 -20 Q-5 -20, 0 0" fill="url(#olive-leaf)" />
                  {i % 2 === 0 && <ellipse cx="-5" cy="-5" rx="3" ry="4" fill="#2e4a1e" />}
                </g>
              ))}
            </g>

            {/* 오른쪽 가지 */}
            <g transform="translate(100, 180) rotate(15)">
              <path
                d="M0 0 Q20 -80, 10 -160"
                fill="none"
                stroke="url(#olive-stem)"
                strokeWidth="3"
              />
              {Array.from({ length: 8 }).map((_, i) => (
                <g key={`r-${i}`} transform={`translate(${5 + i * 1}, ${-20 - i * 18})`}>
                  <path d="M0 0 Q15 -5, 20 -20 Q5 -20, 0 0" fill="url(#olive-leaf)" />
                  {i % 2 === 0 && <ellipse cx="5" cy="-5" rx="3" ry="4" fill="#2e4a1e" />}
                </g>
              ))}
            </g>

            {/* 하단 리본/매듭 */}
            <g transform="translate(100, 175)">
              <path d="M-5 0 Q0 5, 5 0 L5 10 L0 8 L-5 10 Z" fill="url(#olive-gold)" />
            </g>
          </g>
        )}
      </svg>
    </div>
  );
}
