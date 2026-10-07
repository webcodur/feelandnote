"use client";

import { useId, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Star } from "lucide-react";
import Button from "@/components/ui/Button";
import { addContent } from "@/actions/contents/addContent";
import { updateReview } from "@/actions/contents/updateReview";
import { SIMPLE_REVIEW_PRESETS } from "@/constants/review-presets";
import type { ContentDetailData } from "@/actions/contents/getContentDetail";
import styles from "./ContentDetail.module.css";

interface MyReviewSectionProps {
  content: ContentDetailData["content"];
  userRecord: ContentDetailData["userRecord"];
  onRecordChange: (record: ContentDetailData["userRecord"]) => void;
}

// 직접 작성과 짧은 반응 중 하나로 기록한다. 반응 선택 중에도 직접 작성하던 초안은 보존한다.
export default function MyReviewSection({ content, userRecord, onRecordChange }: MyReviewSectionProps) {
  const t = useTranslations("contentDetail.review");
  const tError = useTranslations("actionErrors");
  const [isPending, startTransition] = useTransition();
  const groupName = useId();
  const savedReaction = SIMPLE_REVIEW_PRESETS.find(preset => userRecord?.reviewPresets
    ?.some(value => value === preset.keyword || value === preset.id))?.id ?? null;
  const [selection, setSelection] = useState<string | null>(savedReaction);
  const [rating, setRating] = useState<number | null>(userRecord?.rating ?? null);
  const [review, setReview] = useState(userRecord?.review ?? "");
  const [isSpoiler, setIsSpoiler] = useState(userRecord?.isSpoiler ?? false);
  const [feedback, setFeedback] = useState<"saved" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const selectedPreset = SIMPLE_REVIEW_PRESETS.find(preset => preset.id === selection);
  const manualDisabled = isPending || !!selectedPreset;
  const hasChanges = selectedPreset ? selection !== savedReaction
    : selection !== savedReaction || rating !== (userRecord?.rating ?? null)
      || review !== (userRecord?.review ?? "") || isSpoiler !== (userRecord?.isSpoiler ?? false);
  const clearFeedback = () => { setFeedback(null); setError(null); };
  const activateManualReview = () => {
    if (selectedPreset && !isPending) {
      setSelection(null);
      clearFeedback();
    }
  };

  const handleSave = () => {
    if (!hasChanges || isPending) return;
    startTransition(async () => {
      setFeedback(null);
      setError(null);
      try {
        let userContentId = userRecord?.id;
        let existingRecord;
        if (!userContentId) {
          const added = await addContent({
            id: content.id, type: content.type, title: content.title,
            creator: content.creator, thumbnailUrl: content.thumbnail,
            description: content.description, releaseDate: content.releaseDate,
          });
          if (!added.success) {
            setError(tError(added.error));
            return;
          }
          userContentId = added.data.userContentId;
          existingRecord = added.data.existingRecord;
        }
        const reviewPresets = selectedPreset ? [selectedPreset.keyword] : [];
        const nextRating = selectedPreset ? userRecord?.rating ?? existingRecord?.rating ?? null
          : userRecord || rating !== null ? rating : existingRecord?.rating ?? null;
        const nextReview = selectedPreset ? userRecord?.review ?? existingRecord?.review ?? null
          : userRecord || review ? review.trim() || null : existingRecord?.review || null;
        const nextSpoiler = selectedPreset ? userRecord?.isSpoiler ?? false : isSpoiler;
        const result = await updateReview(selectedPreset ? { userContentId, reviewPresets }
          : { userContentId, rating: nextRating, review: nextReview, isSpoiler: nextSpoiler, reviewPresets });
        if (!result.success) {
          setError(tError(result.error));
          return;
        }
        onRecordChange({
          id: userContentId,
          status: userRecord?.status ?? "FINISHED",
          rating: nextRating,
          review: nextReview,
          reviewPresets,
          isSpoiler: nextSpoiler,
          createdAt: userRecord?.createdAt ?? new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        if (!selectedPreset) {
          setReview(nextReview ?? "");
          setRating(nextRating);
        }
        setFeedback("saved");
      } catch (err) {
        console.error("[MyReviewSection:reaction]", err);
        setError(t("saveFailed"));
      }
    });
  };

  return (
    <div className={styles.composer}>
      <div className={styles.ratingRow} data-disabled={manualDisabled}>
        <span className="text-sm text-text-secondary">{t("rating")}</span>
        <div className="flex max-w-full flex-wrap items-center justify-end gap-2">
          <div className="flex">
            {[1, 2, 3, 4, 5].map(star => (
              <Button unstyled key={star} type="button" disabled={manualDisabled}
                onClick={() => { setRating(value => value === star ? null : star); clearFeedback(); }}
                aria-label={`${t("rating")} ${star}`} aria-pressed={rating === star}
                className={styles.ratingControl}>
                <Star size={20} aria-hidden="true" className={(rating ?? 0) >= star ? "fill-accent text-accent" : ""} />
              </Button>
            ))}
          </div>
          {rating !== null && <span className="text-xs font-medium text-accent">{rating.toFixed(1)}</span>}
        </div>
      </div>
      <textarea aria-label={t("placeholder")} className={styles.reviewInput} placeholder={t("placeholder")}
        value={review} disabled={isPending} readOnly={!!selectedPreset} data-reaction-selected={!!selectedPreset}
        onFocus={activateManualReview} onClick={activateManualReview}
        onChange={event => { setReview(event.target.value); clearFeedback(); }} />
      <fieldset disabled={isPending} className={styles.reactionField}>
        <legend className="sr-only">{t("quickReactions")}</legend>
        <div className={styles.reactionGrid}>
          {SIMPLE_REVIEW_PRESETS.map(preset => (
            <label key={preset.id} className={styles.reactionOption}>
              <input type="radio" name={groupName} value={preset.id}
                checked={selection === preset.id}
                onClick={() => { if (selection === preset.id) { setSelection(null); clearFeedback(); } }}
                onChange={() => { setSelection(preset.id); clearFeedback(); }}
                className={styles.reactionRadio} />
              <span className={styles.reactionLabel}>{t(`reactions.${preset.id}`)}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className={styles.composerFooter}>
        <label className={styles.spoilerToggle}>
          <input type="checkbox" checked={isSpoiler} disabled={manualDisabled}
            className="size-4 cursor-pointer accent-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            onChange={event => { setIsSpoiler(event.target.checked); clearFeedback(); }} />
          {t("containsSpoiler")}
        </label>
        <Button variant="primary" size="sm" className="min-h-11 px-5" type="button"
          data-save-review onClick={handleSave} disabled={isPending || !hasChanges}>
          {isPending && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
          {t("save")}
        </Button>
      </div>
      <div className={styles.reviewFeedback}>
        <span role="status" aria-live="polite" className={styles.reactionStatus}>
          {feedback === "saved" ? t("saved") : ""}
        </span>
        {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      </div>
    </div>
  );
}
