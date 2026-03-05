"use client";

import { useRef, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { ArrowLeft, ArrowRight, User } from "lucide-react";
import { ContentCard } from "@/components/ui/cards";
import { Avatar, TitleBadge, Modal, ModalBody, ModalFooter } from "@/components/ui";
import Button from "@/components/ui/Button";
import type { CelebReview as Review } from "@/types/home";
import { getCelebProfileUrl } from "@/lib/url";
import { getLocalizedContent } from "@/lib/utils/editions";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { useTranslations, useLocale } from "next-intl";

// #region Inline Slider Feed Card
function SliderFeedCard({ review }: { review: Review }) {
  const router = useRouter();
  const [showUserModal, setShowUserModal] = useState(false);
  const t = useTranslations("home.ui");
  const locale = useLocale();

  const timeAgo = formatDistanceToNow(new Date(review.updated_at), { addSuffix: true, locale: ko });

  const handleNavigateToUser = () => {
    setShowUserModal(false);
    router.push(getCelebProfileUrl({ ...review.celeb, profile_type: 'CELEB' }));
  };

  const headerNode = (
    <div className="flex items-center gap-4 py-1">
      <button
        type="button"
        className="flex-shrink-0 cursor-pointer"
        onClick={(e) => { e.stopPropagation(); setShowUserModal(true); }}
      >
        <Avatar url={review.celeb.avatar_url} name={review.celeb.nickname} size="md" className="ring-1 ring-accent/30 rounded-full shadow-lg" />
      </button>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="text-sm font-bold text-text-primary tracking-tight hover:text-accent cursor-pointer"
            onClick={(e) => { e.stopPropagation(); setShowUserModal(true); }}
          >
            {review.celeb.nickname}
          </button>
          <TitleBadge title={null} size="sm" />
          {review.celeb.is_verified && (
            <span className="bg-[#d4af37] text-black text-[8px] px-1.5 py-0.5 font-black font-cinzel leading-none tracking-tight">
              OFFICIAL
            </span>
          )}
        </div>
        <p className="text-[10px] text-accent/60 font-medium font-sans uppercase tracking-wider">
          {review.celeb.profession || "Celeb"} · {timeAgo}
        </p>
      </div>
    </div>
  );

  return (
    <>
      <ContentCard
        contentId={review.content.id}
        contentType={review.content.type}
        title={getLocalizedContent(review.content, locale).title}
        creator={getLocalizedContent(review.content, locale).creator}
        thumbnail={review.content.thumbnail_url}
        review={(locale === 'en' && review.review_en) ? review.review_en : review.review}
        isSpoiler={review.is_spoiler}
        sourceUrl={review.source_url}
        href={`/contents/${review.content.id}`}
        ownerNickname={review.celeb.nickname}
        headerNode={headerNode}
        heightClass="h-[320px] md:h-[280px]"
        titleKo={review.content.title_ko}
        titleEn={review.content.title_en}
        creatorEn={review.content.creator_en}
        thumbnailEn={review.content.thumbnail_en}
        hasEnEdition={review.content.has_en_edition}
      />

      <Modal isOpen={showUserModal} onClose={() => setShowUserModal(false)} title={t("visitArchive")} icon={User} size="sm" closeOnOverlayClick>
        <ModalBody>
          <p className="text-text-secondary">
            {t("visitArchiveConfirm", { name: review.celeb.nickname })}
          </p>
        </ModalBody>
        <ModalFooter className="justify-end">
          <Button variant="ghost" size="md" onClick={() => setShowUserModal(false)}>{t("cancel")}</Button>
          <Button variant="primary" size="md" onClick={handleNavigateToUser}>{t("go")}</Button>
        </ModalFooter>
      </Modal>
    </>
  );
}
// #endregion

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
            <SliderFeedCard review={review} />
          </div>
        ))}

        {/* End Spacer */}
        <div className="w-4 flex-shrink-0" />
      </div>
    </div>
  );
}
