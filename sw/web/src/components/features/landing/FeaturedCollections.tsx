"use client";

import { useState } from "react";
import type { FeaturedTag } from "@/actions/home";
import FeaturedCollectionsDesktop from "./FeaturedCollectionsDesktop";
import FeaturedCollectionsMobile from "./FeaturedCollectionsMobile";

interface FeaturedCollectionsProps {
  tags: FeaturedTag[];
}

export default function FeaturedCollections({ tags }: FeaturedCollectionsProps) {
  const [activeTagIndex, setActiveTagIndex] = useState(0);

  return (
    <div className="w-full">
      {/* Mobile View (< 768px) */}
      <div className="block md:hidden">
        <FeaturedCollectionsMobile 
          tags={tags}
          activeTagIndex={activeTagIndex}
          setActiveTagIndex={setActiveTagIndex}
        />
      </div>

      {/* Desktop View (>= 768px) */}
      <div className="hidden md:block">
        <FeaturedCollectionsDesktop 
          tags={tags}
          activeTagIndex={activeTagIndex}
          setActiveTagIndex={setActiveTagIndex}
        />
      </div>
    </div>
  );
}
