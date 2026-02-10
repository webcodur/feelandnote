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
        <section className="relative animate-in fade-in zoom-in-95 duration-500 px-2">
            {isSwitchingCategory && (
                <div className="absolute inset-0 z-10 bg-black/50 flex items-center justify-center rounded-lg">
                    <Loader2 className="animate-spin text-accent" size={32} />
                </div>
            )}

            {suggestions.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 px-2 pb-4">
                    {suggestions.map((item) => (
                        <div key={item.id} className="relative flex-none w-full mt-2">
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
