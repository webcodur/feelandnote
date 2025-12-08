"use client";

import { useState } from "react";
import { Card, Avatar, Badge } from "@/components/ui";
import { Star, Users, Search, Heart, MessageCircle, Filter, TrendingUp, Inbox } from "lucide-react";

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
        <div className="flex items-center gap-1.5 transition-colors duration-200 hover:text-accent">
          <Heart size={16} /> {item.likes}
        </div>
        <div className="flex items-center gap-1.5 transition-colors duration-200 hover:text-accent">
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

export default function FeedView() {
  const [activityFilter, setActivityFilter] = useState("전체");
  const [categoryFilter, setCategoryFilter] = useState("전체");
  const [sortBy, setSortBy] = useState("스마트");

  // 현재 소셜 기능이 구현되지 않아 빈 배열 사용
  const celebFeed: FeedCardProps["item"][] = [];
  const friendsFeed: FeedCardProps["item"][] = [];
  const discoveryFeed: FeedCardProps["item"][] = [];

  return (
    <>
      {/* Filter Bar */}
      <div className="mb-8 pb-6 border-b border-border">
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-text-secondary" />
            <span className="text-sm font-semibold text-text-secondary">필터</span>
          </div>

          {/* Activity Type Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-secondary">활동:</span>
            {["전체", "Review", "Note", "창작"].map((type) => (
              <button
                key={type}
                onClick={() => setActivityFilter(type)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200
                  ${
                    activityFilter === type
                      ? "bg-accent text-white"
                      : "bg-bg-secondary border border-border text-text-secondary hover:border-accent"
                  }`}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-secondary">카테고리:</span>
            {["전체", "도서", "영화"].map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200
                  ${
                    categoryFilter === cat
                      ? "bg-accent text-white"
                      : "bg-bg-secondary border border-border text-text-secondary hover:border-accent"
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Sort Options */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <TrendingUp size={18} className="text-text-secondary" />
            <span className="text-sm font-semibold text-text-secondary">정렬</span>
          </div>
          <div className="flex gap-2">
            {["스마트", "최신순"].map((sort) => (
              <button
                key={sort}
                onClick={() => setSortBy(sort)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200
                  ${
                    sortBy === sort
                      ? "bg-accent/20 text-accent"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
              >
                {sort}
              </button>
            ))}
          </div>
        </div>
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
