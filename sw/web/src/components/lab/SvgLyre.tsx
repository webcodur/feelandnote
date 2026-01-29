import React from "react";

export default function SvgLyre({ className = "" }: { className?: string }) {
  return (
    <div className={`relative w-64 h-80 ${className}`}>
      <svg
        viewBox="0 0 200 250"
        className="w-full h-full drop-shadow-2xl"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="lyre-gold-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#bf953f" />
            <stop offset="30%" stopColor="#fcf6ba" />
            <stop offset="50%" stopColor="#d4af37" />
            <stop offset="70%" stopColor="#fcf6ba" />
            <stop offset="100%" stopColor="#aa771c" />
          </linearGradient>

          <filter id="lyre-metal-texture">
            <feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="3" result="noise" />
            <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.1 0" in="noise" result="coloredNoise" />
            <feComposite operator="in" in="coloredNoise" in2="SourceGraphic" result="compositeNoise" />
            <feBlend mode="multiply" in="compositeNoise" in2="SourceGraphic" />
          </filter>
        </defs>

        {/* 1. Base (Stepped) */}
        <path
            d="M50 220 L150 220 L145 235 L55 235 Z"
            fill="none"
            stroke="url(#lyre-gold-gradient)"
            strokeWidth="2"
        />
        <rect x="45" y="235" width="110" height="8" rx="1" fill="none" stroke="url(#lyre-gold-gradient)" strokeWidth="2" />

        {/* 2. Soundbox & Arms (Main Body) */}
        <path
            d="M65 220 
               C 65 180, 40 160, 30 130
               C 20 100, 20 60, 40 40
               C 50 30, 60 40, 55 50
               C 50 60, 40 50, 45 45
               "
            fill="none"
            stroke="url(#lyre-gold-gradient)"
            strokeWidth="2.5"
            strokeLinecap="round"
        />
        {/* Right Arm (Mirrored) */}
        <path
            d="M135 220 
               C 135 180, 160 160, 170 130
               C 180 100, 180 60, 160 40
               C 150 30, 140 40, 145 50
               C 150 60, 160 50, 155 45
               "
            fill="none"
            stroke="url(#lyre-gold-gradient)"
            strokeWidth="2.5"
            strokeLinecap="round"
        />

        {/* Soundbox Connection */}
        <path 
            d="M65 190 Q 100 170, 135 190" 
            fill="none" 
            stroke="url(#lyre-gold-gradient)" 
            strokeWidth="2"
        />
        <path 
            d="M70 220 L130 220 L125 195 Q100 185, 75 195 Z" 
            fill="none" 
            stroke="url(#lyre-gold-gradient)" 
            strokeWidth="2"
        />

        {/* 3. Crossbar */}
        <line x1="50" y1="65" x2="150" y2="65" stroke="#d4af37" strokeWidth="3" strokeLinecap="round" />
        <circle cx="50" cy="65" r="3" fill="#d4af37" />
        <circle cx="150" cy="65" r="3" fill="#d4af37" />
        
        {/* 4. Strings (5 Strings) */}
        <g stroke="#fcf6ba" strokeWidth="1.5">
            <line x1="80" y1="65" x2="80" y2="190" />
            <line x1="90" y1="65" x2="90" y2="188" />
            <line x1="100" y1="65" x2="100" y2="187" />
            <line x1="110" y1="65" x2="110" y2="188" />
            <line x1="120" y1="65" x2="120" y2="190" />
        </g>
        
        {/* String Tuning Pegs (Top) */}
        <g fill="#d4af37">
            <circle cx="80" cy="58" r="1.5" />
            <circle cx="90" cy="55" r="1.5" />
            <circle cx="100" cy="53" r="1.5" />
            <circle cx="110" cy="55" r="1.5" />
            <circle cx="120" cy="58" r="1.5" />
        </g>
        
        {/* String Bridge (Bottom) */}
        <rect x="75" y="190" width="50" height="5" fill="none" stroke="url(#lyre-gold-gradient)" strokeWidth="1" />


        {/* 5. Laurels (Decoration on Arms) */}
        <g id="left-laurels">
             <path d="M40 140 Q30 135, 35 125 M40 140 Q50 135, 45 125" stroke="url(#lyre-gold-gradient)" strokeWidth="1" fill="none" />
             <path d="M38 155 Q28 150, 33 140 M38 155 Q48 150, 43 140" stroke="url(#lyre-gold-gradient)" strokeWidth="1" fill="none" />
             <path d="M42 170 Q32 165, 37 155 M42 170 Q52 165, 47 155" stroke="url(#lyre-gold-gradient)" strokeWidth="1" fill="none" />
        </g> 
        <g id="right-laurels" transform="scale(-1, 1) translate(-200, 0)">
             <path d="M40 140 Q30 135, 35 125 M40 140 Q50 135, 45 125" stroke="url(#lyre-gold-gradient)" strokeWidth="1" fill="none" />
             <path d="M38 155 Q28 150, 33 140 M38 155 Q48 150, 43 140" stroke="url(#lyre-gold-gradient)" strokeWidth="1" fill="none" />
             <path d="M42 170 Q32 165, 37 155 M42 170 Q52 165, 47 155" stroke="url(#lyre-gold-gradient)" strokeWidth="1" fill="none" />
        </g>

      </svg>
    </div>
  );
}
