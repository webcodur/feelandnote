"use client";

import { useState, useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight, Sparkles, UserX, MapPin, ArrowUpDown } from "lucide-react";
import CelebProfileCard from "./CelebProfileCard";
import Button from "@/components/ui/Button";
import { getCelebs } from "@/actions/home";
import { CELEB_PROFESSION_FILTERS } from "@/constants/celebProfessions";
import type { CelebProfile } from "@/types/home";
import type { ProfessionCounts, NationalityCounts, CelebSortBy } from "@/actions/home";

interface CelebCarouselProps {
  initialCelebs: CelebProfile[];
  initialTotal: number;
  initialTotalPages: number;
  professionCounts: ProfessionCounts;
  nationalityCounts: NationalityCounts;
  hideHeader?: boolean;
}

const SORT_OPTIONS: { value: CelebSortBy; label: string }[] = [
  { value: "follower", label: "팔로워순" },
  { value: "birth_date_asc", label: "출생 오래된순" },
  { value: "birth_date_desc", label: "출생 최신순" },
];

export default function CelebCarousel({
  initialCelebs,
  initialTotal,
  initialTotalPages,
  professionCounts,
  nationalityCounts,
  hideHeader = false,
}: CelebCarouselProps) {
  const [celebs, setCelebs] = useState<CelebProfile[]>(initialCelebs);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [isLoading, setIsLoading] = useState(false);
  const [profession, setProfession] = useState("all");
  const [nationality, setNationality] = useState("all");
  const [sortBy, setSortBy] = useState<CelebSortBy>("follower");
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadCelebs = useCallback(async (
    page: number,
    prof: string,
    nation: string,
    sort: CelebSortBy
  ) => {
    setIsLoading(true);
    const result = await getCelebs({
      page,
      limit: 8,
      profession: prof,
      nationality: nation,
      sortBy: sort,
    });
    setCelebs(result.celebs);
    setCurrentPage(page);
    setTotalPages(result.totalPages);
    setIsLoading(false);
  }, []);

  const handlePageChange = useCallback((page: number) => {
    loadCelebs(page, profession, nationality, sortBy);
  }, [loadCelebs, profession, nationality, sortBy]);

  const handleProfessionChange = useCallback((prof: string) => {
    setProfession(prof);
    loadCelebs(1, prof, nationality, sortBy);
  }, [loadCelebs, nationality, sortBy]);

  const handleNationalityChange = useCallback((nation: string) => {
    setNationality(nation);
    loadCelebs(1, profession, nation, sortBy);
  }, [loadCelebs, profession, sortBy]);

  const handleSortChange = useCallback((sort: CelebSortBy) => {
    setSortBy(sort);
    loadCelebs(1, profession, nationality, sort);
  }, [loadCelebs, profession, nationality]);

  // 모바일 스크롤 네비게이션
  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const scrollAmount = 200;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  // 초기 데이터도 없으면 섹션 자체를 숨김
  if (initialTotal === 0) {
    return null;
  }

  return (
    <section>
      {/* 섹션 헤더 */}
      {!hideHeader && (
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-1 h-5 bg-accent rounded-full" />
            <Sparkles size={18} className="text-accent" />
            <h2 className="text-lg font-bold">추천 셀럽</h2>
          </div>
        </div>
      )}

      {/* 필터 영역 */}
      <div className="space-y-3 mb-4">
        {/* 직군 필터 + 네비게이션 */}
        <div className="flex items-center gap-2">
          <div className="overflow-x-auto scrollbar-hide flex-1 -mx-4 px-4 md:mx-0 md:px-0">
            <div className="flex items-center gap-2">
              {CELEB_PROFESSION_FILTERS.map(({ value, label, icon: Icon }) => {
                const isActive = profession === value;
                const count = professionCounts[value] ?? 0;
                return (
                  <Button
                    unstyled
                    key={value}
                    onClick={() => handleProfessionChange(value)}
                    disabled={isLoading || count === 0}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0 ${
                      isActive
                        ? "bg-accent text-white"
                        : "bg-white/5 text-text-secondary hover:bg-white/10 hover:text-text-primary"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <Icon size={14} />
                    {label}
                    <span className={isActive ? "text-white/80" : "text-text-tertiary"}>
                      ({count})
                    </span>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* PC: 페이지 네비게이션 */}
          {totalPages > 1 && (
            <div className="hidden md:flex items-center gap-2 shrink-0">
              <span className="text-xs text-text-secondary">
                {currentPage} / {totalPages}
              </span>
              <Button
                unstyled
                onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1 || isLoading}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} />
              </Button>
              <Button
                unstyled
                onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages || isLoading}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight size={16} />
              </Button>
            </div>
          )}

          {/* 모바일: 스크롤 네비게이션 */}
          <div className="flex md:hidden items-center gap-1 shrink-0">
            <Button
              unstyled
              onClick={() => scroll("left")}
              className="p-1.5 rounded-lg bg-white/5 active:bg-white/10"
            >
              <ChevronLeft size={16} />
            </Button>
            <Button
              unstyled
              onClick={() => scroll("right")}
              className="p-1.5 rounded-lg bg-white/5 active:bg-white/10"
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>

        {/* 국적 필터 + 정렬 옵션 */}
        <div className="flex items-center gap-3">
          {/* 국적 필터 */}
          <div className="flex items-center gap-2 flex-1 overflow-x-auto scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
            <MapPin size={14} className="text-text-tertiary shrink-0" />
            <div className="flex items-center gap-1.5">
              {nationalityCounts.map(({ value, label, count }) => {
                const isActive = nationality === value;
                return (
                  <Button
                    unstyled
                    key={value}
                    onClick={() => handleNationalityChange(value)}
                    disabled={isLoading || count === 0}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap shrink-0 ${
                      isActive
                        ? "bg-blue-500 text-white"
                        : "bg-white/5 text-text-secondary hover:bg-white/10 hover:text-text-primary"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {label}
                    <span className={`ml-1 ${isActive ? "text-white/80" : "text-text-tertiary"}`}>
                      ({count})
                    </span>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* 정렬 옵션 */}
          <div className="flex items-center gap-1.5 shrink-0">
            <ArrowUpDown size={14} className="text-text-tertiary" />
            <select
              value={sortBy}
              onChange={(e) => handleSortChange(e.target.value as CelebSortBy)}
              disabled={isLoading}
              className="bg-white/5 border border-border rounded-lg px-2 py-1 text-xs text-text-primary focus:border-accent focus:outline-none disabled:opacity-50"
            >
              {SORT_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 빈 상태 */}
      {celebs.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center py-12 px-4">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-3">
            <UserX size={32} className="text-text-tertiary" />
          </div>
          <p className="text-sm text-text-secondary text-center">
            해당 직군의 셀럽이 없습니다
          </p>
        </div>
      )}

      {/* 모바일: 가로 스크롤 캐러셀 */}
      {celebs.length > 0 && (
        <div
          ref={scrollRef}
          className={`
            flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth snap-x snap-mandatory
            -mx-4 px-4 pb-2
            md:hidden
            ${isLoading ? "opacity-50 pointer-events-none" : ""}
          `}
        >
          {celebs.map((celeb) => (
            <div key={celeb.id} className="shrink-0 snap-start">
              <CelebProfileCard celeb={celeb} size="lg" />
            </div>
          ))}
        </div>
      )}

      {/* PC: 그리드 레이아웃 */}
      {celebs.length > 0 && (
        <div
          className={`
            hidden md:grid grid-cols-4 lg:grid-cols-8 gap-4
            ${isLoading ? "opacity-50 pointer-events-none" : ""}
          `}
        >
          {celebs.map((celeb) => (
            <CelebProfileCard key={celeb.id} celeb={celeb} size="md" />
          ))}
        </div>
      )}
    </section>
  );
}
