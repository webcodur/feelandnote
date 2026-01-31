/*
  파일명: /components/features/search/SearchResultCards.tsx
  기능: 검색 결과 카드 컴포넌트 모음
  책임: 콘텐츠/사용자/태그 검색 결과를 카드 형태로 렌더링
*/ // ------------------------------
"use client";

import { useState, useTransition } from "react";
import { Hash } from "lucide-react";
import { Card, TitleBadge } from "@/components/ui";
import Button from "@/components/ui/Button";
import ContentCompactCard, { ContentCompactGrid } from "@/components/shared/content/ContentCompactCard";
import { toggleFollow } from "@/actions/user";
import type { ContentSearchResult, UserSearchResult, TagSearchResult, RecordsSearchResult } from "@/actions/search";
import type { ContentStatus } from "@/types/database";

type ContentResult = ContentSearchResult | RecordsSearchResult;

interface ContentResultsProps {
  results: ContentResult[];
  mode: "content" | "records";
  currentUserId?: string | null;
  addingIds?: Set<string>;
  addedIds?: Set<string>;
  savedIds?: Set<string>;
  onBeforeNavigate?: (item: ContentResult) => void;
  onAddWithStatus?: (item: ContentResult, status: ContentStatus) => void;
}

export function ContentResults({
  results,
  mode,
  currentUserId,
  addingIds = new Set(),
  addedIds = new Set(),
  savedIds = new Set(),
  onBeforeNavigate,
  onAddWithStatus,
}: ContentResultsProps) {
  if (results.length === 0) return null;

  const showAddButton = mode === "content";

  return (
    <ContentCompactGrid>
      {results.map((item) => {
        const thumbnail = "thumbnail" in item ? item.thumbnail : undefined;
        const metadata = "metadata" in item ? (item.metadata as Record<string, unknown>) : undefined;
        const subtype = "subtype" in item ? (item.subtype as string) : undefined;
        const isAdding = addingIds.has(item.id);
        const isAdded = addedIds.has(item.id);
        const isSaved = savedIds.has(item.id);

        // 콘텐츠 상세 페이지로 이동 (통합 라우트)
        const contentId = "contentId" in item ? item.contentId : item.id;
        const href = `/content/${contentId}?category=${item.category}`;

        return (
          <ContentCompactCard
            key={item.id}
            data={{
              id: item.id,
              title: item.title,
              creator: item.creator,
              category: item.category,
              thumbnail,
              subtype,
              metadata,
            }}
            href={href}
            onBeforeNavigate={() => onBeforeNavigate?.(item)}
            isSaved={isSaved && showAddButton}
            showAddButton={showAddButton}
            isAdding={isAdding}
            isAdded={isAdded}
            onAddWithStatus={onAddWithStatus ? (status) => onAddWithStatus(item, status) : undefined}
          />
        );
      })}
    </ContentCompactGrid>
  );
}

interface UserResultsProps {
  results: UserSearchResult[];
  onItemClick: (user: UserSearchResult) => void;
}

export function UserResults({ results, onItemClick }: UserResultsProps) {
  if (results.length === 0) return null;

  return (
    <div className="space-y-3">
      {results.map((user) => (
        <UserResultCard key={user.id} user={user} onItemClick={onItemClick} />
      ))}
    </div>
  );
}

function UserResultCard({ user, onItemClick }: { user: UserSearchResult; onItemClick: (user: UserSearchResult) => void }) {
  const [isFollowing, setIsFollowing] = useState(user.isFollowing);
  const [isPending, startTransition] = useTransition();

  const handleFollowClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    startTransition(async () => {
      const result = await toggleFollow(user.id);
      if (result.success) {
        setIsFollowing(result.data.isFollowing);
      }
    });
  };

  return (
    <Card
      className="p-4 cursor-pointer hover:border-accent"
      onClick={() => onItemClick(user)}
    >
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="font-semibold text-text-primary">{user.nickname}</h3>
            <TitleBadge title={user.selectedTitle} size="sm" />
          </div>
          <p className="text-sm text-text-secondary">{user.username}</p>
        </div>
        <div className="text-sm text-text-secondary">
          팔로워 {user.followerCount >= 1000 ? `${(user.followerCount / 1000).toFixed(1)}K` : user.followerCount}
        </div>
        <Button
          unstyled
          disabled={isPending}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium
            ${isFollowing ? "bg-white/10 text-text-primary" : "bg-accent text-white"}
            ${isPending ? "opacity-50" : ""}`}
          onClick={handleFollowClick}
        >
          {isFollowing ? "팔로잉" : "팔로우"}
        </Button>
      </div>
    </Card>
  );
}

interface TagResultsProps {
  results: TagSearchResult[];
  onItemClick: (tag: TagSearchResult) => void;
}

export function TagResults({ results, onItemClick }: TagResultsProps) {
  if (results.length === 0) return null;

  return (
    <div className="space-y-3">
      {results.map((tag) => (
        <Card
          key={tag.id}
          className="p-4 cursor-pointer hover:border-accent"
          onClick={() => onItemClick(tag)}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
              <Hash size={24} className="text-text-secondary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-text-primary">#{tag.name}</h3>
              <p className="text-sm text-text-secondary">게시물 {tag.postCount.toLocaleString()}개</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
