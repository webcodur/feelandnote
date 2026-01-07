/*
  파일명: /components/layout/HeaderSearch.tsx
  기능: 헤더 검색 컴포넌트
  책임: 콘텐츠/사용자 검색 입력과 결과 드롭다운 UI를 제공한다.
*/ // ------------------------------

"use client";

import { Search, X } from "lucide-react";
import SearchModeDropdown, { SEARCH_MODES, CONTENT_CATEGORIES } from "@/components/features/search/SearchModeDropdown";
import SearchResultsDropdown from "@/components/features/search/SearchResultsDropdown";
import Button from "@/components/ui/Button";
import { useHeaderSearch } from "./headerSearch/useHeaderSearch";

export default function HeaderSearch() {
  const {
    containerRef, inputRef,
    isOpen, setIsOpen, isModeOpen, setIsModeOpen,
    mode, contentCategory, query, setQuery,
    results, recentSearches, isLoading, selectedIndex, setSelectedIndex,
    addingIds, addedIds,
    handleSearch, handleResultClick, handleAddToArchive, handleOpenInNewTab,
    handleInputKeyDown, handleModeChange, handleCategoryChange, clearRecentSearches,
  } = useHeaderSearch();

  const currentMode = SEARCH_MODES.find((m) => m.id === mode)!;
  const currentCategory = CONTENT_CATEGORIES.find((c) => c.id === contentCategory)!;
  const displayPlaceholder = mode === "content" ? currentCategory.placeholder : currentMode.placeholder;

  return (
    <div ref={containerRef} className="flex-1 max-w-[600px] mx-auto relative">
      {/* Search Bar */}
      <div
        className={`w-full bg-bg-main border rounded-xl flex items-center
          ${isOpen ? "border-accent shadow-lg shadow-accent/10" : "border-border"}`}
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
        <div className="flex-1 flex items-center gap-2 px-3">
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
            className="flex-1 bg-transparent border-none text-text-primary outline-none text-[15px] placeholder:text-text-secondary py-2.5"
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
        <div className="hidden sm:flex items-center gap-1 px-3 text-xs text-text-secondary">
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
          onAddToArchive={handleAddToArchive}
          onOpenInNewTab={handleOpenInNewTab}
        />
      )}
    </div>
  );
}
