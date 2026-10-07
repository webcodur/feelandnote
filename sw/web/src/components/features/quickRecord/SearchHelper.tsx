"use client";

import { useState } from "react";
import { getSearchPresets, generateGoogleSearchUrl } from "@/constants/searchPresets";
import { ExternalLink, FileText } from "lucide-react";
import { searchBlogAction } from "@/actions/search/searchInformation";
import type { BlogSearchResult } from "@feelandnote/content-search/naver-blog";
import { useTranslations, useLocale } from "next-intl";

interface SearchHelperProps {
  title: string;
  creator?: string | null;
  type: string;
  onSearchResult: (query: string, items: BlogSearchResult[]) => void;
}

export default function SearchHelper({ title, type, onSearchResult }: SearchHelperProps) {
  const t = useTranslations("quickRecord.search");
  const locale = useLocale();
  const presets = getSearchPresets(type, locale);
  const [isLoading, setIsLoading] = useState(false);
  const isEn = locale === 'en';

  const handleInlineSearch = async (queryFn: (title: string) => string) => {
    const query = queryFn(title);

    if (isEn) {
      // 영문: Google 검색으로 새 탭 열기
      window.open(generateGoogleSearchUrl(query), '_blank', 'noopener,noreferrer');
      return;
    }

    // 한국어: 네이버 블로그 인라인 검색
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
      <div className="text-xs text-center p-4">
        {t("noPresets")}
      </div>
    );
  }

  return (
    <div className="@container min-w-0 flex flex-col gap-4">
      <div>
        <div className="text-xs text-text-secondary mb-3 flex items-center gap-2">
          <span className="text-[13px]">{t("clickHint")}</span>
        </div>

        <div className="grid grid-cols-1 @min-[240px]:grid-cols-2 gap-2">
          {presets.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => handleInlineSearch(preset.query)}
              disabled={isLoading}
              className="min-w-0 min-h-11 flex items-center justify-center gap-2 px-2 py-2 rounded-control bg-bg-raised border border-line hover:border-line-strong hover:bg-bg-stone-light group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isEn ? (
                <ExternalLink size={12} className="shrink-0 text-text-secondary group-hover:text-accent" aria-hidden="true" />
              ) : (
                <FileText size={12} className="shrink-0 text-text-secondary group-hover:text-accent" aria-hidden="true" />
              )}
              <span className="min-w-0 break-words text-xs font-medium text-text-primary group-hover:text-accent">
                {preset.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
