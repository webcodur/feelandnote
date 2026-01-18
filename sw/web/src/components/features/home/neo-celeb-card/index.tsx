"use client";

import React, { useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Check, ChevronRight } from "lucide-react";
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

  return (
    <div
      className={`${styles.cardGroup} ${styles.perspectiveWrapper} group relative flex-shrink-0 ${className}`}
      style={{ width: `${220 * scale}px`, height: `${310 * scale}px` }}
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
          <div className={`relative w-36 h-48 mb-6 shadow-2xl ${styles.imageFrame} ${imageFrame}`}>
              <div className="absolute inset-[3px] overflow-hidden bg-black shadow-inner">
                {celeb.avatar_url ? (
                  <img
                    src={celeb.avatar_url}
                    alt={celeb.nickname}
                    className={`w-full h-full object-cover ${styles.celebImage}`}
                  />
                ) : (
                  <div className={`w-full h-full flex items-center justify-center bg-neutral-800 ${styles.celebImage}`}>
                    <span className="text-2xl text-white/50">{celeb.nickname[0]}</span>
                  </div>
                )}
              </div>
          </div>

          {/* B. Name & Info */}
          <div className="text-center w-full relative z-20 mt-[-10px]">
            <h3 className={`text-xl font-black ${styles.fontFrank} tracking-wider mb-1 ${finalText} ${engravedEffect || ""}`}>
                {celeb.nickname}
            </h3>
            <div className={`flex items-center justify-center gap-2 text-xs font-bold tracking-[0.15em] ${styles.fontFrank} text-white`}>
                <span>{celeb.content_count || 0} ITEMS</span>
                <span className={`w-1 h-1 rounded-full ${finalDot}`} />
                <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowInfluenceModal(true);
                    }}
                    className="flex items-center px-2.5 py-1 rounded-full bg-white/20 border border-white/30 hover:bg-white/30 hover:border-white/40 backdrop-blur-sm cursor-pointer"
                >
                    <span className="text-[10px]">RANK</span>
                    <span className="ml-1 font-black">{celeb.influence?.rank || '-'}</span>
                    <ChevronRight size={12} className="ml-0.5" />
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
