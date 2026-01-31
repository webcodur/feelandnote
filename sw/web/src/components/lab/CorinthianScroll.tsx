import React from "react";

// 양피지 두루마리 (Scroll)
// 지식, 기록, 철학을 상징

interface CorinthianScrollProps {
  className?: string;
  open?: boolean;
}

export default function CorinthianScroll({ className = "", open = true }: CorinthianScrollProps) {
  return (
    <div className={`relative w-56 h-40 ${className}`}>
      <svg
        viewBox="0 0 240 160"
        className="w-full h-full drop-shadow-2xl"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="scroll-paper" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f5e6c8" />
            <stop offset="50%" stopColor="#e8d4a8" />
            <stop offset="100%" stopColor="#d4c088" />
          </linearGradient>

          <linearGradient id="scroll-edge" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8b7355" />
            <stop offset="50%" stopColor="#a08060" />
            <stop offset="100%" stopColor="#8b7355" />
          </linearGradient>

          <linearGradient id="scroll-gold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#bf953f" />
            <stop offset="50%" stopColor="#d4af37" />
            <stop offset="100%" stopColor="#aa771c" />
          </linearGradient>

          <filter id="scroll-texture" x="0%" y="0%" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="5" result="noise" />
            <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0.9  0 0 0 0 0.85  0 0 0 0 0.7  0 0 0 0.15 0" result="paper" />
            <feBlend in="SourceGraphic" in2="paper" mode="multiply" />
          </filter>
        </defs>

        {open ? (
          <g filter="url(#scroll-texture)">
            {/* 왼쪽 롤 */}
            <ellipse cx="25" cy="80" rx="20" ry="70" fill="url(#scroll-edge)" />
            <ellipse cx="22" cy="80" rx="15" ry="65" fill="url(#scroll-paper)" />
            {/* 왼쪽 롤 장식 */}
            <circle cx="25" cy="15" r="8" fill="url(#scroll-gold)" />
            <circle cx="25" cy="145" r="8" fill="url(#scroll-gold)" />

            {/* 펼쳐진 본문 영역 */}
            <rect x="40" y="15" width="160" height="130" fill="url(#scroll-paper)" />

            {/* 텍스트 라인 (장식용) */}
            {Array.from({ length: 7 }).map((_, i) => (
              <line
                key={i}
                x1="55"
                y1={35 + i * 16}
                x2="185"
                y2={35 + i * 16}
                stroke="#8b7355"
                strokeWidth="1"
                opacity="0.3"
              />
            ))}

            {/* 오른쪽 롤 */}
            <ellipse cx="215" cy="80" rx="20" ry="70" fill="url(#scroll-edge)" />
            <ellipse cx="218" cy="80" rx="15" ry="65" fill="url(#scroll-paper)" />
            {/* 오른쪽 롤 장식 */}
            <circle cx="215" cy="15" r="8" fill="url(#scroll-gold)" />
            <circle cx="215" cy="145" r="8" fill="url(#scroll-gold)" />

            {/* 테두리 장식 */}
            <rect x="40" y="15" width="160" height="130" fill="none" stroke="url(#scroll-gold)" strokeWidth="2" />
          </g>
        ) : (
          <g filter="url(#scroll-texture)">
            {/* 닫힌 두루마리 */}
            <ellipse cx="120" cy="80" rx="30" ry="70" fill="url(#scroll-edge)" />
            <ellipse cx="120" cy="80" rx="25" ry="65" fill="url(#scroll-paper)" />

            {/* 끈 */}
            <path
              d="M95 70 Q90 80, 95 90 Q145 95, 145 70 Q150 60, 145 50 Q95 55, 95 70"
              fill="none"
              stroke="url(#scroll-gold)"
              strokeWidth="3"
            />

            {/* 장식 */}
            <circle cx="120" cy="15" r="10" fill="url(#scroll-gold)" />
            <circle cx="120" cy="145" r="10" fill="url(#scroll-gold)" />
          </g>
        )}
      </svg>
    </div>
  );
}
