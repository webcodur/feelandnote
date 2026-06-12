"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { searchContents } from "@/actions/search";
import { addContent } from "@/actions/contents/addContent";
import { getUserContents, type UserContentPublic } from "@/actions/contents/getUserContents";
import { updateUserContentRating } from "@/actions/contents/updateRating";
import { updateReview } from "@/actions/contents/updateReview";
import { useDebounce } from "@/hooks/useDebounce";
import { useHorizontalScroll } from "@/hooks/useHorizontalScroll";
import type { SearchResult } from "@/components/shared/search/SearchResultsDropdown";
import { getCategoryById, type CategoryId } from "@/constants/categories";
import type { ContentType } from "@/types/database";
import { useQuickRecord } from "@/contexts/QuickRecordContext";
import type { UserProfile } from "@/actions/user/getProfile";
import { removeContent } from "@/actions/contents/removeContent";
import type { BlogSearchResult } from "@feelandnote/content-search/naver-blog";
import type { ScriptureContent } from "@/actions/scriptures";
import { useTranslations } from "next-intl";

// 서브 컴포넌트 임포트
import { HomeRecordHeader } from "./homeSection/HomeRecordHeader";
import { HomeSearchArea } from "./homeSection/HomeSearchArea";
import { HomeEditorArea, type PickedContentItem } from "./homeSection/HomeEditorArea";
import { HomeSuggestions } from "./homeSection/HomeSuggestions";
import { HomeArchiveArea } from "./homeSection/HomeArchiveArea";

// 카테고리 매핑 헬퍼
const categoryToContentType = (category: string): ContentType => {
  const config = getCategoryById(category as CategoryId);
  return config?.dbType || "BOOK";
};

interface HomeRecordSectionProps {
  userId?: string;
  unreviewedList: UserContentPublic[];
  reviewedList: UserContentPublic[];
  profile?: UserProfile | null;
  initialSuggestions?: ScriptureContent[];
}

interface BlogSearchResultData {
  query: string;
  items: BlogSearchResult[];
}

