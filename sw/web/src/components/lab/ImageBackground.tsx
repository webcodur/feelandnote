/*
  파일명: /components/lab/ImageBackground.tsx
  기능: 이미지 기반 배경 컴포넌트
  책임: 이미지 전체가 잘림 없이 보이도록 contain 배치하고,
        빈 영역은 블러 처리된 동일 이미지로 채운다.
        메인 이미지 가장자리를 마스크로 직접 블러 배경에 녹여낸다.
*/

"use client";

import React from "react";

interface ImageBackgroundProps {
  src: string;
  srcMobile?: string;
  alt?: string;
  fullScreen?: boolean;
}

function ImageLayer({ src, alt, className }: { src: string; alt: string; className?: string }) {
  return (
    <div className={className}>
      {/* 블러 배경 */}
      <img
        src={src}
        alt=""
        className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl brightness-50"
        draggable={false}
        aria-hidden
      />
      {/* 메인 이미지: 마스크로 가장자리 직접 페이드 */}
      <img
        src={src}
        alt={alt}
        className="absolute inset-0 w-[88%] h-[88%] m-auto object-contain"
        style={{
          maskImage: "linear-gradient(to right, transparent, black 8%, black 92%, transparent), linear-gradient(to bottom, transparent, black 8%, black 92%, transparent)",
          WebkitMaskImage: "linear-gradient(to right, transparent, black 8%, black 92%, transparent), linear-gradient(to bottom, transparent, black 8%, black 92%, transparent)",
          maskComposite: "intersect",
          WebkitMaskComposite: "destination-in",
        }}
        draggable={false}
      />
    </div>
  );
}

export default function ImageBackground({
  src,
  srcMobile,
  alt = "",
  fullScreen,
}: ImageBackgroundProps) {
  const containerClass = fullScreen
    ? "absolute inset-0 overflow-hidden bg-black"
    : "relative w-full h-[600px] overflow-hidden rounded-xl border border-white/10 shadow-2xl bg-black";

  if (!srcMobile) {
    return (
      <div className={containerClass}>
        <ImageLayer src={src} alt={alt} className="absolute inset-0" />
      </div>
    );
  }

  return (
    <div className={containerClass}>
      <ImageLayer src={src} alt={alt} className="absolute inset-0 hidden md:block" />
      <ImageLayer src={srcMobile} alt={alt} className="absolute inset-0 block md:hidden" />
    </div>
  );
}
