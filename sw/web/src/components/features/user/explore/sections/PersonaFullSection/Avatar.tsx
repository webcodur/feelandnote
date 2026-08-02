/*
  파일명: /components/features/user/explore/sections/PersonaFullSection/Avatar.tsx
  기능: 원형 아바타
  책임: 이미지 또는 이니셜 폴백을 크기별로 표시.
*/ // ------------------------------

"use client";

import Image from "next/image";
import BlurDissolve from "@/components/ui/BlurDissolve";
import { cn } from "@/lib/utils";

export default function Avatar({ src, alt, size = 20 }: { src: string | null; alt: string; size?: number }) {
  const sizeClass = size === 32 ? "w-32 h-32" : size === 20 ? "w-20 h-20" : size === 10 ? "w-10 h-10" : "w-8 h-8";
  const textClass = size === 32 ? "text-4xl" : size === 20 ? "text-2xl" : size === 10 ? "text-sm" : "text-xs";

  return (
    <div className={cn("relative rounded-full overflow-hidden bg-[#161616] shrink-0", sizeClass)}>
      {src ? (
        // 로드가 늦은 이미지만 도착 순간 블러 디졸브로 등장(로드 감지는 래퍼가 직접)
        <BlurDissolve className="absolute inset-0">
          <Image src={src} alt={alt} fill sizes="128px" className="object-cover" />
        </BlurDissolve>
      ) : (
        <div className={cn("w-full h-full flex items-center justify-center font-serif ", textClass)}>
          {alt.charAt(0)}
        </div>
      )}
    </div>
  );
}
