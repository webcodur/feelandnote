"use client";

import { useState, useEffect, Suspense, useTransition } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, FileText, ExternalLink, Plus, Loader2, Check, Sparkles } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { getProfile } from "@/actions/user";
import { generateSummary } from "@/actions/ai";
import { addContent } from "@/actions/contents/addContent";
import { CATEGORIES } from "@/constants/categories";
import ContentInfoHeader from "@/components/features/contents/ContentInfoHeader";
import type { ContentType } from "@/types/database";
import type { ContentInfo, ContentMetadata } from "@/types/content";
import type { CategoryId, VideoSubtype } from "@/constants/categories";

// #region 상수
const CATEGORY_TO_TYPE: Record<string, ContentType> = Object.fromEntries(
  CATEGORIES.map((cat) => [cat.id, cat.dbType as ContentType])
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
  const [isAdded, setIsAdded] = useState(false);
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

  const handleAddToArchive = () => {
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
          status: "WISH",
          progress: 0,
        });
        setIsAdded(true);
        setError(null);
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

      {/* 콘텐츠 정보 헤더 */}
      <ContentInfoHeader content={contentInfo} variant="full">
        {/* 액션 영역 */}
        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

        {isAdded ? (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-green-400 bg-green-400/10 px-4 py-2 rounded-lg">
              <Check size={20} />
              <span className="font-medium">내 기록관에 추가됨</span>
            </div>
            <Button variant="primary" size="lg" onClick={() => router.push("/archive")}>
              <ExternalLink size={18} />
              내 기록관 보기
            </Button>
          </div>
        ) : (
          <Button variant="primary" size="lg" onClick={handleAddToArchive} disabled={isAdding}>
            {isAdding && <Loader2 size={18} className="animate-spin" />}
            {!isAdding && <Plus size={18} />}
            내 기록관에 추가
          </Button>
        )}
      </ContentInfoHeader>

      {/* Description */}
      {contentInfo.description && (
        <Card className="p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <FileText size={20} /> 소개
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

          <p className="text-text-secondary leading-relaxed whitespace-pre-line">{contentInfo.description}</p>
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
