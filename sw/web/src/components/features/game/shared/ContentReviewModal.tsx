/*
  파일명: components/features/game/shared/ContentReviewModal.tsx
  기능: 콘텐츠 리뷰 모달
  책임: ContentCard에서 추출한 리뷰 표시 모달. 게임 결과/ContentCard 공통 사용
*/
"use client";

import Modal, { ModalBody } from "@/components/ui/Modal";
import FormattedText from "@/components/ui/FormattedText";

import type { TitleBadge } from "@/lib/utils/content-locale";
import {
  getPresetByKeyword,
  getSentimentColorClasses,
} from "@/constants/review-presets";
import { useTranslations } from "next-intl";

export interface ContentReviewModalProps {
  contentType: string | null | undefined;
  isOpen: boolean;
  onClose: () => void;
  title: string;
  titleBadge?: TitleBadge | null;
  creator?: string | null;
  review?: string | null;
  reviewPresets?: string[] | null;
  isSpoiler?: boolean;
  sourceUrl?: string | null;
  ownerNickname?: string;
  contentDetailUrl?: string;
  zIndex?: number;
}

export default function ContentReviewModal({
  title,
  isOpen,
  onClose,
  review,
  reviewPresets,
  isSpoiler,
  sourceUrl,
  ownerNickname,
  zIndex,
}: ContentReviewModalProps) {
  const t = useTranslations("content.reviewModal");

  const reviewTitle = ownerNickname ? `${title} — ${ownerNickname}` : title || t("review");

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={reviewTitle} titleClassName="font-semibold break-words text-text-primary" stickyHeader size="md" zIndex={zIndex}>
      <ModalBody>
        {review && !isSpoiler ? (
          <div className="custom-scrollbar pr-2 mb-2">
            {reviewPresets && reviewPresets.length > 0 && (
              <PresetTags presets={reviewPresets} />
            )}
            <p className="text-sm text-text-primary leading-relaxed whitespace-pre-line break-words">
              <FormattedText text={review} />
            </p>
          </div>
        ) : review && isSpoiler ? (
          <p className="text-sm italic">
            {t("spoiler")}
          </p>
        ) : reviewPresets && reviewPresets.length > 0 ? (
          <div className="custom-scrollbar pr-2 mb-2">
            <PresetTags presets={reviewPresets} />
          </div>
        ) : (
          <p className="text-sm italic">
            {t("noReview")}
          </p>
        )}

        {/* 리뷰 출처 링크 */}
        <div className="mt-3 text-xs break-all text-center">
          {sourceUrl ? (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-accent/60 hover:text-accent underline underline-offset-2"
            >
              {t("source", { url: sourceUrl })}
            </a>
          ) : (
            <span className="text-red-500 font-semibold">
              {t("noSource")}
            </span>
          )}
        </div>
      </ModalBody>
    </Modal>
  );
}

function PresetTags({ presets }: { presets: string[] }) {
  return (
    <div className="flex flex-wrap justify-center gap-1.5 mb-3">
      {presets.map((presetKeyword, idx) => {
        const preset = getPresetByKeyword(presetKeyword);
        const sentiment = preset?.sentiment || "etc";
        const colorClasses = getSentimentColorClasses(sentiment);

        return (
          <span
            key={`${presetKeyword}-${idx}`}
            className={`px-2 py-0.5 rounded-full border text-[10px] sm:text-xs font-medium whitespace-nowrap ${colorClasses}`}
          >
            {presetKeyword}
          </span>
        );
      })}
    </div>
  );
}
