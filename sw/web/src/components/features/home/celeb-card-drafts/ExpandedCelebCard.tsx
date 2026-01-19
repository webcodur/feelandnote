/*
  2안: 확대 심플 카드
  - 랭크/팔로우 아이콘 버튼 제거
  - 직군만 표기
  - 카드와 이미지 비중 확대
  - 클릭 시 페이지 이동 대신 상세 모달 표시
*/
"use client";

import { useState } from "react";
import { getCelebProfessionLabel } from "@/constants/celebProfessions";
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
          group relative block w-full aspect-[13/19]
          bg-bg-card overflow-visible cursor-pointer
          ${className}
        `}
      >
        {/* 석판 텍스처 및 미세 광택 */}
        <div className={styles.stoneTexture} />
        <div className="absolute inset-0 border border-white/10 z-10 pointer-events-none" />

        <div className="relative w-full h-[85%] bg-black overflow-hidden">
          {celeb.avatar_url ? (
            <img
              src={celeb.avatar_url}
              alt={celeb.nickname}
              className="w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-700"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-neutral-900">
              <span className="text-5xl text-white/20 font-serif">{celeb.nickname[0]}</span>
            </div>
          )}

          {/* 하단 그라데이션 - 이름/직군 가독성 확보 */}
          <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />

          {/* 이름 & 직군 - 이미지 위에 오버레이 */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h3 className={`
              font-bold text-white mb-0.5 drop-shadow-lg leading-tight break-keep
              ${celeb.nickname.length > 12 ? 'text-base' : celeb.nickname.length > 7 ? 'text-lg' : 'text-xl'}
            `}>
              {celeb.nickname}
            </h3>
            {celeb.profession && (
              <p className="text-sm text-white/70 truncate">
                {getCelebProfessionLabel(celeb.profession)}
              </p>
            )}
          </div>
        </div>

        {/* 하단 정보 바 - 최소화 (15%) */}
        <div className="h-[15%] px-4 flex items-center justify-between bg-bg-card/80 backdrop-blur-sm">
          <span className="text-xs text-text-tertiary tracking-wider">
            {celeb.content_count || 0} ITEMS
          </span>
          <span className="text-xs text-text-tertiary/60">
            상세보기
          </span>
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
