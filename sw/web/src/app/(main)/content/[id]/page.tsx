"use client";

import { useState, useEffect, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Book,
  Film,
  Tv,
  Gamepad2,
  Music,
  Drama,
  Loader2,
  Check,
  ExternalLink,
  Calendar,
  Building2,
  Tag,
  FileText,
  Star,
} from "lucide-react";
import { Button, Card } from "@/components/ui";
import { getContentInfo, type ContentWithUserStatus } from "@/actions/contents/getContentInfo";
import { addContent, type ContentStatus } from "@/actions/contents/addContent";

type CategoryLabels = { [key: string]: string };
type CategoryIcons = { [key: string]: React.ElementType };

const CATEGORY_LABELS: CategoryLabels = {
  book: "도서",
  movie: "영화",
  drama: "드라마",
  animation: "애니메이션",
  game: "게임",
  performance: "공연",
};

const CATEGORY_ICONS: CategoryIcons = {
  book: Book,
  movie: Film,
  drama: Tv,
  animation: Music,
  game: Gamepad2,
  performance: Drama,
};

export default function ContentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const contentId = params.id as string;

  const [content, setContent] = useState<ContentWithUserStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdding, startAddTransition] = useTransition();

  useEffect(() => {
    async function loadContent() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getContentInfo(contentId);
        setContent(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "콘텐츠를 불러오는데 실패했습니다.");
      } finally {
        setIsLoading(false);
      }
    }
    loadContent();
  }, [contentId]);

  const handleAddToArchive = (status: ContentStatus) => {
    if (!content) return;

    startAddTransition(async () => {
      try {
        await addContent({
          type: content.type as "BOOK" | "MOVIE",
          title: content.title,
          creator: content.creator || undefined,
          thumbnailUrl: content.thumbnail_url || undefined,
          description: content.description || undefined,
          publisher: content.publisher || undefined,
          releaseDate: content.release_date || undefined,
          status,
          externalId: contentId,
        });
        // 추가 후 기록관 상세 페이지로 이동
        router.push(`/archive/${contentId}`);
      } catch (err) {
        console.error("기록관 추가 실패:", err);
        setError(err instanceof Error ? err.message : "기록관 추가에 실패했습니다.");
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-accent" />
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-400 mb-4">{error || "콘텐츠를 찾을 수 없습니다."}</p>
        <Button variant="secondary" onClick={() => router.back()}>
          뒤로 가기
        </Button>
      </div>
    );
  }

  const categoryLabel = CATEGORY_LABELS[content.type.toLowerCase()] || content.type;
  const Icon = CATEGORY_ICONS[content.type.toLowerCase()] || Book;
  const metadata = content.metadata as Record<string, string | number> | null;

  return (
    <div className="max-w-[900px] mx-auto">
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
        {content.thumbnail_url && (
          <div
            className="absolute inset-0 -z-10 opacity-20 blur-3xl"
            style={{
              backgroundImage: `url(${content.thumbnail_url})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
        )}

        <div className="flex gap-8">
          {/* Poster/Cover */}
          <div className="w-52 h-80 rounded-2xl shadow-2xl shrink-0 overflow-hidden border border-white/10">
            {content.thumbnail_url ? (
              <img
                src={content.thumbnail_url}
                alt={content.title}
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
            <h1 className="text-4xl font-bold mb-3 leading-tight">{content.title}</h1>

            {/* Creator */}
            {content.creator && (
              <p className="text-xl text-text-secondary mb-6">{content.creator}</p>
            )}

            {/* Quick Info */}
            <div className="flex flex-wrap gap-4 text-sm text-text-secondary mb-8">
              {content.publisher && (
                <span className="flex items-center gap-1.5">
                  <Building2 size={14} /> {content.publisher}
                </span>
              )}
              {content.release_date && (
                <span className="flex items-center gap-1.5">
                  <Calendar size={14} /> {new Date(content.release_date).toLocaleDateString("ko-KR")}
                </span>
              )}
              {metadata?.genre && (
                <span className="flex items-center gap-1.5">
                  <Tag size={14} /> {metadata.genre}
                </span>
              )}
              {metadata?.pages && (
                <span className="flex items-center gap-1.5">
                  <FileText size={14} /> {metadata.pages}p
                </span>
              )}
              {metadata?.rating && (
                <span className="flex items-center gap-1.5 text-yellow-400">
                  <Star size={14} fill="currentColor" /> {metadata.rating}
                </span>
              )}
            </div>

            {/* Action Buttons */}
            {content.userContent ? (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-green-400 bg-green-400/10 px-4 py-2 rounded-lg">
                  <Check size={20} />
                  <span className="font-medium">내 기록관에 있음</span>
                </div>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => router.push(`/archive/${contentId}`)}
                >
                  <ExternalLink size={18} />
                  내 기록 보기
                </Button>
              </div>
            ) : (
              <div className="flex gap-3">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => handleAddToArchive("EXPERIENCE")}
                  disabled={isAdding}
                >
                  {isAdding ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Plus size={18} />
                  )}
                  {content.type === "BOOK" ? "읽음으로 추가" : "봄으로 추가"}
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={() => handleAddToArchive("WISH")}
                  disabled={isAdding}
                >
                  {isAdding ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Plus size={18} />
                  )}
                  관심 목록에 추가
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      {content.description && (
        <Card className="p-6 mb-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <FileText size={20} /> 소개
          </h2>
          <p className="text-text-secondary leading-relaxed whitespace-pre-line">
            {content.description}
          </p>
        </Card>
      )}

      {/* Metadata Details */}
      {metadata && Object.keys(metadata).length > 0 && (
        <Card className="p-6">
          <h2 className="text-lg font-bold mb-4">상세 정보</h2>
          <dl className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {content.publisher && (
              <div>
                <dt className="text-sm text-text-secondary mb-1">출판사/제작사</dt>
                <dd className="text-text-primary font-medium">{content.publisher}</dd>
              </div>
            )}
            {content.release_date && (
              <div>
                <dt className="text-sm text-text-secondary mb-1">출시일</dt>
                <dd className="text-text-primary font-medium">
                  {new Date(content.release_date).toLocaleDateString("ko-KR", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </dd>
              </div>
            )}
            {Object.entries(metadata).map(([key, value]) => {
              // 이미 위에서 표시한 항목은 제외
              if (["genre", "pages", "rating"].includes(key)) {
                return (
                  <div key={key}>
                    <dt className="text-sm text-text-secondary mb-1 capitalize">
                      {key === "genre" ? "장르" : key === "pages" ? "페이지" : key === "rating" ? "평점" : key}
                    </dt>
                    <dd className="text-text-primary font-medium">{String(value)}</dd>
                  </div>
                );
              }
              return (
                <div key={key}>
                  <dt className="text-sm text-text-secondary mb-1 capitalize">{key}</dt>
                  <dd className="text-text-primary font-medium">{String(value)}</dd>
                </div>
              );
            })}
          </dl>
        </Card>
      )}
    </div>
  );
}
