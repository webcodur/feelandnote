"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Loader2, BookOpen } from "lucide-react";
import ContentImage from "@/components/ui/ContentImage";
import { CategoryTabFilter } from "@/components/ui/CategoryTabFilter";
import { CATEGORIES, type CategoryId } from "@/constants/categories";
import type { SearchResult } from "@/components/shared/search/SearchResultsDropdown";
import DecorativeLabel from "@/components/ui/DecorativeLabel";
import { useTranslations } from "next-intl";

interface HomeSearchAreaProps {
    selectedCategory: CategoryId;
    onCategoryChange: (category: CategoryId) => void;
    query: string;
    onQueryChange: (query: string) => void;
    isSearching: boolean;
    searchResults: SearchResult[];
    onResultClick: (result: SearchResult) => void;
    placeholder?: string;
    showDropdown?: boolean;
    searchLabel?: string;
    options?: { value: CategoryId; label: string }[];
}

export function HomeSearchArea({
    selectedCategory,
    onCategoryChange,
    query,
    onQueryChange,
    isSearching,
    searchResults,
    onResultClick,
    placeholder,
    showDropdown = true,
    searchLabel,
    options
}: HomeSearchAreaProps) {
    const t = useTranslations("quickRecord.search");
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // 외부 클릭 감지
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // ESC 키 감지
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Escape") {
            setIsOpen(false);
        }
    };

    // 사람이 고른 직후에는 열지 않는다. 고르면 검색어가 비워지는데, 그 반영 전에 다시 열리면
    // "골랐는데 창이 안 닫힌다"가 된다
    const [justPicked, setJustPicked] = useState(false);

    // 검색어가 바뀌면 드롭다운을 연다. 효과가 아니라 렌더 중에 판정해 연쇄 렌더를 만들지 않는다
    const [seenQuery, setSeenQuery] = useState(query);
    if (seenQuery !== query) {
        setSeenQuery(query);
        if (justPicked) {
            // 검색어가 비워졌으면 선택 처리가 끝난 것이다
            if (query.length < 2) setJustPicked(false);
        } else if (query.length >= 2) {
            setIsOpen(true);
        }
    }

    const handleItemClick = (result: SearchResult) => {
        setJustPicked(true);
        setIsOpen(false);
        onResultClick(result);
    };

    const tc = useTranslations("content.category");
    const tp = useTranslations("content.placeholder");
    const categoryOptions = options || CATEGORIES.map(c => ({ value: c.id, label: tc(c.id) }));

    return (
        <div 
            ref={containerRef}
            onKeyDown={handleKeyDown}
            /* 폭 기준은 카테고리 필터 하나다. 필터를 감싼 칸이 w-max로 제 너비를 재고,
               검색창은 그 칸 안에서 w-full로 같은 너비를 쓴다. 장식 라벨은 이 칸 밖에 두어
               폭 계산에 끼어들지 않게 한다 — 라벨이 더 넓으면 검색창까지 따라 커진다 */
            className="flex flex-col items-center gap-1 mx-auto w-max max-w-full z-20"
        >
            {/* 카테고리 선택 탭 */}
            <DecorativeLabel label={searchLabel || t("contentSearch")} className="mb-2" />

            <div className="flex w-max max-w-full flex-col gap-1">
                {/* 필터 루트는 overflow-x-auto라 제 콘텐츠 너비를 부모에게 전하지 못한다.
                    w-max를 얹어 안쪽 탭 묶음 너비가 그대로 이 칸의 폭이 되게 한다 */}
                <CategoryTabFilter
                    className="w-max max-w-full"
                    options={categoryOptions}
                    value={selectedCategory}
                    onChange={onCategoryChange}
                />

            {/* 통합 검색바 — 폭은 위 필터가 정한 칸을 그대로 쓴다(w-full).
                안쪽 input은 min-w-0으로 자기 기본 너비(약 200px)를 밀어붙이지 못하게 막는다.
                이걸 빼면 w-max 칸이 input 기본값만큼 늘어나 필터보다 넓어진다 */}
            <div className="relative group w-full min-w-0">
                <div className="absolute inset-0 bg-accent/10 rounded-xl blur-2xl group-hover:bg-accent/20 transition-all duration-700 opacity-0 group-hover:opacity-100" />
                <div className="relative flex items-center bg-neutral-900/80 border border-white/10 rounded-xl px-5 py-3 shadow-inner backdrop-blur-md transition-all duration-500 focus-within:bg-black/60 focus-within:border-accent/40 focus-within:ring-1 focus-within:ring-accent/20 group-hover:border-white/20">
                    <Search className="mr-3 shrink-0 transition-colors group-focus-within:text-accent" size={18} strokeWidth={2.5} />
                    <input
                        type="text"
                        size={1}
                        value={query}
                        onChange={(e) => onQueryChange(e.target.value)}
                        placeholder={placeholder || (selectedCategory !== "all" ? tp(selectedCategory) : t("searchPlaceholder"))}
                        className="bg-transparent border-none outline-none text-base text-text-primary placeholder: w-full min-w-0 font-medium tracking-tight"
                    />
                    {isSearching && <Loader2 className="animate-spin text-accent ml-3 shrink-0" size={18} />}
                </div>

                {/* 검색 결과 드롭다운 */}
                {showDropdown && isOpen && (query.length >= 2 || searchResults.length > 0) && (
                    <div className="absolute top-full left-0 right-0 mt-3 bg-neutral-900/90 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-50 text-left">
                        {isSearching ? (
                            <div className="p-8 text-center">
                                <Loader2 className="animate-spin mx-auto mb-2" />
                                <span>{t("searching")}</span>
                            </div>
                        ) : searchResults.length > 0 ? (
                            <div className="max-h-[300px] overflow-y-auto">
                                {searchResults.map((result) => (
                                    <button
                                        key={result.id}
                                        onClick={() => handleItemClick(result)}
                                        className="w-full flex items-center gap-4 p-4 hover:bg-white/5 transition-colors border-b border-white/5 last:border-none"
                                    >
                                        <div className="relative w-10 h-14 bg-white/5 rounded overflow-hidden shrink-0">
                                            {result.thumbnail ? (
                                                <ContentImage src={result.thumbnail} alt={result.title} sizes="40px" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <BookOpen size={16} />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0 text-left">
                                            <h4 className="font-bold text-text-primary truncate">{result.title}</h4>
                                            <p className="text-sm text-text-secondary truncate">{result.subtitle}</p>
                                        </div>
                                        <div className="text-xs shrink-0 px-2 py-1 rounded bg-white/5">
                                            {t("addRecord")}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="p-8 text-center">
                                {t("noResults")}
                            </div>
                        )}
                    </div>
                )}
            </div>
            </div>
        </div>
    );
}
