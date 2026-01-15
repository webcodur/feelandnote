"use client";

import { useState, useCallback } from "react";
import { UserX, ChevronDown, Check } from "lucide-react";
import CelebProfileCard from "./CelebProfileCard";
import Button from "@/components/ui/Button";
import BottomSheet from "@/components/ui/BottomSheet";
import { getCelebs } from "@/actions/home";
import { CELEB_PROFESSION_FILTERS } from "@/constants/celebProfessions";
import { CONTENT_TYPE_FILTERS, getContentUnit } from "@/constants/categories";
import {
  FILTER_BUTTON_STYLES,
  FILTER_CHIP_STYLES,
  FILTER_BOTTOMSHEET_STYLES,
} from "@/constants/filterStyles";
import type { CelebProfile } from "@/types/home";
import type { ProfessionCounts, NationalityCounts, ContentTypeCounts, CelebSortBy } from "@/actions/home";

interface CelebCarouselProps {
  initialCelebs: CelebProfile[];
  initialTotal: number;
  initialTotalPages: number;
  professionCounts: ProfessionCounts;
  nationalityCounts: NationalityCounts;
  contentTypeCounts: ContentTypeCounts;
  hideHeader?: boolean;
}

const SORT_OPTIONS: { value: CelebSortBy; label: string }[] = [
  { value: "influence", label: "영향력순" },
  { value: "follower", label: "팔로워순" },
  { value: "name_asc", label: "이름순" },
  { value: "birth_date_desc", label: "최근 출생순" },
  { value: "birth_date_asc", label: "오래된 출생순" },
];

