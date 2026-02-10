

"use client";

import { useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui";
import DecorativeLabel from "@/components/ui/DecorativeLabel";
import { ContentCard, type ContentCardProps } from "@/components/ui/cards";
import { CELEB_PROFESSIONS } from "@/constants/celebProfessions";
import { Calendar, ArrowRight, BookOpen } from "lucide-react";
import { CATEGORIES, getCategoryById, type CategoryId } from "@/constants/categories";
import { HomeSearchArea } from "@/components/features/quickRecord/homeSection/HomeSearchArea";
import { getUserContents, type UserContentPublic } from "@/actions/contents/getUserContents";
import { useDebounce } from "@/hooks/useDebounce";
import { Copy, Check } from "lucide-react";
import { useEffect, useTransition } from "react";
import { cn } from "@/lib/utils";
import type { ContentType } from "@/types/database";

interface Figure {
    id: string;
    nickname: string;
    avatar_url: string | null;
    profession: string | null;
    bio: string | null;
    contentCount?: number;
}

interface Content {
    id: string;
    type: string;
    title: string;
    creator: string | null;
    thumbnail_url: string | null;
    avg_rating?: number | null;
    review?: string | null;
    is_spoiler?: boolean;
    user_content_id?: string;
}

interface TodayFigureSectionProps {
    figure: Figure;
    contents: Content[];
}

const categoryToContentType = (category: string): ContentType | undefined => {
  if (category === 'all') return undefined;
  const config = getCategoryById(category as any);
  return (config?.dbType as ContentType);
};

export default function TodayFigureSection({ figure, contents: initialContents }: TodayFigureSectionProps) {
    const [contents, setContents] = useState(initialContents);
    const [selectedCategory, setSelectedCategory] = useState<CategoryId>("all");
    
    const [query, setQuery] = useState("");
    const debouncedQuery = useDebounce(query, 300);
    const [isSearching, startTransition] = useTransition();

    if (!figure) return null;

    const professionLabel = CELEB_PROFESSIONS.find(p => p.value === figure.profession)?.label || figure.profession;

    // Search & Filter Logic
    useEffect(() => {
        const fetchContents = async () => {
             const type = categoryToContentType(selectedCategory);
             
             try {
                const result = await getUserContents({
                    userId: figure.id,
                    type,
                    search: debouncedQuery,
                    limit: 100, // Enough to show plenty of results
                    sortBy: 'recent'
                });

                const mappedContents: Content[] = result.items.map(item => ({
                    id: item.content.id,
                    type: item.content.type,
                    title: item.content.title,
                    creator: item.content.creator,
                    thumbnail_url: item.content.thumbnail_url,
                    avg_rating: item.public_record?.rating,
                    review: item.public_record?.content_preview,
                    is_spoiler: item.public_record?.is_spoiler,
                    user_content_id: item.id
                }));
                
                setContents(mappedContents);
             } catch (error) {
                 console.error("Failed to fetch figure contents:", error);
                 // Keep previous contents or empty? maybe empty on error
                 setContents([]);
             }
        };

        startTransition(async () => {
            await fetchContents();
        });

    }, [selectedCategory, debouncedQuery, figure.id]);

    // 오늘 날짜 포맷
    const today = new Date();
    const dateStr = `${today.getMonth() + 1}월 ${today.getDate()}일`;

    return (
        <div className="w-full">
            {/* 섹션 헤더 */}
            <div className="text-center mb-6 md:mb-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-medium mb-2">
                    <Calendar size={12} />
                    <span>{dateStr} 오늘의 인물</span>
                </div>
                <p className="text-sm text-text-tertiary mb-4">
                    매일 새로운 인물과 그가 즐긴 콘텐츠를 소개합니다
                </p>

                {/* 인물 프로필 */}
                <Link
                    href={`/${figure.id}`}
                    className="group relative inline-flex flex-col items-center gap-5 mb-0 py-6 px-10 rounded-2xl transition-all duration-500 hover:bg-gradient-to-b hover:from-white/5 hover:to-transparent"
                >
                    <div className="relative">
                        <Avatar
                            url={figure.avatar_url}
                            name={figure.nickname}
                            size="2xl"
                            className="ring-2 ring-white/10 group-hover:ring-accent/50 group-hover:shadow-[0_0_30px_rgba(212,175,55,0.2)] transition-all duration-500"
                        />
                        {/* 콘텐츠 개수 뱃지 */}
                        <div className="absolute -top-1 -right-1 z-20 min-w-[24px] h-[24px] px-1.5 flex items-center justify-center bg-accent text-black text-[10px] font-bold rounded-full border-2 border-[#121212] shadow-lg">
                            {contents.length}
                        </div>
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-black/80 border border-white/10 rounded-full">
                            <span className="text-[10px] font-bold text-accent tracking-wider uppercase">Today</span>
                        </div>
                    </div>

                    <div className="text-center space-y-2">
                        <h2 className="text-3xl md:text-4xl font-serif font-bold text-text-primary group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-accent group-hover:via-amber-200 group-hover:to-accent transition-all duration-500">
                            {figure.nickname}
                        </h2>
                        <div className="flex items-center justify-center gap-3">
                            <span className="text-sm text-text-secondary font-medium px-2 py-0.5 rounded bg-white/5 border border-white/5">
                                {professionLabel}
                            </span>
                        </div>
                    </div>
                </Link>
                
                {/* 간단한 소개글 */}
                {figure.bio && (
                    <p className="text-center text-sm text-text-secondary max-w-xl mx-auto mb-4 line-clamp-2 mt-2 px-4 break-keep">
                        &ldquo;{figure.bio}&rdquo;
                    </p>
                )}
            </div>

            {/* 카테고리 탭 & 검색바 */}
            <div className="mb-10 md:mb-16">
                <HomeSearchArea
                    selectedCategory={selectedCategory}
                    onCategoryChange={setSelectedCategory}
                    query={query}
                    onQueryChange={setQuery}
                    isSearching={false}
                    searchResults={[]} // No dropdown
                    onResultClick={() => {}}
                    placeholder={`인물의 서재 검색...`}
                    showDropdown={false}
                    searchLabel="서재 탐색"
                    options={[
                        { value: "all", label: "전체" },
                        ...CATEGORIES
                            .filter(c => c.id !== "certificate")
                            .map(c => ({ value: c.id, label: c.label }))
                    ]}
                />
            </div>

            {/* 콘텐츠 리스트 (Grid) */}
            <div className="space-y-4 min-h-[200px]">
                <DecorativeLabel label={`${figure.nickname}의 서재`} className="mb-8" />

                {contents.length > 0 ? (
                    <div className={cn(
                        "grid gap-3 md:gap-4",
                        "grid-cols-1 md:grid-cols-2" // 1 column mobile, 2 columns desktop (Review Card style)
                    )}>
                        {contents.slice(0, 8).map((content) => (
                            <ContentCard // is_spoiler prop passed if available in Content interface
                                key={content.id}
                                contentId={content.id}
                                contentType={content.type as any}
                                title={content.title}
                                creator={content.creator ?? undefined}
                                thumbnail={content.thumbnail_url}
                                rating={content.avg_rating ?? undefined}
                                review={content.review ?? ""}
                                isSpoiler={content.is_spoiler}
                                ownerNickname={figure.nickname}
                                heightClass="h-[280px]"
                                mobileLayout="review"
                                recommendable={true}
                                userContentId={content.user_content_id}
                                className="shadow-lg hover:ring-2 hover:ring-accent/50 transition-all"
                            />
                        ))}
                    </div>
                ) : (
                    <div className="w-full py-16 text-center text-text-tertiary flex flex-col items-center justify-center gap-4 min-w-[300px] border border-dashed border-white/5 rounded-2xl bg-white/[0.02]">
                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-2">
                            <BookOpen size={24} className="opacity-30" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-text-secondary font-medium">
                                {query ? `'${query}' 검색 결과가 없습니다` : `${selectedCategory === 'all' ? '전체' : getCategoryById(selectedCategory)?.label} 기록이 존재하지 않습니다`}
                            </p>
                            {contents.length > 0 && (
                                <p className="text-xs text-text-tertiary">다른 카테고리를 선택해보세요.</p>
                            )}
                        </div>
                    </div>
                )}
                
                {/* 전체 보기 링크 - 콘텐츠가 있을 때만 */}
                {contents.length > 0 && !query && (
                    <div className="flex justify-end mt-4">
                         <Link
                            href={`/${figure.id}`}
                            className="text-xs text-accent hover:underline flex items-center gap-1 opacity-80 hover:opacity-100 transition-opacity"
                        >
                            {figure.nickname}의 서재 전체 보기 <ArrowRight size={12} />
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
