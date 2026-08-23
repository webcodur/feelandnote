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
import type { LibraryContent } from "@/actions/library";
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
  initialSuggestions?: LibraryContent[];
  /** 여닫이 상자 안에서 열릴 때 true — 상자 머리가 이미 하는 말을 되풀이하지 않는다 */
  embedded?: boolean;
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
  embedded = false,
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

  // 카테고리 전환 효과가 최신 목록을 읽되, 목록이 바뀌었다고 다시 돌지는 않게 하는 통로.
  // 렌더마다 현재 값을 담아 둔다(ref 갱신은 렌더를 부르지 않는다)
  const unreviewedListRef = useRef(localUnreviewedList);
  unreviewedListRef.current = localUnreviewedList;

  // 카테고리 전환 효과가 "지금 검색 중인가"를 읽는 통로. 검색어 자체는 의존성에 넣지 않는다
  const queryRef = useRef(query);
  queryRef.current = query;

  // 서버가 새 목록을 내려주면 지역 상태를 갈아끼운다. 렌더 중에 처리해 연쇄 렌더를 만들지 않는다
  const [syncedUnreviewed, setSyncedUnreviewed] = useState(unreviewedList);
  if (syncedUnreviewed !== unreviewedList) {
    setSyncedUnreviewed(unreviewedList);
    setLocalUnreviewedList(unreviewedList);
  }

  const [syncedReviewed, setSyncedReviewed] = useState(reviewedList);
  if (syncedReviewed !== reviewedList) {
    setSyncedReviewed(reviewedList);
    setLocalReviewedList(reviewedList);
  }

  const [selectedCategory, setSelectedCategory] = useState<CategoryId>("book");
  const [suggestions, setSuggestions] = useState<LibraryContent[]>(initialSuggestions);
  const currentCategoryConfig = getCategoryById(selectedCategory);

  const [loadedReviewedItems, setLoadedReviewedItems] = useState<UserContentPublic[]>([]);
  // const [page, setPage] = useState(1);
  // const [hasMore, setHasMore] = useState(true);
  // const [isLoadingMore, setIsLoadingMore] = useState(false);

  const { scrollRef, isDragging, events } = useHorizontalScroll();
  const { scrollRef: suggestionScrollRef, isDragging: isSuggestionDragging, events: suggestionEvents } = useHorizontalScroll();
  const editorRef = useRef<HTMLDivElement>(null);

  // 통합된 로딩 로직 (초기 진입 & 카테고리 변경)
  //
  // 의존성에 목록을 넣지 않는다. 리뷰를 저장하면 미기록 목록이 바뀌는데, 그때 이 효과가 다시
  // 돌면 사용자가 보고 있던 자리를 빼앗아 다른 콘텐츠를 열어 버린다("저장하니 딴 게 뜬다").
  // 자동 지정은 카테고리를 고른 순간에만 한다.
  useEffect(() => {
    const categoryConfig = getCategoryById(selectedCategory);
    if (!categoryConfig) return;

    const targetContentType = categoryConfig.dbType;
    // 검색 중이면 사람이 찾던 것을 고르려는 참이다. 자동으로 다른 것을 열어 자리를 빼앗지 않는다
    const isSearchingNow = queryRef.current.trim().length >= 2;

    startCategoryTransition(async () => {
        const unreviewedItem = isSearchingNow
            ? undefined
            : unreviewedListRef.current.find(item => item.content.type === targetContentType);

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
            const { getQuickRecordSuggestions } = await import("@/actions/library");
            const newSuggestions = await getQuickRecordSuggestions(categoryConfig.dbType); 
            setSuggestions(newSuggestions);
            
            if (!isSearchingNow && !unreviewedItem && newSuggestions.length > 0) {
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
  }, [selectedCategory]);

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
    // 분야를 바꾸면 같은 검색어로 다시 찾는다 — 영화를 찾다 음악으로 옮기면 음악에서 찾아야 한다
  }, [debouncedQuery, selectedCategory]);

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

  const handleEditorComplete = (saved?: { rating: number; review: string; presets: string[] }) => {
    setQuery("");
    setSearchResults([]);

    // 저장했다고 자리를 비우지 않는다. 방금 남긴 값을 그대로 실어 편집기를 유지한다 —
    // 닫으면 카테고리 효과가 다른 콘텐츠를 채워 "저장하니 딴 게 뜬다"가 된다
    if (saved && targetContent) {
      openQuickRecord({
        ...targetContent,
        initialRating: saved.rating,
        initialReview: saved.review,
        initialPresets: saved.presets,
      });
      return;
    }

    closeQuickRecord();
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
                // 검색 결과의 id는 외부 API 것(TMDB 등)이라 상세 조회에 쓰면 못 찾는다.
                // addContent가 돌려준 저장소 콘텐츠 id를 쓴다
                contentId: result.data.contentId,
                type: picked.type,
                title: picked.title,
                thumbnailUrl: picked.thumbnailUrl || picked.thumbnail,
                creator: picked.creator,
                // 이미 남긴 감상이 있으면 그대로 불러온다 — 빈 칸으로 열면 덮어쓴 것처럼 보인다
                initialRating: result.data.existingRecord?.rating ?? 0,
                initialReview: result.data.existingRecord?.review ?? "",
                initialPresets: result.data.existingRecord?.reviewPresets ?? [],
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
        {/* 1. Header Area: Profile & Login
            여닫이 안에서는 접는다 — 상자 머리가 이미 "빠른기록"과 미기록 수를 말하고 있어
            같은 라벨·설명·프로필이 한 화면에 두 번 서게 된다 */}
        {!embedded && (
            <HomeRecordHeader
                profile={profile}
                contentCount={localUnreviewedList.length + allReviewedItems.length}
            />
        )}

        {/* 여닫이 안에서는 최소 높이를 두지 않는다. 내용이 적은 날 빈 공간만 길게 남는다 */}
        <section className={`flex flex-col relative animate-in fade-in duration-500 ${embedded ? "gap-6" : "min-h-[500px] gap-8 slide-in-from-bottom-4"}`}>
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
