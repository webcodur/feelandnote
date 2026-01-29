"use client";

import { useState } from "react";
import Image from "next/image";
import type { FeaturedTag } from "@/actions/home";
import FeaturedCollectionsDesktop from "./FeaturedCollectionsDesktop";
import FeaturedCollectionsMobile from "./FeaturedCollectionsMobile";

import ScrollToNext from "@/components/ui/ScrollToNext";

interface FeaturedCollectionsProps {
  tags: FeaturedTag[];
}

export default function FeaturedCollections({ tags }: FeaturedCollectionsProps) {
  const [activeTagIndex, setActiveTagIndex] = useState(0);

  return (
    <div className="w-full relative">
      {/* Mobile View (< 768px) */}
      <div className="block md:hidden relative z-10">
        <FeaturedCollectionsMobile 
          tags={tags}
          activeTagIndex={activeTagIndex}
          setActiveTagIndex={setActiveTagIndex}
        />
      </div>

      {/* Desktop View (>= 768px) */}
      <div className="hidden md:block relative z-10">
        <FeaturedCollectionsDesktop 
          tags={tags}
          activeTagIndex={activeTagIndex}
          setActiveTagIndex={setActiveTagIndex}
        />
      </div>
    </div>
  );
}
