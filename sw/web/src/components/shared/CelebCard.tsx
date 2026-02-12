/*
  파일명: /components/shared/CelebCard.tsx
  기능: 셀럽 카드 공통 컴포넌트
  책임: 셀럽 정보를 다양한 형태로 표시하고 클릭 시 상세 모달을 띄운다.
*/ // ------------------------------

"use client";

import { useState } from "react";
import CelebDetailModal from "@/components/features/home/celeb-card-drafts/CelebDetailModal";
import { getCelebForModal } from "@/actions/celebs/getCelebForModal";
import { CelebImage } from "@/components/ui";
import type { CelebProfile } from "@/types/home";

// #region Types
type Variant = "card" | "circle" | "medallion";

interface CelebCardProps {
  id: string;
  nickname: string;
  avatar_url?: string | null;
  title?: string | null;
  count?: number;
  className?: string;
  celebProfile?: CelebProfile;
  variant?: Variant;
  // 부모에서 모달 관리 시 위임 (네비게이션 지원용)
  onOpenModal?: (celeb: CelebProfile, index: number) => void;
  index?: number;
}
// #endregion

// #region Variant Styles
const variantConfig = {
  card: {
    container: "aspect-[3/4] w-full rounded-lg",
    sizes: "(max-width: 640px) 120px, (max-width: 1024px) 180px, 200px",
    fallbackSize: 32,
    shape: "square" as const,
  },
  circle: {
    container: "w-24 h-24 rounded-full",
    sizes: "96px",
    fallbackSize: 32,
    shape: "circle" as const,
  },
  medallion: {
    container: "w-14 h-14 sm:w-16 sm:h-16 rounded-full",
    sizes: "64px",
    fallbackSize: 20,
    shape: "circle" as const,
  },
};

const badgeStyles = {
  card: "absolute top-1.5 right-1.5 min-w-[20px] px-1.5 py-0.5 bg-black/60 backdrop-blur-[2px] rounded-full border border-white/10 text-[9px]",
  circle: "absolute -top-1 -right-1 min-w-[28px] h-7 px-1.5 bg-accent text-black rounded-full text-xs",
  medallion: "absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-accent text-black rounded-full border border-black/20 shadow-lg text-[10px]",
};
// #endregion

export default function CelebCard({
  id,
  nickname,
  avatar_url,
  title,
  count,
  className = "",
  celebProfile,
  variant = "card",
  onOpenModal,
  index = 0,
}: CelebCardProps) {
  const [selectedCeleb, setSelectedCeleb] = useState<CelebProfile | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const config = variantConfig[variant];

  const handleClick = async () => {
    if (isLoading) return;

    if (celebProfile) {
      if (onOpenModal) { onOpenModal(celebProfile, index); return; }
      setSelectedCeleb(celebProfile);
      setIsModalOpen(true);
      return;
    }

    setIsLoading(true);
    try {
      const data = await getCelebForModal(id);
      if (data) {
        if (onOpenModal) { onOpenModal(data, index); return; }
        setSelectedCeleb(data);
        setIsModalOpen(true);
      }
    } catch (error) {
      console.error("Failed to fetch celeb details:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // #region Card Variant (기존 스타일)
  if (variant === "card") {
    return (
      <>
        <button
          onClick={handleClick}
          disabled={isLoading}
          className={`group relative flex flex-col text-left disabled:opacity-70 disabled:cursor-not-allowed ${className}`}
        >
          <div className={`
            relative ${config.container} overflow-hidden
            border-2 border-border/40 bg-bg-card group-hover:border-accent
            ${isLoading ? "animate-pulse border-accent/50" : ""}
          `}>
            <CelebImage
              src={avatar_url}
              alt={nickname}
              shape={config.shape}
              sizes={config.sizes}
              fallbackSize={config.fallbackSize}
            />

            {count !== undefined && count > 0 && (
              <div className={`${badgeStyles.card} z-20 flex items-center justify-center`}>
                <span className="font-bold text-white/90 leading-none">{count}</span>
              </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80" />

            <div className="absolute bottom-0 inset-x-0 pb-1 pt-4 px-2 text-center flex flex-col items-center justify-end">
              {title && (
                <span className="block text-[10px] sm:text-xs font-cinzel font-bold text-amber-500 tracking-widest uppercase mb-0 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] break-keep leading-tight">
                  {title}
                </span>
              )}
              <span className="block text-[11px] sm:text-xs font-sans font-bold text-white tracking-wide drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] truncate w-full">
                {nickname}
              </span>
            </div>

            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-10">
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              </div>
            )}
          </div>
        </button>

        {!onOpenModal && selectedCeleb && (
          <CelebDetailModal celeb={selectedCeleb} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        )}
      </>
    );
  }
  // #endregion

  // #region Circle & Medallion Variants
  const isCircle = variant === "circle";

  return (
    <>
      <button
        onClick={handleClick}
        disabled={isLoading}
        className={`group/celeb flex flex-col items-center ${isCircle ? "gap-3" : ""} ${className}`}
      >
        <div className={`
          relative shrink-0 ${config.container} p-0.5
          border-2 border-white/10 bg-neutral-900 shadow-lg
          group-hover/celeb:border-accent
          ${variant === "medallion" ? "group-hover/celeb:scale-105 transition-all shadow-xl" : ""}
          ${isLoading ? "animate-pulse border-accent/50" : ""}
        `}>
          <div className="absolute inset-0.5 rounded-full overflow-hidden">
            <CelebImage
              src={avatar_url}
              alt={nickname}
              shape={config.shape}
              sizes={config.sizes}
              fallbackSize={config.fallbackSize}
            />
          </div>

          {count !== undefined && count > 0 && (
            <div className={`${badgeStyles[variant]} z-20 flex items-center justify-center font-bold`}>
              {count}
            </div>
          )}

          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-full">
              <div className={`${isCircle ? "w-6 h-6" : "w-4 h-4"} border-2 border-white/30 border-t-white rounded-full animate-spin`} />
            </div>
          )}
        </div>

        {isCircle && (
          <span className="text-sm font-medium text-text-secondary group-hover/celeb:text-white text-center leading-tight line-clamp-2">
            {nickname}
          </span>
        )}
      </button>

      {!onOpenModal && selectedCeleb && (
        <CelebDetailModal celeb={selectedCeleb} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      )}
    </>
  );
  // #endregion
}