export default function HomeRecordSection({
  userId,
  unreviewedList,
  reviewedList,
  profile,
  initialSuggestions = [],
}: HomeRecordSectionProps) {
  const t = useTranslations("quickRecord.home");
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);
  
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, startTransition] = useTransition();
  const [isSwitchingCategory, startCategoryTransition] = useTransition();
  
  const { targetContent, openQuickRecord, closeQuickRecord } = useQuickRecord();

  const [processingId, setProcessingId] = useState<string | null>(null);
  const [localUnreviewedList, setLocalUnreviewedList] = useState(unreviewedList);
  const [localReviewedList, setLocalReviewedList] = useState(reviewedList);

  useEffect(() => {
    setLocalUnreviewedList(unreviewedList);
  }, [unreviewedList]);

  useEffect(() => {
    setLocalReviewedList(reviewedList);
  }, [reviewedList]);

  const [selectedCategory, setSelectedCategory] = useState<CategoryId>("book");
  const [suggestions, setSuggestions] = useState<ScriptureContent[]>(initialSuggestions);
  const currentCategoryConfig = getCategoryById(selectedCategory);

  const [loadedReviewedItems, setLoadedReviewedItems] = useState<UserContentPublic[]>([]);
  // const [page, setPage] = useState(1);
  // const [hasMore, setHasMore] = useState(true);
  // const [isLoadingMore, setIsLoadingMore] = useState(false);

  const { scrollRef, isDragging, events } = useHorizontalScroll();
  const { scrollRef: suggestionScrollRef, isDragging: isSuggestionDragging, events: suggestionEvents } = useHorizontalScroll();
  const editorRef = useRef<HTMLDivElement>(null);

  // 통합된 로딩 로직 (초기 진입 & 카테고리 변경)
  useEffect(() => {
    const categoryConfig = getCategoryById(selectedCategory);
    if (!categoryConfig) return;

    const targetContentType = categoryConfig.dbType;

    startCategoryTransition(async () => {
        const unreviewedItem = localUnreviewedList.find(item => item.content.type === targetContentType);

        if (unreviewedItem) {
            openQuickRecord({
                id: unreviewedItem.id,
                contentId: unreviewedItem.content.id,
                type: unreviewedItem.content.type,
                title: unreviewedItem.content.title,
                thumbnailUrl: unreviewedItem.content.thumbnail_url,
                creator: unreviewedItem.content.creator,
                initialRating: unreviewedItem.public_record?.rating || 0,
                initialReview: unreviewedItem.public_record?.content_preview || "",
                initialPresets: unreviewedItem.public_record?.review_presets || [],
            });
        } 
        
        try {
            const { getQuickRecordSuggestions } = await import("@/actions/scriptures");
            const newSuggestions = await getQuickRecordSuggestions(categoryConfig.dbType); 
            setSuggestions(newSuggestions);
            
            if (!unreviewedItem && newSuggestions.length > 0) {
                 const firstItem = newSuggestions[0];
                 openQuickRecord({
                    id: firstItem.id,
                    contentId: firstItem.id,
                    type: firstItem.type as ContentType,
                    title: firstItem.title,
                    thumbnailUrl: firstItem.thumbnail_url,
                    creator: firstItem.creator,
                    initialPresets: [],
                    isRecommendation: true,
                });
            }
        } catch (error) {
            console.error("추천 목록 로드 실패:", error);
            setSuggestions([]);
        }
    });
  }, [selectedCategory, localUnreviewedList]);

  // 검색 효과
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    startTransition(async () => {
      try {
        const data = await searchContents({ query: debouncedQuery, category: selectedCategory, limit: 5 });
        const mappedResults: SearchResult[] = data.items.map((item) => ({
             id: item.id,
             type: "content",
             title: item.title,
             subtitle: item.creator,
             category: item.category as CategoryId,
             subtype: item.subtype,
             thumbnail: item.thumbnail,
             description: item.description,
             releaseDate: item.releaseDate,
             metadata: item.metadata,
         }));
        setSearchResults(mappedResults);
      } catch (error) {
        console.error("검색 실패:", error);
        setSearchResults([]);
      }
    });
  }, [debouncedQuery]);

  // Guest Logic: Check for pending content
  useEffect(() => {
    if (userId) {
        const pending = localStorage.getItem('guest_content_pending');
        if (pending) {
            try {
                const data = JSON.parse(pending);
                // 약간의 지연 후 실행 (UI 렌더링 후)
                setTimeout(() => {
                    if (confirm(t("pendingReviewConfirm", { title: data.title }))) {
                        (async () => {
                            try {
                                const result = await addContent({
                                    id: data.contentId,
                                    type: data.type,
                                    title: data.title,
                                    creator: data.creator,
                                    thumbnailUrl: data.thumbnailUrl
                                });
                                
                                if (result.success && result.data) {
                                    const userContentId = result.data.userContentId;
                                    if (data.rating > 0) {
                                        await updateUserContentRating({ userContentId, rating: data.rating });
                                    }
                                    if (data.review || (data.presets && data.presets.length > 0)) {
                                        await updateReview({
                                            userContentId,
                                            review: data.review,
                                            reviewPresets: data.presets
                                        });
                                    }
                                    localStorage.removeItem('guest_content_pending');
                                    alert(t("registeredSuccess"));
                                    window.location.reload();
                                }
                            } catch (e) {
                                console.error(e);
                                alert(t("registrationError"));
                            }
                        })();
                    } else {
                        if (confirm(t("deleteDraftConfirm"))) {
                            localStorage.removeItem('guest_content_pending');
                        }
                    }
                }, 500);
            } catch (e) {
                console.error("Invalid guest data", e);
                localStorage.removeItem('guest_content_pending');
            }
        }
    }
  }, [userId]);

  const handleEditorComplete = () => {
    closeQuickRecord();
    setQuery("");
    setSearchResults([]);
  };

  const handleSearchResultClick = (result: SearchResult) => {
      handleItemClick({
          id: result.id,
          type: categoryToContentType(result.category ?? "book"),
          title: result.title,
          creator: result.subtitle,
          thumbnail: result.thumbnail,
          thumbnail_url: result.thumbnail,
      }, false);
      setQuery("");
      setSearchResults([]);
  };

  const handleItemClick = async (item: UserContentPublic | PickedContentItem, isWantItem: boolean) => {
    if (isDragging) return;

    if (isWantItem) {
        // isWantItem=true 호출부는 항상 보관함 항목(UserContentPublic)을 전달한다
        const saved = item as UserContentPublic;
        openQuickRecord({
            id: saved.id,
            contentId: saved.content.id,
            type: saved.content.type,
            title: saved.content.title,
            thumbnailUrl: saved.content.thumbnail_url,
            creator: saved.content.creator,
            initialRating: saved.public_record?.rating || 0,
            initialReview: saved.public_record?.content_preview || "",
            initialPresets: saved.public_record?.review_presets || [],
        });
        if (editorRef.current) {
            editorRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        return;
    }

    // isWantItem=false 호출부는 항상 선택 콘텐츠(PickedContentItem)를 전달한다
    const picked = item as PickedContentItem;

    if (!userId) {
        openQuickRecord({
            id: `guest-${picked.id}`,
            contentId: picked.id,
            type: picked.type,
            title: picked.title,
            thumbnailUrl: picked.thumbnailUrl || picked.thumbnail,
            creator: picked.creator,
            initialPresets: [],
            isRecommendation: false,
            initialRating: 0,
            initialReview: "",
        });
        if (editorRef.current) {
            editorRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        return;
    }

    if (processingId) return;
    setProcessingId(picked.id);

    try {
        // 기존 런타임은 creator/thumbnail에 null도 그대로 전달한다. 동작 보존을 위해 캐스트 유지
        const result = await addContent({
            id: picked.id,
            type: picked.type,
            title: picked.title,
            creator: picked.creator as string | undefined,
            thumbnailUrl: (picked.thumbnailUrl || picked.thumbnail) as string | undefined,
        });

        if (result.success && result.data) {
             openQuickRecord({
                id: result.data.userContentId,
                contentId: picked.id,
                type: picked.type,
                title: picked.title,
                thumbnailUrl: picked.thumbnailUrl || picked.thumbnail,
                creator: picked.creator,
                initialPresets: [],
                isRecommendation: false,
             });
             if (editorRef.current) {
                editorRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
             }
        }
    } catch (e) {
        console.error("추가 실패", e);
    } finally {
        setProcessingId(null);
    }
  };

  const handleDelete = async (userContentId: string) => {
      if (!confirm(t("deleteConfirm"))) return;
      try {
          await removeContent(userContentId);
          setLocalUnreviewedList(prev => prev.filter(item => item.id !== userContentId));
          setLocalReviewedList(prev => prev.filter(item => item.id !== userContentId));
          setLoadedReviewedItems(prev => prev.filter(item => item.id !== userContentId));
      } catch (e) {
          console.error("삭제 실패:", e);
          alert(t("deleteFailed"));
      }
  };

  const allReviewedItems = [...localReviewedList, ...loadedReviewedItems];

  return (
    <div className="w-full flex flex-col">
        {/* 1. Header Area: Profile & Login */}
        <HomeRecordHeader 
            profile={profile} 
            contentCount={localUnreviewedList.length + allReviewedItems.length} 
        />

        <section className="min-h-[500px] flex flex-col gap-8 relative animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* 2. Search Area: Category Tabs & Search Bar */}
            <HomeSearchArea
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
                query={query}
                onQueryChange={setQuery}
                isSearching={false}
                searchResults={searchResults}
                onResultClick={handleSearchResultClick}
            />

        {/* 3. Editor Area: RecordEditor & Search Helper */}
            <HomeEditorArea 
                targetContent={targetContent}
                onEditorComplete={handleEditorComplete}
                editorRef={editorRef}
                suggestionProps={{
                    suggestions,
                    categoryLabel: currentCategoryConfig?.label,
                    isSwitchingCategory,
                    localUnreviewedList,
                    allReviewedItems,
                    onItemClick: handleItemClick,
                    onDelete: handleDelete,
                    scrollRef: suggestionScrollRef,
                    events: suggestionEvents,
                    isDragging: isSuggestionDragging,
                }}
                archiveProps={{
                    userId,
                    unreviewedList: localUnreviewedList,
                    allReviewedItems,
                    onItemClick: handleItemClick,
                    onDelete: handleDelete,
                    scrollRef,
                    events,
                    isDragging,
                }}
            />
        </section>
    </div>
  );
}
