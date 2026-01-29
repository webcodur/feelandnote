import React from "react";

export default function CorinthianShield({ className = "" }: { className?: string }) {
  return (
    <div className={`relative w-64 h-64 md:w-96 md:h-96 ${className}`}>
      <svg
        viewBox="0 0 400 400"
        className="w-full h-full drop-shadow-2xl"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* 골드 메탈 그라디언트 */}
          <linearGradient id="gold-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#bf953f" />
            <stop offset="25%" stopColor="#fcf6ba" />
            <stop offset="50%" stopColor="#d4af37" />
            <stop offset="75%" stopColor="#fcf6ba" />
            <stop offset="100%" stopColor="#aa771c" />
          </linearGradient>
          
          {/* 깊이감을 위한 내부 섀도우 그라디언트 */}
          <radialGradient id="inner-depth" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
            <stop offset="70%" stopColor="#000" stopOpacity="0" />
            <stop offset="100%" stopColor="#000" stopOpacity="0.6" />
          </radialGradient>

          {/* 금속 질감 필터 */}
          <filter id="metal-texture">
            <feTurbulence type="fractalNoise" baseFrequency="0.5" numOctaves="3" result="noise" />
            <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.1 0" in="noise" result="coloredNoise" />
            <feBlend mode="multiply" in="coloredNoise" in2="SourceGraphic" />
          </filter>
        </defs>

        {/* 1. 방패 외곽 테두리 (Outer Rim) */}
        <circle cx="200" cy="200" r="190" fill="url(#gold-gradient)" stroke="#5c4033" strokeWidth="2" />
        <circle cx="200" cy="200" r="180" fill="#1a1a1a" stroke="url(#gold-gradient)" strokeWidth="4" />

        {/* 2. 그리스 키 패턴 (Meander Pattern) - 단순화된 원형 배치 */}
        <g stroke="url(#gold-gradient)" strokeWidth="3" fill="none" opacity="0.8">
           {/* 장식용 점선 링 */}
           <circle cx="200" cy="200" r="165" strokeDasharray="4 8" strokeWidth="2" opacity="0.5"/>
        </g>

        {/* 3. 방패 본체 (Main Body) */}
        <circle cx="200" cy="200" r="160" fill="#0f0f0f" />
        {/* 미세한 격자/방사형 무늬 추가 */}
        <g stroke="#d4af37" strokeWidth="0.5" opacity="0.1">
          {Array.from({ length: 12 }).map((_, i) => (
             <line key={i} x1="200" y1="200" x2={200 + 160 * Math.cos(i * 30 * Math.PI / 180)} y2={200 + 160 * Math.sin(i * 30 * Math.PI / 180)} />
          ))}
        </g>
        
        {/* 4. 중앙 장식 (Central Motif) - 양식화된 권위의 상징 */}
        <g transform="translate(200, 200)">
           {/* 중앙 십자/별 문양 */}
           <path d="M0 -80 L15 -30 L80 0 L15 30 L0 80 L-15 30 L-80 0 L-15 -30 Z" fill="url(#gold-gradient)" opacity="0.1" />
           
           {/* 중앙 쉴드 보스 (Umbo) */}
           <circle r="40" fill="url(#gold-gradient)" filter="url(#metal-texture)" />
           <circle r="35" fill="none" stroke="#5c4033" strokeWidth="1" opacity="0.5" />
           
           {/* 중앙 스파이크/포인트 */}
           <circle r="5" fill="#fff" fillOpacity="0.8" />
           
           {/* 내부 장식 고리 */}
           <circle r="60" fill="none" stroke="url(#gold-gradient)" strokeWidth="2" />
           <circle r="70" fill="none" stroke="url(#gold-gradient)" strokeWidth="1" strokeDasharray="1 3" />
           
           {/* 사방으로 뻗어나가는 장식 */}
           <path 
             d="M-40 -40 L-60 -60 M40 -40 L60 -60 M-40 40 L-60 60 M40 40 L60 60" 
             stroke="url(#gold-gradient)" 
             strokeWidth="3" 
             strokeLinecap="round"
           />
        </g>
        
        {/* 5. 광택 및 하이라이트 (Gloss & Highlight) */}
        <ellipse cx="140" cy="140" rx="60" ry="30" transform="rotate(-45 140 140)" fill="#fff" opacity="0.05" />
        <circle cx="200" cy="200" r="190" fill="url(#inner-depth)" style={{ mixBlendMode: 'multiply' }} pointerEvents="none" />

      </svg>
    </div>
  );
}
