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

export default function SearchHelper({ title, creator, type, onSearchResult }: SearchHelperProps) {
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
      <div className="text-xs text-text-tertiary text-center p-4">
        {t("noPresets")}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="text-xs text-text-secondary mb-3 flex items-center gap-2">
          <span className="text-[13px] text-text-tertiary/60">{t("clickHint")}</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {presets.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => handleInlineSearch(preset.query)}
              disabled={isLoading}
              className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-white/5 border border-white/5 hover:border-accent/30 hover:bg-accent/5 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isEn ? (
                <ExternalLink size={12} className="text-text-tertiary group-hover:text-accent transition-colors" />
              ) : (
                <FileText size={12} className="text-text-tertiary group-hover:text-accent transition-colors" />
              )}
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
