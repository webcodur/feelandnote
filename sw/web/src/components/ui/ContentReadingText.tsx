import type { CSSProperties, ReactNode } from "react";

import FormattedText from "./FormattedText";

type ContentReadingTone = "primary" | "secondary";
type ContentReadingSize = "compact" | "reader" | "modal";

interface ContentReadingTextProps {
  text?: string | null;
  children?: ReactNode;
  tone?: ContentReadingTone;
  size?: ContentReadingSize;
  className?: string;
  style?: CSSProperties;
  highlightClassName?: string;
  highlightStyle?: CSSProperties;
}

const SIZE_CLASSES: Record<ContentReadingSize, string> = {
  compact: "text-sm leading-relaxed",
  reader: "text-base leading-relaxed lg:text-lg",
  modal: "text-base leading-[1.9]",
};

const TONE_CLASSES: Record<ContentReadingTone, string> = {
  primary: "text-text-primary",
  secondary: "text-text-secondary",
};

/** 작품 소개·감상평이 어디에서 열리든 같은 본문 위계와 특수부호 처리를 사용한다. */
export default function ContentReadingText({
  text,
  children,
  tone = "primary",
  size = "compact",
  className = "",
  style,
  highlightClassName,
  highlightStyle,
}: ContentReadingTextProps) {
  const content = children ?? (
    text ? (
      <FormattedText
        text={text}
        highlightClassName={highlightClassName}
        highlightStyle={highlightStyle}
      />
    ) : null
  );

  if (content == null || content === false) return null;

  return (
    <div
      className={`block whitespace-pre-wrap break-words font-sans ${SIZE_CLASSES[size]} ${TONE_CLASSES[tone]} ${className}`}
      style={style}
    >
      {content}
    </div>
  );
}
