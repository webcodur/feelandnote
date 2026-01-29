import React from "react";

export default function CorinthianSword({ className = "" }: { className?: string }) {
  return (
    <div className={`relative w-24 h-96 ${className}`}>
      <svg
        viewBox="0 0 100 400"
        className="w-full h-full drop-shadow-2xl"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="sword-gold-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#bf953f" />
            <stop offset="30%" stopColor="#fcf6ba" />
            <stop offset="50%" stopColor="#d4af37" />
            <stop offset="70%" stopColor="#fcf6ba" />
            <stop offset="100%" stopColor="#aa771c" />
          </linearGradient>

          <linearGradient id="sword-blade-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#e0e0e0" />
            <stop offset="50%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#c0c0c0" />
          </linearGradient>
          
          <filter id="sword-metal-texture">
            <feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="3" result="noise" />
            <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.1 0" in="noise" result="coloredNoise" />
             <feComposite operator="in" in="coloredNoise" in2="SourceGraphic" result="compositeNoise" />
            <feBlend mode="multiply" in="compositeNoise" in2="SourceGraphic" />
          </filter>
        </defs>

        {/* 1. 교차 가드 (Guard/Hilt) */}
        <path 
            d="M30 140 H70 L72 145 Q50 155, 28 145 L30 140 Z" 
            fill="url(#sword-gold-gradient)" 
            filter="url(#sword-metal-texture)"
        />

        {/* 2. 손잡이 (Grip) */}
        <rect x="44" y="145" width="12" height="60" rx="2" fill="#2c1810" />
        {/* 그립 텍스처 (가죽 끈) */}
        <g stroke="#1a0f0a" strokeWidth="1" opacity="0.6">
            {Array.from({length: 8}).map((_, i) => (
                <line key={i} x1="44" y1={152 + i*7} x2="56" y2={155 + i*7} />
            ))}
        </g>

        {/* 3. 폼멜 (Pommel) - 끝장식 */}
        <circle cx="50" cy="210" r="8" fill="url(#sword-gold-gradient)" filter="url(#sword-metal-texture)" />
        <circle cx="50" cy="210" r="5" fill="none" stroke="#8a6d3b" strokeWidth="1" />

        {/* 4. 칼날 (Blade) - Xiphos Style (Leaf shape) */}
        <g filter="url(#sword-metal-texture)">
            {/* 자포스 특유의 잎사귀 모양 */}
            <path 
                d="M36 140
                   L34 100  /* 시작부 (Revisso) - 약간 좁아짐 */
                   Q30 60, 50 10  /* 잎사귀처럼 둥글게 모이는 끝 */
                   Q70 60, 66 100 /* 대칭 */
                   L64 140
                   Z"
                fill="url(#sword-blade-gradient)" 
            />
            {/* 중앙 릿지 (Central Ridge) - 강도와 입체감 */}
            <path d="M50 10 L50 140" stroke="#707070" strokeWidth="1" />
            <path d="M50 10 L50 140" stroke="#fff" strokeWidth="2" opacity="0.6" transform="translate(-1, 0)" />
        </g>
        
        {/* 장식 디테일: 칼날과 가드의 접합부 장식 */}
        <path d="M42 140 L50 130 L58 140" fill="#d4af37" opacity="0.8" />

      </svg>
    </div>
  );
}
