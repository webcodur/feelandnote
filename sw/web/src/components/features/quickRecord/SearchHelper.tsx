"use client";

import { useState } from "react";
import { SEARCH_PRESETS, generateGoogleSearchUrl } from "@/constants/searchPresets";
import { ExternalLink, FileText } from "lucide-react";
import { searchBlogAction } from "@/actions/search/searchInformation";
import type { BlogSearchResult } from "@feelandnote/content-search/naver-blog";

interface SearchHelperProps {
  title: string;
  creator?: string | null;
  type: string;
  onSearchResult: (query: string, items: BlogSearchResult[]) => void;
}

export default function SearchHelper({ title, creator, type, onSearchResult }: SearchHelperProps) {
  const presets = SEARCH_PRESETS[type] || [];
  const [isLoading, setIsLoading] = useState(false);

  const handleInlineSearch = async (queryFn: (title: string) => string) => {
    const query = queryFn(title);
    setIsLoading(true);
    
    try {
      const result = await searchBlogAction(query);
      onSearchResult(query, result.items || []);
    } catch (error) {
      console.error("검색 오류:", error);
      onSearchResult(query, []);
    } finally {
      setIsLoading(false);
    }
  };

  if (presets.length === 0) {
    return (
      <div className="text-xs text-text-tertiary text-center p-4">
        이 컨텐츠 타입에 대한 검색 프리셋이 없습니다.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="text-xs text-text-secondary mb-3 flex items-center gap-2">
          <span className="text-[13px] text-text-tertiary/60">각 항목 클릭 시 화면에 검색결과가 표시됩니다.</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {presets.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => handleInlineSearch(preset.query)}
              disabled={isLoading}
              className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-white/5 border border-white/5 hover:border-accent/30 hover:bg-accent/5 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileText size={12} className="text-text-tertiary group-hover:text-accent transition-colors" />
              <span className="text-xs font-semibold text-text-primary group-hover:text-accent transition-colors">
                {preset.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
