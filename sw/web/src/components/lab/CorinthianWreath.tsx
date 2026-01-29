import React from "react";

export default function CorinthianWreath({ className = "" }: { className?: string }) {
  return (
    <div className={`relative w-48 h-48 ${className}`}>
      <svg
        viewBox="0 0 200 200"
        className="w-full h-full drop-shadow-2xl"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="wreath-gold-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#bf953f" />
            <stop offset="25%" stopColor="#fcf6ba" />
            <stop offset="50%" stopColor="#d4af37" />
            <stop offset="75%" stopColor="#fcf6ba" />
            <stop offset="100%" stopColor="#aa771c" />
          </linearGradient>

          <filter id="wreath-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feComposite in="coloredBlur" in2="SourceGraphic" operator="in" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* 
            월계관 (Laurel Wreath)
            양쪽에서 올라와 상단이 열려있는 형태
        */}
        
        <g filter="url(#wreath-glow)">
            {/* 왼쪽 가지 (Left Branch) */}
            <g transform="translate(100, 180) rotate(-10)">
               {/* 잎사귀들 - 아래에서 위로 배치 */}
               {Array.from({length: 8}).map((_, i) => (
                   <g key={`l-${i}`} transform={`rotate(${-20 - (i * 18)}) translate(0, -${80})`}>
                       {/* 잎 1 */}
                       <path d="M0 0 Q-10 -5, -15 -20 Q0 -25, 0 0" fill="url(#wreath-gold-gradient)" transform="rotate(-15)" />
                       {/* 잎 2 */}
                       <path d="M0 0 Q10 -5, 15 -20 Q0 -25, 0 0" fill="url(#wreath-gold-gradient)" transform="rotate(15)" />
                       {/* 열매 (Berries) */}
                       {(i % 2 === 0) && <circle cx="0" cy="-10" r="3" fill="#d4af37" />}
                   </g>
               ))}
            </g>

            {/* 오른쪽 가지 (Right Branch) */}
            <g transform="translate(100, 180) rotate(10)">
               {Array.from({length: 8}).map((_, i) => (
                   <g key={`r-${i}`} transform={`rotate(${20 + (i * 18)}) translate(0, -${80})`}>
                       {/* 잎 1 */}
                       <path d="M0 0 Q-10 -5, -15 -20 Q0 -25, 0 0" fill="url(#wreath-gold-gradient)" transform="rotate(-15)" />
                       {/* 잎 2 */}
                       <path d="M0 0 Q10 -5, 15 -20 Q0 -25, 0 0" fill="url(#wreath-gold-gradient)" transform="rotate(15)" />
                       {/* 열매 */}
                       {(i % 2 === 0) && <circle cx="0" cy="-10" r="3" fill="#d4af37" />}
                   </g>
               ))}
            </g>

            {/* 하단 매듭/리본 (Bottom Tie) */}
            <g transform="translate(100, 175)">
                <path d="M-5 0 Q0 5, 5 0 L5 10 L0 8 L-5 10 Z" fill="url(#wreath-gold-gradient)" />
                <path d="M0 5 L-10 15 L-5 20 L0 10 Z" fill="#aa771c" opacity="0.8" />
                <path d="M0 5 L10 15 L5 20 L0 10 Z" fill="#aa771c" opacity="0.8" />
            </g>
        </g>
        
        {/* 중앙 빈 공간에 은은한 광채 */}
        <circle cx="100" cy="100" r="60" fill="url(#wreath-gold-gradient)" fillOpacity="0.05" filter="url(#wreath-glow)" />

      </svg>
    </div>
  );
}
