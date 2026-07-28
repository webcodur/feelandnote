/*
  파일명: components/features/game/shared/ContentReviewModal.tsx
  기능: 콘텐츠 리뷰 모달
  책임: ContentCard에서 추출한 리뷰 표시 모달. 게임 결과/ContentCard 공통 사용
*/
"use client";

import { Link } from "@/i18n/navigation";
import { ExternalLink } from "lucide-react";
import Modal, { ModalBody, ModalFooter } from "@/components/ui/Modal";
import FormattedText from "@/components/ui/FormattedText";
import {
  getPresetByKeyword,
  getSentimentColorClasses,
} from "@/constants/review-presets";
import { useTranslations } from "next-intl";

export interface ContentReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
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
  isOpen,
  onClose,
  title,
  creator,
  review,
  reviewPresets,
  isSpoiler,
  sourceUrl,
  ownerNickname,
  contentDetailUrl,
  zIndex,
}: ContentReviewModalProps) {
  const t = useTranslations("content.reviewModal");

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" zIndex={zIndex}>
      <ModalBody>
        <div className="mb-4 pb-3 border-b border-border/30">
          <h3 className="text-base font-semibold text-text-primary line-clamp-2">
            {title}
          </h3>
          {creator && (
            <p className="text-xs text-text-secondary line-clamp-1 mt-1">
              {creator.replace(/\^/g, ", ")}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-medium text-text-secondary">
            {ownerNickname
              ? t("ownerReview", { name: ownerNickname })
              : t("review")}
          </h4>
        </div>

        {review && !isSpoiler ? (
          <div className="max-h-[50vh] overflow-y-auto custom-scrollbar pr-2 mb-2">
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
          <div className="max-h-[50vh] overflow-y-auto custom-scrollbar pr-2 mb-2">
            <PresetTags presets={reviewPresets} />
          </div>
        ) : (
          <p className="text-sm italic">
            {t("noReview")}
          </p>
        )}

        {/* 출처 링크 */}
        <div className="mt-3 text-xs break-all">
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
      {contentDetailUrl && (
        <ModalFooter>
          <Link
            href={contentDetailUrl}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-5 text-sm font-medium rounded-lg bg-accent text-white hover:bg-accent-hover"
          >
            <ExternalLink size={14} />
            {t("detail")}
          </Link>
        </ModalFooter>
      )}
    </Modal>
  );
}

function PresetTags({ presets }: { presets: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5 mb-3">
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
