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
import { ContentCard } from "@/components/ui/cards";
import { toggleFollow } from "@/actions/user";
import type { ContentType } from "@/types/database";
import type { ContentSearchResult, UserSearchResult, TagSearchResult, RecordsSearchResult } from "@/actions/search";
import type { ContentStatus } from "@/types/database";

type ContentResult = ContentSearchResult | RecordsSearchResult;

interface ContentResultsProps {
  results: ContentResult[];
  mode: "content" | "records";
  currentUserId?: string | null;
  savedIds?: Set<string>;
  userCounts?: Record<string, number>;
  onBeforeNavigate?: (item: ContentResult) => void;
  onAddContent?: (item: ContentResult) => void;
}

export function ContentResults({
  results,
  mode,
  currentUserId,
  savedIds = new Set(),
  userCounts = {},
  onBeforeNavigate,
  onAddContent,
}: ContentResultsProps) {
  if (results.length === 0) return null;

  const showAddButton = mode === "content";

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-8 gap-1">
      {results.map((item) => {
        const thumbnail = "thumbnail" in item ? item.thumbnail : undefined;
        const isSaved = savedIds.has(item.id);
        const contentType = item.category.toUpperCase() as ContentType;

        // 콘텐츠 상세 페이지로 이동 (통합 라우트)
        const contentId = "contentId" in item ? item.contentId : item.id;
        const href = `/content/${contentId}?category=${item.category}`;

        // userCount: records 모드에서는 item에서, content 모드에서는 userCounts에서
        const userCount = "userCount" in item ? item.userCount : userCounts[item.id];

        return (
          <ContentCard
            key={item.id}
            contentId={contentId}
            thumbnail={thumbnail}
            title={item.title}
            creator={item.creator}
            contentType={contentType}
            href={href}
            onClick={() => onBeforeNavigate?.(item)}
            saved={isSaved && showAddButton}
            addable={showAddButton && !isSaved && !!onAddContent}
            onAdd={() => onAddContent?.(item)}
          />
        );
      })}
    </div>
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
