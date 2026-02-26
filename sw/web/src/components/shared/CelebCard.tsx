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
type CardShape = "circle" | "square";

interface CelebCardProps {
  id: string;
  nickname: string;
  avatar_url?: string | null;
  title?: string | null;
  count?: number;
  className?: string;
  celebProfile?: CelebProfile;
  variant?: Variant;
  /** card variant 전용: 이미지 형태 (circle | square) */
  shape?: CardShape;
  // 부모에서 모달 관리 시 위임 (네비게이션 지원용)
  onOpenModal?: (celeb: CelebProfile, index: number) => void;
  index?: number;
}
// #endregion

// #region Variant Styles
const badgeStyles = {
  card: "absolute top-1.5 right-1.5 min-w-[22px] px-1.5 py-0.5 bg-accent/90 rounded-full text-[10px] font-semibold shadow-md shadow-accent/30",
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
  shape = "circle",
  onOpenModal,
  index = 0,
}: CelebCardProps) {
  const [selectedCeleb, setSelectedCeleb] = useState<CelebProfile | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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

  // #region Shared Styles
  // 푸른색(Cool) 계열을 완전히 배제한 웜그레이(Warm Grey) 기반 스포트라이트 배경
  const spotlightBg = {
    background: "radial-gradient(circle at 50% 0%, #302b27 0%, #171513 40%, #0a0908 100%)"
  };
  // 누끼 피사체에 입체감을 주는 드롭 섀도우
  const subjectShadow = "drop-shadow-[0_10px_15px_rgba(0,0,0,0.8)]";

  // 피사체 뒤에서 빛나는 후광 효과 (Hover 시 발광)
  const GlowEffect = ({ isCelebGroup = false }: { isCelebGroup?: boolean }) => {
    const hoverClasses = isCelebGroup 
      ? "group-hover/celeb:opacity-100 group-hover/celeb:scale-125 group-hover/celeb:bg-accent/40"
      : "group-hover:opacity-100 group-hover:scale-125 group-hover:bg-accent/40";

    return (
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] h-[70%] rounded-full bg-accent/20 blur-[20px] opacity-40 transition-all duration-700 pointer-events-none mix-blend-screen z-0 ${hoverClasses}`} />
    );
  };

  // 단조로운 단색 배경에 오묘하고 깊이감 있는 질감을 입히는 노이즈 텍스처
  const NoiseTexture = () => (
    <div 
      className="absolute inset-0 opacity-[0.06] pointer-events-none z-0 mix-blend-overlay"
      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.5' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
    />
  );
  // #endregion

  // #region Card Variant
  if (variant === "card") {
    const isCircleShape = shape === "circle";
    const roundedClass = isCircleShape ? "rounded-full" : "rounded-md";

    return (
      <>
        <button
          onClick={handleClick}
          disabled={isLoading}
          className={`group relative flex flex-col items-center disabled:opacity-70 disabled:cursor-not-allowed ${className}`}
        >
          <div className={`
            relative aspect-square w-full ${roundedClass} overflow-hidden
            border border-white/10 group-hover:border-accent/60 transition-colors duration-300
            ${isLoading ? "animate-pulse border-accent/50" : ""}
            ring-1 ring-inset ring-white/5 shadow-inner
          `}
            style={spotlightBg}
          >
            <NoiseTexture />
            <GlowEffect />
            <CelebImage
              src={avatar_url}
              alt={nickname}
              shape={isCircleShape ? "circle" : "square"}
              sizes="(max-width: 640px) 120px, (max-width: 1024px) 180px, 200px"
              fallbackSize={32}
              className={`z-10 relative ${subjectShadow} transition-transform duration-500 group-hover:scale-105`}
            />

            {count !== undefined && count > 0 && (
              <div className={`${badgeStyles.card} z-20 flex items-center justify-center`}>
                <span className="font-bold text-black leading-none">{count}</span>
              </div>
            )}

            {isLoading && (
              <div className={`absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm ${roundedClass} z-10`}>
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              </div>
            )}
          </div>

          <div className="mt-1.5 text-center flex flex-col items-center w-full">
            {title && (
              <span className="block text-[10px] sm:text-xs font-cinzel font-bold text-amber-500 tracking-widest uppercase break-keep leading-tight">
                {title}
              </span>
            )}
            <span className="block text-[11px] sm:text-xs font-sans font-medium text-white/90 tracking-wide truncate w-full group-hover:text-white transition-colors">
              {nickname}
            </span>
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
  const config = variant === "circle"
    ? { container: "w-24 h-24 rounded-full", sizes: "96px", fallbackSize: 32 }
    : { container: "w-14 h-14 sm:w-16 sm:h-16 rounded-full", sizes: "64px", fallbackSize: 20 };

  return (
    <>
      <button
        onClick={handleClick}
        disabled={isLoading}
        className={`group/celeb flex flex-col items-center ${isCircle ? "gap-2" : ""} ${className}`}
      >
        <div className={`
          relative shrink-0 ${config.container} p-0.5
          border border-white/10 shadow-lg transition-all duration-300
          group-hover/celeb:border-accent/60
          ${variant === "medallion" ? "group-hover/celeb:scale-105 shadow-xl" : ""}
          ${isLoading ? "animate-pulse border-accent/50" : ""}
        `}
          style={{ background: "#0a0a0c" }}
        >
          <div 
            className="absolute inset-0.5 rounded-full overflow-hidden shadow-inner ring-1 ring-white/5 ring-inset"
            style={spotlightBg}
          >
            <NoiseTexture />
            <GlowEffect isCelebGroup />
            <CelebImage
              src={avatar_url}
              alt={nickname}
              shape="circle"
              sizes={config.sizes}
              fallbackSize={config.fallbackSize}
              className={`z-10 relative ${subjectShadow} transition-transform duration-500 group-hover/celeb:scale-110`}
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
