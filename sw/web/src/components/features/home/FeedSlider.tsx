"use client";

import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import ReviewCard from "@/components/features/home/ReviewCard";
import type { CelebReview as Review } from "@/types/home";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

interface FeedSliderProps {
  reviews: Review[];
}

export default function FeedSlider({ reviews }: FeedSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = containerRef.current;
    setShowLeftArrow(scrollLeft > 0);
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
  };

  const scroll = (direction: "left" | "right") => {
    if (!containerRef.current) return;
    const { clientWidth } = containerRef.current;
    const scrollAmount = direction === "left" ? -clientWidth / 1.5 : clientWidth / 1.5;
    
    containerRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
  };

  return (
    <div className="relative group/slider">
      {/* Navigation Buttons (Desktop) */}
      <button
        onClick={() => scroll("left")}
        className={`hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-20 w-12 h-12 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm border border-white/10 text-white hover:bg-accent hover:text-black transition-all duration-300 ${!showLeftArrow ? "opacity-0 pointer-events-none" : "opacity-0 group-hover/slider:opacity-100"}`}
        aria-label="Previous slide"
      >
        <ArrowLeft size={20} />
      </button>

      <button
        onClick={() => scroll("right")}
        className={`hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-20 w-12 h-12 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm border border-white/10 text-white hover:bg-accent hover:text-black transition-all duration-300 ${!showRightArrow ? "opacity-0 pointer-events-none" : "opacity-0 group-hover/slider:opacity-100"}`}
        aria-label="Next slide"
      >
        <ArrowRight size={20} />
      </button>

      {/* Slider Container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto pb-4 scrollbar-hidden snap-x snap-mandatory"
      >
        {reviews.map((review, idx) => (
          <div
            key={review.id}
            className={`flex-shrink-0 w-[48%] snap-start ${idx > 0 ? "ml-3" : ""}`}
          >
            <ReviewCard
              userId={review.celeb.id}
              userName={review.celeb.nickname}
              userAvatar={review.celeb.avatar_url}
              userSubtitle={review.celeb.profession || "Celeb"}
              isOfficial={review.celeb.is_verified}
              contentType={review.content.type}
              contentId={review.content.id}
              contentTitle={review.content.title}
              contentCreator={review.content.creator}
              contentThumbnail={review.content.thumbnail_url}
              review={review.review}
              timeAgo={formatDistanceToNow(new Date(review.updated_at), { addSuffix: true, locale: ko })}
              isSpoiler={review.is_spoiler}
              sourceUrl={review.source_url}
              href={`/contents/${review.content.id}`}
            />
          </div>
        ))}

        {/* End Spacer */}
        <div className="w-4 flex-shrink-0" />
      </div>
    </div>
  );
}
