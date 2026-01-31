/*
  파일명: components/features/game/GameCelebCard.tsx
  기능: 업다운 게임용 셀럽 카드
  책임: 셀럽 정보와 영향력 점수를 표시한다.
*/ // ------------------------------

"use client";

import Image from "next/image";
import type { CelebProfile } from "@/types/home";
import { CELEB_PROFESSIONS } from "@/constants/celebProfessions";

interface GameCelebCardProps {
  celeb: CelebProfile;
  showScore: boolean;
  isLeft: boolean;
  isRevealing?: boolean;
  isCorrect?: boolean | null;
  onClick?: () => void;
  clickable?: boolean;
  hideInfo?: boolean; // 고수 모드: 이름/수식어 숨김
}

export default function GameCelebCard({
  celeb,
  showScore,
  isLeft,
  isRevealing,
  isCorrect,
  onClick,
  clickable = false,
  hideInfo = false,
}: GameCelebCardProps) {
  const score = celeb.influence?.total_score ?? 0;
  const professionLabel =
    CELEB_PROFESSIONS.find((p) => p.value === celeb.profession)?.label ?? celeb.profession;

  // 생몰년 포맷
  const formatYear = (date: string | null) => (date ? new Date(date).getFullYear() : null);
  const birthYear = formatYear(celeb.birth_date);
  const deathYear = formatYear(celeb.death_date);
  const lifeSpan = birthYear
    ? deathYear
      ? `${birthYear} - ${deathYear}`
      : `${birthYear} -`
    : null;

  const handleClick = () => {
    if (clickable && onClick) onClick();
  };

  return (
    <div
      onClick={handleClick}
      className={`
        relative bg-card rounded-xl overflow-hidden border border-border
        ${isRevealing && isCorrect === false ? "ring-2 ring-red-500" : ""}
        ${isRevealing && isCorrect === true ? "ring-2 ring-green-500" : ""}
        ${clickable ? "cursor-pointer hover:ring-2 hover:ring-accent/50" : ""}
      `}
    >
      {/* 이미지 영역 */}
      <div className="relative aspect-[9/16] bg-bg-secondary">
        {celeb.portrait_url || celeb.avatar_url ? (
          <Image
            src={celeb.portrait_url || celeb.avatar_url || ""}
            alt={celeb.nickname}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-6xl text-text-secondary">
            {celeb.nickname.charAt(0)}
          </div>
        )}

        {/* 그라데이션 오버레이 */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      </div>

      {/* 정보 영역 - 이름만 남김 */}
      <div className="absolute bottom-0 start-0 end-0 p-3 sm:p-4 bg-gradient-to-t from-black/90 via-black/40 to-transparent text-center">
        {/* 수식어 - 모바일 숨김 */}
        {!hideInfo && celeb.title && (
          <div className="hidden sm:block text-xs text-text-secondary mb-0.5 sm:mb-1 truncate">{celeb.title}</div>
        )}

        {/* 이름 */}
        <h3 className="text-base sm:text-xl font-bold text-white mb-1 truncate drop-shadow-md">
          {hideInfo ? "???" : celeb.nickname}
        </h3>

        {/* 직군 & 생몰년 - 모바일 숨김 */}
        {!hideInfo && (
          <div className="hidden sm:flex items-center justify-center gap-2 text-xs sm:text-sm text-text-secondary mb-2 sm:mb-3">
            {professionLabel && <span className="whitespace-nowrap">{professionLabel}</span>}
            {lifeSpan && (
              <>
                <span className="text-border">·</span>
                <span className="truncate">{lifeSpan}</span>
              </>
            )}
          </div>
        )}
        
        {/* 클릭 힌트 - 모바일 숨김 */}
        <p
          className={`hidden sm:block text-xs text-text-tertiary mt-1 ${
            clickable && !hideInfo ? "visible" : "invisible"
          }`}
        >
          탭하여 상세 보기
        </p>
      </div>
    </div>
  );
}
