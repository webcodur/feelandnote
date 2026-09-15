"use client";

import { FormattedText } from "@/components/ui";
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
  if (!text) return null;

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
