"use client";

import { type ReactNode } from "react";

interface Props {
  children?: ReactNode;
  hideOverlay?: boolean;
}

export default function HegemonyMapBanner({ children, hideOverlay = false }: Props) {
  return (
    <div 
      className="relative w-full h-[700px] overflow-hidden bg-[#1a1814] text-[#d4c5a3] flex items-center justify-center font-serif"
    >
      <style>{`
        @keyframes drift {
            0% { transform: translate3d(0, 0, 0); }
            100% { transform: translate3d(240px, -240px, 0); } /* Consistent pixel distance for grid alignment */
        }
        @keyframes drift-terrain {
            0% { transform: translate3d(0, 0, 0); }
            100% { transform: translate3d(120px, -120px, 0); } /* Parallax effect */
        }
      `}</style>
      
      {/* 3D Container for Perspective */}
      <div className="absolute inset-0 perspective-[1000px] pointer-events-none transform-style-3d overflow-hidden flex items-center justify-center">
         <div 
            className="absolute w-[200%] h-[200%] origin-center backface-hidden"
            style={{ 
                transform: "rotateX(60deg) scale(2) translateY(10%)", // Increased scale slightly to avoid edges
                willChange: "transform",
            }}
         >
            {/* 0. Background Texture */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')] opacity-20 mix-blend-overlay" />
            
            {/* 1. Infinite Terrain Layer - Optimize by using translate3d */}
            <div 
                className="absolute top-[-50%] left-[-50%] w-[300%] h-[300%] opacity-40 will-change-transform backface-hidden"
                style={{ animation: "drift-terrain 120s linear infinite" }}
            >
                {/* Simplified Landmasses - reduced blur radius slightly for performance */}
                <div className="absolute top-[10%] left-[10%] w-[20%] h-[15%] bg-[#2c2a24] rounded-[30%_70%_70%_30%] blur-2xl opacity-60" />
                <div className="absolute top-[20%] left-[40%] w-[25%] h-[20%] bg-[#2a221b] rounded-[60%_40%_30%_70%] blur-2xl opacity-60" />
                <div className="absolute top-[50%] left-[20%] w-[20%] h-[20%] bg-[#1f1d19] rounded-full blur-xl opacity-50" />
                
                <div className="absolute top-[15%] right-[20%] w-[30%] h-[25%] bg-[#2c2a24] rounded-[40%_60%_60%_40%] blur-2xl opacity-60" />
                <div className="absolute bottom-[20%] right-[30%] w-[25%] h-[20%] bg-[#2a221b] rounded-[50%_50%_20%_80%] blur-2xl opacity-60" />
                <div className="absolute bottom-[40%] left-[50%] w-[15%] h-[15%] bg-[#1e1c18] rounded-full blur-xl opacity-50" />

                {/* More scattered fills */}
                <div className="absolute bottom-[10%] left-[10%] w-[20%] h-[20%] bg-[#2c2a24] blur-2xl opacity-60" />
                <div className="absolute top-[60%] right-[10%] w-[20%] h-[20%] bg-[#2a221b] blur-2xl opacity-60" />

                {/* Vector paths are performant */}
                <svg className="absolute inset-0 w-full h-full stroke-[#4a4538] stroke-[1] fill-none opacity-30">
                <path d="M 0 100 Q 500 200 1000 150 T 2000 300" />
                <path d="M 500 800 Q 1000 600 1500 900" />
                <path d="M 1200 200 Q 1500 500 1800 400" />
                <path d="M 200 1500 Q 600 1200 1000 1400" />
                </svg>
            </div>

            {/* 2. Hexagon Grid Layer - Use Transform instead of background-position */}
            <div className="absolute inset-[-50%] w-[300%] h-[300%] overflow-hidden pointer-events-none opacity-10">
                <div 
                    className="absolute inset-0 will-change-transform backface-hidden"
                    style={{ 
                        backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l25.98 15v30L30 60 4.02 45V15z' fill-opacity='0' stroke='%23d4c5a3' stroke-width='1'/%3E%3C/svg%3E\")",
                        backgroundSize: "60px 60px", /* Must match translation distance to loop perfectly */
                        animation: "drift 40s linear infinite",
                    }}
                />
            </div>
         </div>
         
         {/* Top Gradient for Horizon Fade */}
         <div className="absolute top-0 left-0 right-0 h-[40%] bg-gradient-to-b from-[#1a1814] to-transparent z-10 pointer-events-none" />
      </div>

      {/* 5. Vignette & Overlay */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_40%,rgba(0,0,0,0.8)_90%)] z-20" />
      <div className="absolute inset-0 border-[1px] border-[#d4c5a3]/10 m-4 pointer-events-none z-20" />
      
      {/* Corner Ornaments */}
      <div className="absolute top-8 left-8 w-8 h-8 border-t-2 border-l-2 border-[#d4c5a3]/40 z-20" />
      <div className="absolute top-8 right-8 w-8 h-8 border-t-2 border-r-2 border-[#d4c5a3]/40 z-20" />
      <div className="absolute bottom-8 left-8 w-8 h-8 border-b-2 border-l-2 border-[#d4c5a3]/40 z-20" />
      <div className="absolute bottom-8 right-8 w-8 h-8 border-b-2 border-r-2 border-[#d4c5a3]/40 z-20" />

      {/* 6. Content Children */}
      {children && !hideOverlay && (
        <div className="absolute z-30 text-center pointer-events-none flex flex-col items-center justify-center">
            {children}
             <div className="mt-6 flex items-center gap-4 opacity-40">
                <div className="h-[1px] w-12 bg-[#d4c5a3]" />
                <span className="text-[10px] uppercase tracking-[0.3em]">Territory Control</span>
                <div className="h-[1px] w-12 bg-[#d4c5a3]" />
            </div>
        </div>
      )}
    </div>
  );
}
