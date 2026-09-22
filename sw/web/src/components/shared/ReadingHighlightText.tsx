"use client";

import { useMemo } from "react";
import FormattedText from "../ui/FormattedText";

interface ReadingHighlightTextProps {
  text: string;
  /** 원문 기준 강조 범위(재생 문장 등) — 겹치는 문단 안을 <mark>로 감싼다 */
  mark?: { start: number; end: number } | null;
}

/** 빈 줄을 문단 경계로 쓰는 읽어보기·가상독백 본문에 재생 문장 강조를 입힌다. */
export default function ReadingHighlightText({ text, mark }: ReadingHighlightTextProps) {
  const paragraphs = useMemo(
    () => Array.from(text.matchAll(/[^\n]+(?:\n(?!\n)[^\n]+)*/g), (match) => ({ text: match[0], start: match.index })),
    [text],
  );
  return (
    <>
      {paragraphs.map((paragraph) => {
        const start = mark ? Math.max(0, mark.start - paragraph.start) : 0;
        const end = mark ? Math.min(paragraph.text.length, mark.end - paragraph.start) : 0;
        return (
          <p key={paragraph.start}>
            <FormattedText text={paragraph.text} mark={end > start ? { start, end } : null} />
          </p>
        );
      })}
    </>
  );
}
