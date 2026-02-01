import React from "react";

export default function CorinthianVase({ className = "" }: { className?: string }) {
  return (
    <div className={`relative w-48 h-64 ${className}`}>
      <svg
        viewBox="0 0 200 300"
        className="w-full h-full drop-shadow-2xl"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="vase-gold-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#bf953f" />
            <stop offset="30%" stopColor="#fcf6ba" />
            <stop offset="50%" stopColor="#d4af37" />
            <stop offset="70%" stopColor="#fcf6ba" />
            <stop offset="100%" stopColor="#aa771c" />
          </linearGradient>

          <linearGradient id="vase-dark-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1a0f0a" />
            <stop offset="50%" stopColor="#2c1810" />
            <stop offset="100%" stopColor="#0d0705" />
          </linearGradient>

          <filter id="vase-metal-texture">
            <feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="3" result="noise" />
            <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.1 0" in="noise" result="coloredNoise" />
            <feComposite operator="in" in="coloredNoise" in2="SourceGraphic" result="compositeNoise" />
            <feBlend mode="multiply" in="compositeNoise" in2="SourceGraphic" />
          </filter>

          {/* Body Clip Path for Patterns - 바닥 연결부위 넓힘 */}
          <clipPath id="vase-body-clip">
             <path d="M72 20 L128 20 L125 50 Q180 70, 180 120 Q180 200, 120 275 L80 275 Q20 200, 20 120 Q20 70, 75 50 L72 20 Z" />
          </clipPath>

          <pattern id="vase-meander-gold" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse" viewBox="0 0 24 24">
             <rect width="24" height="24" fill="url(#vase-dark-gradient)" />
             <path d="M2 22 H22 V2 H4 V18 H18 V6 H10 V12" fill="none" stroke="#d4af37" strokeWidth="2" strokeLinecap="square" />
          </pattern>
        </defs>

        {/* 1. Body Base (Solid) - 하단부를 뾰족하지 않고 평평(x80~120)하게 수정 */}
        <path 
            id="vase-body-shape"
            d="M72 20 L128 20 L125 50 Q180 70, 180 120 Q180 200, 120 275 L80 275 Q20 200, 20 120 Q20 70, 75 50 L72 20 Z"
            fill="url(#vase-gold-gradient)"
            stroke="#1a0f0a" strokeWidth="1"
            filter="url(#vase-metal-texture)"
        />

        {/* 2. Patterns (Clipped to Body) */}
        <g clipPath="url(#vase-body-clip)" opacity="0.9">
            
            {/* Neck Area (Dark) */}
            <rect x="0" y="0" width="200" height="50" fill="url(#vase-dark-gradient)" />
            
            {/* Shoulder Band - 투입구에 밀착된 타원형 */}
            <g transform="translate(100, 38) scale(1, 0.45)">
                 {Array.from({length: 20}).map((_, i) => (
                    <path
                        key={i}
                        d="M-2.5 0 L2.5 0 L0 22 Z"
                        fill="#2c1810"
                        transform={`rotate(${i * 18}) translate(0, 8)`}
                    />
                 ))}
                 <ellipse cx="0" cy="0" rx="32" ry="32" fill="none" stroke="#2c1810" strokeWidth="2" />
            </g>

            {/* Belly Band */}
            <path d="M0 100 Q100 115, 200 100 L200 130 Q100 145, 0 130 Z" fill="url(#vase-dark-gradient)" />
            <path d="M0 102 Q100 117, 200 102 L200 128 Q100 143, 0 128 Z" fill="url(#vase-meander-gold)" opacity="0.9" />
            
            {/* Lower Body Rays - 아래로 볼록한 타원형 배치 */}
            {Array.from({ length: 15 }).map((_, i) => {
                // 정규화된 위치 (-0.5 ~ 0.5)
                const t = (i / 14) - 0.5;
                const angle = t * Math.PI * 0.85; // -77도 ~ +77도 (보이는 범위)

                // 타원형 x좌표 (중앙 100, 반경 70)
                const x = 100 + Math.sin(angle) * 70;

                // 원근감: 중앙이 넓고 가장자리가 좁음
                const perspectiveScale = Math.cos(angle);
                const width = 12 * perspectiveScale;
                const height = 70;

                // 하단 타원: 중앙이 가장 아래, 가장자리가 위로
                const bottomCurveDepth = 35;
                const baseY = 275 - (1 - perspectiveScale) * bottomCurveDepth;

                // 상단 타원: 하단과 같은 곡선을 따르되 덜 볼록하게 (연속된 곡선)
                const topCurveDepth = 12;
                const topY = (275 - height) - (1 - perspectiveScale) * topCurveDepth;

                if (width < 1) return null;

                return (
                    <path
                        key={i}
                        d={`M${x} ${baseY} L${x + width / 2} ${topY} L${x - width / 2} ${topY} Z`}
                        fill="#2c1810"
                        opacity={0.5 + 0.35 * perspectiveScale}
                    />
                );
            })}
        </g>

        {/* 3. Rim (Lip) */}
        <path d="M68 15 L132 15 L128 24 L72 24 Z" fill="url(#vase-gold-gradient)" stroke="#1a0f0a" strokeWidth="1" />
        <rect x="70" y="24" width="60" height="4" fill="#2c1810" />

        {/* 4. Handles */}
        <path 
            d="M72 30 
               C 30 25, 20 40, 20 60 
               C 20 85, 40 80, 50 70
               L 40 65 
               C 35 70, 30 75, 30 60
               C 30 50, 40 35, 72 40
               Z" 
            fill="url(#vase-gold-gradient)" 
            stroke="#1a0f0a" strokeWidth="0.5"
            filter="url(#vase-metal-texture)"
        />
        <path 
            d="M128 30 
               C 170 25, 180 40, 180 60 
               C 180 85, 160 80, 150 70
               L 160 65 
               C 165 70, 170 75, 170 60
               C 170 50, 160 35, 128 40
               Z" 
            fill="url(#vase-gold-gradient)" 
            stroke="#1a0f0a" strokeWidth="0.5"
            filter="url(#vase-metal-texture)"
        />

        {/* 5. Foot (Base) & Stem Connector */}
        {/* 연결용 필렛 (Fillet/Stem) - 밝은 색으로 수정 (Gold) */}
        <path d="M80 274 L120 274 L125 282 L75 282 Z" fill="url(#vase-gold-gradient)" />
        
        {/* Foot Base */}
        <path d="M70 282 L130 282 L140 295 L60 295 Z" fill="url(#vase-dark-gradient)" stroke="#1a0f0a" strokeWidth="1" />
        <path d="M60 295 L140 295 L140 300 L60 300 Z" fill="url(#vase-gold-gradient)" />

        {/* 6. Highlights */}
        <path d="M120 40 Q160 60, 160 120 Q160 200, 110 260" stroke="#fff" strokeWidth="8" strokeOpacity="0.1" fill="none" filter="url(#vase-metal-texture)" />
        <path d="M80 40 Q40 60, 40 120 Q40 200, 90 260" stroke="#000" strokeWidth="8" strokeOpacity="0.1" fill="none" filter="url(#vase-metal-texture)" />

      </svg>
    </div>
  );
}
