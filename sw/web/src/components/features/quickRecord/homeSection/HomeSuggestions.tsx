"use client";

import { Sparkles, Loader2 } from "lucide-react";
import { ContentCard } from "@/components/ui/cards";
import type { ContentType } from "@/types/database";
import type { ScriptureContent } from "@/actions/scriptures";
import type { UserContentPublic } from "@/actions/contents/getUserContents";

interface HomeSuggestionsProps {
    suggestions: ScriptureContent[];
    categoryLabel?: string;
    isSwitchingCategory: boolean;
    localUnreviewedList: UserContentPublic[];
    allReviewedItems: UserContentPublic[];
    onItemClick: (item: any, isWantItem: boolean) => void;
    onDelete: (id: string) => void;
    scrollRef: React.RefObject<HTMLDivElement | null>;
    events: any;
    isDragging: boolean;
}

export function HomeSuggestions({
    suggestions,
    categoryLabel,
    isSwitchingCategory,
    localUnreviewedList,
    allReviewedItems,
    onItemClick,
    onDelete,
    scrollRef,
    events,
    isDragging
}: HomeSuggestionsProps) {
    return (
        <section className="relative animate-in fade-in zoom-in-95 duration-500 mt-8 md:mt-12">
            <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="text-lg font-serif font-bold text-text-primary flex items-center gap-2">
                    <Sparkles size={18} className="text-accent" />
                    셀럽들의 최고 인기 {categoryLabel} 리뷰하기
                </h3>
                {isSwitchingCategory && <Loader2 className="animate-spin text-text-tertiary" size={18} />}
            </div>

            {suggestions.length > 0 ? (
                <div
                    ref={scrollRef}
                    {...events}
                    className={`flex overflow-x-auto gap-4 pb-4 -mx-4 px-4 scrollbar-hide select-none ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
                    style={{ scrollBehavior: isDragging ? 'auto' : 'smooth' }}
                >
                    {suggestions.map((item) => (
                        <div key={item.id} className="relative flex-none w-[140px] md:w-[160px]">
                            <ContentCard
                                contentId={item.id}
                                contentType={item.type as ContentType}
                                title={item.title}
                                creator={item.creator}
                                thumbnail={item.thumbnail_url}
                                {...(() => {
                                    const inLibraryItem = localUnreviewedList.find(i => i.content.id === item.id) ||
                                        allReviewedItems.find(i => i.content.id === item.id);
                                    return inLibraryItem
                                        ? {
                                            saved: true,
                                            userContentId: inLibraryItem.id,
                                            deletable: true,
                                            onDelete: (e: React.MouseEvent) => { e.stopPropagation(); onDelete(inLibraryItem.id); },
                                            recommendable: true,
                                            addable: false,
                                        }
                                        : {
                                            addable: true,
                                            onAdd: (e: React.MouseEvent) => {
                                                e.stopPropagation();
                                                onItemClick({
                                                    id: item.id,
                                                    type: item.type,
                                                    title: item.title,
                                                    creator: item.creator,
                                                    thumbnailUrl: item.thumbnail_url,
                                                    thumbnail: item.thumbnail_url
                                                }, false);
                                            }
                                        };
                                })()}
                                onClick={() => {
                                    const inLibraryItem = localUnreviewedList.find(i => i.content.id === item.id) ||
                                        allReviewedItems.find(i => i.content.id === item.id);
                                    if (inLibraryItem) {
                                        onItemClick(inLibraryItem, true);
                                    } else {
                                        onItemClick({
                                            id: item.id,
                                            type: item.type,
                                            title: item.title,
                                            creator: item.creator,
                                            thumbnailUrl: item.thumbnail_url,
                                            thumbnail: item.thumbnail_url
                                        }, false);
                                    }
                                }}
                                className="hover:ring-2 hover:ring-accent/50 transition-all cursor-pointer shadow-lg"
                                heightClass="h-[200px] md:h-[230px]"
                            />
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 bg-black/80 backdrop-blur-md border border-white/10 px-2 py-0.5 rounded-full text-[10px] text-accent flex items-center gap-1 shadow-lg whitespace-nowrap pointer-events-none">
                                <Sparkles size={8} className="text-accent" />
                                <span>인기</span>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="h-40 flex items-center justify-center text-text-tertiary">
                    이 카테고리의 인기 기록이 없습니다.
                </div>
            )}
        </section>
    );
}