export default function CelebCarousel({
  initialCelebs,
  initialTotal,
  initialTotalPages,
  professionCounts,
  nationalityCounts,
  contentTypeCounts,
  hideHeader = false,
}: CelebCarouselProps) {
  const [celebs, setCelebs] = useState<CelebProfile[]>(initialCelebs);
  const [isLoading, setIsLoading] = useState(false);
  const [profession, setProfession] = useState("all");
  const [nationality, setNationality] = useState("all");
  const [contentType, setContentType] = useState("all");
  const [sortBy, setSortBy] = useState<CelebSortBy>("influence");

  // 현재 선택된 콘텐츠 타입의 단위
  const contentUnit = contentType === "all" ? "개" : getContentUnit(contentType);

  // 모바일 모달 상태
  const [activeFilter, setActiveFilter] = useState<"profession" | "nationality" | "contentType" | "sort" | null>(null);

  const loadCelebs = useCallback(async (
    prof: string,
    nation: string,
    cType: string,
    sort: CelebSortBy
  ) => {
    setIsLoading(true);
    const result = await getCelebs({
      page: 1,
      limit: 100,
      profession: prof,
      nationality: nation,
      contentType: cType,
      sortBy: sort,
    });
    setCelebs(result.celebs);
    setIsLoading(false);
  }, []);

  const handleProfessionChange = useCallback((prof: string) => {
    setProfession(prof);
    loadCelebs(prof, nationality, contentType, sortBy);
  }, [loadCelebs, nationality, contentType, sortBy]);

  const handleNationalityChange = useCallback((nation: string) => {
    setNationality(nation);
    loadCelebs(profession, nation, contentType, sortBy);
  }, [loadCelebs, profession, contentType, sortBy]);

  const handleContentTypeChange = useCallback((cType: string) => {
    setContentType(cType);
    loadCelebs(profession, nationality, cType, sortBy);
  }, [loadCelebs, profession, nationality, sortBy]);

  const handleSortChange = useCallback((sort: CelebSortBy) => {
    setSortBy(sort);
    loadCelebs(profession, nationality, contentType, sort);
  }, [loadCelebs, profession, nationality, contentType]);

  // 현재 선택된 값들의 라벨
  const activeProfession = CELEB_PROFESSION_FILTERS.find((f) => f.value === profession);
  const activeNationality = nationalityCounts.find((n) => n.value === nationality);
  const activeContentType = CONTENT_TYPE_FILTERS.find((c) => c.value === contentType);
  const activeSort = SORT_OPTIONS.find((s) => s.value === sortBy);

  // 초기 데이터도 없으면 섹션 자체를 숨김
  if (initialTotal === 0) {
    return null;
  }

  return (
    <section>
      {/* PC: 전체 필터 표시 */}
      <div className="hidden md:block space-y-3 mb-4">
        {/* 직군 필터 */}
        <div className="flex items-center gap-2">
          <span className={FILTER_BUTTON_STYLES.label}>직군</span>
          <div className="overflow-x-auto scrollbar-hide flex-1">
            <div className={FILTER_BUTTON_STYLES.container}>
              {CELEB_PROFESSION_FILTERS.map(({ value, label }) => {
                const isActive = profession === value;
                const count = professionCounts[value] ?? 0;
                return (
                  <Button
                    unstyled
                    key={value}
                    onClick={() => handleProfessionChange(value)}
                    disabled={isLoading || count === 0}
                    className={`${FILTER_BUTTON_STYLES.base} ${
                      isActive ? FILTER_BUTTON_STYLES.active : FILTER_BUTTON_STYLES.inactive
                    } ${FILTER_BUTTON_STYLES.disabled}`}
                  >
                    {label}
                    <span className={`ml-1 ${isActive ? FILTER_BUTTON_STYLES.countActive : FILTER_BUTTON_STYLES.countInactive}`}>
                      ({count})
                    </span>
                  </Button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 국적 필터 */}
        <div className="flex items-center gap-2">
          <span className={FILTER_BUTTON_STYLES.label}>국적</span>
          <div className={FILTER_BUTTON_STYLES.container}>
            {nationalityCounts.map(({ value, label, count }) => {
              const isActive = nationality === value;
              return (
                <Button
                  unstyled
                  key={value}
                  onClick={() => handleNationalityChange(value)}
                  disabled={isLoading || count === 0}
                  className={`${FILTER_BUTTON_STYLES.base} ${
                    isActive ? FILTER_BUTTON_STYLES.active : FILTER_BUTTON_STYLES.inactive
                  } ${FILTER_BUTTON_STYLES.disabled}`}
                >
                  {label}
                  <span className={`ml-1 ${isActive ? FILTER_BUTTON_STYLES.countActive : FILTER_BUTTON_STYLES.countInactive}`}>
                    ({count})
                  </span>
                </Button>
              );
            })}
          </div>
        </div>

        {/* 콘텐츠 타입 필터 */}
        <div className="flex items-center gap-2">
          <span className={FILTER_BUTTON_STYLES.label}>콘텐츠</span>
          <div className={FILTER_BUTTON_STYLES.container}>
            {CONTENT_TYPE_FILTERS.map(({ value, label }) => {
              const isActive = contentType === value;
              const count = contentTypeCounts[value] ?? 0;
              return (
                <Button
                  unstyled
                  key={value}
                  onClick={() => handleContentTypeChange(value)}
                  disabled={isLoading || count === 0}
                  className={`${FILTER_BUTTON_STYLES.base} ${
                    isActive ? FILTER_BUTTON_STYLES.active : FILTER_BUTTON_STYLES.inactive
                  } ${FILTER_BUTTON_STYLES.disabled}`}
                >
                  {label}
                  <span className={`ml-1 ${isActive ? FILTER_BUTTON_STYLES.countActive : FILTER_BUTTON_STYLES.countInactive}`}>
                    ({count})
                  </span>
                </Button>
              );
            })}
          </div>
        </div>

        {/* 정렬 옵션 */}
        <div className="flex items-center gap-2">
          <span className={FILTER_BUTTON_STYLES.label}>정렬</span>
          <div className={FILTER_BUTTON_STYLES.container}>
            {SORT_OPTIONS.map(({ value, label }) => {
              const isActive = sortBy === value;
              return (
                <Button
                  unstyled
                  key={value}
                  onClick={() => handleSortChange(value)}
                  disabled={isLoading}
                  className={`${FILTER_BUTTON_STYLES.base} ${
                    isActive ? FILTER_BUTTON_STYLES.active : FILTER_BUTTON_STYLES.inactive
                  } ${FILTER_BUTTON_STYLES.disabled}`}
                >
                  {label}
                </Button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 모바일: 개별 필터 칩 */}
      <div className="md:hidden mb-4 space-y-2">
        {/* 직군 필터 칩 */}
        <div className="flex items-center gap-2">
          <span className={FILTER_BUTTON_STYLES.label}>직군</span>
          <Button
            unstyled
            onClick={() => setActiveFilter("profession")}
            disabled={isLoading}
            className={`${FILTER_CHIP_STYLES.base} ${FILTER_CHIP_STYLES.active}`}
          >
            {activeProfession?.label}
            <ChevronDown size={14} />
          </Button>
        </div>

        {/* 국적 필터 칩 */}
        <div className="flex items-center gap-2">
          <span className={FILTER_BUTTON_STYLES.label}>국적</span>
          <Button
            unstyled
            onClick={() => setActiveFilter("nationality")}
            disabled={isLoading}
            className={`${FILTER_CHIP_STYLES.base} ${
              nationality !== "all" ? FILTER_CHIP_STYLES.active : FILTER_CHIP_STYLES.inactive
            }`}
          >
            {activeNationality?.label ?? "전체"}
            <ChevronDown size={14} />
          </Button>
        </div>

        {/* 콘텐츠 타입 필터 칩 */}
        <div className="flex items-center gap-2">
          <span className={FILTER_BUTTON_STYLES.label}>콘텐츠</span>
          <Button
            unstyled
            onClick={() => setActiveFilter("contentType")}
            disabled={isLoading}
            className={`${FILTER_CHIP_STYLES.base} ${
              contentType !== "all" ? FILTER_CHIP_STYLES.active : FILTER_CHIP_STYLES.inactive
            }`}
          >
            {activeContentType?.label ?? "전체"}
            <ChevronDown size={14} />
          </Button>
        </div>

        {/* 정렬 칩 */}
        <div className="flex items-center gap-2">
          <span className={FILTER_BUTTON_STYLES.label}>정렬</span>
          <Button
            unstyled
            onClick={() => setActiveFilter("sort")}
            disabled={isLoading}
            className={`${FILTER_CHIP_STYLES.base} ${
              sortBy !== "influence" ? FILTER_CHIP_STYLES.active : FILTER_CHIP_STYLES.inactive
            }`}
          >
            {activeSort?.label}
            <ChevronDown size={14} />
          </Button>
        </div>
      </div>

      {/* 모바일: 직군 필터 바텀시트 */}
      <BottomSheet
        isOpen={activeFilter === "profession"}
        onClose={() => setActiveFilter(null)}
        title="직군"
      >
        <div className="p-4 space-y-2">
          {CELEB_PROFESSION_FILTERS.map(({ value, label }) => {
            const isActive = profession === value;
            const count = professionCounts[value] ?? 0;
            const isDisabled = count === 0;
            return (
              <Button
                unstyled
                key={value}
                onClick={() => {
                  if (!isDisabled) {
                    handleProfessionChange(value);
                    setActiveFilter(null);
                  }
                }}
                disabled={isDisabled}
                className={`${FILTER_BOTTOMSHEET_STYLES.base} ${
                  isActive ? FILTER_BOTTOMSHEET_STYLES.active : FILTER_BOTTOMSHEET_STYLES.inactive
                } ${FILTER_BOTTOMSHEET_STYLES.disabled}`}
              >
                <span className="flex-1 text-left text-sm font-medium">{label}</span>
                <span className="text-xs text-text-tertiary">{count}</span>
                {isActive && <Check size={18} className="text-accent" />}
              </Button>
            );
          })}
        </div>
      </BottomSheet>

      {/* 모바일: 국적 필터 바텀시트 */}
      <BottomSheet
        isOpen={activeFilter === "nationality"}
        onClose={() => setActiveFilter(null)}
        title="국적"
      >
        <div className="p-4 space-y-2">
          {nationalityCounts.map(({ value, label, count }) => {
            const isActive = nationality === value;
            const isDisabled = count === 0;
            return (
              <Button
                unstyled
                key={value}
                onClick={() => {
                  if (!isDisabled) {
                    handleNationalityChange(value);
                    setActiveFilter(null);
                  }
                }}
                disabled={isDisabled}
                className={`${FILTER_BOTTOMSHEET_STYLES.base} ${
                  isActive ? FILTER_BOTTOMSHEET_STYLES.active : FILTER_BOTTOMSHEET_STYLES.inactive
                } ${FILTER_BOTTOMSHEET_STYLES.disabled}`}
              >
                <span className="flex-1 text-left text-sm font-medium">{label}</span>
                <span className="text-xs text-text-tertiary">{count}</span>
                {isActive && <Check size={18} className="text-accent" />}
              </Button>
            );
          })}
        </div>
      </BottomSheet>

      {/* 모바일: 콘텐츠 타입 필터 바텀시트 */}
      <BottomSheet
        isOpen={activeFilter === "contentType"}
        onClose={() => setActiveFilter(null)}
        title="콘텐츠"
      >
        <div className="p-4 space-y-2">
          {CONTENT_TYPE_FILTERS.map(({ value, label }) => {
            const isActive = contentType === value;
            const count = contentTypeCounts[value] ?? 0;
            const isDisabled = count === 0;
            return (
              <Button
                unstyled
                key={value}
                onClick={() => {
                  if (!isDisabled) {
                    handleContentTypeChange(value);
                    setActiveFilter(null);
                  }
                }}
                disabled={isDisabled}
                className={`${FILTER_BOTTOMSHEET_STYLES.base} ${
                  isActive ? FILTER_BOTTOMSHEET_STYLES.active : FILTER_BOTTOMSHEET_STYLES.inactive
                } ${FILTER_BOTTOMSHEET_STYLES.disabled}`}
              >
                <span className="flex-1 text-left text-sm font-medium">{label}</span>
                <span className="text-xs text-text-tertiary">{count}</span>
                {isActive && <Check size={18} className="text-accent" />}
              </Button>
            );
          })}
        </div>
      </BottomSheet>

      {/* 모바일: 정렬 바텀시트 */}
      <BottomSheet
        isOpen={activeFilter === "sort"}
        onClose={() => setActiveFilter(null)}
        title="정렬"
      >
        <div className="p-4 space-y-2">
          {SORT_OPTIONS.map(({ value, label }) => {
            const isActive = sortBy === value;
            return (
              <Button
                unstyled
                key={value}
                onClick={() => {
                  handleSortChange(value);
                  setActiveFilter(null);
                }}
                className={`${FILTER_BOTTOMSHEET_STYLES.base} ${
                  isActive ? FILTER_BOTTOMSHEET_STYLES.active : FILTER_BOTTOMSHEET_STYLES.inactive
                }`}
              >
                <span className="flex-1 text-left text-sm font-medium">{label}</span>
                {isActive && <Check size={18} className="text-accent" />}
              </Button>
            );
          })}
        </div>
      </BottomSheet>

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

      {/* 모바일 그리드 (4열, 작은 카드) */}
      {celebs.length > 0 && (
        <div
          className={`
            grid grid-cols-4 gap-2 md:hidden
            ${isLoading ? "opacity-50 pointer-events-none" : ""}
          `}
        >
          {celebs.map((celeb, index) => (
            <CelebProfileCard key={celeb.id} celeb={celeb} size="sm" priority={index < 4} contentUnit={contentUnit} />
          ))}
        </div>
      )}

      {/* PC 그리드 (4~8열) */}
      {celebs.length > 0 && (
        <div
          className={`
            hidden md:grid md:grid-cols-4 lg:grid-cols-8 gap-4
            ${isLoading ? "opacity-50 pointer-events-none" : ""}
          `}
        >
          {celebs.map((celeb, index) => (
            <CelebProfileCard key={celeb.id} celeb={celeb} size="md" priority={index < 8} contentUnit={contentUnit} />
          ))}
        </div>
      )}
    </section>
  );
}
