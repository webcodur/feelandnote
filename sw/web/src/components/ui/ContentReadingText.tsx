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
  /** 원문 기준 강조 범위(재생 문장 등) — FormattedText에 전달한다 */
  mark?: { start: number; end: number } | null;
  /** 본문을 눌러 전문을 여는 조작. 있으면 버튼 역할·키보드·즉각 hover 반응을 단다 */
  onClick?: () => void;
  clickLabel?: string;
}

const SIZE_CLASSES: Record<ContentReadingSize, string> = {
  compact: "text-sm leading-relaxed",
  reader: "text-base leading-relaxed lg:text-lg",
  modal: "text-[15px] leading-[1.8] sm:text-base",
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
  onClick,
  clickLabel,
  mark,
  ref,
}: ContentReadingTextProps) {
  const content = children ?? (
    text ? (
      <FormattedText
        text={text}
        highlightClassName={highlightClassName}
        highlightStyle={highlightStyle}
        mark={mark}
      />
    ) : null
  );

  if (content == null || content === false) return null;

  const interactive = !!onClick;

  return (
    <div
      ref={ref}
      className={`block whitespace-pre-wrap break-words font-sans ${SIZE_CLASSES[size]} ${TONE_CLASSES[tone]} ${
        interactive
          ? "cursor-pointer hover:brightness-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70"
          : ""
      } ${className}`}
      style={style}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-haspopup={interactive ? "dialog" : undefined}
      aria-label={interactive ? clickLabel : undefined}
      title={interactive ? clickLabel : undefined}
      onClick={
        interactive
          ? () => {
              // 글을 긁으려던 클릭(드래그 선택)은 모달을 열지 않는다
              if (!window.getSelection()?.toString()) onClick?.();
            }
          : undefined
      }
      onKeyDown={
        interactive
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
    >
      {content}
    </div>
  );
}
