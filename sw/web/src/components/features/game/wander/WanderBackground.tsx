"use client";

import { Compass, Home, MapPin } from "lucide-react";

export default function WanderBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-bg-main">
      <div className="absolute inset-0 bg-gradient-to-br from-bg-secondary via-bg-main to-stone-heavy" />
      <div className="absolute inset-x-0 top-1/3 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
      <div className="absolute left-[12%] top-[20%] text-accent/20">
        <Compass className="h-28 w-28 md:h-44 md:w-44" strokeWidth={0.7} />
      </div>
      <div className="absolute bottom-[16%] right-[12%] text-accent/20">
        <Home className="h-20 w-20 md:h-32 md:w-32" strokeWidth={0.7} />
      </div>
      <div className="absolute left-[28%] top-[45%] h-px w-[45%] rotate-[-9deg] border-t border-dashed border-accent/25" />
      <MapPin className="absolute left-[26%] top-[41%] h-6 w-6 text-accent/30" />
      <MapPin className="absolute right-[25%] top-[34%] h-6 w-6 text-accent/30" />
      <div className="absolute inset-0 bg-gradient-to-b from-bg-main/20 via-transparent to-bg-main/80" />
    </div>
  );
}
