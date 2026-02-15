"use client";

import { useState } from "react";
import { ChevronRight, Star, Play, BookOpen, Crown, Gem, Box, Layers, Waves, Network, Grid, Flashlight, Music, Wind, Flame, Sprout, Activity, Columns, Orbit, Stars, Mail, Shapes, Shell, Share2, Anchor, ScrollText, Map as MapIcon } from "lucide-react";
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
import SealedEdictBanner from "./SealedEdictBanner";
import SacredGeometryBanner from "./SacredGeometryBanner";
import GoldenSpiralBanner from "./GoldenSpiralBanner";
import MessageBottlesBanner from "./MessageBottlesBanner";
import ParchmentScrollBanner from "./ParchmentScrollBanner";
import HegemonyMapBanner from "./HegemonyMapBanner";

// 공통 데모 오버레이
const demoOverlay = (
  <>
    <h2 className="text-4xl sm:text-5xl md:text-7xl font-serif font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-stone-500 tracking-tight text-center">
      지혜의 서고
    </h2>
    <p className="text-[#d4af37] tracking-[0.2em] sm:tracking-[0.4em] text-xs sm:text-sm mt-3 sm:mt-4 uppercase font-cinzel text-center">
      Scripture of Wisdom
    </p>
  </>
);

export default function HeroBannerPreview() {
  const [activeDesign, setActiveDesign] = useState<"astrolabe" | "tunnel" | "lyre" | "prism" | "constellation" | "hexagon" | "flame" | "tree" | "pendulum" | "orrery" | "sealed-edict" | "sacred-geometry" | "golden-spiral" | "message-bottles" | "parchment-scroll" | "hegemony-map">("hegemony-map");

  return (
    <div className="w-full flex flex-col gap-8">
      {/* Design Selector */}
      <div className="flex flex-wrap justify-center gap-4">
        {/* ... existing buttons ... */}
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
        {/* ... (skipping some for brevity in diff, but need to be careful with replace context) ... */}
        {/* It is cleaner to just add the new button at the end of the list */}
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
        <button
          onClick={() => setActiveDesign("sealed-edict")}
          className={`px-6 py-2 rounded-full border transition-all flex items-center gap-2 ${
            activeDesign === "sealed-edict"
              ? "bg-accent text-bg-main border-accent font-bold"
              : "border-white/20 text-text-secondary hover:border-accent/50"
          }`}
        >
          <Mail size={14} />
          Idea 11: Sealed Edict
        </button>
        <button
          onClick={() => setActiveDesign("sacred-geometry")}
          className={`px-6 py-2 rounded-full border transition-all flex items-center gap-2 ${
            activeDesign === "sacred-geometry"
              ? "bg-accent text-bg-main border-accent font-bold"
              : "border-white/20 text-text-secondary hover:border-accent/50"
          }`}
        >
          <Shapes size={14} />
          Idea 12: Sacred Geometry
        </button>
        <button
          onClick={() => setActiveDesign("golden-spiral")}
          className={`px-6 py-2 rounded-full border transition-all flex items-center gap-2 ${
            activeDesign === "golden-spiral"
              ? "bg-accent text-bg-main border-accent font-bold"
              : "border-white/20 text-text-secondary hover:border-accent/50"
          }`}
        >
          <Shell size={14} />
          Idea 13: Golden Spiral
        </button>
        <button
          onClick={() => setActiveDesign("message-bottles")}
          className={`px-6 py-2 rounded-full border transition-all flex items-center gap-2 ${
            activeDesign === "message-bottles"
              ? "bg-accent text-bg-main border-accent font-bold"
              : "border-white/20 text-text-secondary hover:border-accent/50"
          }`}
        >
          <Anchor size={14} />
          Idea 14: Message Bottles
        </button>
        <button
          onClick={() => setActiveDesign("parchment-scroll")}
          className={`px-6 py-2 rounded-full border transition-all flex items-center gap-2 ${
            activeDesign === "parchment-scroll"
              ? "bg-accent text-bg-main border-accent font-bold"
              : "border-white/20 text-text-secondary hover:border-accent/50"
          }`}
        >
          <ScrollText size={14} />
          Idea 15: Parchment Scroll
        </button>
        <button
          onClick={() => setActiveDesign("hegemony-map")}
          className={`px-6 py-2 rounded-full border transition-all flex items-center gap-2 ${
            activeDesign === "hegemony-map"
              ? "bg-accent text-bg-main border-accent font-bold"
              : "border-white/20 text-text-secondary hover:border-accent/50"
          }`}
        >
          <MapIcon size={14} />
          Idea 16: Hegemony Map
        </button>
      </div>

      {/* Preview Area */}
      <div className="w-full border border-stone-800 rounded-lg overflow-hidden bg-bg-main relative min-h-[700px]">
        {activeDesign === "astrolabe" && <AstrolabeBanner>{demoOverlay}</AstrolabeBanner>}
        {activeDesign === "tunnel" && <ArchiveTunnelBanner>{demoOverlay}</ArchiveTunnelBanner>}
        {activeDesign === "lyre" && <LyreBanner>{demoOverlay}</LyreBanner>}
        {activeDesign === "prism" && <PrismBanner>{demoOverlay}</PrismBanner>}
        {activeDesign === "constellation" && <ConstellationBanner>{demoOverlay}</ConstellationBanner>}
        {activeDesign === "hexagon" && <HexagonBanner>{demoOverlay}</HexagonBanner>}
        {activeDesign === "flame" && <EternalFlameBanner>{demoOverlay}</EternalFlameBanner>}
        {activeDesign === "tree" && <TreeBanner>{demoOverlay}</TreeBanner>}
        {activeDesign === "pendulum" && <PendulumBanner>{demoOverlay}</PendulumBanner>}
        {activeDesign === "orrery" && <OrreryBanner>{demoOverlay}</OrreryBanner>}
        {activeDesign === "sealed-edict" && <SealedEdictBanner>{demoOverlay}</SealedEdictBanner>}
        {activeDesign === "sacred-geometry" && <SacredGeometryBanner>{demoOverlay}</SacredGeometryBanner>}
        {activeDesign === "golden-spiral" && <GoldenSpiralBanner>{demoOverlay}</GoldenSpiralBanner>}
        {activeDesign === "message-bottles" && <MessageBottlesBanner>{demoOverlay}</MessageBottlesBanner>}
        {activeDesign === "parchment-scroll" && <ParchmentScrollBanner>{demoOverlay}</ParchmentScrollBanner>}
        {activeDesign === "hegemony-map" && <HegemonyMapBanner>{demoOverlay}</HegemonyMapBanner>}
      </div>
    </div>
  );
}


