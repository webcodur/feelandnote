"use client";

import React, { useState } from "react";
import { User } from "lucide-react";
import type { CelebProfile } from "@/types/home";
import type { CelebReview } from "@/types/home";
import { ContentCard } from "@/components/ui/cards";
import { Avatar, BlurDissolve, TitleBadge, Modal as UiModal, ModalBody, ModalFooter } from "@/components/ui";
import Button from "@/components/ui/Button";
import { updateUserContentRating } from "@/actions/contents/updateRating";
import RatingEditModal from "@/components/ui/cards/ContentCard/modals/RatingEditModal";
import { getLocalizedContent } from "@/lib/utils/editions";
import { formatDistanceToNow } from "date-fns";
import { ko, enUS } from "date-fns/locale";
import { useRouter } from "@/i18n/navigation";
import { useTranslations, useLocale } from "next-intl";

const DATE_LOCALES = { ko, en: enUS } as const;

export function CelebReviewCard({ review, celeb, onRatingUpdate, modalZIndex }: { review: CelebReview; celeb: CelebProfile; onRatingUpdate?: (id: string, rating: number | null) => void; modalZIndex?: number }) {
  const router = useRouter();
  const [showUserModal, setShowUserModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [currentRating, setCurrentRating] = useState<number | null>(review.rating);
  const t = useTranslations("home.ui");
  const locale = useLocale();
  const isEn = locale === "en";
  const reviewDisplayName = (isEn && celeb.nickname_en) || celeb.nickname;
  const reviewDisplayTitle = (isEn && celeb.title_en) || celeb.title;

  const timeAgo = formatDistanceToNow(new Date(review.updated_at), { addSuffix: true, locale: DATE_LOCALES[locale as keyof typeof DATE_LOCALES] ?? ko });

  /* 인물 상세는 `/celeb/<이름>`이 정본 주소다. `/<식별자>`는 회원 전용 자리라
     인물을 넣으면 404가 난다(26.08.10 확인 — 인물 조회는 slug로만 한다). */
  const handleNavigateToUser = () => {
    setShowUserModal(false);
    router.push(`/celeb/${celeb.slug ?? celeb.id}`);
  };

  const headerNode = (
    <div className="flex items-center gap-4 py-1">
      <button
        type="button"
        className="flex-shrink-0 cursor-pointer"
        onClick={(e) => { e.stopPropagation(); setShowUserModal(true); }}
      >
        <BlurDissolve>
          <Avatar url={celeb.avatar_url} name={reviewDisplayName} size="md" className="ring-1 ring-accent/30 rounded-full shadow-lg" />
        </BlurDissolve>
      </button>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="text-sm font-bold text-text-primary tracking-tight hover:text-accent cursor-pointer"
            onClick={(e) => { e.stopPropagation(); setShowUserModal(true); }}
          >
            {reviewDisplayName}
          </button>
          <TitleBadge title={null} size="sm" />
          {celeb.is_verified && (
            <span className="bg-[#d4af37] text-black text-[8px] px-1.5 py-0.5 font-black font-cinzel leading-none tracking-tight">
              OFFICIAL
            </span>
          )}
        </div>
        <p className="text-[10px] text-accent/60 font-medium font-sans uppercase tracking-wider">
          {reviewDisplayTitle || t("recorder")} · {timeAgo}
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
        celebCount={review.content.celeb_count}
        userCount={review.content.user_count}
        rating={currentRating}
        onRatingClick={(e) => { e.stopPropagation(); setShowRatingModal(true); }}
        review={(locale === 'en' && review.review_en) ? review.review_en : review.review}
        isSpoiler={review.is_spoiler}
        sourceUrl={review.source_url}
        href=""
        ownerNickname={reviewDisplayName}
        headerNode={headerNode}
        heightClass="h-[320px] md:h-[280px]"
        modalZIndex={modalZIndex}
        titleKo={review.content.title_ko}
        titleEn={review.content.title_en}
        creatorEn={review.content.creator_en}
        thumbnailEn={review.content.thumbnail_en}
        hasEnEdition={review.content.has_en_edition}
      />

      <RatingEditModal
        isOpen={showRatingModal}
        onClose={() => setShowRatingModal(false)}
        contentTitle={review.content.title}
        currentRating={currentRating}
        onSave={async (rating) => {
          const result = await updateUserContentRating({ userContentId: review.id, rating });
          if (result.success) {
            setCurrentRating(rating);
            onRatingUpdate?.(review.id, rating);
          }
        }}
        zIndex={modalZIndex}
      />

      <UiModal isOpen={showUserModal} onClose={() => setShowUserModal(false)} title={t("visitArchive")} icon={User} size="sm" closeOnOverlayClick zIndex={modalZIndex}>
        <ModalBody>
          <p className="text-text-secondary">
            {t("visitArchiveConfirm", { name: reviewDisplayName })}
          </p>
        </ModalBody>
        <ModalFooter className="justify-end">
          <Button variant="ghost" size="md" onClick={() => setShowUserModal(false)}>{t("cancel")}</Button>
          <Button variant="primary" size="md" onClick={handleNavigateToUser}>{t("go")}</Button>
        </ModalFooter>
      </UiModal>
    </>
  );
}
