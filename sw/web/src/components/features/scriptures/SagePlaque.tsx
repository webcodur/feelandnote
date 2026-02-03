/*
  파일명: /components/features/scriptures/SagePlaque.tsx
  기능: 현인 명판 (Sage Plaque)
  책임: 셀럽 프로필을 가로형 명판 스타일로 표시하고, 클릭 시 디테일 모달을 띄운다.
*/ // ------------------------------
"use client";

import { useState } from "react";
import Image from "next/image";
import { User } from "lucide-react";
import CelebDetailModal from "@/components/features/home/celeb-card-drafts/CelebDetailModal";
import { getCelebForModal } from "@/actions/celebs/getCelebForModal";
import type { CelebProfile } from "@/types/home";

interface SagePlaqueProps {
  id: string;
  nickname: string;
  avatarUrl: string | null;
  bio: string | null;
  contentCount: number;
  badge?: string;
  subtitle?: string;
}

export default function SagePlaque({
  id,
  nickname,
  avatarUrl,
  bio,
  contentCount,
  badge = "Today's Sage",
  subtitle = "Curator of Wisdom",
}: SagePlaqueProps) {
  const [showModal, setShowModal] = useState(false);
  const [celebProfile, setCelebProfile] = useState<CelebProfile | null>(null);

  const handleClick = async () => {
    setShowModal(true);
    const profile = await getCelebForModal(id);
    setCelebProfile(profile);
  };

  return (
    <>
      <button
        onClick={handleClick}
        className="w-full text-left block mb-8 group relative isolate"
      >
        {/* Background Atmosphere */}
        <div className="absolute inset-0 bg-gradient-to-br from-neutral-900/80 to-neutral-950/80 rounded-2xl -z-20 transform transition-transform duration-500 group-hover:scale-[1.01]" />
        <div className="absolute inset-0 rounded-2xl border border-white/10 group-hover:border-amber-500/40 transition-colors duration-500 -z-10" />

        {/* Divine Glow Effect (Hover) */}
        <div className="absolute inset-0 bg-amber-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl -z-20" />

        <div className="flex flex-col sm:flex-row items-center gap-6 p-6 md:p-10">
          {/* Avatar Section */}
          <div className="relative shrink-0">
            <div className="absolute inset-0 bg-amber-500/20 blur-2xl rounded-full scale-150 opacity-20 group-hover:opacity-40 transition-opacity" />

            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full p-[3px] bg-gradient-to-br from-amber-500 via-white/20 to-amber-600/30 relative z-10 transition-transform duration-500 group-hover:scale-105">
              <div className="w-full h-full rounded-full overflow-hidden border-2 border-neutral-900 relative">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt={nickname}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 96px, 128px"
                    priority
                  />
                ) : (
                  <div className="w-full h-full bg-neutral-800 flex items-center justify-center">
                    <User size={40} className="text-white/20" />
                  </div>
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 bg-amber-500/90 text-black text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg shadow-amber-500/20 z-20">
                {badge}
              </div>
            </div>
          </div>

          {/* Text Info */}
          <div className="flex-1 text-center sm:text-left space-y-3 relative z-10 w-full min-w-0">
            <div>
              <div className="flex items-center justify-center sm:justify-start gap-2 mb-2 opacity-80">
                <div className="h-[1px] w-4 bg-amber-500/50" />
                <span className="text-xs font-cinzel text-amber-500 tracking-widest uppercase">
                  {subtitle}
                </span>
                <div className="h-[1px] w-4 bg-amber-500/50 sm:hidden" />
              </div>
              <h3 className="text-2xl sm:text-4xl font-serif font-black text-white group-hover:text-amber-400 transition-colors duration-300 truncate">
                {nickname}
              </h3>
            </div>

            <p className="text-sm sm:text-base text-text-secondary leading-relaxed line-clamp-2 sm:line-clamp-none max-w-2xl mx-auto sm:mx-0">
              {bio || "이 시대의 통찰을 전하는 현자입니다."}
            </p>

            {/* Stats */}
            <div className="flex items-center justify-center sm:justify-start gap-4 pt-2">
              <div className="flex items-center gap-1.5 text-xs text-text-tertiary">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500/50" />
                <span className="text-amber-500 font-bold">{contentCount}</span>
                <span>Scriptures Selected</span>
              </div>
            </div>
          </div>

          {/* Decorative Element (Desktop Only) */}
          <div className="hidden lg:block absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-white/5 to-transparent pointer-events-none opacity-30" />
        </div>
      </button>

      {/* 셀럽 디테일 모달 */}
      {showModal && celebProfile && (
        <CelebDetailModal
          celeb={celebProfile}
          isOpen={showModal}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
