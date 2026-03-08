"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Scroll, Sparkles, BookOpen, Film, Music, Gamepad2 } from "lucide-react";

export default function MuseumPreview() {
  const t = useTranslations("scriptures.hub");

  const mediaTypes = [
    { icon: <BookOpen size={16} />, label: "BOOK" },
    { icon: <Film size={16} />, label: "VIDEO" },
    { icon: <Music size={16} />, label: "MUSIC" },
    { icon: <Gamepad2 size={16} />, label: "GAME" },
  ];

  return (
    <Link href="/scriptures/museum" className="block w-full group">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1c1814] to-[#120f0c] border border-[#d4af37]/20 hover:border-[#d4af37]/50 transition-all duration-700 shadow-2xl">
        {/* 프리미엄 장식 배경 */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.25),transparent_70%)] blur-[80px] rounded-full group-hover:scale-125 transition-transform duration-1000" />
        </div>
        <div className="absolute left-0 top-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#d4af37]/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
        <div className="absolute inset-0 opacity-[0.05] bg-[url('/noise.png')] mix-blend-overlay pointer-events-none" />

        <div className="relative z-10 p-8 sm:p-12 flex flex-col items-center text-center space-y-6">
          {/* 아이콘 */}
          <div className="p-5 rounded-2xl bg-[#d4af37]/10 text-[#d4af37] group-hover:scale-110 group-hover:bg-[#d4af37] group-hover:text-black transition-all duration-700 shadow-[0_0_40px_rgba(212,175,55,0.2)] group-hover:shadow-[0_0_60px_rgba(212,175,55,0.4)] backdrop-blur-sm border border-[#d4af37]/20">
            <Scroll size={36} strokeWidth={1.5} />
          </div>

          {/* 제목 + 설명 */}
          <div className="space-y-3 max-w-xl">
            <h3 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-br from-[#fdfbf7] via-[#f5ebd8] to-[#d4af37] group-hover:to-[#f5ebd8] transition-all duration-700 tracking-tight">
              {t("museumTitle")}
            </h3>
            <p className="text-sm md:text-base text-[#e8dcc4]/80 leading-relaxed font-medium break-keep">
              {t("museum")}
            </p>
          </div>

          {/* 매체 타입 아이콘 행 */}
          <div className="flex items-center gap-3">
            {mediaTypes.map((m) => (
              <div
                key={m.label}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-[#d4af37]/10 group-hover:border-[#d4af37]/25 transition-all duration-500"
              >
                <span className="text-[#d4af37]/70">{m.icon}</span>
                <span className="text-[10px] font-bold text-[#e8dcc4]/50 tracking-widest">{m.label}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="pt-2">
            <div className="inline-flex items-center gap-2 text-sm font-bold text-black px-6 py-3 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#e6c65c] shadow-[0_0_20px_rgba(212,175,55,0.3)] group-hover:shadow-[0_0_30px_rgba(212,175,55,0.5)] group-hover:scale-105 transition-all duration-300 transform">
              {t("enterMuseum")} <Sparkles size={16} />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
