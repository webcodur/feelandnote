/*
  셀럽 카드 (재질 프레임 적용)
  - MaterialFrame 컴포넌트 사용 (FramePreview 기반)
  - 호버 전: 채도 절반, 호버 시: 풀 채색 + LP 애니메이션
*/
"use client";

import { useState } from "react";
import type { CelebProfile } from "@/types/home";
import MaterialFrame from "@/components/ui/MaterialFrame";
import { getMaterialKeyByPercentile, getMaterialKeyByScore } from "@/constants/materials";
import CelebDetailModal from "./CelebDetailModal";

interface ExpandedCelebCardProps {
  celeb: CelebProfile;
  className?: string;
}

export default function ExpandedCelebCard({ celeb, className = "" }: ExpandedCelebCardProps) {
  const [showModal, setShowModal] = useState(false);
  // 오라 시스템: score 기반으로 재질 결정 (SSOT: materials.ts/getMaterialKeyByScore)
  const materialKey = celeb.influence?.total_score != null
    ? getMaterialKeyByScore(celeb.influence.total_score)
    : "wood";

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`
          group relative block w-full aspect-[3/4]
          overflow-visible cursor-pointer
          hover:z-10 transition-all duration-300
          ${className}
        `}
      >
        <MaterialFrame
          material={materialKey}
          frameSize="sm"
          className="w-full h-full"
        >
          {/* 이미지 */}
          {celeb.avatar_url ? (
            <img
              src={celeb.avatar_url}
              alt={celeb.nickname}
              className="w-full h-full object-cover object-center group-hover:scale-105 saturate-[0.5] group-hover:saturate-100 transition-all duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-neutral-950">
              <span className="text-4xl text-white/20 font-serif">{celeb.nickname[0]}</span>
            </div>
          )}

          {/* 아이템 수 - 우상단 뱃지 */}
          <div className="absolute top-1.5 right-1.5 z-20 min-w-[24px] px-1.5 py-0.5 bg-black/70 backdrop-blur-sm rounded-full flex items-center justify-center">
            <span className="text-[9px] font-bold text-white">{celeb.content_count || 0}</span>
          </div>

          {/* 하단 그라데이션 */}
          <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-black via-black/70 to-transparent" />

          {/* 하단 정보 */}
          <div className="absolute bottom-0 left-0 right-0 p-2 flex flex-col items-center text-center z-10">
            {celeb.title && (
              <span className="text-[9px] md:text-[11px] text-accent font-medium truncate max-w-full">{celeb.title}</span>
            )}
            <h3 className={`font-serif font-bold text-white leading-tight truncate max-w-full ${celeb.nickname.length > 6 ? 'text-[11px] md:text-xs' : 'text-xs md:text-sm'}`}>
              {celeb.nickname}
            </h3>
          </div>
        </MaterialFrame>
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
