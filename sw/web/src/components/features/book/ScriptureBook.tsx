"use client";

import Image from "next/image";

interface ScriptureBookProps {
  title: string;
  author?: string;
  imageUrl: string;
  coverColor?: string;
  accentColor?: string;
}

export default function ScriptureBook({
  title,
  author,
  imageUrl,
  coverColor = "from-stone-800 to-stone-900",
  accentColor = "#d4af37",
}: ScriptureBookProps) {
  return (
    <div className="w-full h-full relative group">
      {/* 2.5D Book Container */}
      {/* 약간 위에서 내려다본 시점: 상단은 평평하고 하단에 페이지 두께가 보임 */}
      <div className="relative w-full h-[96%] top-[2%] shadow-xl transition-transform duration-300">
        
        {/* TEXTURED PLATE (Hardcover Board) */}
        {/* 책 밑 UI(페이지) 좌측보다 살짝 더 이어지게: 페이지 left-10px, 판 left-6px */}
        <div className="absolute top-0 bottom-0 left-[6px] right-[6px] z-20 bg-[#2c2c2c] rounded-r-sm rounded-l-[2px] shadow-sm flex items-center justify-center overflow-hidden">
          {/* Texture Pattern */}
          <div 
             className="absolute inset-0 opacity-40 mix-blend-overlay pointer-events-none" 
             style={{ 
                 backgroundImage: "url('https://www.transparenttextures.com/patterns/binding-dark.png')" 
             }} 
          />
          
          {/* FRONT COVER POSTER */}
          {/* 판 안쪽에 포스터가 붙은 느낌 (약간의 패딩) */}
          <div className="relative w-[calc(100%-4px)] h-[calc(100%-2px)] bg-[#1a1a1a] rounded-r-[1px] rounded-l-[1px] overflow-hidden shadow-inner">
            {imageUrl ? (
              <div className="relative w-full h-full">
                <Image
                  src={imageUrl}
                  alt={title}
                  fill
                  className="object-cover"
                  unoptimized
                  sizes="(max-width: 768px) 100vw, 300px"
                />
                {/* 굴곡 효과 (좌측 스파인 쪽 그림자) */}
                <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-black/50 via-black/10 to-transparent pointer-events-none" />
                {/* 질감 오버레이 */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-10 pointer-events-none" />
              </div>
            ) : (
                // Default Design
              <div className={`w-full h-full bg-gradient-to-br ${coverColor} p-4 flex flex-col items-center justify-center text-center`}>
                  <div className="border-2 w-full h-full flex flex-col items-center justify-center p-2" style={{ borderColor: `${accentColor}40` }}>
                    <h3 className="font-serif font-bold text-lg leading-tight mb-2" style={{ color: accentColor }}>{title}</h3>
                    {author && <p className="font-cinzel text-[10px] opacity-70">{author}</p>}
                  </div>
              </div>
            )}
          </div>
        </div>

        {/* PAGES (Bottom thickness) - z-index Higher than Plate */}
        {/* 책이 살짝 누워있는 느낌을 주기 위해 하단에 페이지 레이어 배치 */}
        <div 
          className="absolute bottom-[-6px] left-[10px] right-[10px] h-[8px] bg-[#e3ded1] z-30 rounded-b-sm"
          style={{
             background: "repeating-linear-gradient(180deg, #e3ded1 0px, #e3ded1 1px, #d8d3c5 2px, #d8d3c5 3px)",
             boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.3)"
          }}
        />
        
        {/* LEFT BOOK SPINE INDICATOR (Shadow/Depth) */}
        <div className="absolute left-[6px] top-1 bottom-[-4px] w-[4px] bg-[#111] z-0 rounded-l-sm opacity-80" />
      </div>
    </div>
  );
}
