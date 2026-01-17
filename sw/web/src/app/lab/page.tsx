"use client";

import NeoCelebCard from "@/components/features/home/neo-celeb-card";

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
