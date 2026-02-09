"use client";

import { useState } from "react";
import { Search, X, FileText, ExternalLink } from "lucide-react";
import SearchHelper from "./SearchHelper";
import LinkPreviewModal from "./LinkPreviewModal";
import type { BlogSearchResult } from "@feelandnote/content-search/naver-blog";

interface ExternalResourceSearchProps {
    title: string;
    creator?: string | null;
    type: string;
    className?: string;
}

interface BlogSearchResultData {
    query: string;
    items: BlogSearchResult[];
}

export default function ExternalResourceSearch({
    title,
    creator,
    type,
    className = ""
}: ExternalResourceSearchProps) {
    const [blogSearchResult, setBlogSearchResult] = useState<BlogSearchResultData | null>(null);
    const [previewUrl, setPreviewUrl] = useState<{ url: string; title?: string } | null>(null);

    return (
        <div className={`bg-bg-card/50 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden shadow-xl flex flex-col ${className}`}>
            <div className="px-4 py-2 border-b border-white/5 bg-white/2 flex items-center justify-between shadow-sm shrink-0 min-h-[52px]">
                <div className="flex-1" /> {/* Left spacer */}
                <div className="flex-none flex items-center justify-center gap-2 text-white whitespace-nowrap px-4">
                    <Search size={16} className="text-accent" />
                    <span className="text-sm font-bold uppercase tracking-wider">해당 작품의 외부 자료 탐색하기</span>
                </div>
                <div className="flex-1 flex justify-end">
                    {blogSearchResult && (
                        <button
                            onClick={() => setBlogSearchResult(null)}
                            className="p-1.5 rounded-lg hover:bg-white/10 text-text-tertiary hover:text-text-primary transition-colors"
                            title="결과 초기화"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
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
                                    검색 결과: <span className="text-accent">"{blogSearchResult.query}"</span>
                                </h3>
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                                {blogSearchResult.items.length > 0 ? (
                                    blogSearchResult.items.map((item, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setPreviewUrl({ url: item.link, title: item.title })}
                                            className="flex flex-col gap-1.5 p-3.5 bg-white/5 hover:bg-white/10 rounded-xl group border border-white/5 hover:border-accent/20 text-left w-full"
                                        >
                                            <div className="flex items-center justify-between gap-2 w-full">
                                                <h4 className="text-sm font-bold text-text-primary line-clamp-1 group-hover:text-accent transition-colors">
                                                    {item.title}
                                                </h4>
                                            </div>
                                            <p className="text-xs text-text-tertiary line-clamp-2 w-full leading-relaxed">
                                                {item.description}
                                            </p>
                                            <div className="flex items-center gap-2 text-[10px] text-text-tertiary/60 mt-1">
                                                <span className="font-medium text-text-tertiary/80">{item.bloggerName}</span>
                                                <span>•</span>
                                                <span>{item.postDate}</span>
                                            </div>
                                        </button>
                                    ))
                                ) : (
                                    <div className="text-center text-text-tertiary py-12 bg-white/5 rounded-xl border border-white/5 border-dashed">
                                        <p className="text-sm">검색 결과가 없습니다.</p>
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
}
