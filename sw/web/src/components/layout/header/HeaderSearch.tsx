/*
  파일명: /components/layout/HeaderSearch.tsx
  기능: 헤더 검색 컴포넌트
  책임: 콘텐츠/사용자 검색 입력과 결과 드롭다운 UI를 제공한다.
*/ // ------------------------------

"use client";

import { useState, useEffect } from "react";
import { Search, X, ArrowLeft } from "lucide-react";
import SearchModeDropdown, { SEARCH_MODES, CONTENT_CATEGORIES } from "@/components/shared/search/SearchModeDropdown";
import SearchResultsDropdown from "@/components/shared/search/SearchResultsDropdown";
import Button from "@/components/ui/Button";
import { useHeaderSearch } from "./useHeaderSearch";
import { Z_INDEX } from "@/constants/zIndex";

export default function HeaderSearch() {
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);
  const {
    containerRef, inputRef,
    isOpen, setIsOpen, isModeOpen, setIsModeOpen,
    mode, contentCategory, query, setQuery,
    results, recentSearches, isLoading, selectedIndex, setSelectedIndex,
    addingIds, addedIds,
    handleSearch, handleResultClick, handleAddWithStatus, handleOpenInNewTab,
    handleInputKeyDown, handleModeChange, handleCategoryChange, clearRecentSearches,
  } = useHeaderSearch();

  const currentMode = SEARCH_MODES.find((m) => m.id === mode)!;
  const currentCategory = CONTENT_CATEGORIES.find((c) => c.id === contentCategory)!;
  const displayPlaceholder = mode === "content" ? currentCategory.placeholder : currentMode.placeholder;

  // 모바일 확장 시 input에 포커스
  useEffect(() => {
    if (isMobileExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isMobileExpanded, inputRef]);

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
      className="md:hidden w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white/5"
    >
      <Search size={20} className="text-text-primary" />
    </Button>
  );
  // endregion

  // region: 모바일 확장 검색창 (풀스크린 오버레이)
  const MobileExpandedSearch = isMobileExpanded && (
    <div
      className="md:hidden fixed inset-0 bg-bg-main"
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
          onClick={closeMobileSearch}
          className="w-10 h-10 flex items-center justify-center rounded-sm hover:bg-white/5 group"
        >
          <ArrowLeft size={20} className="text-text-primary group-hover:text-accent transition-colors" />
        </Button>

        <div className="flex-1 flex items-center gap-2 bg-black/40 border-2 border-accent-dim/30 rounded-sm px-3 shadow-inner group focus-within:border-accent transition-all">
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
            className="flex-1 bg-transparent border-none text-text-primary outline-none text-[15px] font-serif placeholder:text-text-tertiary placeholder:italic py-2"
          />
          {query && (
            <Button
              unstyled
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="text-text-tertiary hover:text-text-primary"
            >
              <X size={16} />
            </Button>
          )}
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
              inputRef.current?.focus();
            }}
            onClearRecentSearches={clearRecentSearches}
            onViewAllResults={() => {
              handleSearch();
              closeMobileSearch();
            }}
            onAddWithStatus={handleAddWithStatus}
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
      <div ref={containerRef} className="hidden md:block flex-1 max-w-md mx-auto relative">
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
          {query && (
            <Button
              unstyled
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="text-text-secondary hover:text-text-primary"
            >
              <X size={16} />
            </Button>
          )}
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
          onAddWithStatus={handleAddWithStatus}
          onOpenInNewTab={handleOpenInNewTab}
        />
      )}
      </div>
    </>
  );
}
