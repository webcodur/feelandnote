"use client";

import { FEED_ITEMS, FRIENDS_FEED, DISCOVERY_FEED } from "@/lib/mock-data";
import { Card, Avatar, Badge } from "@/components/ui";
import { Star, Users, Search, Heart, MessageCircle } from "lucide-react";

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
      <div className="grid grid-cols-[repeat(auto-fill,minmax(380px,1fr))] gap-6">
        {items.map((item) => (
          <FeedCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

export default function FeedPage() {
  return (
    <>
      <FeedSubsection
        icon={<Star size={24} />}
        title="셀럽 피드"
        desc="내가 팔로우한 문화 인플루언서들의 이야기"
        items={FEED_ITEMS}
      />

      <FeedSubsection
        icon={<Users size={24} />}
        title="친구 피드"
        desc="함께 기록하는 친구들의 소식"
        items={FRIENDS_FEED}
      />

      <FeedSubsection
        icon={<Search size={24} />}
        title="새로운 발견"
        desc="취향이 비슷한 새로운 사람들을 만나보세요"
        items={DISCOVERY_FEED}
      />
    </>
  );
}
