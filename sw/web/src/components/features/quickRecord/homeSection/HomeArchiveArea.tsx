"use client";

import Link from "next/link";
import { Bookmark, Sparkles, Star, BookOpen, ChevronRight } from "lucide-react";
import { ContentCard } from "@/components/ui/cards";
import type { UserContentPublic } from "@/actions/contents/getUserContents";

interface HomeArchiveAreaProps {
    userId?: string;
    unreviewedList: UserContentPublic[];
    allReviewedItems: UserContentPublic[];
    onItemClick: (item: any, isWantItem: boolean) => void;
    onDelete: (id: string) => void;
    scrollRef: React.RefObject<HTMLDivElement | null>;
    events: any;
    isDragging: boolean;
}

export function HomeArchiveArea({
    userId,
    unreviewedList,
    allReviewedItems,
    onItemClick,
    onDelete,
    scrollRef,
    events,
    isDragging
}: HomeArchiveAreaProps) {
    const hasUnreviewed = unreviewedList.length > 0;
    const hasReviewed = allReviewedItems.length > 0;

    return (
        <section className="relative group/section animate-in fade-in delay-200 duration-700 px-2">

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 px-2 pb-4">
                {/* 1. Unreviewed List (작성 대기) */}
                {unreviewedList.map((item) => (
                    <div key={`unreviewed-${item.id}`} className="group relative flex-none w-full mt-2">
                        <ContentCard
                            contentId={item.content.id}
                            contentType={item.content.type}
                            title={item.content.title}
                            creator={item.content.creator}
                            thumbnail={item.content.thumbnail_url}
                            onClick={() => onItemClick(item, true)}
                            className="hover:ring-2 hover:ring-accent/50 transition-all cursor-pointer shadow-lg"
                            heightClass="h-[200px] md:h-[230px]"
                            deletable
                            onDelete={(e) => { e.stopPropagation(); onDelete(item.id); }}
                            recommendable
                            userContentId={item.id}
                        />
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 bg-black/80 backdrop-blur-md border border-white/10 px-2 py-0.5 rounded-full text-[10px] text-accent flex items-center gap-1 shadow-lg whitespace-nowrap">
                            <Sparkles size={8} className="text-accent" />
                            <span>작성 대기</span>
                        </div>
                    </div>
                ))}

                {/* 2. Divider (Visual separation in grid if needed, or just omit) */}
                {/* Grid flow handles separation naturally, but we could add a full-width divider if we used fragment/col-span, but let's keep simple grid for now. */}

                {/* 3. Reviewed List (완료) */}
                {allReviewedItems.map((item) => (
                    <div key={`reviewed-${item.id}`} className="group relative flex-none w-full mt-2">
                        <ContentCard
                            contentId={item.content.id}
                            contentType={item.content.type}
                            title={item.content.title}
                            creator={item.content.creator}
                            thumbnail={item.content.thumbnail_url}
                            onClick={() => onItemClick(item, true)}
                            className="hover:ring-2 hover:ring-accent/50 transition-all cursor-pointer shadow-lg"
                            heightClass="h-[200px] md:h-[230px]"
                            deletable
                            onDelete={(e) => { e.stopPropagation(); onDelete(item.id); }}
                            recommendable
                            userContentId={item.id}
                        />
                        {item.public_record?.rating && (
                            <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded text-[10px] text-accent flex items-center gap-0.5 pointer-events-none">
                                <Star size={8} fill="currentColor" />
                                {item.public_record?.rating}
                            </div>
                        )}
                    </div>
                ))}

                {/* 4. Go to Detail Page Link */}
                {hasReviewed && (
                    <Link
                        href={`/${userId}`}
                        className="flex-none w-full h-[200px] md:h-[230px] mt-2 flex flex-col items-center justify-center gap-3 bg-white/5 rounded-xl border border-white/5 border-dashed hover:bg-white/10 hover:border-accent/30 transition-all group/more text-center px-4"
                    >
                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover/more:bg-accent/20 group-hover/more:text-accent transition-colors">
                            <ChevronRight size={20} />
                        </div>
                        <span className="text-sm text-text-secondary group-hover/more:text-text-primary font-medium leading-tight">
                            상세 기록관<br />페이지로 이동
                        </span>
                    </Link>
                )}

                {/* Empty State */}
                {!hasUnreviewed && !hasReviewed && (
                    <div className="w-full py-16 text-center text-text-tertiary flex flex-col items-center justify-center gap-4 min-w-[300px] border border-dashed border-white/5 rounded-2xl bg-white/[0.02]">
                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-2">
                            <BookOpen size={24} className="opacity-30" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-text-secondary font-medium">아직 보관된 기록이 없습니다</p>
                            <p className="text-xs text-text-tertiary">상단 검색창을 통해 첫 번째 기록을 남겨보세요.</p>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}
