"use client";

import { FormattedText } from "@/components/ui";
import { NO_VERIFIED_QUOTE_EN, NO_VERIFIED_QUOTE_KO } from "@feelandnote/shared/constants/celeb-speech";
import styles from "./CelebQuote.module.css";

export interface CelebQuoteProps {
  text: string | null | undefined;
  hasVoice?: boolean;
  isQuoteActive?: boolean;
  onPlay?: () => void;
  playLabel: string;
  variant?: "detail" | "modal";
  className?: string;
}

export default function CelebQuote({
  text,
  hasVoice = false,
  isQuoteActive = false,
  onPlay,
  playLabel,
  variant = "detail",
  className = "",
}: CelebQuoteProps) {
  // 「확인된 어록이 없습니다」는 어록 부재의 자리 표시이지 보여줄 문구가 아니다 — 빈 값처럼 그리지 않는다
  const trimmed = text?.trim();
  if (!trimmed || trimmed === NO_VERIFIED_QUOTE_KO || trimmed === NO_VERIFIED_QUOTE_EN) return null;

  const quoteContent = (
    <>
      &ldquo;
      <FormattedText text={text} />
      &rdquo;
    </>
  );

  return (
    <div className={`${styles.quote} ${variant === "modal" ? styles.modal : ""} ${className}`}>
      {hasVoice && onPlay ? (
        <button
          type="button"
          onClick={onPlay}
          className={`${styles.quoteButton} ${isQuoteActive ? styles.quoteButtonPlaying : ""}`}
          aria-label={playLabel}
          aria-pressed={isQuoteActive}
          title={playLabel}
        >
          {quoteContent}
        </button>
      ) : (
        <p>{quoteContent}</p>
      )}
    </div>
  );
}
