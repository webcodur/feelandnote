"use client";

import Image from "next/image";

export type ViewAngle = "isometric" | "front" | "side";

export interface Book3DProps {
  title: string;
  author: string;
  spineText: string;
  coverColor: string; // tailwind gradient class e.g. "from-[#8b0000] to-[#2a0000]"
  accentColor: string; // hex code e.g. "#d4af37"
  imageUrl?: string;
  angle?: ViewAngle;
}

export default function Book3D({
  title,
  author,
  spineText,
  coverColor,
  accentColor,
  imageUrl,
  angle = "isometric",
}: Book3DProps) {
  // 각도별 transform 스타일
  const getTransform = (a: ViewAngle) => {
    switch (a) {
      case "front":
        return "rotateY(0deg) rotateX(0deg)";
      case "side":
        return "rotateY(90deg) rotateX(0deg)";
      case "isometric":
      default:
        return "rotateY(-30deg) rotateX(10deg)";
    }
  };

  return (
    <div className="w-full h-full flex items-center justify-center perspective-[1000px]">
      <div
        className="relative w-[66%] h-[80%] max-w-[240px] max-h-[360px] aspect-[2/3] group transition-transform duration-700 ease-in-out"
        style={{
          transformStyle: "preserve-3d",
          transform: getTransform(angle),
        }}
      >
        {/* 1. FRONT COVER (Z = 25px) */}
        <div
          className="absolute inset-0 bg-[#1a1a1a] rounded-r-md z-20 backface-hidden"
          style={{ transform: "translateZ(12px)" }}
        >
          {imageUrl ? (
            // 이미지 커버
            <div className="relative w-full h-full rounded-r-md overflow-hidden">
              <Image
                src={imageUrl}
                alt={title}
                fill
                className="object-cover"
                unoptimized // 외부 이미지 허용
                sizes="(max-width: 768px) 100vw, 300px"
              />
              {/* 텍스처 오버레이 */}
              <div className="absolute inset-0 bg-gradient-to-tr from-black/40 via-transparent to-white/10 mix-blend-overlay" />
              <div className="absolute inset-0 shadow-[inset_3px_0_10px_rgba(0,0,0,0.5)]" /> {/* 척추 쪽 그림자 */}
            </div>
          ) : (
            // CSS 디자인 커버
            <>
              <div className={`absolute inset-0 bg-gradient-to-br ${coverColor} rounded-r-md`} />
              <div
                className="absolute inset-0 border-[3px] m-3 rounded-r-sm"
                style={{ borderColor: `${accentColor}50` }} // opacity 30% -> hex 50
              />
              <div
                className="absolute inset-0 border m-1.5 rounded-r-sm"
                style={{ borderColor: `${accentColor}30` }} // opacity 20% -> hex 30
              />

              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                <h2
                  className="font-serif font-black text-2xl md:text-3xl mb-2 drop-shadow-md leading-tight"
                  style={{ color: accentColor }}
                >
                  {title.split(" ").map((word, i) => (
                    <span key={i} className="block">
                      {word}
                    </span>
                  ))}
                </h2>
                <div className="w-8 h-[2px] my-3" style={{ backgroundColor: `${accentColor}80` }} />
                <span className="font-cinzel text-[10px] md:text-xs text-text-tertiary tracking-[0.3em] font-bold uppercase">
                  {author}
                </span>
              </div>
            </>
          )}

          {/* 공통 조명 효과 */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none rounded-r-md" />
          <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-black/60 to-transparent pointer-events-none" />
        </div>

        {/* 2. BACK COVER (Z = -25px) */}
        <div
          className="absolute inset-0 bg-[#111] rounded-l-md"
          style={{ transform: "translateZ(-12px) rotateY(180deg)" }}
        >
          <div className={`absolute inset-0 bg-gradient-to-br ${coverColor} opacity-50 rounded-l-md`} />
        </div>

        {/* 3. SPINE (Left Face) */}
        <div
          className="absolute top-0 bottom-0 w-[24px] bg-[#151515]"
          style={{
            left: 0,
            transformOrigin: "center",
            transform: "translateX(-12px) rotateY(-90deg)",
          }}
        >
          <div className="w-full h-full relative flex flex-col items-center py-6 overflow-hidden border-x border-white/5 shadow-inner">
            {/* 스파인 배경색 */}
            <div className={`absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/60 z-0`} />
            <div className={`absolute inset-0 bg-gradient-to-b ${coverColor} opacity-80 z-0`} />

            {/* 상단 장식 */}
            <span
              className={`relative z-10 w-4 h-4 text-[8px] rounded-full border flex items-center justify-center font-serif mb-auto`}
              style={{ borderColor: `${accentColor}50`, color: accentColor }}
            >
              {title[0]}
            </span>

            {/* 책 제목 (세로 - 90도 회전) */}
            <div
              className="relative z-10 font-serif font-bold tracking-widest text-xs opacity-90 py-4 rotate-90 whitespace-nowrap"
              style={{ color: "#e0e0e0" }}
            >
              {spineText.length > 20 ? spineText.substring(0, 20) + "..." : spineText}
            </div>

            {/* 하단 장식 */}
            <div className="relative z-10 mt-auto space-y-1">
              <div className="w-2 h-[1px]" style={{ backgroundColor: `${accentColor}50` }} />
              <div className="w-2 h-[1px]" style={{ backgroundColor: `${accentColor}50` }} />
            </div>
          </div>
        </div>

        {/* 4. RIGHT PAGES */}
        <div
          className="absolute top-[2px] bottom-[2px] w-[22px] bg-[#e3ded1]"
          style={{
            right: 0,
            transformOrigin: "center",
            transform: "translateX(11px) rotateY(90deg)",
          }}
        >
          <div
            className="w-full h-full"
            style={{
              backgroundImage:
                "repeating-linear-gradient(90deg, #e3ded1 0px, #e3ded1 1px, #d8d3c5 2px, #d8d3c5 3px)",
              boxShadow: "inset 3px 0 10px rgba(0,0,0,0.1)",
            }}
          />
        </div>

        {/* 5. TOP PAGES */}
        <div
          className="absolute left-[1px] right-[2px] h-[24px] bg-[#e3ded1]"
          style={{
            top: 0,
            transformOrigin: "center",
            transform: "translateY(-12px) rotateX(90deg)",
          }}
        >
          <div
            className="w-full h-full"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, #e3ded1 0px, #e3ded1 1px, #d8d3c5 2px, #d8d3c5 3px)",
              boxShadow: "inset 0 3px 10px rgba(0,0,0,0.1)",
            }}
          />
        </div>

        {/* 6. BOTTOM PAGES */}
        <div
          className="absolute left-[1px] right-[2px] h-[24px] bg-[#e3ded1]"
          style={{
            bottom: 0,
            transformOrigin: "center",
            transform: "translateY(12px) rotateX(-90deg)",
          }}
        >
          <div
            className="w-full h-full"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, #e3ded1 0px, #e3ded1 1px, #d8d3c5 2px, #d8d3c5 3px)",
              boxShadow: "inset 0 3px 10px rgba(0,0,0,0.1)",
            }}
          />
        </div>
      </div>

      {/* Shadow Platform */}
      <div
        className="absolute bottom-[-15%] left-[50%] w-[80%] h-[15%] bg-black/60 blur-lg rounded-[100%] transition-transform duration-700 pointer-events-none"
        style={{
          transform: `translateX(-50%) rotateX(70deg) translateZ(-40px) ${
            angle === "side" ? "scale(0.5) rotateY(90deg)" : "scale(1)"
          }`,
          opacity: angle === "front" ? 0.4 : 0.6,
        }}
      />
    </div>
  );
}
