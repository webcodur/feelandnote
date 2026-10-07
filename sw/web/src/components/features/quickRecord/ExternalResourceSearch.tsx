"use client";

import { useState, useImperativeHandle, forwardRef, useEffect } from "react";
import { Search, X, FileText } from "lucide-react";
import SearchHelper from "./SearchHelper";
import LinkPreviewModal from "./LinkPreviewModal";
import type { BlogSearchResult } from "@feelandnote/content-search/naver-blog";
import { useTranslations } from "next-intl";

export interface ExternalResourceSearchHandle {
    clearResults: () => void;
}

interface ExternalResourceSearchProps {
    title: string;
    creator?: string | null;
    type: string;
    className?: string;
    hideHeader?: boolean;
    onResultsChange?: (hasResults: boolean) => void;
}

interface BlogSearchResultData {
    query: string;
    items: BlogSearchResult[];
}

const ExternalResourceSearch = forwardRef<ExternalResourceSearchHandle, ExternalResourceSearchProps>(({
    title,
    creator,
    type,
    className = "",
    hideHeader = false,
    onResultsChange
}, ref) => {
    const t = useTranslations("quickRecord.external");
    const [blogSearchResult, setBlogSearchResult] = useState<BlogSearchResultData | null>(null);
    const [previewUrl, setPreviewUrl] = useState<{ url: string; title?: string } | null>(null);

    useImperativeHandle(ref, () => ({
        clearResults: () => {
            setBlogSearchResult(null);
        }
    }));

    useEffect(() => {
        onResultsChange?.(!!blogSearchResult);
    }, [blogSearchResult, onResultsChange]);

    return (
        <div data-external-resource-search className={`min-w-0 bg-bg-card border border-line rounded-panel overflow-hidden flex flex-col ${className}`}>
            {!hideHeader && (
                <div className="relative px-3 py-3 border-b border-line bg-bg-raised flex items-center justify-center gap-2 shrink-0 min-h-[52px]">
                    <div className={`min-w-0 flex items-center justify-center gap-2 text-text-primary ${blogSearchResult ? "px-9" : ""}`}>
                        <Search size={16} className="shrink-0 text-accent" aria-hidden="true" />
                        <span data-external-search-heading className="min-w-0 break-words text-center text-sm font-semibold leading-relaxed">{t("headerTitle")}</span>
                    </div>
                        {blogSearchResult && (
                            <button
                                type="button"
                                onClick={() => setBlogSearchResult(null)}
                                className="absolute right-1 top-1/2 -translate-y-1/2 size-11 flex items-center justify-center rounded-control text-text-secondary hover:bg-bg-card hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                                title={t("resetResults")}
                                aria-label={t("resetResults")}
                            >
                                <X size={14} />
                            </button>
                        )}
                </div>
            )}

            <div className="min-w-0 flex-1 overflow-y-auto custom-scrollbar p-3.5 md:p-4">
                <div className="flex flex-col gap-6">
                    <SearchHelper
                        title={title}
                        creator={creator}
                        type={type}
                        onSearchResult={(query, items) => setBlogSearchResult({ query, items })}
                    />

                    {blogSearchResult && (
                        <div className="border-t border-white/10 pt-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <div className="flex items-center gap-2 mb-4">
                                <FileText size={16} className="text-accent" />
                                <h3 className="text-sm font-bold text-text-primary">
                                    {t("searchResults")} <span className="text-accent">&quot;{blogSearchResult.query}&quot;</span>
                                </h3>
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                                {blogSearchResult.items.length > 0 ? (
                                    blogSearchResult.items.map((item, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setPreviewUrl({ url: item.link, title: item.title })}
                                            className="flex flex-col gap-1.5 p-3.5 bg-bg-raised hover:bg-bg-stone-light rounded-card group border border-line hover:border-line-strong text-left w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                                        >
                                            <div className="flex items-center justify-between gap-2 w-full">
                                                <h4 className="text-sm font-semibold text-text-primary line-clamp-1 group-hover:text-accent">
                                                    {item.title}
                                                </h4>
                                            </div>
                                            <p className="text-sm text-text-secondary line-clamp-2 w-full leading-relaxed">
                                                {item.description}
                                            </p>
                                            <div className="flex items-center gap-2 text-[11px] mt-1">
                                                <span className="font-medium">{item.bloggerName}</span>
                                                <span>•</span>
                                                <span>{item.postDate}</span>
                                            </div>
                                        </button>
                                    ))
                                ) : (
                                    <div className="text-center py-12 bg-white/5 rounded-xl border border-white/5 border-dashed">
                                        <p className="text-sm">{t("noResults")}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* 링크 미리보기 모달 */}
            {previewUrl && (
                <LinkPreviewModal
                    isOpen={!!previewUrl}
                    onClose={() => setPreviewUrl(null)}
                    url={previewUrl.url}
                    title={previewUrl.title}
                />
            )}
        </div>
    );
});

ExternalResourceSearch.displayName = "ExternalResourceSearch";

export default ExternalResourceSearch;
