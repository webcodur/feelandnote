"use client";

import NeoCelebCard from "@/components/features/home/neo-celeb-card";
import InfluenceBadge from "@/components/ui/InfluenceBadge";

// Mock Data
const MOCK_CELEB = {
  id: "1",
  nickname: "Napoléon",
  avatar_url: "https://i.namu.wiki/i/KPhbuC83K96X1vQz7C_5J6XJ9J2M6v5J8K96X1vQz7C_5J6XJ9J2M6v5J8.webp", // Using a placeholder or existing one
  background_url: "",
  profession: "EMPEROR",
  description: "Ruler of France",
  follower_count: 1000000,
  is_following: false
} as any;

const MOCK_CELEB_GOLD = { ...MOCK_CELEB, id: "gold", nickname: "Elon Musk", profession: "TECH KING" };
const MOCK_CELEB_SILVER = { ...MOCK_CELEB, id: "silver", nickname: "Steve Jobs", profession: "VISIONARY" };
const MOCK_CELEB_BRONZE = { ...MOCK_CELEB, id: "bronze", nickname: "Napoléon", profession: "RULER" };

export default function LabPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-[#e0e0e0] flex flex-col items-center py-20 gap-10">
      <h1 className="text-4xl font-cinzel text-[#d4af37]">Component Lab</h1>

      {/* INFLUENCE BADGES SHOWCASE - All 10 Variations */}
      <section className="flex flex-col items-center gap-8 p-10 border border-white/5 bg-white/[0.02] rounded-[3rem] w-full max-w-6xl">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-cinzel text-accent tracking-[0.2em]">Insignia Archive</h2>
          <p className="text-xs text-text-tertiary uppercase tracking-widest opacity-60">Visualizing 10 grades of influence</p>
        </div>

        <div className="grid grid-cols-5 gap-y-12 gap-x-8 items-end justify-items-center w-full">
          {/* Standard Tiers */}
          <div className="flex flex-col items-center gap-3">
            <InfluenceBadge rank="S" size="lg" />
            <span className="text-[10px] text-blue-400 font-bold tracking-tighter">DIAMOND (S)</span>
          </div>
          <div className="flex flex-col items-center gap-3">
            <InfluenceBadge rank="A" size="lg" />
            <span className="text-[10px] text-accent font-bold tracking-tighter">GOLD (A)</span>
          </div>
          <div className="flex flex-col items-center gap-3">
            <InfluenceBadge rank="B" size="lg" />
            <span className="text-[10px] text-slate-300 font-bold tracking-tighter">SILVER (B)</span>
          </div>
          <div className="flex flex-col items-center gap-3">
            <InfluenceBadge rank="C" size="md" />
            <span className="text-[10px] text-orange-400 font-bold tracking-tighter">BRONZE (C)</span>
          </div>
          <div className="flex flex-col items-center gap-3">
            <InfluenceBadge rank="D" size="md" />
            <span className="text-[10px] text-slate-500 font-bold tracking-tighter">IRON (D)</span>
          </div>

          {/* Special Tiers */}
          <div className="flex flex-col items-center gap-3">
            <InfluenceBadge variant="black-gold" size="lg" />
            <span className="text-[10px] text-[#D4AF37] font-bold tracking-tighter">BLACK GOLD</span>
          </div>
          <div className="flex flex-col items-center gap-3">
            <InfluenceBadge variant="rose-gold" size="lg" />
            <span className="text-[10px] text-rose-400 font-bold tracking-tighter">ROSE GOLD</span>
          </div>
          <div className="flex flex-col items-center gap-3">
            <InfluenceBadge variant="crimson" size="lg" />
            <span className="text-[10px] text-red-500 font-bold tracking-tighter">CRIMSON</span>
          </div>
          <div className="flex flex-col items-center gap-3">
            <InfluenceBadge variant="amethyst" size="lg" />
            <span className="text-[10px] text-purple-400 font-bold tracking-tighter">AMETHYST</span>
          </div>
          <div className="flex flex-col items-center gap-3">
            <InfluenceBadge variant="holographic" size="lg" />
            <span className="text-[10px] bg-clip-text text-transparent bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 font-bold tracking-tighter">HOLOGRAPHIC</span>
          </div>
        </div>
      </section>
      
      <div className="flex flex-wrap gap-12 justify-center items-center px-10">
        
        {/* RANK S ALTERNATIVES */}
        <div className="flex flex-col items-center gap-4">
          <h2 className="text-xl font-serif text-[#D4AF37]">Black Gold (Rank S)</h2>
          <NeoCelebCard celeb={MOCK_CELEB} variant="black-gold" />
        </div>
        <div className="flex flex-col items-center gap-4">
          <h2 className="text-xl font-serif text-[#3b82f6]">Diamond (Original S)</h2>
          <NeoCelebCard celeb={MOCK_CELEB} variant="diamond" />
        </div>

        {/* SPECIAL */}
        <div className="flex flex-col items-center gap-4">
           <h2 className="text-xl font-serif text-[#fb7185]">Rose Gold (Special)</h2>
           <NeoCelebCard celeb={MOCK_CELEB} variant="rose-gold" />
        </div>
        <div className="flex flex-col items-center gap-4">
           <h2 className="text-xl font-serif text-[#dc143c]">Crimson (Special)</h2>
           <NeoCelebCard celeb={MOCK_CELEB} variant="crimson" />
        </div>
        <div className="flex flex-col items-center gap-4">
           <h2 className="text-xl font-serif text-[#8a2be2]">Amethyst (Special)</h2>
           <NeoCelebCard celeb={MOCK_CELEB} variant="amethyst" />
        </div>
        <div className="flex flex-col items-center gap-4">
           <h2 className="text-xl font-serif text-[#40e0d0] bg-clip-text text-transparent bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500">
             Holographic (Special)
           </h2>
           <NeoCelebCard celeb={MOCK_CELEB} variant="holographic" />
        </div>

        {/* RANK A */}
        <div className="flex flex-col items-center gap-4">
          <h2 className="text-xl font-serif text-[#d4af37]">Gold (Rank A)</h2>
          <NeoCelebCard celeb={MOCK_CELEB_GOLD} variant="gold" />
        </div>

        {/* RANK B */}
        <div className="flex flex-col items-center gap-4">
          <h2 className="text-xl font-serif text-[#c0c0c0]">Silver (Rank B)</h2>
          <NeoCelebCard celeb={MOCK_CELEB_SILVER} variant="silver" />
        </div>

        {/* RANK C */}
        <div className="flex flex-col items-center gap-4">
          <h2 className="text-xl font-serif text-[#cd7f32]">Bronze (Rank C)</h2>
          <NeoCelebCard celeb={MOCK_CELEB_BRONZE} variant="bronze" />
        </div>


        <div className="flex flex-col items-center gap-4">
          <h2 className="text-xl font-serif text-[#546e7a]">Iron (Original D)</h2>
          <NeoCelebCard celeb={MOCK_CELEB} variant="iron" />
        </div>
      </div>
    </div>
  );
}
