import React from "react";

// 코린트식 투구 (Corinthian Helmet)
// 스파르타 전사의 상징적인 투구

interface CorinthianHelmetProps {
  className?: string;
  withCrest?: boolean;
}

export default function CorinthianHelmet({ className = "", withCrest = true }: CorinthianHelmetProps) {
  return (
    <div className={`relative w-48 h-56 ${className}`}>
      <svg
        viewBox="0 0 200 230"
        className="w-full h-full drop-shadow-2xl"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="helmet-gold-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#bf953f" />
            <stop offset="25%" stopColor="#fcf6ba" />
            <stop offset="50%" stopColor="#d4af37" />
            <stop offset="75%" stopColor="#fcf6ba" />
            <stop offset="100%" stopColor="#aa771c" />
          </linearGradient>

          <linearGradient id="helmet-bronze-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8b4513" />
            <stop offset="30%" stopColor="#cd7f32" />
            <stop offset="50%" stopColor="#daa520" />
            <stop offset="70%" stopColor="#cd7f32" />
            <stop offset="100%" stopColor="#8b4513" />
          </linearGradient>

          <linearGradient id="crest-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#8b0000" />
            <stop offset="50%" stopColor="#dc143c" />
            <stop offset="100%" stopColor="#8b0000" />
          </linearGradient>

          <filter id="helmet-shadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.5" />
          </filter>
        </defs>

        <g filter="url(#helmet-shadow)">
          {/* 깃털 장식 (Crest) */}
          {withCrest && (
            <g>
              {/* 깃털 받침대 */}
              <path
                d="M85 60 Q100 55, 115 60 L110 70 Q100 65, 90 70 Z"
                fill="url(#helmet-gold-gradient)"
              />
              {/* 깃털 본체 */}
              <path
                d="M95 60 Q90 30, 85 10 Q100 5, 115 10 Q110 30, 105 60"
                fill="url(#crest-gradient)"
              />
              {/* 깃털 디테일 */}
              {Array.from({ length: 5 }).map((_, i) => (
                <line
                  key={i}
                  x1={90 + i * 5}
                  y1="55"
                  x2={88 + i * 6}
                  y2="15"
                  stroke="#5a0000"
                  strokeWidth="1"
                  opacity="0.3"
                />
              ))}
            </g>
          )}

          {/* 투구 본체 (Dome) */}
          <path
            d="M40 120
               Q40 60, 100 50
               Q160 60, 160 120
               L155 180
               Q100 200, 45 180
               Z"
            fill="url(#helmet-bronze-gradient)"
          />

          {/* 코 보호대 (Nasal Guard) */}
          <path
            d="M90 130 L100 200 L110 130"
            fill="url(#helmet-bronze-gradient)"
            stroke="url(#helmet-gold-gradient)"
            strokeWidth="2"
          />

          {/* 눈 구멍 (Eye Slots) - 왼쪽 */}
          <ellipse cx="70" cy="140" rx="18" ry="25" fill="#0a0a0a" />
          <ellipse cx="70" cy="140" rx="16" ry="23" fill="none" stroke="url(#helmet-gold-gradient)" strokeWidth="2" />

          {/* 눈 구멍 (Eye Slots) - 오른쪽 */}
          <ellipse cx="130" cy="140" rx="18" ry="25" fill="#0a0a0a" />
          <ellipse cx="130" cy="140" rx="16" ry="23" fill="none" stroke="url(#helmet-gold-gradient)" strokeWidth="2" />

          {/* 볼 보호대 (Cheek Guards) */}
          <path
            d="M45 175 Q30 190, 40 220 Q60 225, 70 210 Q75 195, 55 180"
            fill="url(#helmet-bronze-gradient)"
            stroke="url(#helmet-gold-gradient)"
            strokeWidth="1"
          />
          <path
            d="M155 175 Q170 190, 160 220 Q140 225, 130 210 Q125 195, 145 180"
            fill="url(#helmet-bronze-gradient)"
            stroke="url(#helmet-gold-gradient)"
            strokeWidth="1"
          />

          {/* 장식선 */}
          <path
            d="M50 100 Q100 90, 150 100"
            fill="none"
            stroke="url(#helmet-gold-gradient)"
            strokeWidth="3"
          />

          {/* 테두리 장식 */}
          <ellipse cx="100" cy="75" rx="50" ry="8" fill="none" stroke="url(#helmet-gold-gradient)" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}
