/*
  파일명: /components/layout/HeaderSearch.tsx
  기능: 헤더 검색 컴포넌트
  책임: 콘텐츠/사용자 검색 입력과 결과 드롭다운 UI를 제공한다.
*/ // ------------------------------

"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X, ArrowLeft } from "lucide-react";
import SearchModeDropdown from "@/components/shared/search/SearchModeDropdown";
import SearchResultsDropdown from "@/components/shared/search/SearchResultsDropdown";
import Button from "@/components/ui/Button";
import { useHeaderSearch } from "./useHeaderSearch";
import { Z_INDEX } from "@/constants/zIndex";
import { useTranslations } from "next-intl";

export default function HeaderSearch() {
  const t = useTranslations("shared.search.mode");
  const tp = useTranslations("content.placeholder");
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const {
    containerRef, mobileContainerRef, inputRef,
    isOpen, setIsOpen, isModeOpen, setIsModeOpen,
    mode, contentCategory, query, setQuery,
    results, recentSearches, isLoading, selectedIndex, setSelectedIndex,
    addingIds, addedIds,
    handleSearch, handleResultClick, handleAddContent, handleOpenInNewTab,
    handleInputKeyDown, handleModeChange, handleCategoryChange, clearRecentSearches,
  } = useHeaderSearch();

  const displayPlaceholder = mode === "content" ? tp(contentCategory) : t(`${mode}Placeholder`);

  // 모바일 확장 시 input에 포커스
  useEffect(() => {
    if (isMobileExpanded && mobileInputRef.current) {
      mobileInputRef.current.focus();
    }
  }, [isMobileExpanded]);

  // 모바일 확장 시 스크롤 방지
  useEffect(() => {
    if (isMobileExpanded) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [isMobileExpanded]);

  const closeMobileSearch = () => {
    setIsMobileExpanded(false);
    setIsOpen(false);
    setQuery("");
  };

  // region: 모바일 검색 아이콘 버튼
  const MobileSearchButton = (
    <Button
      unstyled
      onClick={() => setIsMobileExpanded(true)}
      className="xl:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/5"
    >
      <Search size={20} className="text-text-secondary hover:text-text-primary" />
    </Button>
  );
  // endregion

  // region: 모바일 확장 검색창 (풀스크린 오버레이)
  const MobileExpandedSearch = isMobileExpanded && (
    <div
      ref={mobileContainerRef}
      className="xl:hidden fixed inset-0 bg-bg-main"
      style={{ zIndex: Z_INDEX.modal }}
    >
      {/* Subtle stone texture for overlay */}
      <div 
        className="absolute inset-0 opacity-10 pointer-events-none mix-blend-overlay z-0"
        style={{ backgroundImage: `url("https://res.cloudinary.com/dchkzn79d/image/upload/v1737077656/noise_w9lq5j.png")` }}
      />
      
      {/* 모바일 검색 헤더 */}
      <div className="relative z-10 flex items-center gap-2 px-3 h-16 border-b border-accent-dim/20 bg-bg-card/80 backdrop-blur-md">
        <Button
          unstyled
          type="button"
          onClick={closeMobileSearch}
          className="w-8 h-8 flex items-center justify-center rounded-sm hover:bg-white/5 group shrink-0"
        >
          <ArrowLeft size={18} className="text-text-primary group-hover:text-accent transition-colors" />
        </Button>

        <div className="flex-1 min-w-0 flex items-center gap-2 bg-black/40 border-2 border-accent-dim/30 rounded-sm px-3 shadow-inner group focus-within:border-accent transition-all">
          <SearchModeDropdown
            isOpen={isModeOpen}
            onToggle={() => {
              setIsModeOpen(!isModeOpen);
              if (!isModeOpen) setIsOpen(false);
            }}
            mode={mode}
            contentCategory={contentCategory}
            onModeChange={handleModeChange}
            onCategoryChange={handleCategoryChange}
            onClose={() => setIsModeOpen(false)}
          />
          <input
            ref={mobileInputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(-1);
            }}
            onFocus={() => {
              setIsOpen(true);
              setIsModeOpen(false);
            }}
            onKeyDown={handleInputKeyDown}
            placeholder={displayPlaceholder}
            className="flex-1 min-w-0 bg-transparent border-none text-text-primary outline-none text-sm sm:text-[15px] font-serif placeholder: placeholder:italic py-2"
          />
          <Button
            unstyled
            onClick={() => {
              setQuery("");
              mobileInputRef.current?.focus();
            }}
            disabled={!query}
            className={`${query ? " hover:text-text-primary" : " cursor-not-allowed"}`}
          >
            <X size={16} />
          </Button>
        </div>
      </div>

      {/* 모바일 검색 결과 */}
      <div className="relative z-10 px-3 py-4 max-h-[calc(100vh-64px)] overflow-y-auto no-scrollbar">
        {isOpen && (
          <SearchResultsDropdown
            isLoading={isLoading}
            query={query}
            results={results}
            recentSearches={recentSearches}
            selectedIndex={selectedIndex}
            searchMode={mode}
            addingIds={addingIds}
            addedIds={addedIds}
            onResultClick={(result) => {
              handleResultClick(result);
              closeMobileSearch();
            }}
            onRecentSearchClick={(search) => {
              setQuery(search);
              mobileInputRef.current?.focus();
            }}
            onClearRecentSearches={clearRecentSearches}
            onViewAllResults={() => {
              handleSearch();
              closeMobileSearch();
            }}
            onAddContent={handleAddContent}
            onOpenInNewTab={handleOpenInNewTab}
            isMobile
          />
        )}
      </div>
    </div>
  );
  // endregion

  return (
    <>
      {/* 모바일: 검색 아이콘 버튼 */}
      {MobileSearchButton}

      {/* 모바일: 확장 검색창 오버레이 */}
      {MobileExpandedSearch}

      {/* 데스크톱: 인라인 검색창 */}
      <div ref={containerRef} className="hidden xl:block flex-1 max-w-md mx-auto relative">
      {/* Search Bar */}
      <div
        className={`w-full h-10 bg-white/5 backdrop-blur-sm border rounded-lg flex items-center transition-all duration-300
          ${isOpen ? "border-accent shadow-[0_0_15px_rgba(212,175,55,0.15)] bg-black/40" : "border-white/10 hover:border-white/20 hover:bg-white/10"}`}
      >
        {/* Mode Selector */}
        <SearchModeDropdown
          isOpen={isModeOpen}
          onToggle={() => {
            setIsModeOpen(!isModeOpen);
            if (!isModeOpen) setIsOpen(false);
          }}
          mode={mode}
          contentCategory={contentCategory}
          onModeChange={handleModeChange}
          onCategoryChange={handleCategoryChange}
          onClose={() => setIsModeOpen(false)}
        />

        {/* Search Input */}
        <div className="flex-1 h-full flex items-center gap-2 px-3">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(-1);
            }}
            onFocus={() => {
              setIsOpen(true);
              setIsModeOpen(false);
            }}
            onKeyDown={handleInputKeyDown}
            placeholder={displayPlaceholder}
            className="flex-1 h-full bg-transparent border-none text-text-primary outline-none text-[15px] placeholder:text-text-secondary"
          />
          <Button
            unstyled
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            disabled={!query}
            className={`${query ? "text-text-secondary hover:text-text-primary" : "text-text-secondary/30 cursor-not-allowed"}`}
          >
            <X size={16} />
          </Button>
          <Button
            unstyled
            onClick={handleSearch}
            className="text-text-secondary hover:text-accent shrink-0"
          >
            <Search size={18} />
          </Button>
        </div>

        {/* Keyboard hint */}
        <div className="hidden sm:flex h-full items-center gap-1 px-3 text-xs text-text-secondary border-l border-white/5">
          <kbd className="px-1.5 py-0.5 bg-white/5 rounded text-[10px]">Ctrl</kbd>
          <kbd className="px-1.5 py-0.5 bg-white/5 rounded text-[10px]">K</kbd>
        </div>
      </div>

      {/* Results Dropdown */}
      {isOpen && (
        <SearchResultsDropdown
          isLoading={isLoading}
          query={query}
          results={results}
          recentSearches={recentSearches}
          selectedIndex={selectedIndex}
          searchMode={mode}
          addingIds={addingIds}
          addedIds={addedIds}
          onResultClick={handleResultClick}
          onRecentSearchClick={(search) => {
            setQuery(search);
            inputRef.current?.focus();
          }}
          onClearRecentSearches={clearRecentSearches}
          onViewAllResults={handleSearch}
          onAddContent={handleAddContent}
          onOpenInNewTab={handleOpenInNewTab}
        />
      )}
      </div>
    </>
  );
}
