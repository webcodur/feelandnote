"use client";

import MainLayout from "@/components/layout/MainLayout";
import { FEED_ITEMS, FRIENDS_FEED, DISCOVERY_FEED } from "@/lib/mock-data";
import { Card, Avatar, Badge } from "@/components/ui";
import { Star, Users, Search, Heart, MessageCircle } from "lucide-react";

export default function FeedPage() {
  return (
    <MainLayout>
      <div className="feed-container">
        {/* 셀럽 섹션 */}
        <div className="feed-subsection">
          <div className="subsection-header-full">
            <span className="subsection-icon"><Star size={24} className="text-accent" /></span>
            <div className="header-text">
              <div className="subsection-title">셀럽 피드</div>
              <div className="subsection-desc">내가 팔로우한 문화 인플루언서들의 이야기</div>
            </div>
          </div>
          <div className="feed-grid-full">
            {FEED_ITEMS.map((item) => (
              <FeedCard key={item.id} item={item} />
            ))}
          </div>
        </div>

        {/* 친구 섹션 */}
        <div className="feed-subsection">
          <div className="subsection-header-full">
            <span className="subsection-icon"><Users size={24} className="text-accent" /></span>
            <div className="header-text">
              <div className="subsection-title">친구 피드</div>
              <div className="subsection-desc">함께 기록하는 친구들의 소식</div>
            </div>
          </div>
          <div className="feed-grid-full">
            {FRIENDS_FEED.map((item) => (
              <FeedCard key={item.id} item={item} />
            ))}
          </div>
        </div>

        {/* 발견 섹션 */}
        <div className="feed-subsection">
          <div className="subsection-header-full">
            <span className="subsection-icon"><Search size={24} className="text-accent" /></span>
            <div className="header-text">
              <div className="subsection-title">새로운 발견</div>
              <div className="subsection-desc">취향이 비슷한 새로운 사람들을 만나보세요</div>
            </div>
          </div>
          <div className="feed-grid-full">
            {DISCOVERY_FEED.map((item) => (
              <FeedCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

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
    <Card hover className="feed-card-full">
      <div className="feed-card-header">
        <Avatar size="md" gradient={item.avatarColor} />
        <div className="user-info-full">
          <div className="user-name">{item.user}</div>
          <div className="post-meta">
            <Badge variant="primary">{item.action}</Badge>
            <span>{item.time}</span>
          </div>
        </div>
      </div>
      <div className="feed-card-content">
        <div className="content-title">{item.title}</div>
        <div className="content-preview-full">{item.content}</div>
      </div>
      <div className="feed-card-footer">
        <div className="interaction-item"><Heart size={16} /> {item.likes}</div>
        <div className="interaction-item"><MessageCircle size={16} /> {item.comments}</div>
      </div>
    </Card>
  );
}
