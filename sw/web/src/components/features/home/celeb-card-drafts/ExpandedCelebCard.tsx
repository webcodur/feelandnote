/*
  셀럽 카드 (미니멀 스타일 채택)
  - 아이템 수: 우상단 뱃지
  - 수식어 → 이름: 하단 그라데이션 위
  - 기존 액자 효과(랭크별 테두리, 석판 텍스처) 유지
  - 호버 전: 채도 절반, 호버 시: 풀 채색 + 확대
*/
"use client";

import { useState } from "react";
import type { CelebProfile } from "@/types/home";
import styles from "./ExpandedCelebCard.module.css";
import CelebDetailModal from "./CelebDetailModal";

interface ExpandedCelebCardProps {
  celeb: CelebProfile;
  className?: string;
}

export default function ExpandedCelebCard({ celeb, className = "" }: ExpandedCelebCardProps) {
  const [showModal, setShowModal] = useState(false);
  const rank = celeb.influence?.rank || "D";
  const rankClass = styles[`rank${rank}`];

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`
          ${styles.animatedBorderCard} ${rankClass}
          group relative block w-full aspect-[3/4]
          bg-bg-card overflow-visible cursor-pointer
          ${className}
        `}
      >
        {/* 석판 텍스처 및 미세 광택 (기존 액자 효과) */}
        <div className={styles.stoneTexture} />
        <div className="absolute inset-0 border border-white/10 z-10 pointer-events-none" />

        {/* 이미지 영역 - 전체 높이 */}
        <div className="relative w-full h-full bg-black overflow-hidden">
          {celeb.avatar_url ? (
            <img
              src={celeb.avatar_url}
              alt={celeb.nickname}
              className="w-full h-full object-cover object-center group-hover:scale-110 saturate-[0.5] group-hover:saturate-100 group-active:saturate-100 transition-all duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-neutral-900">
              <span className="text-5xl text-white/20 font-serif">{celeb.nickname[0]}</span>
            </div>
          )}

          {/* 아이템 수 - 우상단 뱃지 (중앙 정렬) */}
          <div className="absolute top-2 right-2 z-20 min-w-[28px] px-2 py-1 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center">
            <span className="text-[10px] font-bold text-white text-center">{celeb.content_count || 0}</span>
          </div>

          {/* 하단 그라데이션 */}
          <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-black via-black/60 to-transparent" />

          {/* 하단 정보: 수식어 → 이름 (중앙정렬) */}
          <div className="absolute bottom-0 left-0 right-0 p-3 flex flex-col items-center text-center z-10">
            {celeb.title && (
              <span className="text-[10px] text-accent font-medium truncate max-w-full">{celeb.title}</span>
            )}
            <h3 className={`
              font-serif font-bold text-white leading-tight truncate max-w-full
              ${celeb.nickname.length > 6 ? 'text-xs' : 'text-sm'}
            `}>
              {celeb.nickname}
            </h3>
          </div>
        </div>
      </button>

      {/* 상세 모달 */}
      {showModal && (
        <CelebDetailModal
          celeb={celeb}
          isOpen={showModal}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
