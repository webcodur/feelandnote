/*
  파일명: /components/shared/CelebCard.tsx
  기능: 셀럽 카드 공통 컴포넌트
  책임: 셀럽 정보를 카드 형태로 표시하고 클릭 시 상세 모달을 띄운다.
*/ // ------------------------------

"use client";

import { useState } from "react";
import Image from "next/image";
import { User } from "lucide-react";
import CelebDetailModal from "@/components/features/home/celeb-card-drafts/CelebDetailModal";
import { getCelebForModal } from "@/actions/celebs/getCelebForModal";
import type { CelebProfile } from "@/types/home";

// #region Types
interface CelebCardProps {
  id: string;
  nickname: string;
  avatar_url?: string | null;
  title?: string | null;
  count?: number;
  className?: string;
  // 전체 CelebProfile이 있으면 API 호출 생략
  celebProfile?: CelebProfile;
}
// #endregion

export default function CelebCard({
  id,
  nickname,
  avatar_url,
  title,
  count,
  className = "",
  celebProfile,
}: CelebCardProps) {
  const [selectedCeleb, setSelectedCeleb] = useState<CelebProfile | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    if (isLoading) return;

    // celebProfile이 있으면 바로 사용
    if (celebProfile) {
      setSelectedCeleb(celebProfile);
      setIsModalOpen(true);
      return;
    }

    // 없으면 API 호출
    setIsLoading(true);
    try {
      const data = await getCelebForModal(id);
      if (data) {
        setSelectedCeleb(data);
        setIsModalOpen(true);
      }
    } catch (error) {
      console.error("Failed to fetch celeb details:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        disabled={isLoading}
        className={`
          group relative flex flex-col text-left
          disabled:opacity-70 disabled:cursor-not-allowed
          ${className}
        `}
      >
        {/* 카드 본체 */}
        <div className={`
          relative aspect-[3/4] w-full overflow-hidden rounded-lg
          border-2 border-border/40 bg-bg-card
          group-hover:border-accent
          ${isLoading ? "animate-pulse border-accent/50" : ""}
        `}>
          {avatar_url ? (
            <Image
              src={avatar_url}
              alt={nickname}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 120px, (max-width: 1024px) 180px, 200px"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-bg-secondary">
              <User size={32} className="text-text-tertiary" />
            </div>
          )}

          {/* 카운트 뱃지 - 우상단 */}
          {count !== undefined && count > 0 && (
            <div className="absolute top-1.5 right-1.5 z-20 min-w-[20px] px-1.5 py-0.5 bg-black/60 backdrop-blur-[2px] rounded-full flex items-center justify-center border border-white/10">
              <span className="text-[9px] font-bold text-white/90 leading-none">{count}</span>
            </div>
          )}

          {/* 그라데이션 오버레이 */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80" />

          {/* 텍스트 정보 */}
          <div className="absolute bottom-0 inset-x-0 pb-1 pt-4 px-2 text-center flex flex-col items-center justify-end">
            {title && (
              <span className="
                block text-[10px] sm:text-xs font-cinzel font-bold text-amber-500
                tracking-widest uppercase mb-0
                drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]
                break-keep leading-tight
              ">
                {title}
              </span>
            )}

            <span className="
              block text-[11px] sm:text-xs font-sans font-bold text-white tracking-wide
              drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]
              truncate w-full
            ">
              {nickname}
            </span>
          </div>

          {/* 로딩 인디케이터 */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-10">
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          )}
        </div>
      </button>

      {/* 상세 모달 */}
      {selectedCeleb && (
        <CelebDetailModal
          celeb={selectedCeleb}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  );
}
