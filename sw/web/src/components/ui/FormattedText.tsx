import InlineFormattedText, { type FormattedTextProps } from "./formatted-text/InlineFormattedText";
import { splitTextBlocks } from "./formatted-text/structure";

export { emphasisSpans, emphasisDelimiters, emphasisClassName } from "./formatted-text/emphasis";
export { splitReadableParagraphs } from "./formatted-text/structure";

interface Props extends FormattedTextProps {
  /** 본문 표시가 필요한 호출부에서 명시한다. 짧은 글·댓글의 기본은 inline. */
  layout?: "inline" | "prose";
}

export const TEXT_HEADING_CLASS = "mb-[0.75em] block font-semibold text-text-primary";

export function TextSectionBreak() {
  return <span role="separator" className="my-[1.5em] block text-center text-text-tertiary">
    <span aria-hidden="true">- - -</span>
  </span>;
}

/** 강조와 낭독 오프셋은 유지하고, 작성된 문단·구획 경계만 표시한다. */
export default function FormattedText({ text, className = "", layout, mark, ...emphasis }: Props) {
  if (!text) return null;
  const wrapping = `[overflow-wrap:anywhere] ${className}`;
  const prose = layout === "prose";
  if (!prose) return <InlineFormattedText text={text} className={wrapping} mark={mark} {...emphasis} />;

  const blocks = splitTextBlocks(text);
  return (
    <span className={wrapping} data-formatted-layout="prose">
      {blocks.map((block, index) => {
        if (block.kind === "section") {
          return <TextSectionBreak key={block.start} />;
        }
        const start = mark ? Math.max(0, mark.start - block.start) : 0;
        const end = mark ? Math.min(block.text.length, mark.end - block.start) : 0;
        const spacing = index === 0 ? "" : blocks[index - 1].kind !== "paragraph" ? "block" : "mt-[1em] block";
        const heading = block.kind === "heading";
        return (
          <span key={block.start} className={`${spacing} ${heading ? TEXT_HEADING_CLASS : ""}`}
            data-text-paragraph={!heading || undefined} data-text-heading={heading || undefined}
            role={heading ? "heading" : undefined} aria-level={heading ? 3 : undefined}>
            <InlineFormattedText text={block.text} mark={end > start ? { start, end } : null} {...emphasis} />
          </span>
        );
      })}
    </span>
  );
}
