"use client";

import React, { useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Check } from "lucide-react";
import styles from "./styles.module.css";
import { NeoCelebCardProps } from "./types";
import { getVariantStyles } from "./variantConfig";
import { toggleFollow } from "@/actions/user";
import CelebInfluenceModal from "../CelebInfluenceModal";

export default function NeoCelebCard({
  celeb,
  variant,
  className = "",
  onFollowClick,
  scale = 1,
}: NeoCelebCardProps) {
  const [isFollowing, setIsFollowing] = useState(celeb.is_following);
  const [isLoading, setIsLoading] = useState(false);
  const [showInfluenceModal, setShowInfluenceModal] = useState(false);

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
    shadow, // Normalized name in new config
    shadowHover, // Fallback for old properties if any left, but we normalized to 'shadow' mostly or need check
    btn, 
    text, // Normalized
    textColor, // Old prop fallback
    subText, // Normalized
    subTextColor, // Old prop fallback
    dot, // Normalized
    dotColor, // Old prop fallback
    label, // Normalized
    labelColor, // Old prop fallback
    imageFilter, 
    engravedEffect, 
    frameColor,
    lpClass 
  } = getVariantStyles(variant) as any; // Cast to any to handle mixed old/new naming until fully standardized

  // Normalize styles
  const finalShadow = shadow || shadowHover || "";
  const finalText = text || textColor || "";
  const finalSubText = subText || subTextColor || "";
  const finalDot = dot || dotColor || "";
  const finalLabel = label || labelColor || "";

  return (
    <div
      className={`${styles.cardGroup} ${styles.perspectiveWrapper} group relative cursor-pointer flex-shrink-0 ${className}`}
      style={{ width: `${240 * scale}px`, height: `${340 * scale}px` }}
    >
      {/* Scaled Inner Container */}
      <div 
        style={{ 
            transform: `scale(${scale})`, 
            transformOrigin: 'top left',
            width: '240px',
            height: '340px'
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
            h-[340px] 
            /* overflow-visible by default to show border */
        `}
      >
      {/* Inner Surface with Clipping */}
      <div className={`relative w-full h-full overflow-hidden ${surface}`}>
        {/* LP Effect Layer (Modular) */}
        <div className={`${styles.lpBase} ${lpClass || ""}`} />

        {/* Metal Texture Overlay */}
        <div 
          className="absolute inset-0 opacity-40 pointer-events-none mix-blend-overlay z-0" 
          style={{ backgroundImage: `url("https://res.cloudinary.com/dchkzn79d/image/upload/v1737077656/noise_w9lq5j.png")`, backgroundSize: '150px 150px' }} 
        />
        
        {/* Content Layer (z-10) */}
        <div className="relative z-10 flex flex-col items-center h-full p-6 pt-8">
          
          {/* A. Image Frame */}
          <div className="relative w-36 h-48 mb-6 transition-all duration-500 ease-out shadow-2xl">
              <div className={`absolute inset-0 border ${frameColor} transition-colors duration-200`} />
              <div className={`absolute inset-1 border ${frameColor} opacity-30`} />
              
              <div className="absolute inset-2 overflow-hidden bg-black shadow-inner">
                {celeb.avatar_url ? (
                  <img
                    src={celeb.avatar_url}
                    alt={celeb.nickname}
                    className={`w-full h-full object-cover transition-transform duration-700 ease-out ${imageFilter || ""}`}
                  />
                ) : (
                  <div className={`w-full h-full flex items-center justify-center bg-neutral-800 ${imageFilter || ""}`}>
                    <span className="text-2xl text-white/50">{celeb.nickname[0]}</span>
                  </div>
                )}
              </div>
          </div>

          {/* B. Name & Info */}
          <div className="text-center w-full relative z-20 mt-[-10px]">
            <h3 className={`text-2xl font-black ${styles.fontFrank} tracking-wider mb-1 ${finalText} ${engravedEffect || ""}`}>
                {celeb.nickname}
            </h3>
            <div className={`flex items-center justify-center gap-2 text-[10px] font-bold tracking-[0.2em] ${styles.fontFrank} ${finalSubText} opacity-80`}>
                <span>{celeb.content_count || 0} ITEMS</span>
                <span className={`w-1 h-1 rounded-full ${finalDot}`} />
                <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowInfluenceModal(true);
                    }}
                    className="underline decoration-dotted underline-offset-2 hover:decoration-solid hover:brightness-125 cursor-pointer"
                >
                    RANK {celeb.influence?.rank || '-'} ›
                </button>
            </div>

            {/* C. Action Buttons */}
            <div className="w-full flex justify-between gap-3 px-1 mt-6 opacity-100 transition-opacity">
                <Link
                    href={`/${celeb.id}`}
                    className={`${btn} ${styles.btnBase} ${styles.fontFrank} flex-1 py-2 text-xs tracking-widest uppercase text-center`}
                >
                    VIEW
                </Link>
                <button
                    onClick={handleFollowClick}
                    disabled={isLoading}
                    className={`${btn} ${styles.btnBase} px-3 flex items-center justify-center text-lg ${isLoading ? 'opacity-50' : ''}`}
                >
                    {isFollowing ? <Check size={14} strokeWidth={3} /> : "+"}
                </button>
            </div>
          </div>
        </div>
        </div>
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
