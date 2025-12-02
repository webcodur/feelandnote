import { FEED_ITEMS, FRIENDS_FEED, DISCOVERY_FEED } from "@/lib/mock-data";
import { Card, Avatar, Badge } from "@/components/ui";
import { Star, Users, Search, Heart, MessageCircle } from "lucide-react";

export default function FeedSection() {
  return (
    <div className="card feed-section">
      <div className="card-header">
        <div className="card-title">📰 새 소식</div>
        <div className="card-action">피드 전체보기 →</div>
      </div>

      {/* Celebrities Section */}
      <div className="feed-subsection">
        <div className="subsection-header">
          <span className="subsection-icon"><Star size={20} className="text-accent" /></span>
          <span className="subsection-title">셀럽</span>
          <span className="subsection-count">· 팔로우 중인 문화 인플루언서</span>
        </div>
        <div className="feed-items">
          {FEED_ITEMS.map((item) => (
            <Card key={item.id} hover className="feed-card">
              <div className="feed-card-header">
                <Avatar size="md" gradient={item.avatarColor} />
                <div className="feed-user-info">
                  <div className="user-name">{item.user}</div>
                  <div className="feed-meta">
                    <Badge variant="primary">{item.action}</Badge>
                    <span>{item.time}</span>
                  </div>
                </div>
              </div>
              <div className="feed-card-content">
                <div className="content-title">{item.title}</div>
                <div className="content-preview">{item.content}</div>
              </div>
              <div className="feed-card-footer">
                <div className="interaction-item"><Heart size={16} /> {item.likes}</div>
                <div className="interaction-item"><MessageCircle size={16} /> {item.comments}</div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Friends Section */}
      <div className="feed-subsection">
        <div className="subsection-header">
          <span className="subsection-icon"><Users size={20} className="text-accent" /></span>
          <span className="subsection-title">친구</span>
          <span className="subsection-count">· 상호 팔로우 중</span>
        </div>
        <div className="feed-items">
          {FRIENDS_FEED.map((item) => (
            <Card key={item.id} hover className="feed-card">
              <div className="feed-card-header">
                <Avatar size="md" gradient={item.avatarColor} />
                <div className="feed-user-info">
                  <div className="user-name">{item.user}</div>
                  <div className="feed-meta">
                    <Badge variant="primary">{item.action}</Badge>
                    <span>{item.time}</span>
                  </div>
                </div>
              </div>
              <div className="feed-card-content">
                <div className="content-title">{item.title}</div>
                <div className="content-preview">{item.content}</div>
              </div>
              <div className="feed-card-footer">
                <div className="interaction-item"><Heart size={16} /> {item.likes}</div>
                <div className="interaction-item"><MessageCircle size={16} /> {item.comments}</div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Discovery Section */}
      <div className="feed-subsection">
        <div className="subsection-header">
          <span className="subsection-icon"><Search size={20} className="text-accent" /></span>
          <span className="subsection-title">발견</span>
          <span className="subsection-count">· 취향 기반 추천</span>
        </div>
        <div className="feed-items">
          {DISCOVERY_FEED.map((item) => (
            <Card key={item.id} hover className="feed-card">
              <div className="feed-card-header">
                <Avatar size="md" gradient={item.avatarColor} />
                <div className="feed-user-info">
                  <div className="user-name">{item.user}</div>
                  <div className="feed-meta">
                    <Badge variant="primary">{item.action}</Badge>
                    <span>{item.time}</span>
                  </div>
                </div>
              </div>
              <div className="feed-card-content">
                <div className="content-title">{item.title}</div>
                <div className="content-preview">{item.content}</div>
              </div>
              <div className="feed-card-footer">
                <div className="interaction-item"><Heart size={16} /> {item.likes}</div>
                <div className="interaction-item"><MessageCircle size={16} /> {item.comments}</div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
