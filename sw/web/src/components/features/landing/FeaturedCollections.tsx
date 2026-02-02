"use client";

import { useState } from "react";
import type { FeaturedTag } from "@/actions/home";
import FeaturedCollectionsDesktop from "./FeaturedCollectionsDesktop";
import FeaturedCollectionsMobile from "./FeaturedCollectionsMobile";

export type ExhibitionLocation = "main" | "explore-pc" | "explore-mb";

interface FeaturedCollectionsProps {
  tags: FeaturedTag[];
  hideQuickBrowse?: boolean;
  location?: ExhibitionLocation;
}

export default function FeaturedCollections({ tags, hideQuickBrowse = false, location = "main" }: FeaturedCollectionsProps) {
  const [activeTagIndex, setActiveTagIndex] = useState(0);

  return (
    <div className="w-full relative">
      {/* Mobile View (< 768px) */}
      <div className="block md:hidden relative z-10">
        <FeaturedCollectionsMobile
          tags={tags}
          activeTagIndex={activeTagIndex}
          setActiveTagIndex={setActiveTagIndex}
          hideQuickBrowse={hideQuickBrowse}
        />
      </div>

      {/* Desktop View (>= 768px) */}
      <div className="hidden md:block relative z-10">
        <FeaturedCollectionsDesktop
          tags={tags}
          activeTagIndex={activeTagIndex}
          setActiveTagIndex={setActiveTagIndex}
          hideQuickBrowse={hideQuickBrowse}
          location={location === "explore-mb" ? "main" : location}
        />
      </div>
    </div>
  );
}
