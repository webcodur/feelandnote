"use client";

import type { BaseCardProps } from "./base/BaseCard";
import BookCard from "./variants/BookCard";
import VideoCard from "./variants/VideoCard";
import GameCard from "./variants/GameCard";
import PerformanceCard from "./variants/PerformanceCard";

/**
 * ContentCard Factory
 * 콘텐츠 타입에 따라 적절한 카드 컴포넌트를 렌더링
 */
export default function ContentCard(props: BaseCardProps) {
  const contentType = props.item.content.type;

  switch (contentType) {
    case "BOOK":
      return <BookCard {...props} />;
    case "VIDEO":
      return <VideoCard {...props} />;
    case "GAME":
      return <GameCard {...props} />;
    case "PERFORMANCE":
      return <PerformanceCard {...props} />;
    default:
      // fallback: BookCard 스타일 사용
      return <BookCard {...props} />;
  }
}

// 개별 카드도 필요한 경우 직접 import 가능하도록 re-export
export { BookCard, VideoCard, GameCard, PerformanceCard };
export type { BaseCardProps as ContentCardProps };
