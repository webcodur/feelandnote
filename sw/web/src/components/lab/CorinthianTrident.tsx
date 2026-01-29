import React from "react";

export default function CorinthianTrident({ className = "" }: { className?: string }) {
  return (
    <div className={`relative w-24 h-96 ${className}`}>
      <svg
        viewBox="0 0 100 400"
        className="w-full h-full drop-shadow-2xl"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="trident-gold-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#bf953f" />
            <stop offset="25%" stopColor="#fcf6ba" />
            <stop offset="50%" stopColor="#d4af37" />
            <stop offset="75%" stopColor="#fcf6ba" />
            <stop offset="100%" stopColor="#aa771c" />
          </linearGradient>

          <filter id="trident-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feComposite in="coloredBlur" in2="SourceGraphic" operator="in" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* 1. 자루 (Shaft) - 길이를 늘리고(y=90 -> y=380) 위로 연결 */}
        <rect x="46" y="85" width="8" height="300" fill="url(#trident-gold-gradient)" />
        <rect x="48" y="85" width="4" height="300" fill="#000" fillOpacity="0.2" />

        {/* 2. 목 부분 (Neck/Connector) - 연결부 보강 */}
        <rect x="44" y="82" width="12" height="6" rx="1" fill="url(#trident-gold-gradient)" />
        <rect x="44" y="90" width="12" height="4" rx="1" fill="url(#trident-gold-gradient)" />

        {/* 3. 삼지창 헤드 (Trident Head) */}
        <g stroke="url(#trident-gold-gradient)" strokeWidth="2" fill="none" filter="url(#trident-glow)">
            {/* 중앙 날 */}
            <path d="M50 82 V15 L45 25 L50 20 L55 25 L50 15" strokeLinejoin="round" />

            {/* 왼쪽 날 */}
            <path d="M50 82 Q 20 72, 20 45 L 15 25 L 22 35 L 20 45" strokeLinejoin="round" />
            
            {/* 오른쪽 날 */}
            <path d="M50 82 Q 80 72, 80 45 L 85 25 L 78 35 L 80 45" strokeLinejoin="round" />
        </g>

        {/* 4. 날 채우기 (Solid Fill) */}
        <g fill="url(#trident-gold-gradient)">
             {/* 중앙 날 화살촉 */}
             <path d="M50 15 L45 28 L50 23 L55 28 Z" />
             
             {/* 왼쪽 날 화살촉 */}
             <path d="M15 25 L24 35 L20 45 L18 35 Z" />
             
             {/* 오른쪽 날 화살촉 */}
             <path d="M85 25 L76 35 L80 45 L82 35 Z" />
        </g>
        
        {/* 5. 바디 입체감 (Stem Volume) - 자루와 자연스럽게 연결 */}
        <path d="M48 85 L52 85 L52 70 Q80 60, 80 45 L78 45 Q78 60, 52 75 L52 40 L48 40 L48 75 Q22 60, 22 45 L20 45 Q20 60, 48 70 Z" fill="url(#trident-gold-gradient)" />

      </svg>
    </div>
  );
}
