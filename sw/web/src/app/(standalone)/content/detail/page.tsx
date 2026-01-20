/*
  파일명: /app/(standalone)/content/detail/page.tsx
  기능: 콘텐츠 상세 페이지
  책임: 콘텐츠 정보와 기록 관리 UI를 제공한다.
*/ // ------------------------------

"use client";

import { useState, useEffect, Suspense, useTransition } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, FileText, Bookmark, Check, Loader2, Sparkles, Calendar, User } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { getProfile } from "@/actions/user";
import { generateSummary } from "@/actions/ai";
import { addContent } from "@/actions/contents/addContent";
import { getContent } from "@/actions/contents/getContent";
import { checkContentSaved } from "@/actions/contents/getMyContentIds";
import { CATEGORIES } from "@/constants/categories";
import ContentInfoHeader from "@/components/shared/content/ContentInfoHeader";
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

const CATEGORY_ICONS = Object.fromEntries(
  CATEGORIES.map((cat) => [cat.id, cat.icon])
);

const CATEGORY_LABELS = Object.fromEntries(
  CATEGORIES.map((cat) => [cat.id, cat.label])
);
// #endregion

// #region 서브컴포넌트 - ContentDetailContent
function ContentDetailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // #region sessionStorage에서 데이터 로드
  const storageKey = searchParams.get("key") || "";
  const [contentInfo, setContentInfo] = useState<ContentInfo | null>(null);

  useEffect(() => {
    if (!storageKey) return;

    const stored = sessionStorage.getItem(storageKey);
    if (!stored) return;

    try {
      const data = JSON.parse(stored);
      setContentInfo({
        id: data.id,
        type: CATEGORY_TO_TYPE[data.category] || "BOOK",
        category: data.category as CategoryId,
        title: data.title || "제목 없음",
        creator: data.creator || undefined,
        thumbnail: data.thumbnail || undefined,
        description: data.description || undefined,
        releaseDate: data.releaseDate || undefined,
        subtype: data.subtype as VideoSubtype | undefined,
        metadata: data.metadata || null,
      });
    } catch (err) {
      console.error("콘텐츠 데이터 파싱 실패:", err);
    }
  }, [storageKey]);
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
  // #endregion

  // #region 이펙트
  useEffect(() => {
    getProfile().then((profile) => {
      setHasApiKey(!!profile?.gemini_api_key);
    });
  }, []);

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

  // 로딩 중
  if (!contentInfo) {
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
        <Card className="p-4 md:p-6">
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
              <p className="text-sm text-text-primary leading-relaxed">{summary}</p>
            </div>
          )}

          <p className="text-sm md:text-base text-text-secondary leading-relaxed whitespace-pre-line">{contentInfo.description}</p>
        </Card>
      )}
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
