"use client";

import { useState } from "react";
import { ChevronRight, Star, Play, BookOpen, Crown, Gem, Box, Layers, Waves, Network, Grid, Flashlight, Music, Wind, Flame, Sprout, Activity, Columns, Orbit } from "lucide-react";
import AstrolabeBanner from "./AstrolabeBanner";
import ArchiveTunnelBanner from "./ArchiveTunnelBanner";
import LyreBanner from "./LyreBanner";
import PrismBanner from "./PrismBanner";
import ConstellationBanner from "./ConstellationBanner";
import HexagonBanner from "./HexagonBanner";
import EternalFlameBanner from "./EternalFlameBanner";
import TreeBanner from "./TreeBanner";
import PendulumBanner from "./PendulumBanner";
import OrreryBanner from "./OrreryBanner";

export default function HeroBannerPreview() {
  const [activeDesign, setActiveDesign] = useState<"astrolabe" | "tunnel" | "lyre" | "prism" | "constellation" | "hexagon" | "flame" | "tree" | "pendulum" | "orrery">("orrery");

  return (
    <div className="w-full flex flex-col gap-8">
      {/* Design Selector */}
      <div className="flex flex-wrap justify-center gap-4">
        <button
          onClick={() => setActiveDesign("astrolabe")}
          className={`px-6 py-2 rounded-full border transition-all flex items-center gap-2 ${
            activeDesign === "astrolabe"
              ? "bg-accent text-bg-main border-accent font-bold"
              : "border-white/20 text-text-secondary hover:border-accent/50"
          }`}
        >
          <Star size={14} />
          Idea 1: Celestial Mechanism
        </button>
        <button
          onClick={() => setActiveDesign("tunnel")}
          className={`px-6 py-2 rounded-full border transition-all flex items-center gap-2 ${
            activeDesign === "tunnel"
              ? "bg-accent text-bg-main border-accent font-bold"
              : "border-white/20 text-text-secondary hover:border-accent/50"
          }`}
        >
          <Layers size={14} />
          Idea 2: Archive Tunnel
        </button>
        <button
          onClick={() => setActiveDesign("lyre")}
          className={`px-6 py-2 rounded-full border transition-all flex items-center gap-2 ${
            activeDesign === "lyre"
              ? "bg-accent text-bg-main border-accent font-bold"
              : "border-white/20 text-text-secondary hover:border-accent/50"
          }`}
        >
          <Music size={14} />
          Idea 3: Golden Lyre
        </button>
        <button
          onClick={() => setActiveDesign("prism")}
          className={`px-6 py-2 rounded-full border transition-all flex items-center gap-2 ${
            activeDesign === "prism"
              ? "bg-accent text-bg-main border-accent font-bold"
              : "border-white/20 text-text-secondary hover:border-accent/50"
          }`}
        >
          <Gem size={14} />
          Idea 4: Prism (Cube)
        </button>
        <button
          onClick={() => setActiveDesign("constellation")}
          className={`px-6 py-2 rounded-full border transition-all flex items-center gap-2 ${
            activeDesign === "constellation"
              ? "bg-accent text-bg-main border-accent font-bold"
              : "border-white/20 text-text-secondary hover:border-accent/50"
          }`}
        >
          <Network size={14} />
          Idea 5: Star Network
        </button>
        <button
          onClick={() => setActiveDesign("hexagon")}
          className={`px-6 py-2 rounded-full border transition-all flex items-center gap-2 ${
            activeDesign === "hexagon"
              ? "bg-accent text-bg-main border-accent font-bold"
              : "border-white/20 text-text-secondary hover:border-accent/50"
          }`}
        >
          <Grid size={14} />
          Idea 6: Sacred Geometry
        </button>
        <button
          onClick={() => setActiveDesign("flame")}
          className={`px-6 py-2 rounded-full border transition-all flex items-center gap-2 ${
            activeDesign === "flame"
              ? "bg-accent text-bg-main border-accent font-bold"
              : "border-white/20 text-text-secondary hover:border-accent/50"
          }`}
        >
          <Flame size={14} />
          Idea 7: Eternal Flame
        </button>
        <button
          onClick={() => setActiveDesign("tree")}
          className={`px-6 py-2 rounded-full border transition-all flex items-center gap-2 ${
            activeDesign === "tree"
              ? "bg-accent text-bg-main border-accent font-bold"
              : "border-white/20 text-text-secondary hover:border-accent/50"
          }`}
        >
          <Sprout size={14} />
          Idea 8: Sacred Tree
        </button>
        <button
          onClick={() => setActiveDesign("pendulum")}
          className={`px-6 py-2 rounded-full border transition-all flex items-center gap-2 ${
            activeDesign === "pendulum"
              ? "bg-accent text-bg-main border-accent font-bold"
              : "border-white/20 text-text-secondary hover:border-accent/50"
          }`}
        >
          <Activity size={14} />
          Idea 9: Newton's Cradle
        </button>
        <button
          onClick={() => setActiveDesign("orrery")}
          className={`px-6 py-2 rounded-full border transition-all flex items-center gap-2 ${
            activeDesign === "orrery"
              ? "bg-accent text-bg-main border-accent font-bold"
              : "border-white/20 text-text-secondary hover:border-accent/50"
          }`}
        >
          <Orbit size={14} />
          Idea 10: Grand Orrery
        </button>
      </div>

      {/* Preview Area */}
      <div className="w-full border border-stone-800 rounded-lg overflow-hidden bg-bg-main relative min-h-[700px]">
        {activeDesign === "astrolabe" && <AstrolabeBanner />}
        {activeDesign === "tunnel" && <ArchiveTunnelBanner />}
        {activeDesign === "lyre" && <LyreBanner />}
        {activeDesign === "prism" && <PrismBanner />}
        {activeDesign === "constellation" && <ConstellationBanner />}
        {activeDesign === "hexagon" && <HexagonBanner />}
        {activeDesign === "flame" && <EternalFlameBanner />}
        {activeDesign === "tree" && <TreeBanner />}
        {activeDesign === "pendulum" && <PendulumBanner />}
        {activeDesign === "orrery" && <OrreryBanner />}
      </div>
    </div>
  );
}


