"use client";

import Image from "next/image";
import type { FeaturedCeleb } from "@/actions/home";

/*
  기획전 전용 인물 화보. 평소 아바타와 별개로, 이 테마에서만 보여줄 인물 사진 1장.
  Hero 카드 아래에 표시되며, 인물 전환 시 함께 바뀐다. 없으면 아무것도 그리지 않는다.
*/
export default function SpotlightHeroImage({ celeb }: { celeb?: FeaturedCeleb | null }) {
  if (!celeb?.spotlight_image_url) return null;

  return (
    <div className="flex justify-center px-4">
      <div
        key={celeb.id}
        className="relative w-full max-w-sm aspect-square overflow-hidden rounded-lg bg-[#0a0a0a] shadow-xl ring-1 ring-white/10 animate-fade-in"
      >
        <Image
          src={celeb.spotlight_image_url}
          alt={celeb.nickname}
          fill
          unoptimized
          sizes="(max-width: 768px) 100vw, 384px"
          className="object-cover"
        />
      </div>
    </div>
  );
}
