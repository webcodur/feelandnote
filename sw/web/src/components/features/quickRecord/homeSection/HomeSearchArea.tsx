"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Loader2, BookOpen } from "lucide-react";
import { CategoryTabFilter } from "@/components/ui/CategoryTabFilter";
import { CATEGORIES, type CategoryId } from "@/constants/categories";
import type { SearchResult } from "@/components/shared/search/SearchResultsDropdown";

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
    showDropdown = true
}: HomeSearchAreaProps) {
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

    // 검색어나 결과가 바뀌면 드롭다운 열기
    useEffect(() => {
        if (query.length >= 2 || (isSearching && query.length >= 2)) {
            setIsOpen(true);
        }
    }, [query, searchResults, isSearching]);

    const handleItemClick = (result: SearchResult) => {
        onResultClick(result);
        setIsOpen(false);
    };

    return (
        <div 
            ref={containerRef}
            onKeyDown={handleKeyDown}
            className="flex flex-col gap-1 mx-auto w-fit max-w-full z-20"
        >
            {/* 카테고리 선택 탭 */}
            <CategoryTabFilter
                options={CATEGORIES.map(c => ({ value: c.id, label: c.label }))}
                value={selectedCategory}
                onChange={onCategoryChange}
            />

            {/* 통합 검색바 */}
            <div className="relative group w-full">
                <div className="absolute inset-0 bg-accent/10 rounded-xl blur-2xl group-hover:bg-accent/20 transition-all duration-700 opacity-0 group-hover:opacity-100" />
                <div className="relative flex items-center bg-neutral-900/80 border border-white/10 rounded-xl px-5 py-3 shadow-inner backdrop-blur-md transition-all duration-500 focus-within:bg-black/60 focus-within:border-accent/40 focus-within:ring-1 focus-within:ring-accent/20 group-hover:border-white/20">
                    <Search className="text-text-tertiary mr-3 transition-colors group-focus-within:text-accent" size={18} strokeWidth={2.5} />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => onQueryChange(e.target.value)}
                        placeholder={placeholder || "기록하고 싶은 작품을 검색해보세요..."}
                        className="bg-transparent border-none outline-none text-base text-text-primary placeholder:text-text-tertiary/40 w-full font-medium tracking-tight"
                    />
                    {isSearching && <Loader2 className="animate-spin text-accent ml-3 shrink-0" size={18} />}
                </div>

                {/* 검색 결과 드롭다운 */}
                {showDropdown && isOpen && (query.length >= 2 || searchResults.length > 0) && (
                    <div className="absolute top-full left-0 right-0 mt-3 bg-neutral-900/90 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-50 text-left">
                        {isSearching ? (
                            <div className="p-8 text-center text-text-tertiary">
                                <Loader2 className="animate-spin mx-auto mb-2" />
                                <span>검색 중...</span>
                            </div>
                        ) : searchResults.length > 0 ? (
                            <div className="max-h-[300px] overflow-y-auto">
                                {searchResults.map((result) => (
                                    <button
                                        key={result.id}
                                        onClick={() => handleItemClick(result)}
                                        className="w-full flex items-center gap-4 p-4 hover:bg-white/5 transition-colors border-b border-white/5 last:border-none"
                                    >
                                        <div className="w-10 h-14 bg-white/5 rounded overflow-hidden shrink-0">
                                            {result.thumbnail ? (
                                                <img src={result.thumbnail} alt={result.title} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-text-tertiary">
                                                    <BookOpen size={16} />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0 text-left">
                                            <h4 className="font-bold text-text-primary truncate">{result.title}</h4>
                                            <p className="text-sm text-text-secondary truncate">{result.subtitle}</p>
                                        </div>
                                        <div className="text-xs text-text-tertiary shrink-0 px-2 py-1 rounded bg-white/5">
                                            기록하기
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="p-8 text-center text-text-tertiary">
                                검색 결과가 없습니다.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
