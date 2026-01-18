"use client";

import React, { useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Check, UserPlus } from "lucide-react";
import styles from "./styles.module.css";
import { NeoCelebCardProps } from "./types";
import { getVariantStyles } from "./variantConfig";
import { toggleFollow } from "@/actions/user";
import CelebInfluenceModal from "../CelebInfluenceModal";

// 사이즈별 설정
const SIZE_CONFIG = {
  default: {
    outer: { width: 240, height: 340 },
    inner: { width: 260, height: 370 },
    image: "w-40 h-52",
    imageBorder: "inset-[3px]",
    fallbackText: "text-3xl",
    contentPadding: "p-4 pt-5",
    nameHeight: "h-[48px]",
    itemsText: "text-sm mb-3",
    buttonGap: "gap-3",
    buttonPadding: "px-4 py-2.5",
    rankText: "text-xs",
    rankValue: "text-base ml-1.5",
    iconSize: 18,
  },
  compact: {
    outer: { width: 210, height: 300 },
    inner: { width: 230, height: 330 },
    image: "w-36 h-44",
    imageBorder: "inset-[2px]",
    fallbackText: "text-2xl",
    contentPadding: "p-3 pt-4",
    nameHeight: "h-[42px]",
    itemsText: "text-xs mb-2",
    buttonGap: "gap-2",
    buttonPadding: "px-3 py-2",
    rankText: "text-[10px]",
    rankValue: "text-sm ml-1",
    iconSize: 16,
  },
  small: {
    outer: { width: 160, height: 230 },
    inner: { width: 175, height: 250 },
    image: "w-24 h-32",
    imageBorder: "inset-[2px]",
    fallbackText: "text-xl",
    contentPadding: "p-2 pt-3",
    nameHeight: "h-[36px]",
    itemsText: "text-[10px] mb-1.5",
    buttonGap: "gap-1.5",
    buttonPadding: "px-2 py-1.5",
    rankText: "text-[9px]",
    rankValue: "text-xs ml-0.5",
    iconSize: 14,
  },
};

