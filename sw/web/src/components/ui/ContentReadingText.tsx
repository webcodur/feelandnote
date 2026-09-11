import type { CSSProperties, ReactNode, Ref } from "react";

import FormattedText from "./FormattedText";

type ContentReadingTone = "primary" | "secondary";
type ContentReadingSize = "compact" | "reader" | "modal";

interface ContentReadingTextProps {
  text?: string | null;
  /** 넘침 측정처럼 바깥에서 본문 상자를 직접 재야 할 때 쓴다 */
  ref?: Ref<HTMLDivElement>;
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
  ref,
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
      ref={ref}
      className={`block whitespace-pre-wrap break-words font-sans ${SIZE_CLASSES[size]} ${TONE_CLASSES[tone]} ${className}`}
      style={style}
    >
      {content}
    </div>
  );
}
