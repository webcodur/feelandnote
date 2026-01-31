/*
  파일명: /components/features/home/TagCelebShowcase.tsx
  기능: 태그 선택 시 포트레잇 기반 대형 쇼케이스 UI
  책임: portrait_url 활용, 경계 블러 처리로 여러 인물 동시 표시
*/
"use client";

import { useState } from "react";
import type { CelebProfile } from "@/types/home";
import type { TagCount } from "@/actions/home";
import CelebDetailModal from "./celeb-card-drafts/CelebDetailModal";
import ExpandedCelebCard from "./celeb-card-drafts/ExpandedCelebCard";
import { Pagination } from "@/components/ui";

interface TagCelebShowcaseProps {
  celebs: CelebProfile[];
  tag: TagCount;
  isLoading?: boolean;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function TagCelebShowcase({
  celebs,
  tag,
  isLoading = false,
  currentPage,
  totalPages,
  onPageChange,
}: TagCelebShowcaseProps) {
  const [selectedCeleb, setSelectedCeleb] = useState<CelebProfile | null>(null);
  const loadingClass = isLoading ? "opacity-50 pointer-events-none" : "";

  // 영향력 순 정렬 (높은 순)
  const sortedByInfluence = [...celebs].sort((a, b) => {
    const scoreA = a.influence?.total_score ?? 0;
    const scoreB = b.influence?.total_score ?? 0;
    return scoreB - scoreA;
  });

  // 히어로 섹션용 상위 12명까지 - 2행 구조
  const heroCount = Math.min(sortedByInfluence.length, 12);
  const topCelebs = sortedByInfluence.slice(0, heroCount);

  // 전면 행 (포트레잇, 대형): 최대 5명
  // 후면 행 (썸네일, 소형): 나머지
  const frontRowCount = Math.min(heroCount, 5);
  const backRowCount = heroCount - frontRowCount;

  // 지그재그 배치 함수: 영향력 순을 중앙부터 좌우 교대로 배치
  const zigzagArrange = (items: CelebProfile[]) => {
    if (items.length === 0) return [];
    const result: (CelebProfile | null)[] = new Array(items.length).fill(null);
    const center = Math.floor(items.length / 2);

    items.forEach((item, i) => {
      if (i === 0) {
        result[center] = item;
      } else {
        const offset = Math.ceil(i / 2);
        const position = i % 2 === 1 ? center - offset : center + offset;
        result[position] = item;
      }
    });

    return result.filter((item): item is CelebProfile => item !== null);
  };

  const frontRow = zigzagArrange(topCelebs.slice(0, frontRowCount));
  const backRow = zigzagArrange(topCelebs.slice(frontRowCount, frontRowCount + backRowCount));

  // 하단 그리드: 영향력 순
  const gridCelebs = sortedByInfluence;

  return (
    <div className={`space-y-8 ${loadingClass}`}>
      {/* 히어로 섹션 - 2행 구조 (후면 썸네일 + 전면 포트레잇) */}
      <HeroSection
        frontRow={frontRow}
        backRow={backRow}
        tag={tag}
        onSelect={setSelectedCeleb}
      />

      {/* 그리드 섹션 - 기존 ExpandedCelebCard 사용 */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 md:gap-4">
        {gridCelebs.map((celeb) => (
          <ExpandedCelebCard key={celeb.id} celeb={celeb} />
        ))}
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="mt-8">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
          />
        </div>
      )}

      {/* 상세 모달 */}
      {selectedCeleb && (
        <CelebDetailModal
          celeb={selectedCeleb}
          isOpen={!!selectedCeleb}
          onClose={() => setSelectedCeleb(null)}
        />
      )}
    </div>
  );
}

