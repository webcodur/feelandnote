/*
  파일명: /app/(standalone)/content/detail/page.tsx
  기능: 콘텐츠 상세 페이지
  책임: 콘텐츠 정보와 기록 관리 UI를 제공한다.
*/ // ------------------------------

"use client";

import { useState, useEffect, Suspense, useTransition } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, FileText, Bookmark, Check, Loader2, Sparkles, Calendar, User, MessageSquare, Star, EyeOff } from "lucide-react";
import { Button, Card, Avatar, FormattedText } from "@/components/ui";
import { getProfile } from "@/actions/user";
import { generateSummary } from "@/actions/ai";
import { addContent } from "@/actions/contents/addContent";
import { getContent } from "@/actions/contents/getContent";
import { getContentById } from "@/actions/contents/getContentById";
import { getReviewFeed, type ReviewFeedItem } from "@/actions/contents/getReviewFeed";
import { checkContentSaved } from "@/actions/contents/getMyContentIds";
import { CATEGORIES } from "@/constants/categories";
import ContentMetadataDisplay from "@/components/shared/content/ContentMetadataDisplay";
import RecordInfo from "@/components/features/user/detail/RecordInfo";
import { Z_INDEX } from "@/constants/zIndex";
import type { ContentType, ContentStatus } from "@/types/database";
import type { ContentInfo } from "@/types/content";
import type { UserContentWithContent } from "@/actions/contents/getMyContents";
import type { CategoryId, VideoSubtype } from "@/constants/categories";

// #region 상수
const CATEGORY_TO_TYPE: Record<string, ContentType> = Object.fromEntries(
  CATEGORIES.map((cat) => [cat.id, cat.dbType as ContentType])
);

const TYPE_TO_CATEGORY: Record<ContentType, CategoryId> = Object.fromEntries(
  CATEGORIES.map((cat) => [cat.dbType, cat.id])
) as Record<ContentType, CategoryId>;

const CATEGORY_ICONS = Object.fromEntries(
  CATEGORIES.map((cat) => [cat.id, cat.icon])
);

const CATEGORY_LABELS = Object.fromEntries(
  CATEGORIES.map((cat) => [cat.id, cat.label])
);

// API 출처 정보
const API_SOURCE_INFO: Record<CategoryId, { name: string; url: string }> = {
  book: { name: "네이버 책 API", url: "https://developers.naver.com/docs/serviceapi/search/book/book.md" },
  video: { name: "TMDB API", url: "https://www.themoviedb.org" },
  game: { name: "IGDB API", url: "https://www.igdb.com" },
  music: { name: "Spotify API", url: "https://developer.spotify.com" },
  certificate: { name: "Q-Net API", url: "https://www.q-net.or.kr" },
};
// #endregion

