"use client";

import { useMemo, type CSSProperties } from "react";
import FormattedText from "../ui/FormattedText";
import type { ReadingSegment } from "@/lib/reading-timing";

interface ReadingHighlightTextProps {
  text: string;
  /** 원문 기준 강조 범위(재생 문장 등) — 겹치는 문단 안을 <mark>로 감싼다 */
  mark?: { start: number; end: number } | null;
  /** 문장 타이밍 세그먼트 — 주면 문장 범위를 눌러 그 시점부터 재생할 수 있다 */
  segments?: ReadingSegment[] | null;
  onPlayFrom?: (seconds: number) => void;
  /** 문장 조각 버튼의 접근성 라벨 */
  sentenceLabel?: string;
  highlightClassName?: string;
  highlightStyle?: CSSProperties;
}

type Chunk = { start: number; end: number; segment: ReadingSegment | null };

/** 문단 범위 안에서 세그먼트와 겹치는 조각을 자른다. 세그먼트 사이 빈칸은 다음 문장에 붙인다. */
function paragraphChunks(paragraphStart: number, paragraphEnd: number, segments: ReadingSegment[]): Chunk[] {
  const overlapping = segments.filter((s) => s.textStart < paragraphEnd && s.textEnd > paragraphStart);
  if (!overlapping.length) return [{ start: paragraphStart, end: paragraphEnd, segment: null }];
  const chunks: Chunk[] = [];
  let cursor = paragraphStart;
  for (const segment of overlapping) {
    const start = Math.max(paragraphStart, segment.textStart);
    const end = Math.min(paragraphEnd, segment.textEnd);
    if (start > cursor) chunks.push({ start: cursor, end: start, segment });
    if (end > start) chunks.push({ start, end, segment });
    cursor = end;
  }
  if (cursor < paragraphEnd) chunks.push({ start: cursor, end: paragraphEnd, segment: overlapping[overlapping.length - 1] });
  const first = chunks[0];
  if (first && !first.segment) first.segment = overlapping[0];
  return chunks.filter((c) => c.end > c.start);
}

/** 빈 줄을 문단 경계로 쓰는 읽어보기·가상독백 본문에 재생 문장 강조를 입힌다. */
export default function ReadingHighlightText({ text, mark, segments, onPlayFrom, sentenceLabel, highlightClassName, highlightStyle }: ReadingHighlightTextProps) {
  const paragraphs = useMemo(
    () => Array.from(text.matchAll(/[^\n]+(?:\n(?!\n)[^\n]+)*/g), (match) => ({ text: match[0], start: match.index })),
    [text],
  );
  const clickable = !!(segments?.length && onPlayFrom);
  return (
    <>
      {paragraphs.map((paragraph) => {
        const paragraphEnd = paragraph.start + paragraph.text.length;
        const renderSlice = (sliceStart: number, sliceEnd: number, key: string) => {
          const slice = paragraph.text.slice(sliceStart, sliceEnd);
          const start = mark ? Math.max(0, mark.start - paragraph.start - sliceStart) : 0;
          const end = mark ? Math.min(slice.length, mark.end - paragraph.start - sliceStart) : 0;
          return (
            <FormattedText
              key={key}
              text={slice}
              mark={end > start ? { start, end } : null}
              highlightClassName={highlightClassName}
              highlightStyle={highlightStyle}
            />
          );
        };
        if (!clickable) {
          return (
            <p key={paragraph.start}>
              {renderSlice(0, paragraph.text.length, "w")}
            </p>
          );
        }
        return (
          <p key={paragraph.start}>
            {paragraphChunks(paragraph.start, paragraphEnd, segments!).map((chunk, i) => {
              const sliceStart = chunk.start - paragraph.start;
              const sliceEnd = chunk.end - paragraph.start;
              if (!chunk.segment) return renderSlice(sliceStart, sliceEnd, `${i}`);
              const seconds = chunk.segment.start;
              return (
                <span
                  key={i}
                  role="button"
                  tabIndex={0}
                  aria-label={sentenceLabel}
                  title={sentenceLabel}
                  onClick={() => {
                    // 드래그로 텍스트를 골랐을 때는 재생하지 않는다
                    if (window.getSelection()?.toString()) return;
                    onPlayFrom!(seconds);
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" && event.key !== " ") return;
                    event.preventDefault();
                    onPlayFrom!(seconds);
                  }}
                  className="cursor-pointer rounded-sm hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/70"
                >
                  {renderSlice(sliceStart, sliceEnd, `${i}`)}
                </span>
              );
            })}
          </p>
        );
      })}
    </>
  );
}
