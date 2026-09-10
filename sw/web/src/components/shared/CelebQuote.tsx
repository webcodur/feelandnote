"use client";

import { FormattedText } from "@/components/ui";
import styles from "./CelebQuote.module.css";

export interface CelebQuoteProps {
  text: string | null | undefined;
  hasVoice?: boolean;
  isVoiceActive?: boolean;
  isQuoteActive?: boolean;
  onPlay?: () => void;
  playLabel: string;
  stopLabel: string;
  variant?: "detail" | "modal";
  className?: string;
}

export default function CelebQuote({
  text,
  hasVoice = false,
  isVoiceActive = false,
  isQuoteActive = false,
  onPlay,
  playLabel,
  stopLabel,
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
          aria-label={isVoiceActive ? stopLabel : playLabel}
          aria-pressed={isQuoteActive}
          title={isVoiceActive ? stopLabel : playLabel}
        >
          {quoteContent}
        </button>
      ) : (
        <p>{quoteContent}</p>
      )}
    </div>
  );
}
