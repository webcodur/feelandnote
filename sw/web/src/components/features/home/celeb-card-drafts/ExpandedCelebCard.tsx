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
import CelebDetailModal from "./CelebDetailModal";

// 랭크별 테두리 색상 (기존 카드 스타일 유지)
const RANK_BORDER_COLORS = {
  S: "border-amber-400/60",
  A: "border-slate-300/60",
  B: "border-amber-700/60",
  C: "border-slate-400/60",
  D: "border-slate-500/60",
} as const;

// 랭크별 호버 글로우
const RANK_GLOW = {
  S: "hover:shadow-[0_0_30px_rgba(251,191,36,0.4)]",
  A: "hover:shadow-[0_0_30px_rgba(148,163,184,0.4)]",
  B: "hover:shadow-[0_0_30px_rgba(180,83,9,0.3)]",
  C: "hover:shadow-[0_0_30px_rgba(100,116,139,0.3)]",
  D: "hover:shadow-[0_0_30px_rgba(71,85,105,0.3)]",
} as const;

interface ExpandedCelebCardProps {
  celeb: CelebProfile;
  className?: string;
}

export default function ExpandedCelebCard({ celeb, className = "" }: ExpandedCelebCardProps) {
  const [showModal, setShowModal] = useState(false);
  const rank = celeb.influence?.rank || "D";
  const borderColor = RANK_BORDER_COLORS[rank];
  const glowEffect = RANK_GLOW[rank];

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`
          group relative block w-full aspect-[13/19]
          bg-bg-card border-2 ${borderColor}
          overflow-hidden cursor-pointer
          transition-all duration-300 ease-out
          hover:-translate-y-1 ${glowEffect}
          ${className}
        `}
      >
        {/* 이미지 영역 - 전체 높이의 85% 차지 (비중 대폭 확대) */}
        <div className="relative w-full h-[85%] bg-black">
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
            <h3 className="text-xl font-bold text-white truncate mb-0.5 drop-shadow-lg">
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
