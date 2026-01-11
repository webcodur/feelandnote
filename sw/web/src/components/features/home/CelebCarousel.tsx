"use client";

import CelebProfileCard from "./CelebProfileCard";
import type { CelebProfile } from "@/types/home";

interface CelebCarouselProps {
  celebs: CelebProfile[];
}

export default function CelebCarousel({ celebs }: CelebCarouselProps) {
  if (celebs.length === 0) {
    return null;
  }

  return (
    <section>
      <h2 className="text-lg font-bold mb-4 px-4">추천 셀럽</h2>
      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex gap-4 px-4">
          {celebs.map((celeb) => (
            <CelebProfileCard key={celeb.id} celeb={celeb} />
          ))}
        </div>
      </div>
    </section>
  );
}
