"use client";

import { useMemo, type CSSProperties } from "react";
import FormattedText, { emphasisClassName, emphasisDelimiters, emphasisSpans } from "../ui/FormattedText";
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

type Span = { start: number; end: number; className?: string; delimiters?: { open: string; close: string } };
type Chunk = { start: number; end: number; segment: ReadingSegment | null; span?: Span };

/** 문단 범위 안에서 세그먼트와 겹치는 조각을 자른다. 세그먼트 사이 빈칸은 다음 문장에 붙인다. */
function paragraphChunks(paragraph: { text: string; start: number }, segments: ReadingSegment[], highlightClassName?: string): Chunk[] {
  const paragraphStart = paragraph.start;
  const paragraphEnd = paragraph.start + paragraph.text.length;
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

  // "싸우자! 싸우자!"처럼 인용구가 세그먼트를 건너면 부호 쌍이 다른 조각에 갈려 강조가 통째로 빠진다.
  // 강조 범위 경계에서 조각을 한 번 더 잘라 안쪽 조각에 쌍째 클래스를 입힌다 — 조각별 문장 재생은 그대로 둔다.
  const spans: Span[] = emphasisSpans(paragraph.text).map((s) => {
    const matched = paragraph.text.slice(s.start, s.end);
    return {
      start: s.start + paragraphStart,
      end: s.end + paragraphStart,
      className: emphasisClassName(matched, highlightClassName),
      delimiters: emphasisDelimiters(matched),
    };
  });
  const pieces: Chunk[] = [];
  for (const chunk of chunks.filter((c) => c.end > c.start)) {
    const edges = spans
      .flatMap((s) => [s.start, s.end])
      .filter((b) => b > chunk.start && b < chunk.end)
      .sort((a, b) => a - b);
    let slice = chunk.start;
    for (const boundary of [...edges, chunk.end]) {
      if (boundary <= slice) continue;
      const span = spans.find((s) => s.start <= slice && s.end >= boundary);
      pieces.push({ start: slice, end: boundary, segment: chunk.segment, span });
      slice = boundary;
    }
  }
  return pieces;
}

/** 빈 줄을 문단 경계로 쓰는 읽어보기·가상독백 본문에 재생 문장 강조를 입힌다. */
export default function ReadingHighlightText({ text, mark, segments, onPlayFrom, sentenceLabel, highlightClassName, highlightStyle }: ReadingHighlightTextProps) {
  const paragraphs = useMemo(
    () => Array.from(text.matchAll(/[^\n]+(?:\n(?!\n)[^\n]+)*/g), (match) => ({ text: match[0], start: match.index })),
    [text],
  );
  const clickable = !!(segments?.length && onPlayFrom);
  return (
    <div className="space-y-5">
      {paragraphs.map((paragraph) => {
        const renderSlice = (sliceStart: number, sliceEnd: number, key: string, delimiters?: { open?: string; close?: string }) => {
          let slice = paragraph.text.slice(sliceStart, sliceEnd);
          // 조각 가장자리의 원문 부호를 쌍째 정규화 부호로 바꾼다 — 1:1 치환이라 재생 강조 오프셋은 유지된다
          if (delimiters?.open) slice = delimiters.open + slice.slice(1);
          if (delimiters?.close) slice = slice.slice(0, -1) + delimiters.close;
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
            {paragraphChunks(paragraph, segments!, highlightClassName).map((piece, i) => {
              const sliceStart = piece.start - paragraph.start;
              const sliceEnd = piece.end - paragraph.start;
              // 강조 범위 안쪽 조각 — 부호 쌍은 밖에 있으니 문단에서 맞춘 클래스를 통째로 입힌다
              const slice = renderSlice(sliceStart, sliceEnd, `${i}`, piece.span?.className ? {
                open: piece.start === piece.span.start ? piece.span.delimiters?.open : undefined,
                close: piece.end === piece.span.end ? piece.span.delimiters?.close : undefined,
              } : undefined);
              const content = piece.span?.className ? (
                <span key={`${i}-e`} className={piece.span.className} style={highlightClassName ? highlightStyle : undefined}>
                  {slice}
                </span>
              ) : slice;
              if (!piece.segment) return content;
              const seconds = piece.segment.start;
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
                  {content}
                </span>
              );
            })}
          </p>
        );
      })}
    </div>
  );
}
