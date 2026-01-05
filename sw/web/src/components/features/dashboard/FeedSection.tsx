"use client";

import Link from "next/link";
import { Card, Avatar, Badge } from "@/components/ui";
import { Star, Users, Search, Heart, MessageCircle, Newspaper } from "lucide-react";

interface FeedItem {
  id: number;
  user: string;
  avatarColor: string;
  action: string;
  title: string;
  content: string;
  likes: string;
  comments: number;
  time: string;
}

function FeedCard({ item }: { item: FeedItem }) {
  return (
    <Card hover className="p-0">
      <div className="p-4 flex items-center gap-3 border-b border-white/5">
        <Avatar size="md" gradient={item.avatarColor} />
        <div className="flex-1">
          <div className="font-semibold text-[15px]">{item.user}</div>
          <div className="text-xs text-text-secondary flex gap-2 items-center mt-1">
            <Badge variant="primary">{item.action}</Badge>
            <span>{item.time}</span>
          </div>
        </div>
      </div>
      <div className="p-4">
        <div className="font-semibold text-base mb-2">{item.title}</div>
        <div className="text-sm text-text-secondary leading-relaxed line-clamp-2">{item.content}</div>
      </div>
      <div className="py-3 px-4 border-t border-white/5 flex gap-4 text-[13px] text-text-secondary">
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
  items: FeedItem[];
}) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-accent">{icon}</span>
        <span className="font-semibold">{title}</span>
        <span className="text-text-secondary text-sm">{desc}</span>
      </div>
      {items.length > 0 ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
          {items.map((item) => (
            <FeedCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-text-secondary text-sm">
          아직 표시할 피드가 없습니다.
        </div>
      )}
    </div>
  );
}

export default function FeedSection() {
  // 현재 소셜 기능이 구현되지 않아 빈 배열 사용
  const celebFeed: FeedItem[] = [];
  const friendsFeed: FeedItem[] = [];
  const discoveryFeed: FeedItem[] = [];

  return (
    <Card>
      <div className="flex justify-between items-center mb-5">
        <div className="text-lg font-bold flex items-center gap-2">
          <Newspaper size={18} className="text-accent" /> 새 소식
        </div>
        <Link href="/archive/feed" className="text-accent text-sm cursor-pointer font-semibold hover:underline">
          피드 전체보기 →
        </Link>
      </div>

      <FeedSubsection
        icon={<Star size={20} />}
        title="셀럽"
        desc="· 팔로우 중인 문화 인플루언서"
        items={celebFeed}
      />

      <FeedSubsection
        icon={<Users size={20} />}
        title="친구"
        desc="· 상호 팔로우 중"
        items={friendsFeed}
      />

      <FeedSubsection
        icon={<Search size={20} />}
        title="발견"
        desc="· 취향 기반 추천"
        items={discoveryFeed}
      />

      <div className="text-center py-4 text-text-secondary text-sm border-t border-white/5 mt-4">
        <p>소셜 기능은 준비 중입니다.</p>
        <p className="text-xs mt-1">곧 친구들의 기록을 확인할 수 있습니다!</p>
      </div>
    </Card>
  );
}
