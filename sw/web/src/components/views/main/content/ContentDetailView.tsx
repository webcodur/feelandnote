"use client";

import { useState, useEffect, useTransition, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Book,
  Calendar,
  User,
  FileText,
  ExternalLink,
  Plus,
  Loader2,
  Check,
  Sparkles,
} from "lucide-react";
import { Button, Card } from "@/components/ui";
import { addContent } from "@/actions/contents/addContent";
import { getProfile } from "@/actions/user";
import { generateSummary } from "@/actions/ai";
import { CATEGORIES, getCategoryById, type CategoryId } from "@/constants/categories";
import type { ContentType } from "@/types/database";

// 카테고리별 라벨/아이콘 맵 생성
const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((cat) => [cat.id, cat.label])
);
const CATEGORY_ICONS: Record<string, React.ElementType> = Object.fromEntries(
  CATEGORIES.map((cat) => [cat.id, cat.icon])
);

// 카테고리를 ContentType으로 매핑
const CATEGORY_TO_TYPE: Record<string, ContentType> = Object.fromEntries(
  CATEGORIES.map((cat) => [cat.id, cat.dbType as ContentType])
);

function ContentDetailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // 쿼리 파라미터에서 메타데이터 추출
  const contentId = searchParams.get("id") || "";
  const title = searchParams.get("title") || "제목 없음";
  const category = searchParams.get("category") || "book";
  const creator = searchParams.get("creator");
  const thumbnail = searchParams.get("thumbnail");
  const description = searchParams.get("description");
  const releaseDate = searchParams.get("releaseDate");

  const categoryLabel = CATEGORY_LABELS[category] || category;
  const Icon = CATEGORY_ICONS[category] || Book;

  const [isAdding, startAddTransition] = useTransition();
  const [isAdded, setIsAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);

  useEffect(() => {
    getProfile().then((profile) => {
      setHasApiKey(!!profile?.gemini_api_key);
    });
  }, []);

  const handleSummarize = async () => {
    if (!description) return;
    setIsSummarizing(true);
    try {
      const result = await generateSummary({ contentTitle: title, description });
      setSummary(result.text);
    } catch (err) {
      console.error("AI 요약 실패:", err);
      alert(err instanceof Error ? err.message : "AI 요약에 실패했습니다.");
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleAddToArchive = () => {
    if (!contentId) {
      setError("콘텐츠 ID가 없습니다.");
      return;
    }

    startAddTransition(async () => {
      try {
        await addContent({
          id: contentId,
          type: CATEGORY_TO_TYPE[category] || "BOOK",
          title,
          creator: creator || undefined,
          thumbnailUrl: thumbnail || undefined,
          description: description || undefined,
          releaseDate: releaseDate || undefined,
        });
        setIsAdded(true);
        setError(null);
      } catch (err) {
        console.error("기록관 추가 실패:", err);
        setError(err instanceof Error ? err.message : "기록관 추가에 실패했습니다.");
      }
    });
  };

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

      {/* Hero Section */}
      <div className="relative mb-8">
        {/* Background blur */}
        {thumbnail && (
          <div
            className="absolute inset-0 -z-10 opacity-20 blur-3xl"
            style={{
              backgroundImage: `url(${thumbnail})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
        )}

        <div className="flex gap-8">
          {/* Poster/Cover */}
          <div className="w-52 h-80 rounded-2xl shadow-2xl shrink-0 overflow-hidden border border-white/10">
            {thumbnail ? (
              <img
                src={thumbnail}
                alt={title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
                <Icon size={64} className="text-gray-500" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 py-4">
            {/* Category Badge */}
            <div className="flex items-center gap-2 mb-4">
              <span className="py-1.5 px-4 bg-accent/20 text-accent rounded-full text-sm font-semibold flex items-center gap-2">
                <Icon size={16} /> {categoryLabel}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-4xl font-bold mb-3 leading-tight">{title}</h1>

            {/* Creator */}
            {creator && (
              <p className="text-xl text-text-secondary mb-6 flex items-center gap-2">
                <User size={18} /> {creator}
              </p>
            )}

            {/* Quick Info */}
            <div className="flex flex-wrap gap-4 text-sm text-text-secondary mb-8">
              {releaseDate && (
                <span className="flex items-center gap-1.5">
                  <Calendar size={14} /> {releaseDate}
                </span>
              )}
            </div>

            {/* Action Buttons */}
            {error && (
              <p className="text-red-400 text-sm mb-4">{error}</p>
            )}

            {isAdded ? (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-green-400 bg-green-400/10 px-4 py-2 rounded-lg">
                  <Check size={20} />
                  <span className="font-medium">내 기록관에 추가됨</span>
                </div>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => router.push("/archive")}
                >
                  <ExternalLink size={18} />
                  내 기록관 보기
                </Button>
              </div>
            ) : (
              <Button
                variant="primary"
                size="lg"
                onClick={handleAddToArchive}
                disabled={isAdding}
              >
                {isAdding ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Plus size={18} />
                )}
                내 기록관에 추가
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      {description && (
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
              {isSummarizing ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Sparkles size={14} />
              )}
              AI 요약
            </Button>
          </div>

          {/* AI 요약 결과 */}
          {summary && (
            <div className="p-3 mb-4 bg-accent/10 border border-accent/20 rounded-lg">
              <div className="flex items-center gap-1.5 text-xs text-accent mb-2">
                <Sparkles size={12} /> AI 요약
              </div>
              <p className="text-sm text-text-primary leading-relaxed">{summary}</p>
            </div>
          )}

          <p className="text-text-secondary leading-relaxed whitespace-pre-line">
            {description}
          </p>
        </Card>
      )}

      {/* Raw Metadata (Debug) */}
      <Card className="p-6">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <ExternalLink size={20} /> API 메타데이터 (Debug)
        </h2>
        <div className="bg-bg-main rounded-lg p-4 overflow-x-auto">
          <pre className="text-sm text-text-secondary font-mono">
{JSON.stringify({
  id: contentId,
  title,
  category,
  creator,
  thumbnail,
  description,
  releaseDate,
}, null, 2)}
          </pre>
        </div>
      </Card>
    </>
  );
}

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 size={32} className="animate-spin text-accent" />
    </div>
  );
}

export default function ContentDetailView() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ContentDetailContent />
    </Suspense>
  );
}