export default function NeoCelebCard({
  celeb,
  variant,
  className = "",
  onFollowClick,
  scale = 1,
  size = "default",
}: NeoCelebCardProps) {
  const [isFollowing, setIsFollowing] = useState(celeb.is_following);
  const [isLoading, setIsLoading] = useState(false);
  const [showInfluenceModal, setShowInfluenceModal] = useState(false);

  const config = SIZE_CONFIG[size];

  const handleFollowClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isLoading) return;

    // 외부 핸들러가 있으면 호출
    if (onFollowClick) {
      onFollowClick(e);
      return;
    }

    setIsLoading(true);
    const prevState = isFollowing;
    setIsFollowing(!isFollowing); // Optimistic update

    const result = await toggleFollow(celeb.id);

    if (!result.success) {
      setIsFollowing(prevState); // Revert on error
    }

    setIsLoading(false);
  };

  const {
    surface,
    borderVariant,
    shadow,
    shadowHover,
    btn,
    text,
    textColor,
    subText,
    subTextColor,
    dot,
    dotColor,
    label,
    labelColor,
    engravedEffect,
    lpClass,
    imageFrame
  } = getVariantStyles(variant) as any;

  // Normalize styles
  const finalShadow = shadow || shadowHover || "";
  const finalText = text || textColor || "";
  const finalSubText = subText || subTextColor || "";
  const finalDot = dot || dotColor || "";
  const finalLabel = label || labelColor || "";

  // 이름 길이 및 카드 사이즈에 따른 텍스트 크기
  const getNameSize = (name: string, cardSize: string) => {
    if (cardSize === "small") {
      if (name.length > 10) return 'text-xs';
      if (name.length > 7) return 'text-sm';
      return 'text-base';
    }
    if (name.length > 10) return 'text-base';
    if (name.length > 7) return 'text-lg';
    return 'text-xl';
  };

  const nameSize = getNameSize(celeb.nickname, size);

  return (
    <div
      className={`${styles.cardGroup} ${styles.perspectiveWrapper} group relative flex-shrink-0 ${className}`}
      style={{ width: `${config.outer.width * scale}px`, height: `${config.outer.height * scale}px` }}
    >
      {/* Scaled Inner Container */}
      <div
        style={{
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            width: `${config.inner.width}px`,
            height: `${config.inner.height}px`
        }}
      >
      {/* Main Card Container */}
      <div
        className={`
            ${styles.animatedBorderCard}
            ${borderVariant}
            ${finalShadow}
            relative border border-white/10
            transition-all duration-300 ease-out
            /* overflow-visible by default to show border */
        `}
        style={{ height: `${config.inner.height}px` }}
      >
      {/* Inner Surface with Clipping - 카드 클릭 시 프로필 이동 */}
      <Link href={`/${celeb.id}`} className={`relative w-full h-full overflow-hidden block ${surface}`}>
        {/* LP Effect Layer (Modular) */}
        <div className={`${styles.lpBase} ${lpClass || ""}`} />

        {/* Metal Texture Overlay */}
        <div 
          className="absolute inset-0 opacity-40 pointer-events-none mix-blend-overlay z-0" 
          style={{ backgroundImage: `url("https://res.cloudinary.com/dchkzn79d/image/upload/v1737077656/noise_w9lq5j.png")`, backgroundSize: '150px 150px' }} 
        />
        
        {/* Content Layer (z-10) */}
        <div className={`relative z-10 flex flex-col items-center h-full ${config.contentPadding}`}>

          {/* A. Image Frame - 고정 크기 */}
          <div className={`relative ${config.image} flex-shrink-0 shadow-2xl ${styles.imageFrame} ${imageFrame}`}>
              <div className={`absolute ${config.imageBorder} overflow-hidden bg-black shadow-inner`}>
                {celeb.avatar_url ? (
                  <img
                    src={celeb.avatar_url}
                    alt={celeb.nickname}
                    className={`w-full h-full object-cover ${styles.celebImage}`}
                  />
                ) : (
                  <div className={`w-full h-full flex items-center justify-center bg-neutral-800 ${styles.celebImage}`}>
                    <span className={`${config.fallbackText} text-white/50`}>{celeb.nickname[0]}</span>
                  </div>
                )}
              </div>
          </div>

          {/* B. Name & Info */}
          <div className="text-center w-full relative z-20 mt-2">
            <div className={`${config.nameHeight} flex items-center justify-center ${nameSize} font-bold ${styles.fontFrank} tracking-wide leading-tight break-keep ${styles.nameText} ${finalText} ${engravedEffect || ""}`}>
                {celeb.nickname}
            </div>
            <div className={`font-semibold ${styles.fontFrank} ${styles.subInfoText} text-white/90 ${config.itemsText}`}>
                {celeb.content_count || 0} ITEMS
            </div>

            {/* C. Action Buttons - RANK + Follow */}
            <div className={`w-full flex justify-center ${config.buttonGap}`}>
                <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowInfluenceModal(true);
                    }}
                    className={`${btn} ${styles.btnBase} ${styles.btnText} flex items-center ${config.buttonPadding} cursor-pointer`}
                >
                    <span className={`${config.rankText} tracking-wider`}>RANK</span>
                    <span className={`${config.rankValue} font-black`}>{celeb.influence?.rank || '-'}</span>
                </button>
                <button
                    onClick={handleFollowClick}
                    disabled={isLoading}
                    className={`${btn} ${styles.btnBase} ${config.buttonPadding} flex items-center justify-center ${isLoading ? 'opacity-50' : ''}`}
                >
                    {isFollowing ? <Check size={config.iconSize} strokeWidth={3} /> : <UserPlus size={config.iconSize} />}
                </button>
            </div>
          </div>
        </div>
        </Link>
      </div>
      </div>

      {showInfluenceModal && typeof document !== 'undefined' && createPortal(
        <CelebInfluenceModal
          celebId={celeb.id}
          isOpen={showInfluenceModal}
          onClose={() => setShowInfluenceModal(false)}
        />,
        document.body
      )}
    </div>
  );
}
