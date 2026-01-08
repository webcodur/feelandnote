/*
  파일명: /components/features/user/UserContentGrid.tsx
  기능: 사용자 콘텐츠 그리드 표시
  책임: 공개 프로필의 콘텐츠 목록을 카테고리별 탭과 그리드로 렌더링
*/ // ------------------------------
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Star, BookOpen, Film, Gamepad2, Music, Award, LayoutGrid, Image } from "lucide-react";
import Button from "@/components/ui/Button";
import ContentCompactCard, { ContentCompactGrid } from "@/components/shared/content/ContentCompactCard";
import { getUserContentsAll, type UserContentPublic } from "@/actions/contents/getUserContents";
import type { ContentType } from "@/types/database";

type ViewMode = "detail" | "compact";

interface UserContentGridProps {
  userId: string;
}

const CATEGORY_TABS = [
  { value: "all", label: "전체", icon: null },
  { value: "BOOK", label: "도서", icon: BookOpen },
  { value: "VIDEO", label: "영상", icon: Film },
  { value: "GAME", label: "게임", icon: Gamepad2 },
  { value: "MUSIC", label: "음악", icon: Music },
  { value: "CERTIFICATE", label: "자격증", icon: Award },
] as const;

// DB 타입을 카테고리 ID로 변환
const TYPE_TO_CATEGORY: Record<string, string> = {
  BOOK: "book",
  VIDEO: "video",
  GAME: "game",
  MUSIC: "music",
  CERTIFICATE: "certificate",
};

export default function UserContentGrid({ userId }: UserContentGridProps) {
  const [activeTab, setActiveTab] = useState<string>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("detail");
  const [contents, setContents] = useState<UserContentPublic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadContents = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const type = activeTab === "all" ? undefined : (activeTab as ContentType);
        const data = await getUserContentsAll(userId, type);
        setContents(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "콘텐츠를 불러오는데 실패했습니다.");
      } finally {
        setIsLoading(false);
      }
    };
    loadContents();
  }, [userId, activeTab]);

  const filteredContents = activeTab === "all"
    ? contents
    : contents.filter(item => item.content.type === activeTab);

  return (
    <div>
      {/* 컨트롤 바 */}
      <div className="flex items-center justify-between gap-2 mb-4">
        {/* 카테고리 탭 */}
        <div className="flex gap-1 overflow-x-auto pb-2">
          {CATEGORY_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.value;
            return (
              <Button
                unstyled
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap ${
                  isActive
                    ? "bg-accent text-white"
                    : "bg-surface text-text-secondary hover:bg-surface-hover"
                }`}
              >
                {Icon && <Icon size={14} />}
                {tab.label}
              </Button>
            );
          })}
        </div>

        {/* 뷰 모드 토글 */}
        <div className="flex gap-1 shrink-0">
          <Button
            unstyled
            onClick={() => setViewMode("detail")}
            className={`p-2 rounded-lg ${viewMode === "detail" ? "bg-accent text-white" : "bg-surface text-text-secondary hover:bg-surface-hover"}`}
            title="상세 보기"
          >
            <LayoutGrid size={16} />
          </Button>
          <Button
            unstyled
            onClick={() => setViewMode("compact")}
            className={`p-2 rounded-lg ${viewMode === "compact" ? "bg-accent text-white" : "bg-surface text-text-secondary hover:bg-surface-hover"}`}
            title="컴팩트 보기"
          >
            <Image size={16} />
          </Button>
        </div>
      </div>

      {/* 로딩 */}
      {isLoading && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-[2/3] bg-surface rounded-lg mb-2" />
              <div className="h-3 bg-surface rounded w-3/4 mb-1" />
              <div className="h-3 bg-surface rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* 에러 */}
      {error && (
        <div className="text-center py-8 text-text-secondary">
          <p>{error}</p>
        </div>
      )}

      {/* 빈 상태 */}
      {!isLoading && !error && filteredContents.length === 0 && (
        <div className="text-center py-12 text-text-secondary">
          <p>공개된 기록이 없습니다.</p>
        </div>
      )}

      {/* 컴팩트 뷰 */}
      {!isLoading && !error && filteredContents.length > 0 && viewMode === "compact" && (
        <ContentCompactGrid>
          {filteredContents.map((item) => (
            <ContentCompactCard
              key={item.id}
              data={{
                id: item.content_id,
                title: item.content.title,
                creator: item.content.creator || undefined,
                category: TYPE_TO_CATEGORY[item.content.type] || "book",
                thumbnail: item.content.thumbnail_url || undefined,
                metadata: item.content.metadata || undefined,
              }}
              href={`/archive/${item.content_id}`}
            />
          ))}
        </ContentCompactGrid>
      )}

      {/* 상세 뷰 (기존) */}
      {!isLoading && !error && filteredContents.length > 0 && viewMode === "detail" && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
          {filteredContents.map((item) => (
            <Link
              key={item.id}
              href={`/archive/${item.content_id}`}
              className="text-left group"
            >
              {/* 썸네일 */}
              <div className="aspect-[2/3] bg-surface rounded-lg overflow-hidden mb-2 relative">
                {item.content.thumbnail_url ? (
                  <img
                    src={item.content.thumbnail_url}
                    alt={item.content.title}
                    className="w-full h-full object-cover group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-text-tertiary">
                    <BookOpen size={24} />
                  </div>
                )}
                {/* 평점 배지 */}
                {item.public_record?.rating && (
                  <div className="absolute bottom-1 right-1 flex items-center gap-0.5 px-1.5 py-0.5 bg-black/70 rounded text-xs text-yellow-400">
                    <Star size={10} fill="currentColor" />
                    {item.public_record.rating.toFixed(1)}
                  </div>
                )}
              </div>
              {/* 제목 */}
              <h3 className="text-xs font-medium text-text-primary line-clamp-2 group-hover:text-accent">
                {item.content.title}
              </h3>
              {/* 작가/감독 */}
              {item.content.creator && (
                <p className="text-xs text-text-tertiary truncate mt-0.5">
                  {item.content.creator}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
