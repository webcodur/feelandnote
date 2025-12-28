"use client";

import FeedPostCard from "./FeedPostCard";
import type { SubTab } from "./ArchiveDetailTabs";

const FEED_REVIEWS = [
  { user: "독서광", avatar: "🧙‍♂️", time: "2시간 전", rating: "★★★★★", content: "다시 봐도 명작입니다. 처음 호그와트에 들어가는 장면은 언제 봐도 가슴이 뜁니다.", likes: 24, comments: 5 },
  { user: "마법사A", avatar: "🧙", time: "5시간 전", rating: "★★★★☆", content: "처음 읽었을 때의 감동이 아직도 생생합니다.", likes: 18, comments: 3 },
];

const FEED_NOTES = [
  { user: "영화매니아", avatar: "🎬", time: "5시간 전", progress: "47%", content: "1장 메모: 프리벳가 4번지의 묘사가 인상적이다.", likes: 12, comments: 2 },
  { user: "책벌레", avatar: "📖", time: "1일 전", progress: "완독", content: "3줄 요약: 마법사의 세계, 우정, 그리고 선택", likes: 8, comments: 1 },
];

const FEED_CREATIONS = [
  { user: "판타지러버", avatar: "📚", time: "1일 전", type: "What If", typeClass: "bg-red-500/20 text-red-400", title: "해리가 슬리데린이었다면?", content: "드레이코와의 관계가 어떻게 달라졌을지...", likes: 38, comments: 15 },
  { user: "OST덕후", avatar: "🎵", time: "3일 전", type: "OST", typeClass: "bg-blue-500/20 text-blue-400", title: "호그와트 입학 장면 BGM", content: "웅장한 오케스트라와 신비로운 첼레스타", likes: 22, comments: 8 },
];

interface FeedSectionProps {
  subTab: SubTab;
}

export default function FeedSection({ subTab }: FeedSectionProps) {
  const renderPosts = () => {
    if (subTab === "review") {
      return FEED_REVIEWS.map((post, i) => (
        <FeedPostCard key={i} {...post} />
      ));
    }
    if (subTab === "note") {
      return FEED_NOTES.map((post, i) => (
        <FeedPostCard key={i} {...post} />
      ));
    }
    return FEED_CREATIONS.map((post, i) => (
      <FeedPostCard key={i} {...post} />
    ));
  };

  return (
    <div className="animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3">
        {renderPosts()}
      </div>
    </div>
  );
}
