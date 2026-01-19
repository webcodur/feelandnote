/*
  2안: 확대 심플 카드
  - 랭크/팔로우 아이콘 버튼 제거
  - 직군만 표기
  - 카드와 이미지 비중 확대
  - 클릭 시 페이지 이동 대신 상세 모달 표시
*/
"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
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

        <div className={`relative w-full h-full md:h-[80%] bg-black overflow-hidden transition-all duration-300`}>
          {/* 이미지 영역: 모바일에서는 무조건 부모 높이 전체(aspect-ratio)를 채움 */}
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

          {/* 모바일 장식: 하단 짙은 그라데이션 */}
          <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-black via-black/40 to-transparent md:hidden" />
          
          {/* PC 전용 장식 */}
          <div className="absolute bottom-0 left-0 right-0 h-1/4 bg-gradient-to-t from-black/60 to-transparent hidden md:block" />

          {/* 모바일 전용 텍스트 (중앙 정렬 및 단어 단위 줄바꿈) */}
          <div className="absolute bottom-0 left-0 right-0 px-1.5 py-3 md:hidden flex flex-col items-center z-10">
            {/* 1행: 이름 (중앙 정렬, 공백 기준 줄바꿈, 긴 이름 축소) */}
            <h3 className={`
              font-serif font-black text-white leading-tight text-center mb-1 drop-shadow-md break-keep line-clamp-2 w-full
              ${celeb.nickname.length > 6 ? 'text-[10px]' : 'text-[11px]'}
            `}>
              {celeb.nickname}
            </h3>
            
            {/* 2행: 직업 & 기록 수 (중앙 집중형 병렬 배치) */}
            <div className="flex items-center justify-center gap-2 w-full opacity-90">
              <span className="text-[8px] text-text-tertiary truncate max-w-[60%]">
                {celeb.profession ? getCelebProfessionLabel(celeb.profession) : "-"}
              </span>
              <div className="flex items-center gap-0.5 shrink-0 border-l border-white/10 pl-2">
                <Sparkles className="w-2 h-2 text-accent" />
                <span className="text-[10px] font-serif font-black text-accent">{celeb.content_count || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* PC 전용 하단 정보 영역 (높이가 20%로 고정되어 h-full인 상단 이미지와 조화를 이룸) */}
        <div className="hidden md:flex h-[20%] px-3 items-center justify-between bg-bg-card border-t border-white/10">
          <div className="flex flex-col items-start min-w-0">
             <h3 className="font-serif font-black text-white leading-tight truncate w-full text-left text-xs sm:text-sm">
              {celeb.nickname}
            </h3>
            {celeb.profession && (
              <span className="text-[9px] text-text-tertiary opacity-70 tracking-tighter truncate w-full text-left">
                {getCelebProfessionLabel(celeb.profession)}
              </span>
            )}
          </div>

          <div className="flex flex-col items-end shrink-0 ml-2">
            <span className="text-xs font-serif font-black text-accent/80 leading-none">
              {celeb.content_count || 0}
            </span>
            <span className="text-[8px] text-accent/40 font-black uppercase tracking-tighter mt-0.5">
              ITEMS
            </span>
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
