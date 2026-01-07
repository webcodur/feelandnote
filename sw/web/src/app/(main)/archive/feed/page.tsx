/*
  파일명: /app/(main)/archive/feed/page.tsx
  기능: 피드 페이지
  책임: 셀럽/친구들의 문화생활 피드를 표시한다.
*/ // ------------------------------

"use client";

import { useState } from "react";
import { Card, Avatar, Badge, FilterChips, FilterSelect, SectionHeader, type ChipOption, type FilterOption } from "@/components/ui";
import { Star, Users, Search, Heart, MessageCircle, ArrowUpDown, Inbox, Newspaper, LayoutGrid, FileText, PenTool, Book, Film } from "lucide-react";

const ACTIVITY_OPTIONS: ChipOption[] = [
  { value: "all", label: "전체", icon: LayoutGrid },
  { value: "review", label: "Review", icon: Star },
  { value: "note", label: "Note", icon: FileText },
  { value: "creation", label: "창작", icon: PenTool },
];

const CATEGORY_OPTIONS: ChipOption[] = [
  { value: "all", label: "전체", icon: LayoutGrid },
  { value: "book", label: "도서", icon: Book },
  { value: "video", label: "영화", icon: Film },
];

const SORT_OPTIONS: FilterOption[] = [
  { value: "smart", label: "스마트" },
  { value: "recent", label: "최신순" },
];

interface FeedCardProps {
  item: {
    id: number;
    user: string;
    avatarColor: string;
    action: string;
    title: string;
    content: string;
    likes: string;
    comments: number;
    time: string;
  };
}

function FeedCard({ item }: FeedCardProps) {
  return (
    <Card hover className="p-0 flex flex-col">
      <div className="p-5 flex items-center gap-3 border-b border-white/5">
        <Avatar size="md" gradient={item.avatarColor} />
        <div className="flex-1">
          <div className="font-semibold text-[15px]">{item.user}</div>
          <div className="text-xs text-text-secondary flex gap-2 items-center mt-1">
            <Badge variant="primary">{item.action}</Badge>
            <span>{item.time}</span>
          </div>
        </div>
      </div>
      <div className="p-5 flex-1">
        <div className="font-semibold text-base mb-2">{item.title}</div>
        <div className="text-[15px] text-[#d0d7de] leading-relaxed line-clamp-3">{item.content}</div>
      </div>
      <div className="py-4 px-5 border-t border-white/5 flex gap-4 text-[13px] text-text-secondary">
        <div className="flex items-center gap-1.5 hover:text-accent">
          <Heart size={16} /> {item.likes}
        </div>
        <div className="flex items-center gap-1.5 hover:text-accent">
          <MessageCircle size={16} /> {item.comments}
        </div>
      </div>
    </Card>
  );
}

function FeedSubsection({
  icon,
  title,
  desc,
  items,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  items: FeedCardProps["item"][];
}) {
  return (
    <div className="mb-12">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/5">
        <span className="text-accent">{icon}</span>
        <div className="flex-1">
          <div className="text-2xl font-bold mb-1">{title}</div>
          <div className="text-sm text-text-secondary">{desc}</div>
        </div>
      </div>
      {items.length > 0 ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(380px,1fr))] gap-6">
          {items.map((item) => (
            <FeedCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-text-secondary">
          <Inbox size={48} className="mx-auto mb-3 opacity-50" />
          <p>아직 표시할 피드가 없습니다.</p>
        </div>
      )}
    </div>
  );
}

export default function Page() {
  const [activityFilter, setActivityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("smart");

  const celebFeed: FeedCardProps["item"][] = [];
  const friendsFeed: FeedCardProps["item"][] = [];
  const discoveryFeed: FeedCardProps["item"][] = [];

  return (
    <>
      <SectionHeader
        title="피드"
        description="친구들과 셀럽의 문화생활을 구경하세요"
        icon={<Newspaper size={24} />}
        className="mb-8"
      />

      {/* Filter Bar */}
      <div className="flex justify-between items-center mb-6 pb-6 border-b border-border">
        <div className="flex items-center gap-4">
          <FilterChips
            options={ACTIVITY_OPTIONS}
            value={activityFilter}
            onChange={setActivityFilter}
            variant="filled"
            showIcon
          />
          <div className="w-px h-6 bg-border" />
          <FilterChips
            options={CATEGORY_OPTIONS}
            value={categoryFilter}
            onChange={setCategoryFilter}
            variant="filled"
            showIcon
          />
        </div>
        <FilterSelect
          options={SORT_OPTIONS}
          value={sortBy}
          onChange={setSortBy}
          icon={ArrowUpDown}
          defaultValue="smart"
        />
      </div>

      {/* Coming Soon Notice */}
      <Card className="mb-8 bg-gradient-to-r from-accent/10 to-transparent border-accent/30">
        <div className="text-center py-4">
          <h3 className="text-lg font-bold mb-2">소셜 기능 준비 중</h3>
          <p className="text-text-secondary text-sm">
            친구들의 기록을 확인하고, 취향이 비슷한 사람들을 발견하는 기능이 곧 제공됩니다.
          </p>
        </div>
      </Card>

      <FeedSubsection
        icon={<Star size={24} />}
        title="셀럽 피드"
        desc="내가 팔로우한 문화 인플루언서들의 이야기"
        items={celebFeed}
      />

      <FeedSubsection
        icon={<Users size={24} />}
        title="친구 피드"
        desc="함께 기록하는 친구들의 소식"
        items={friendsFeed}
      />

      <FeedSubsection
        icon={<Search size={24} />}
        title="새로운 발견"
        desc="취향이 비슷한 새로운 사람들을 만나보세요"
        items={discoveryFeed}
      />
    </>
  );
}
