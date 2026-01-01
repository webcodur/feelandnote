"use client";

import { Book, Hash, Plus, Loader2, Check, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui";
import Button from "@/components/ui/Button";
import { CATEGORIES } from "@/constants/categories";
import type { ContentSearchResult, UserSearchResult, TagSearchResult, ArchiveSearchResult } from "@/actions/search";

const CATEGORY_ICONS: Record<string, React.ElementType> = Object.fromEntries(
  CATEGORIES.map((cat) => [cat.id, cat.icon])
);

type ContentResult = ContentSearchResult | ArchiveSearchResult;

interface ContentResultsProps {
  results: ContentResult[];
  mode: "content" | "archive";
  addingIds?: Set<string>;
  addedIds?: Set<string>;
  onItemClick: (item: ContentResult) => void;
  onAddToArchive?: (item: ContentResult) => void;
  onOpenInNewTab?: (item: ContentResult) => void;
}

export function ContentResults({
  results,
  mode,
  addingIds = new Set(),
  addedIds = new Set(),
  onItemClick,
  onAddToArchive,
  onOpenInNewTab,
}: ContentResultsProps) {
  if (results.length === 0) return null;

  const showUtils = mode === "content";

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {results.map((item) => {
        const CategoryIcon = CATEGORY_ICONS[item.category] || Book;
        const thumbnail = "thumbnail" in item ? item.thumbnail : undefined;
        const status = "status" in item ? item.status : undefined;
        const rating = "rating" in item ? item.rating : undefined;
        const isAdding = addingIds.has(item.id);
        const isAdded = addedIds.has(item.id);

        return (
          <Card
            key={item.id}
            className="p-0 cursor-pointer hover:border-accent group relative"
            onClick={() => onItemClick(item)}
          >
            <div className="aspect-[2/3] bg-gradient-to-br from-gray-700 to-gray-900 rounded-t-xl flex items-center justify-center overflow-hidden relative">
              {thumbnail ? (
                <img src={thumbnail} alt={item.title} className="w-full h-full object-cover" />
              ) : (
                <CategoryIcon size={32} className="text-gray-500" />
              )}

              {/* 유틸 버튼 오버레이 */}
              {showUtils && (
                <div className="absolute top-2 right-2 flex-col gap-1 hidden group-hover:flex">
                  {onAddToArchive && (
                    isAdded ? (
                      <div className="p-1.5 rounded-md bg-green-500/80 text-white">
                        <Check size={14} />
                      </div>
                    ) : (
                      <Button
                        unstyled
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddToArchive(item);
                        }}
                        disabled={isAdding}
                        className="p-1.5 rounded-md bg-accent/80 text-white hover:bg-accent"
                        title="기록관에 추가"
                      >
                        {isAdding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                      </Button>
                    )
                  )}
                  {onOpenInNewTab && (
                    <Button
                      unstyled
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenInNewTab(item);
                      }}
                      className="p-1.5 rounded-md bg-black/60 text-white hover:bg-black/80"
                      title="새 창으로 열기"
                    >
                      <ExternalLink size={14} />
                    </Button>
                  )}
                </div>
              )}
            </div>
            <div className="p-3">
              <h3 className="text-sm font-semibold text-text-primary truncate">{item.title}</h3>
              <p className="text-xs text-text-secondary truncate">{item.creator}</p>
              {rating && (
                <div className="text-yellow-400 text-xs mt-1">
                  {"★".repeat(rating)}{"☆".repeat(5 - rating)}
                </div>
              )}
              {status && <div className="text-xs text-accent mt-1">{status}</div>}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

interface UserResultsProps {
  results: UserSearchResult[];
  onItemClick: (user: UserSearchResult) => void;
  onFollowToggle: (userId: string) => void;
}

export function UserResults({ results, onItemClick, onFollowToggle }: UserResultsProps) {
  if (results.length === 0) return null;

  return (
    <div className="space-y-3">
      {results.map((user) => (
        <Card
          key={user.id}
          className="p-4 cursor-pointer hover:border-accent"
          onClick={() => onItemClick(user)}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-text-primary">{user.nickname}</h3>
              <p className="text-sm text-text-secondary">{user.username}</p>
            </div>
            <div className="text-sm text-text-secondary">
              팔로워 {user.followerCount >= 1000 ? `${(user.followerCount / 1000).toFixed(1)}K` : user.followerCount}
            </div>
            <Button
              unstyled
              className={`px-4 py-1.5 rounded-lg text-sm font-medium
                ${user.isFollowing ? "bg-white/10 text-text-primary" : "bg-accent text-white"}`}
              onClick={(e) => { e.stopPropagation(); onFollowToggle(user.id); }}
            >
              {user.isFollowing ? "팔로잉" : "팔로우"}
            </Button>
          </div>
        </Card>
      ))}
    </div>
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