// #region 서브컴포넌트 - ContentDetailContent
function ContentDetailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // #region 데이터 로드 (외부 검색 API 직접 조회)
  const contentId = searchParams.get("id") || "";
  const categoryParam = searchParams.get("category") as CategoryId | null;
  const [contentInfo, setContentInfo] = useState<ContentInfo | null>(null);
  const [isLoadingContent, setIsLoadingContent] = useState(true);

  useEffect(() => {
    if (!contentId) {
      setIsLoadingContent(false);
      return;
    }

    const loadContent = async () => {
      setIsLoadingContent(true);

      try {
        // 외부 API로 콘텐츠 정보 조회 (ID가 곧 외부 API ID)
        const category = categoryParam || "book";
        const apiContent = await getContentById(contentId, category);
        if (apiContent) {
          setContentInfo({
            id: apiContent.id,
            type: CATEGORY_TO_TYPE[apiContent.category] || "BOOK",
            category: apiContent.category,
            title: apiContent.title,
            creator: apiContent.creator || undefined,
            thumbnail: apiContent.thumbnail || undefined,
            description: apiContent.description || undefined,
            releaseDate: apiContent.releaseDate || undefined,
            subtype: apiContent.subtype as VideoSubtype | undefined,
            metadata: apiContent.metadata || null,
          });
        }
      } catch (err) {
        console.error("콘텐츠 조회 실패:", err);
      } finally {
        setIsLoadingContent(false);
      }
    };

    loadContent();
  }, [contentId, categoryParam]);
  // #endregion

  // #region 상태
  const [isAdding, startTransition] = useTransition();
  const [isCheckingRecord, setIsCheckingRecord] = useState(true);
  const [isAdded, setIsAdded] = useState(false);
  const [savedItem, setSavedItem] = useState<UserContentWithContent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);

  // 리뷰 피드 상태
  const [reviews, setReviews] = useState<ReviewFeedItem[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(true);
  const [showSpoilers, setShowSpoilers] = useState<Set<string>>(new Set());
  // #endregion

  // #region 이펙트
  useEffect(() => {
    getProfile().then((profile) => {
      setHasApiKey(!!profile?.gemini_api_key);
    });
  }, []);

  // 리뷰 피드 로드
  useEffect(() => {
    if (!contentInfo?.id) return;

    setIsLoadingReviews(true);
    getReviewFeed({ contentId: contentInfo.id, limit: 10 })
      .then(setReviews)
      .finally(() => setIsLoadingReviews(false));
  }, [contentInfo?.id]);

  // 저장 여부 확인 및 전체 정보 로드
  useEffect(() => {
    if (!contentInfo?.id) return;

    setIsCheckingRecord(true);
    checkContentSaved(contentInfo.id)
      .then(async (result) => {
        if (result.saved) {
          setIsAdded(true);
          // 저장된 콘텐츠의 전체 정보 가져오기
          try {
            const data = await getContent(contentInfo.id);
            setSavedItem(data as unknown as UserContentWithContent);
          } catch (err) {
            console.error(err);
          }
        }
      })
      .finally(() => {
        setIsCheckingRecord(false);
      });
  }, [contentInfo?.id]);
  // #endregion

  // #region 핸들러
  const handleSummarize = async () => {
    if (!contentInfo?.description) return;
    setIsSummarizing(true);
    try {
      const result = await generateSummary({ contentTitle: contentInfo.title, description: contentInfo.description });
      setSummary(result.text);
    } catch (err) {
      console.error("AI 요약 실패:", err);
      alert(err instanceof Error ? err.message : "AI 요약에 실패했습니다.");
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleAddWithStatus = (status: ContentStatus) => {
    if (!contentInfo?.id) {
      setError("콘텐츠 ID가 없습니다.");
      return;
    }

    startTransition(async () => {
      try {
        await addContent({
          id: contentInfo.id,
          type: contentInfo.type,
          title: contentInfo.title,
          creator: contentInfo.creator,
          thumbnailUrl: contentInfo.thumbnail,
          description: contentInfo.description,
          releaseDate: contentInfo.releaseDate,
          status,
        });
        setIsAdded(true);
        setError(null);
        // 추가 후 전체 정보 다시 가져오기
        const data = await getContent(contentInfo.id);
        setSavedItem(data as unknown as UserContentWithContent);
      } catch (err) {
        console.error("기록관 추가 실패:", err);
        setError(err instanceof Error ? err.message : "기록관 추가에 실패했습니다.");
      }
    });
  };
  // #endregion

  // 스포일러 토글 핸들러
  const toggleSpoiler = (reviewId: string) => {
    setShowSpoilers((prev) => {
      const next = new Set(prev);
      if (next.has(reviewId)) next.delete(reviewId);
      else next.add(reviewId);
      return next;
    });
  };

  // 로딩 중
  if (isLoadingContent || !contentInfo) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-accent" />
      </div>
    );
  }

  const Icon = CATEGORY_ICONS[contentInfo.category] || CATEGORIES[0].icon;
  const categoryLabel = CATEGORY_LABELS[contentInfo.category] || contentInfo.category;

  return (
    <>
      <Button
        variant="ghost"
        className="flex items-center gap-2 text-text-secondary text-sm font-semibold mb-6"
        onClick={() => router.back()}
      >
        <ArrowLeft size={16} />
        <span>뒤로 가기</span>
      </Button>

      {/* 상단: 2열 레이아웃 (PC) / 1열 (모바일) */}
      <div className="relative mb-8">
        {/* 배경 블러 */}
        {contentInfo.thumbnail && (
          <div
            className="absolute inset-0 opacity-20 blur-3xl"
            style={{
              zIndex: Z_INDEX.background,
              backgroundImage: `url(${contentInfo.thumbnail})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
        )}

        <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] md:items-stretch gap-4 md:gap-6">
          {/* 좌측: 콘텐츠 정보 */}
          <Card className="p-4 flex gap-4">
            {/* 썸네일 */}
            <div className="relative w-24 h-36 md:w-32 md:h-48 rounded-lg shadow-lg shrink-0 overflow-hidden border border-white/10">
              {contentInfo.thumbnail ? (
                <Image src={contentInfo.thumbnail} alt={contentInfo.title} fill unoptimized className="object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
                  <Icon size={32} className="text-gray-500" />
                </div>
              )}
            </div>

            {/* 정보 */}
            <div className="flex-1 min-w-0">
              {/* 헤더: 카테고리 배지 */}
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-text-primary">콘텐츠 정보</h3>
                <span className="py-0.5 px-2 bg-accent/20 text-accent rounded text-[10px] font-medium flex items-center gap-1">
                  <Icon size={10} /> {categoryLabel}
                </span>
              </div>

              {/* 제목 */}
              <h1 className="text-lg md:text-xl font-bold mb-1 leading-tight truncate">{contentInfo.title}</h1>

              {/* 작성자 */}
              {contentInfo.creator && (
                <p className="text-sm text-text-secondary mb-3 flex items-center gap-1.5 truncate">
                  <User size={12} /> {contentInfo.creator}
                </p>
              )}

              {/* 출시일 */}
              {contentInfo.releaseDate && (
                <div className="text-xs text-text-tertiary mb-3 flex items-center gap-1.5">
                  <Calendar size={12} /> {contentInfo.releaseDate}
                </div>
              )}

              {/* 메타데이터 */}
              {contentInfo.metadata && (
                <div className="p-2.5 bg-black/20 rounded-lg border border-white/5">
                  <ContentMetadataDisplay
                    category={contentInfo.category}
                    metadata={contentInfo.metadata}
                    subtype={contentInfo.subtype}
                    compact
                  />
                </div>
              )}
            </div>
          </Card>

          {/* 우측: 내 기록 영역 */}
          <div>
            {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

            {/* 로딩 중 */}
            {isCheckingRecord && (
              <Card className="p-4 h-full flex flex-col animate-pulse">
                {/* 헤더 스켈레톤 */}
                <div className="flex items-center justify-between mb-3 shrink-0">
                  <div className="h-4 w-14 bg-white/10 rounded" />
                  <div className="h-6 w-24 bg-white/10 rounded" />
                </div>
                {/* Row 1, 2, 3 스켈레톤 */}
                <div className="flex flex-col gap-1.5 text-xs">
                  <div className="h-5 flex items-center justify-between">
                    <div className="h-3 w-24 bg-white/10 rounded" />
                    <div className="h-3 w-24 bg-white/10 rounded" />
                  </div>
                  <div className="h-5 flex items-center justify-between">
                    <div className="h-3 w-20 bg-white/10 rounded" />
                    <div className="h-5 w-12 bg-white/10 rounded-full" />
                  </div>
                  <div className="h-5 flex items-center justify-between">
                    <div className="h-3 w-20 bg-white/10 rounded" />
                    <div className="h-3 w-16 bg-white/10 rounded" />
                  </div>
                </div>
                {/* 리뷰 영역 스켈레톤 */}
                <div className="mt-2 bg-black/20 rounded-lg p-2.5 border border-white/5 flex-1">
                  <div className="h-3 w-full bg-white/10 rounded mb-1.5" />
                  <div className="h-3 w-2/3 bg-white/10 rounded" />
                </div>
              </Card>
            )}

            {/* 추가되지 않은 상태 */}
            {!isCheckingRecord && !isAdded && (
              <Card className="p-4 md:p-6 flex flex-col items-center justify-center min-h-[120px]">
                <p className="text-text-secondary text-sm mb-4 text-center">아직 기록관에 추가되지 않았습니다</p>
                <div className="flex gap-2 w-full">
                  <Button
                    variant="secondary"
                    size="lg"
                    onClick={() => handleAddWithStatus("WANT")}
                    disabled={isAdding}
                    className="flex-1"
                  >
                    {isAdding ? <Loader2 size={18} className="animate-spin" /> : <Bookmark size={18} className="text-yellow-500" />}
                    관심 등록
                  </Button>
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={() => handleAddWithStatus("FINISHED")}
                    disabled={isAdding}
                    className="flex-1"
                  >
                    {isAdding ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                    감상 등록
                  </Button>
                </div>
              </Card>
            )}

            {/* 추가된 상태: 기록 정보 표시 */}
            {!isCheckingRecord && isAdded && savedItem && (
              <RecordInfo item={savedItem} href={`/${savedItem.user_id}/records/${contentInfo.id}`} />
            )}
          </div>
        </div>
      </div>

      {/* 하단: 소개 */}
      {contentInfo.description && (
        <Card className="p-4 md:p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base md:text-lg font-bold flex items-center gap-2">
              <FileText size={18} className="md:w-5 md:h-5" /> 소개
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSummarize}
              disabled={!hasApiKey || isSummarizing}
              title={hasApiKey ? "AI로 줄거리 요약" : "마이페이지 > 설정에서 API 키를 등록하세요"}
              className="text-xs gap-1.5"
            >
              {isSummarizing && <Loader2 size={14} className="animate-spin" />}
              {!isSummarizing && <Sparkles size={14} />}
              AI 요약
            </Button>
          </div>

          {summary && (
            <div className="p-3 mb-4 bg-accent/10 border border-accent/20 rounded-lg">
              <div className="flex items-center gap-1.5 text-xs text-accent mb-2">
                <Sparkles size={12} /> AI 요약
              </div>
              <p className="text-sm text-text-primary leading-relaxed"><FormattedText text={summary} /></p>
            </div>
          )}

          <p className="text-sm md:text-base text-text-secondary leading-relaxed whitespace-pre-line"><FormattedText text={contentInfo.description} /></p>
        </Card>
      )}

      {/* 다른 사람들의 리뷰 */}
      <Card className="p-4 md:p-6">
        <h2 className="text-base md:text-lg font-bold flex items-center gap-2 mb-4">
          <MessageSquare size={18} className="md:w-5 md:h-5" /> 다른 기록자들의 리뷰
        </h2>

        {isLoadingReviews && (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={24} className="animate-spin text-accent" />
          </div>
        )}

        {!isLoadingReviews && reviews.length === 0 && (
          <div className="py-8 text-center text-text-secondary text-sm">
            아직 작성된 리뷰가 없습니다
          </div>
        )}

        {!isLoadingReviews && reviews.length > 0 && (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review.id} className="p-4 bg-black/20 rounded-lg border border-white/5">
                {/* 사용자 정보 */}
                <div className="flex items-center gap-3 mb-3">
                  <Link href={`/${review.user.id}`} className="shrink-0">
                    <Avatar url={review.user.avatar_url} name={review.user.nickname} size="sm" />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link href={`/${review.user.id}`} className="text-sm font-semibold text-text-primary hover:text-accent">
                      {review.user.nickname}
                    </Link>
                    <div className="flex items-center gap-2 text-xs text-text-tertiary">
                      {review.rating && (
                        <span className="flex items-center gap-0.5">
                          <Star size={10} className="text-yellow-400 fill-yellow-400" />
                          {review.rating}
                        </span>
                      )}
                      <span>{new Date(review.updated_at).toLocaleDateString("ko-KR")}</span>
                    </div>
                  </div>
                </div>

                {/* 리뷰 내용 */}
                {review.is_spoiler && !showSpoilers.has(review.id) ? (
                  <button
                    onClick={() => toggleSpoiler(review.id)}
                    className="w-full py-4 flex items-center justify-center gap-2 bg-accent/5 border border-dashed border-accent/20 rounded text-accent/60 hover:text-accent text-xs font-medium"
                  >
                    <EyeOff size={14} />
                    스포일러 포함 · 탭하여 보기
                  </button>
                ) : (
                  <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-line line-clamp-4">
                    <FormattedText text={review.review} />
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* API 출처 안내 */}
      <div className="mt-6 text-center text-xs text-text-tertiary">
        <p>
          콘텐츠 정보 제공:{" "}
          <a
            href={API_SOURCE_INFO[contentInfo.category].url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent/60 hover:text-accent underline underline-offset-2"
          >
            {API_SOURCE_INFO[contentInfo.category].name}
          </a>
        </p>
      </div>
    </>
  );
}
// #endregion

// #region 메인 컴포넌트
export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-accent" />
        </div>
      }
    >
      <ContentDetailContent />
    </Suspense>
  );
}
// #endregion
