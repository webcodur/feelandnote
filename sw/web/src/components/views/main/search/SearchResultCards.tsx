"use client";

import { Book, Hash } from "lucide-react";
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
  onItemClick: (item: ContentResult) => void;
}

export function ContentResults({ results, mode, onItemClick }: ContentResultsProps) {
  if (results.length === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {results.map((item) => {
        const CategoryIcon = CATEGORY_ICONS[item.category] || Book;
        const thumbnail = "thumbnail" in item ? item.thumbnail : undefined;
        const status = "status" in item ? item.status : undefined;
        const rating = "rating" in item ? item.rating : undefined;
        return (
          <Card
            key={item.id}
            className="p-0 cursor-pointer hover:border-accent transition-colors"
            onClick={() => onItemClick(item)}
          >
            <div className="aspect-[2/3] bg-gradient-to-br from-gray-700 to-gray-900 rounded-t-xl flex items-center justify-center overflow-hidden">
              {thumbnail ? (
                <img src={thumbnail} alt={item.title} className="w-full h-full object-cover" />
              ) : (
                <CategoryIcon size={32} className="text-gray-500" />
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
          className="p-4 cursor-pointer hover:border-accent transition-colors"
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
          className="p-4 cursor-pointer hover:border-accent transition-colors"
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
