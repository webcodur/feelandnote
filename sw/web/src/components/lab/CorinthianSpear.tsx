import React from "react";

export default function CorinthianSpear({ className = "" }: { className?: string }) {
  return (
    <div className={`relative w-24 h-96 ${className}`}>
      <svg
        viewBox="0 0 100 400"
        className="w-full h-full drop-shadow-2xl"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="spear-gold-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#bf953f" />
            <stop offset="30%" stopColor="#fcf6ba" />
            <stop offset="50%" stopColor="#d4af37" />
            <stop offset="70%" stopColor="#fcf6ba" />
            <stop offset="100%" stopColor="#aa771c" />
          </linearGradient>

          <linearGradient id="spear-shaft-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#2c1810" />
            <stop offset="50%" stopColor="#5d4037" />
            <stop offset="100%" stopColor="#1a0f0a" />
          </linearGradient>
          
          <filter id="spear-metal-texture">
            <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" result="noise" />
            <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.15 0" in="noise" result="coloredNoise" />
            <feComposite operator="in" in="coloredNoise" in2="SourceGraphic" result="compositeNoise" />
            <feBlend mode="multiply" in="compositeNoise" in2="SourceGraphic" />
          </filter>
        </defs>

        {/* 1. 자루 (Shaft) - Dory - 지름 축소 (Width 16 -> 10) */}
        <rect x="45" y="100" width="10" height="280" fill="url(#spear-shaft-gradient)" />
        {/* 자루의 그립 부분 장식 */}
        <g opacity="0.4">
            <line x1="45" y1="200" x2="55" y2="204" stroke="#000" strokeWidth="1"/>
            <line x1="45" y1="205" x2="55" y2="209" stroke="#000" strokeWidth="1"/>
            <line x1="45" y1="210" x2="55" y2="214" stroke="#000" strokeWidth="1"/>
            <line x1="45" y1="215" x2="55" y2="219" stroke="#000" strokeWidth="1"/>
        </g>

        {/* 2. 소켓 (Socket) - 연결부 지름 축소 */}
        <path d="M45 100 L46 80 L54 80 L55 100 Z" fill="url(#spear-gold-gradient)" filter="url(#spear-metal-texture)" />
        {/* 연결부 링 장식 - 지름 축소에 맞춰 조정 */}
        <rect x="44.5" y="98" width="11" height="4" rx="2" fill="#d4af37" />
        <rect x="45.5" y="80" width="9" height="2" fill="#8a6d3b" />

        {/* 3. 창날 (Spearhead) - 길이 단축 및 직선적인 형태로 수정 */}
        <g filter="url(#spear-metal-texture)">
            {/* 
               메인 날 - 더 짧고 직선적인 실루엣 (Leaf/Diamond shape)
               기존: Tip at 5, Base at 82. Length ~77.
               수정: Tip at 25, Base at 82. Length ~57.
               폭: 50 +/- 8 (42~58) 정도로 유지하되 곡선을 직선화
            */}
            <path 
                d="M50 25 L58 60 L54 82 L46 82 L42 60 L50 25 Z" 
                fill="url(#spear-gold-gradient)" 
            />
            
            {/* 날 부분의 입체감 (Bevel) - 중앙 릿지를 기준으로 양쪽 면 구분 */}
            <path d="M50 25 L58 60 L50 65 L42 60 Z" fill="#fff" fillOpacity="0.1" />

            {/* 중앙 릿지 (Ridge) */}
            <path d="M50 25 L50 82" stroke="#aa771c" strokeWidth="1" opacity="0.6"/>
            {/* 하이라이트 */}
            <path d="M50 25 L50 82" stroke="#fff" strokeWidth="2" opacity="0.4" transform="translate(-0.5, 0)"/>
        </g>

        {/* 4. 하단부 (Sauroter) - 지름 축소 반영 */}
        <path d="M45 380 L50 400 L55 380 Z" fill="url(#spear-gold-gradient)" />

      </svg>
    </div>
  );
}