// #region 히어로 섹션
function HeroSection({
  frontRow,
  backRow,
  tag,
  onSelect,
}: {
  frontRow: CelebProfile[];
  backRow: CelebProfile[];
  tag: TagCount;
  onSelect: (celeb: CelebProfile) => void;
}) {
  if (frontRow.length === 0 && backRow.length === 0) return null;

  const allCelebs = [...frontRow, ...backRow];

  return (
    <div className="relative overflow-hidden rounded-2xl bg-bg-main">
      {/* 배경 블러 이미지들 */}
      <div className="absolute inset-0 overflow-hidden">
        {allCelebs.slice(0, 3).map((celeb, i) => {
          const imageUrl = celeb.portrait_url || celeb.avatar_url;
          if (!imageUrl) return null;
          const positions = ["left", "center", "right"];
          return (
            <div
              key={celeb.id}
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage: `url(${imageUrl})`,
                backgroundSize: "60%",
                backgroundPosition: `${positions[i]} top`,
                backgroundRepeat: "no-repeat",
                filter: "blur(80px) saturate(0.3)",
              }}
            />
          );
        })}
        {/* 다크 오버레이 그라데이션 */}
        <div className="absolute inset-0 bg-gradient-to-b from-bg-main/80 via-transparent to-bg-main" />
        <div className="absolute inset-0 bg-gradient-to-r from-bg-main/60 via-transparent to-bg-main/60" />
      </div>

      {/* 콘텐츠 */}
      <div className="relative z-10 px-4 md:px-8 pt-8 pb-12">
        {/* 태그 정보 - 신전 테마 */}
        <div className="text-center mb-12 pt-4">
          {/* 장식 라인 */}
          <div className="flex items-center justify-center gap-4 mb-5">
            <div className="h-px w-12 md:w-20 bg-gradient-to-r from-transparent to-accent/50" />
            <div className="w-1.5 h-1.5 rotate-45 bg-accent/70" />
            <div className="h-px w-12 md:w-20 bg-gradient-to-l from-transparent to-accent/50" />
          </div>

          {/* 태그명 */}
          <h2
            className="font-serif text-2xl md:text-4xl font-bold tracking-wide mb-4"
            style={{
              color: tag.color,
              textShadow: `0 0 40px ${tag.color}60, 0 2px 10px rgba(0,0,0,0.8)`,
            }}
          >
            {tag.name}
          </h2>

          {/* 설명 */}
          {tag.description && (
            <p className="text-sm md:text-base text-text-secondary max-w-xl mx-auto leading-relaxed font-medium italic">
              "{tag.description}"
            </p>
          )}

          {/* 하단 장식 */}
          <div className="flex items-center justify-center gap-3 mt-6">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-white/20" />
            <div className="w-1 h-1 rounded-full bg-white/30" />
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-white/20" />
          </div>
        </div>

        {/* 포트레잇 갤러리 - 모바일/데스크톱 분리 */}

        {/* 모바일: 전면 3명만 */}
        <div className="relative min-h-[240px] md:hidden">
          <div className="absolute bottom-0 left-0 right-0 flex justify-center items-end gap-0">
            {frontRow.slice(0, 3).map((celeb, index) => (
              <HeroPortrait
                key={celeb.id}
                celeb={celeb}
                index={index}
                total={Math.min(frontRow.length, 3)}
                onClick={() => onSelect(celeb)}
                size="mobile"
              />
            ))}
          </div>
        </div>

        {/* 데스크톱: 2행 구조 */}
        <div className="relative min-h-[420px] hidden md:block">
          {/* 후면 행 (썸네일, 소형) */}
          {backRow.length > 0 && (
            <div className="absolute top-0 left-0 right-0 flex justify-center items-end gap-0 z-0">
              {backRow.map((celeb, index) => (
                <BackRowPortrait
                  key={celeb.id}
                  celeb={celeb}
                  index={index}
                  total={backRow.length}
                  onClick={() => onSelect(celeb)}
                />
              ))}
            </div>
          )}

          {/* 전면 행 (포트레잇, 대형) */}
          <div className="absolute bottom-0 left-0 right-0 flex justify-center items-end gap-0 z-10">
            {frontRow.map((celeb, index) => (
              <HeroPortrait
                key={celeb.id}
                celeb={celeb}
                index={index}
                total={frontRow.length}
                onClick={() => onSelect(celeb)}
                size="desktop"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// 후면 행 (썸네일, 소형)
function BackRowPortrait({
  celeb,
  index,
  total,
  onClick,
}: {
  celeb: CelebProfile;
  index: number;
  total: number;
  onClick: () => void;
}) {
  const imageUrl = celeb.avatar_url || celeb.portrait_url;
  const isCenter = index === Math.floor(total / 2);

  const centerDistance = Math.abs(index - Math.floor(total / 2));
  const scale = isCenter ? 1 : 1 - centerDistance * 0.03;
  const translateY = centerDistance * 3;

  const margin = index === 0 ? "" : "-ml-4 md:-ml-5";

  return (
    <button
      onClick={onClick}
      className={`
        group relative flex-shrink-0 cursor-pointer
        transition-all duration-300 hover:z-50 z-0
        opacity-70 hover:opacity-100
        ${margin}
      `}
      style={{
        transform: `scale(${scale}) translateY(${translateY}px)`,
      }}
    >
      <div
        className={`
          relative overflow-visible
          ${isCenter ? "w-20 h-28 md:w-28 md:h-40" : "w-16 h-24 md:w-24 md:h-36"}
        `}
      >
        {imageUrl ? (
          <div
            className="absolute inset-[-15%] group-hover:scale-105 transition-transform duration-500"
            style={{
              backgroundImage: `url(${imageUrl})`,
              backgroundSize: "80% auto",
              backgroundPosition: "center 20%",
              backgroundRepeat: "no-repeat",
              maskImage: `
                radial-gradient(ellipse 40% 60% at center 50%, black 0%, black 55%, rgba(0,0,0,0.4) 75%, transparent 100%)
              `,
              WebkitMaskImage: `
                radial-gradient(ellipse 40% 60% at center 50%, black 0%, black 55%, rgba(0,0,0,0.4) 75%, transparent 100%)
              `,
              filter: "drop-shadow(0 8px 20px rgba(0,0,0,0.5)) saturate(0.8)",
            }}
          />
        ) : (
          <div className="absolute inset-[15%] bg-bg-card/30 rounded-full flex items-center justify-center">
            <span className="text-2xl text-white/20 font-serif">{celeb.nickname[0]}</span>
          </div>
        )}

        <div className="absolute -bottom-1 inset-x-0 text-center">
          <span className={`font-serif font-medium text-white/80 drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)] ${isCenter ? "text-[10px] md:text-xs" : "text-[9px] md:text-[11px]"}`}>
            {celeb.nickname}
          </span>
        </div>
      </div>
    </button>
  );
}

// 전면 행 (포트레잇, 대형)
function HeroPortrait({
  celeb,
  index,
  total,
  onClick,
  size = "desktop",
}: {
  celeb: CelebProfile;
  index: number;
  total: number;
  onClick: () => void;
  size?: "mobile" | "desktop";
}) {
  const imageUrl = celeb.portrait_url || celeb.avatar_url;
  const isCenter = index === Math.floor(total / 2);

  // 중앙일수록 크고, 양끝은 작게
  const centerDistance = Math.abs(index - Math.floor(total / 2));
  const scale = isCenter ? 1 : 1 - centerDistance * 0.05;
  const translateY = centerDistance * 4;

  // 오버랩 줄이고 클릭 영역 확보
  const margin = index === 0 ? "" : (size === "mobile" ? "-ml-8" : "-ml-8");

  // 크기 설정
  const sizeClasses = size === "mobile"
    ? (isCenter ? "w-36 h-52" : "w-28 h-40")
    : (isCenter ? "w-72 h-96" : "w-56 h-80");

  return (
    <button
      onClick={onClick}
      className={`
        group relative flex-shrink-0 cursor-pointer
        transition-all duration-300 hover:z-50 z-10
        ${margin}
      `}
      style={{
        transform: `scale(${scale}) translateY(${translateY}px)`,
      }}
    >
      {/* 이미지 컨테이너 */}
      <div className={`relative overflow-visible ${sizeClasses}`}>
        {/* 이미지 - 인물 선명, 사방 블러 border */}
        {imageUrl ? (
          <div
            className="absolute inset-[-20%] group-hover:scale-105 transition-transform duration-500"
            style={{
              backgroundImage: `url(${imageUrl})`,
              backgroundSize: "75% auto",
              backgroundPosition: "center 20%",
              backgroundRepeat: "no-repeat",
              maskImage: `
                radial-gradient(ellipse 38% 65% at center 50%, black 0%, black 62%, rgba(0,0,0,0.5) 75%, rgba(0,0,0,0.2) 88%, transparent 100%)
              `,
              WebkitMaskImage: `
                radial-gradient(ellipse 38% 65% at center 50%, black 0%, black 62%, rgba(0,0,0,0.5) 75%, rgba(0,0,0,0.2) 88%, transparent 100%)
              `,
              filter: "drop-shadow(0 12px 32px rgba(0,0,0,0.55))",
            }}
          />
        ) : (
          <div className="absolute inset-[15%] bg-bg-card/30 rounded-[50%] flex items-center justify-center">
            <span className="text-4xl text-white/20 font-serif">{celeb.nickname[0]}</span>
          </div>
        )}

        {/* 이름 - 이미지 아래 */}
        <div className="absolute -bottom-1 inset-x-0 text-center">
          <span className={`font-serif font-bold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] ${
            size === "mobile"
              ? (isCenter ? "text-sm" : "text-xs")
              : (isCenter ? "text-lg" : "text-base")
          }`}>
            {celeb.nickname}
          </span>
        </div>
      </div>

      {/* 호버 시 글로우 */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 50% 60% at center, rgba(124, 77, 255, 0.15) 0%, transparent 60%)",
        }}
      />
    </button>
  );
}
// #endregion

